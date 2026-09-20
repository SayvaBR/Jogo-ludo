import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Board, PALETTE, tokenPoint } from './board';
import { bestCpuMove, COLORS, FINISH, loadGame, move, newGame, onlyLegalMove, roll, type Game } from './engine';
import { fairDie } from './fair-die';
import { playSound, unlockAudio } from './audio';
import './style.css';
import './board-v2.css';
import './dice-v3.css';
import './premium-v4.css';

const SAVE='ludo-react-save-v3';
const SETTINGS='ludo-react-settings';
interface Settings { players:number;cpu:boolean;bank:boolean;sound:boolean; }
const defaults:Settings={players:2,cpu:true,bank:false,sound:true};
const heroGame=newGame(4,false,false);
function readSettings():Settings{
  try {const saved=JSON.parse(localStorage.getItem(SETTINGS)||'{}');return {...defaults,...saved};}catch{return defaults;}
}
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
/** Every pawn hop is interpolated on the display's paint clock, without React renders per frame. */
async function animateRoute(color:number,token:number,from:number,to:number,step:()=>void):Promise<void>{
  // Wait for React to insert the transient SVG pawn before querying it.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const pawn=document.querySelector<SVGGElement>('[data-animated-pawn="true"]');
  if(!pawn||document.hidden)return;
  const route=from===-1?[0]:Array.from({length:to-from},(_,i)=>from+i+1);
  let previous=from;
  for(const progress of route){
    if(document.hidden)break;
    const start=tokenPoint(color,token,previous),end=tokenPoint(color,token,progress);
    step();
    await new Promise<void>(resolve=>{
      let began:number|null=null;
      const duration=previous===-1?205:108;
      const frame=(time:number)=>{
        if(began===null)began=time;
        const p=Math.min(1,(time-began)/duration),smooth=p*p*(3-2*p);
        const x=start[0]+(end[0]-start[0])*smooth;
        const y=start[1]+(end[1]-start[1])*smooth-Math.sin(p*Math.PI)*7;
        pawn.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        if(p<1&&!document.hidden)requestAnimationFrame(frame);
        else{pawn.setAttribute('transform',`translate(${end[0]} ${end[1]})`);resolve();}
      };
      requestAnimationFrame(frame);
    });
    previous=progress;
  }
}
const pips:Record<number,number[][]>={
  1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],
  4:[[0,0],[0,2],[2,0],[2,2]],5:[[0,0],[0,2],[1,1],[2,0],[2,2]],
  6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]
};
// Front, top, right, left, bottom, back of the physical 3D cube.
const faceRotation:Record<number,[number,number]>={1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
function Dice({value,rolling,disabled,onClick}:{value:number;rolling:boolean;disabled:boolean;onClick:()=>void}){
  const [x,y]=faceRotation[value||1];
  const style={'--dice-x':`${x}deg`,'--dice-y':`${y}deg`} as CSSProperties;
  return <button className={`dice-button ${rolling?'is-rolling':''} ${value===0?'dice-button--idle':''}`} disabled={disabled} onClick={onClick} aria-label={rolling?'Dado rolando':value?`Lançar o dado. Último resultado: ${value}`:'Lançar o dado'}>
    <span className="dice-aura" aria-hidden="true"/>
    <span className="dice-cube" style={style} aria-hidden="true">
      {[1,2,3,4,5,6].map(face=><span key={face} className={`cube-face cube-face--${face}`}>{pips[face].map(([col,row],i)=><i key={i} style={{gridColumn:col+1,gridRow:row+1}}/>)}</span>)}
    </span>
  </button>;
}
function App(){
  const [settings,setSettings]=useState<Settings>(readSettings);
  const [game,setGame]=useState<Game|null>(()=>loadGame(localStorage.getItem(SAVE)));
  const [page,setPage]=useState<'menu'|'game'>('menu');
  const [modal,setModal]=useState(false);
  const [menuSettings,setMenuSettings]=useState(false);
  const [busy,setBusy]=useState(false);
  const [rolling,setRolling]=useState(false);
  const [diceFace,setDiceFace]=useState(game?.die||0);
  const [animation,setAnimation]=useState<{color:number;token:number;progress:number}|null>(null);
  const lock=useRef(false);
  useEffect(()=>{localStorage.setItem(SETTINGS,JSON.stringify(settings));},[settings]);
  useEffect(()=>{if(game)localStorage.setItem(SAVE,JSON.stringify(game));},[game]);
  const updateSettings=(key:keyof Settings,value:number|boolean)=>setSettings(old=>({...old,[key]:value}));
  const back=useCallback(()=>{
    if(modal){setModal(false);return;}
    if(page==='game'){setModal(true);return;}
    if(menuSettings){setMenuSettings(false);return;}
  },[modal,page,menuSettings]);
  useEffect(()=>{
    let listener:{remove:()=>Promise<void>}|undefined,disposed=false;
    void NativeApp.addListener('backButton',()=>back()).then(value=>{if(disposed)void value.remove();else listener=value;}).catch(()=>{});
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();back();}};
    document.addEventListener('keydown',key);
    return ()=>{disposed=true;document.removeEventListener('keydown',key);if(listener)void listener.remove();};
  },[back]);
  const start=(players:number,cpu:boolean)=>{
    unlockAudio(settings.sound);playSound('tap',settings.sound);
    const next=newGame(players,cpu,settings.bank);
    lock.current=false;setBusy(false);setRolling(false);setDiceFace(0);setAnimation(null);setGame(next);setPage('game');setModal(false);setMenuSettings(false);
  };
  const rollDie=useCallback(async()=>{
    if(!game||lock.current||page!=='game'||modal||game.phase!=='roll')return;
    lock.current=true;unlockAudio(settings.sound);setBusy(true);
    // Choose once, before displaying the animation. Human and CPU share fairDie().
    const value=fairDie();setDiceFace(value);setRolling(true);
    playSound('roll',settings.sound);
    await pause(800);
    setGame(roll(game,value));setRolling(false);
    playSound('land',settings.sound);navigator.vibrate?.(18);
    setBusy(false);lock.current=false;
  },[game,page,modal,settings.sound]);
  const playToken=useCallback(async(token:number)=>{
    if(!game||lock.current||page!=='game'||modal||game.phase!=='choose')return;
    const result=move(game,token);if(!result)return;
    lock.current=true;setBusy(true);
    const color=game.current;
    setAnimation({color,token,progress:result.from});
    await animateRoute(color,token,result.from,result.to,()=>playSound('step',settings.sound));
    setGame(result.state);setAnimation(null);
    if(result.event==='capture')playSound('capture',settings.sound);
    else if(result.event==='finish')playSound('finish',settings.sound);
    else if(result.event==='win')playSound('win',settings.sound);
    if(result.event==='capture'||result.event==='win')navigator.vibrate?.(result.event==='win'?[50,40,90]:36);
    setBusy(false);lock.current=false;
  },[game,page,modal,settings.sound]);
  // Identical auto-move handling for human and CPU when there is exactly one legal pawn.
  useEffect(()=>{
    if(page!=='game'||!game||modal||busy||lock.current)return;
    const forced=onlyLegalMove(game);if(forced===null)return;
    const timer=setTimeout(()=>{void playToken(forced);},230);
    return ()=>clearTimeout(timer);
  },[game,page,modal,busy,playToken]);
  useEffect(()=>{
    if(page!=='game'||!game||modal||busy||lock.current||game.phase==='finished'||!game.cpu.includes(game.current))return;
    if(game.phase==='choose'&&onlyLegalMove(game)!==null)return;
    const timer=setTimeout(()=>{if(game.phase==='roll')void rollDie();else{const token=bestCpuMove(game);if(token>=0)void playToken(token);}},540);
    return ()=>clearTimeout(timer);
  },[game,page,modal,busy,rollDie,playToken]);
  const reset=()=>{if(lock.current)return;localStorage.removeItem(SAVE);setDiceFace(0);setGame(null);setModal(false);setPage('menu');};
  const finished=game?.winner!==-1&&game?.phase==='finished';
  return <main className="app-shell">
    {page==='menu'?<section className="menu" aria-label="Menu principal">
      <header className="brand"><span className="brand-icon" aria-hidden="true">✦</span><div><strong>ESTÚDIO LUDO</strong><small>DIVERSÃO SEMPRE COM VOCÊ</small></div><div className="brand-actions"><button className="icon-action" aria-label="Configurações" aria-expanded={menuSettings} onClick={()=>setMenuSettings(p=>!p)}>⚙</button></div></header>
      {menuSettings&&<div className="settings-drawer"><label>Som do jogo <input type="checkbox" checked={settings.sound} onChange={e=>{unlockAudio(e.target.checked);updateSettings('sound',e.target.checked);}}/></label></div>}
      <div className="hero-art" aria-hidden="true"><div className="hero-board-frame"><Board state={heroGame} animated={null} onToken={()=>{}}/></div><span className="hero-spark">✦</span><div className="hero-mini-dice">{pips[5].map(([x,y],i)=><i key={i} style={{gridColumn:x+1,gridRow:y+1}}/>)}</div></div>
      <div className="hero-text"><h1>LU<span>DO</span><span className="title-star">✦</span></h1><p>Quatro cores. Mil momentos.</p></div>
      <div className="menu-panel"><div className="panel-title"><strong>Preparar partida</strong></div>
        <div className="option-group"><div className="option-label"><span className="option-symbol">●●</span> Jogadores</div>
          <div className="seg" role="group" aria-label="Número de jogadores">{[2,3,4].map(n=><button key={n} aria-pressed={settings.players===n} className={settings.players===n?'selected':''} onClick={()=>{playSound('tap',settings.sound);updateSettings('players',n);}}><span className="choice-icon" aria-hidden="true">{'●'.repeat(n)}</span>{n} jogadores</button>)}</div>
        </div>
        <div className="option-group"><div className="option-label"><span className="option-symbol">✣</span> Modo de jogo</div>
          <div className="seg modes" role="group" aria-label="Modo de jogo"><button aria-pressed={!settings.cpu} className={!settings.cpu?'selected':''} onClick={()=>{playSound('tap',settings.sound);updateSettings('cpu',false);}}><span className="choice-icon" aria-hidden="true">♟</span> Amigos</button><button aria-pressed={settings.cpu} className={settings.cpu?'selected':''} onClick={()=>{playSound('tap',settings.sound);updateSettings('cpu',true);}}><span className="choice-icon" aria-hidden="true">✦</span> Contra CPU</button></div>
          <label className="switch-row"><span><strong>Acumular dados com 6</strong><small>Lance novamente antes de mover</small></span><input type="checkbox" checked={settings.bank} onChange={e=>updateSettings('bank',e.target.checked)}/></label>
        </div>
        <button className="primary" onClick={()=>start(settings.players,settings.cpu)}>COMEÇAR PARTIDA <span aria-hidden="true">→</span></button>
        {game&&<button className="secondary" onClick={()=>{unlockAudio(settings.sound);setModal(false);setPage('game');}}>↻ Continuar partida</button>}
      </div>
      <footer className="menu-footer"><button onClick={()=>updateSettings('sound',!settings.sound)} aria-pressed={!settings.sound}>{settings.sound?'♪ Som ligado':'♪ Sem som'}</button></footer>
    </section>:game&&<section className="match" aria-label="Partida de Ludo">
      <header className="match-top"><button className="back" onClick={()=>setModal(true)} aria-label="Voltar ou pausar">‹</button><div className="match-heading"><strong>LU<span style={{color:'#ffd447'}}>DO</span> <span>✦</span></strong></div><button className="menu-action" onClick={()=>setModal(true)} aria-label="Abrir menu">☰</button></header>
      <div className="player-grid">{game.seats.map(color=><div key={color} className={`player-pill ${game.current===color?'player-pill--active':''}`} style={{'--color':PALETTE[color]} as CSSProperties}><i className="player-color"/><div><strong>{COLORS[color]}{game.cpu.includes(color)?' · CPU':''}</strong><span className="finish-dots" aria-label={`${game.pieces[color].filter(p=>p===FINISH).length} peões concluídos`}>{[0,1,2,3].map(i=><i key={i} className={i<game.pieces[color].filter(p=>p===FINISH).length?'is-done':''}/>)}</span></div>{game.current===color&&<span className="current-arrow"/>}</div>)}</div>
      <div className="turn-banner"><span className="turn-indicator" style={{backgroundColor:PALETTE[game.current]}}/><i className="turn-pawn" style={{'--color':PALETTE[game.current]} as CSSProperties}/><div><strong>{finished?`${COLORS[game.winner]} venceu!`:`Vez de ${COLORS[game.current]}`}</strong><span>{game.message}</span></div></div>
      <div className="board-wrap"><Board state={game} animated={animation} onToken={token=>{if(!busy)void playToken(token);}}/></div>
      <div className="game-controls"><div className="dice-info"><span className="eyebrow">{game.phase==='choose'?'SUA JOGADA':'SEU LANCE'}</span><strong>{finished?'Fim de jogo':game.phase==='choose'?onlyLegalMove(game)!==null?'Movendo peão…':`Avance ${game.die} casas`:game.cpu.includes(game.current)?'CPU jogando…':'Role o dado'}</strong><small>{game.bankSixes&&game.bank.length?`Dados: ${game.bank.join(' · ')}`:game.phase==='roll'?'Toque no dado para jogar':game.phase==='choose'?'Escolha um peão iluminado':'Boa partida!'}</small></div><Dice value={diceFace} rolling={rolling} disabled={busy||modal||game.phase!=='roll'||game.cpu.includes(game.current)} onClick={()=>void rollDie()}/></div>
      {finished&&<button className="primary victory-button" onClick={()=>start(game.seats.length,game.cpu.length>0)}>JOGAR NOVAMENTE →</button>}
    </section>}
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><div className="pause-modal" role="dialog" aria-modal="true" aria-label="Partida pausada" onClick={e=>e.stopPropagation()}><span className="pause-icon">Ⅱ</span><h2>Partida pausada</h2><p>Seu progresso foi salvo.</p><button className="primary" onClick={()=>setModal(false)}>CONTINUAR PARTIDA</button><button className="secondary" disabled={lock.current} onClick={()=>{if(lock.current)return;setModal(false);setPage('menu');}}>VOLTAR AO MENU</button><button className="danger" disabled={lock.current} onClick={reset}>Apagar partida</button></div></div>}
  </main>;
}
export default App;
