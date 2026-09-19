import { useCallback, useEffect, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Board, PALETTE } from './board';
import { bestCpuMove, COLORS, FINISH, loadGame, move, newGame, roll, type Game } from './engine';
import './style.css';

const SAVE = 'ludo-react-save-v2';
const SETTINGS = 'ludo-react-settings';
interface Settings { players: number; cpu: boolean; bank: boolean; reduced: boolean; sound: boolean; }
const defaults: Settings = { players: 2, cpu: true, bank: false, reduced: false, sound: true };
function readSettings(): Settings {
  try { const saved = JSON.parse(localStorage.getItem(SETTINGS) || '{}'); return { ...defaults, ...saved }; } catch { return defaults; }
}
function chime(kind: 'roll' | 'move' | 'capture' | 'win', enabled: boolean) {
  if(!enabled) return;
  try {
    const Audio = window.AudioContext;
    if(!Audio) return;
    const ctx = new Audio();
    const oscillator = ctx.createOscillator(); const gain=ctx.createGain();
    oscillator.type='sine'; oscillator.frequency.setValueAtTime(kind==='capture'?310:kind==='win'?720:kind==='roll'?470:600,ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind==='capture'?140:kind==='win'?1080:kind==='roll'?580:420,ctx.currentTime+.13);
    gain.gain.setValueAtTime(.055,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.17);
    oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.18);
    oscillator.onended=()=>{void ctx.close();};
  } catch { /* audio is optional on devices without Web Audio */ }
}
const pause = (ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const dots: Record<number,number[][]> = {1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]};
function Dice({value,rolling,disabled,onClick}: {value:number;rolling:boolean;disabled:boolean;onClick:()=>void}) {
  return <button className={`dice ${rolling?'dice--rolling':''}`} onClick={onClick} disabled={disabled} aria-label={value?`Dado ${value}. Lançar dado`:'Lançar dado'}>
    <span className="dice-face">{(dots[value||1]).map(([x,y],i)=><i key={i} style={{gridColumn:x+1,gridRow:y+1}} />)}</span>
  </button>;
}
export default function App() {
  const [settings,setSettings]=useState<Settings>(readSettings);
  const [game,setGame]=useState<Game|null>(()=>loadGame(localStorage.getItem(SAVE)));
  const [page,setPage]=useState<'menu'|'game'>('menu');
  const [modal,setModal]=useState(false);
  const [busy,setBusy]=useState(false);
  const [rolling,setRolling]=useState(false);
  const [animation,setAnimation]=useState<{color:number;token:number;progress:number}|null>(null);
  const lock=useRef(false);
  useEffect(()=>{ localStorage.setItem(SETTINGS,JSON.stringify(settings)); },[settings]);
  useEffect(()=>{ if(game) localStorage.setItem(SAVE,JSON.stringify(game)); },[game]);
  const updateSettings=(key:keyof Settings,value:number|boolean)=>setSettings(previous=>({...previous,[key]:value}));
  const back=useCallback(()=>{
    if(modal){setModal(false);return;}
    if(page==='game'){setModal(true);return;}
    setModal(false);
  },[modal,page]);
  useEffect(()=>{
    let listener:{remove:()=>Promise<void>}|undefined; let disposed=false;
    void NativeApp.addListener('backButton',()=>back()).then(value=>{if(disposed)void value.remove();else listener=value;}).catch(()=>{});
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();back();}};
    document.addEventListener('keydown',key);
    return ()=>{disposed=true;document.removeEventListener('keydown',key);if(listener)void listener.remove();};
  },[back]);
  const start=(count:number,versusCpu:boolean)=>{
    const next=newGame(count,versusCpu,settings.bank);
    lock.current=false;setBusy(false);setRolling(false);setAnimation(null);setGame(next);setPage('game');setModal(false);
  };
  const rollDie=useCallback(async()=>{
    if(!game||lock.current||page!=='game'||modal||game.phase!=='roll')return;
    lock.current=true;setBusy(true);setRolling(true);
    const value=Math.floor(Math.random()*6)+1;
    if(!settings.reduced) await pause(420);
    const next=roll(game,value);
    setGame(next);setRolling(false);setBusy(false);lock.current=false;
    chime('roll',settings.sound);
  },[game,page,modal,settings.reduced,settings.sound]);
  const playToken=useCallback(async(token:number)=>{
    if(!game||lock.current||page!=='game'||modal||game.phase!=='choose')return;
    const result=move(game,token); if(!result)return;
    lock.current=true;setBusy(true);
    if(!settings.reduced){
      const color=game.current;
      setAnimation({color,token,progress:result.from});
      const route=result.from===-1?[0]:Array.from({length:result.to-result.from},(_,i)=>result.from+i+1);
      for(const progress of route){setAnimation({color,token,progress});await pause(75);}
      setAnimation(null);
    }
    setGame(result.state);
    chime(result.event==='capture'?'capture':result.event==='win'?'win':'move',settings.sound);
    if(result.event==='capture'||result.event==='win')navigator.vibrate?.(result.event==='win'?[60,40,90]:35);
    setBusy(false);lock.current=false;
  },[game,page,modal,settings.reduced,settings.sound]);
  useEffect(()=>{
    if(page!=='game'||!game||modal||busy||lock.current||game.phase==='finished'||!game.cpu.includes(game.current))return;
    const timer=setTimeout(()=>{if(game.phase==='roll')void rollDie();else {const token=bestCpuMove(game);if(token>=0)void playToken(token);}},600);
    return ()=>clearTimeout(timer);
  },[game,page,modal,busy,rollDie,playToken]);
  const resume=()=>{if(game){setModal(false);setPage('game');}};
  const reset=()=>{if(lock.current)return;localStorage.removeItem(SAVE);setGame(null);setModal(false);setPage('menu');};
  const finished=game?.winner!==-1&&game?.phase==='finished';
  return <main className="app-shell">
    {page==='menu' ? <section className="menu" aria-label="Menu principal">
      <div className="brand"><span className="brand-icon">✦</span> ESTÚDIO DE JOGOS <span className="brand-line"/></div>
      <div className="hero-art" aria-hidden="true"><div className="art-board"><span className="art-dot dot-red"/><span className="art-dot dot-blue"/><span className="art-dot dot-yellow"/><span className="art-dot dot-green"/><span className="art-star">★</span></div></div>
      <div className="hero-text"><span className="eyebrow">O CLÁSSICO ESTÁ DE VOLTA</span><h1>LU<span>DO</span><span className="title-star">✦</span></h1><p>Quatro cores. Um dado.<br/>Diversão a cada rodada.</p></div>
      <div className="menu-panel"><div className="panel-title"><strong>Preparar partida</strong><span>Escolha como jogar</span></div>
        <div className="seg" role="group" aria-label="Quantidade de jogadores">{[2,3,4].map(n=><button key={n} className={settings.players===n?'selected':''} onClick={()=>updateSettings('players',n)}>{n} jogadores</button>)}</div>
        <div className="seg modes" role="group" aria-label="Modo de jogo"><button className={!settings.cpu?'selected':''} onClick={()=>updateSettings('cpu',false)}>◉ Amigos</button><button className={settings.cpu?'selected':''} onClick={()=>updateSettings('cpu',true)}>✦ Contra CPU</button></div>
        <label className="switch-row"><span><strong>Acumular dados com 6</strong><small>Variante: lance de novo antes de mover</small></span><input type="checkbox" checked={settings.bank} onChange={e=>updateSettings('bank',e.target.checked)}/></label>
        <button className="primary" onClick={()=>start(settings.players,settings.cpu)}>COMEÇAR PARTIDA <span>→</span></button>
        {game&&<button className="secondary" onClick={resume}>↻ Continuar partida salva</button>}
      </div>
      <div className="menu-footer"><label><input type="checkbox" checked={!settings.sound} onChange={e=>updateSettings('sound',!e.target.checked)}/> Sem som</label><label><input type="checkbox" checked={settings.reduced} onChange={e=>updateSettings('reduced',e.target.checked)}/> Reduzir animações</label></div>
    </section> : game && <section className="match" aria-label="Partida de Ludo">
      <header className="match-top"><button className="back" aria-label="Voltar ao menu" onClick={()=>setModal(true)}>‹</button><div className="match-heading"><span className="eyebrow">PARTIDA LOCAL</span><strong>LUDO <span>✦</span></strong></div><button className="menu-action" onClick={()=>setModal(true)} aria-label="Pausar partida">☷</button></header>
      <div className="player-grid">{game.seats.map(color=><div key={color} className={`player-pill ${game.current===color?'player-pill--active':''}`} style={{'--color':PALETTE[color]} as React.CSSProperties}><i className="player-color"/><div><strong>{COLORS[color]}</strong><small>{game.cpu.includes(color)?'CPU':'JOGADOR'} • {game.pieces[color].filter(p=>p===FINISH).length}/4</small></div>{game.current===color&&<span className="current-arrow">●</span>}</div>)}</div>
      <div className="turn-banner"><span className="turn-indicator" style={{backgroundColor:PALETTE[game.current]}}/><div><strong>{finished?`${COLORS[game.winner]} venceu!`:`Vez de ${COLORS[game.current]}`}</strong><span>{game.message}</span></div></div>
      <div className="board-wrap"><Board state={game} animated={animation} onToken={token=>{if(!busy)void playToken(token);}} /></div>
      <div className="game-controls"><div className="dice-info"><span className="eyebrow">{game.phase==='choose'?'ESCOLHA UMA PEÇA':'SUA JOGADA'}</span><strong>{game.phase==='finished'?'Fim de jogo':game.phase==='choose'?`Avance ${game.die} casas`:game.cpu.includes(game.current)?'CPU pensando…':'Role o dado'}</strong><small>{game.bankSixes&&game.bank.length?`Fila de dados: ${game.bank.join(' · ')}`:game.sixStreak?`${game.sixStreak} seis consecutivo(s)`: 'Toque no dado para lançar'}</small></div><Dice value={game.die||1} rolling={rolling} disabled={busy||modal||game.phase!=='roll'||game.cpu.includes(game.current)} onClick={()=>void rollDie()}/></div>
      {finished&&<button className="primary victory-button" onClick={()=>start(game.seats.length,game.cpu.length>0)}>JOGAR NOVAMENTE →</button>}
    </section>}
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><div className="pause-modal" role="dialog" aria-modal="true" aria-label="Partida pausada" onClick={e=>e.stopPropagation()}><span className="pause-icon">Ⅱ</span><h2>Partida pausada</h2><p>Sua partida está salva automaticamente.</p><button className="primary" onClick={()=>setModal(false)}>CONTINUAR PARTIDA</button><button className="secondary" onClick={()=>{if(lock.current)return;setModal(false);setPage('menu');}}>VOLTAR AO MENU</button><button className="danger" onClick={reset}>Apagar partida salva</button></div></div>}
  </main>;
}
