import type { Game } from './engine';
import { legalMoves, SAFE, square, STARTS } from './engine';
import { TRACK, LANES, YARDS, tokenPoint, type Point } from './board-path';
export { tokenPoint } from './board-path';
export const PALETTE = ['#f44968', '#358df4', '#ffc547', '#2ac49d'] as const;

function star(x:number,y:number,outer:number,inner=outer*.5):string {
  let path='';
  for (let i=0;i<10;i++){
    const angle=-Math.PI/2+i*Math.PI/5;
    const radius=i%2?inner:outer;
    path+=`${i?'L':'M'}${(x+Math.cos(angle)*radius).toFixed(2)} ${(y+Math.sin(angle)*radius).toFixed(2)} `;
  }
  return `${path}Z`;
}
function Piece({color, point, active, onClick, id, animated=false}: {color:number; point:Point; active:boolean; onClick?:()=>void; id:string; animated?:boolean}) {
  return <g className={`pawn ${active ? 'pawn--active' : ''} ${onClick ? 'pawn--clickable' : ''}`} transform={`translate(${point[0]} ${point[1]})`} data-animated-pawn={animated ? 'true': undefined} onClick={onClick} role={onClick ? 'button' : undefined} aria-label={onClick ? `Mover peão ${id}` : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}} : undefined}>
    {active && <><circle className="pawn-pulse" r="25" fill={PALETTE[color]} opacity=".3"/><circle r="20" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".95"/></>}
    <ellipse cy="5" rx="16" ry="13" fill="#111a36" opacity=".26"/>
    <circle cy="-1" r="15.5" fill={`url(#pawn-${color})`} stroke="#172442" strokeWidth="2"/>
    <path d="M -10 -8 Q -3 -14 5 -11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".65"/>
    <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill={color===2?'#553d19':'#fff'} stroke={color===2?'#fff4c9':'#13213f'} strokeWidth=".45" paintOrder="stroke">{id.split('-').at(-1)}</text>
    <circle r="21" fill="transparent" stroke="transparent" strokeWidth="12"/>
  </g>;
}
export function Board({state, animated, onToken}: {state: Game;animated: { color: number; token: number; progress: number } | null;onToken:(token:number)=>void}) {
  const options = state.phase === 'choose' ? legalMoves(state) : [];
  const positions = new Map<string, Point[]>();
  for (const color of state.seats) for(let token=0;token<4;token++) {
    const p=state.pieces[color][token];
    if(p<0 || p===57) continue;
    const key = p < 52 ? `t${square(color,p)}` : `h${color}-${p}`;
    positions.set(key,[...(positions.get(key) || []),[color,token]]);
  }
  const offset = (color: number, token: number, progress: number): Point => {
    if(progress<0 || progress===57) return [0,0];
    const key=progress<52 ? `t${square(color,progress)}` : `h${color}-${progress}`;
    const peers=positions.get(key) || [];
    if(peers.length<2) return [0,0];
    const idx=peers.findIndex(p=>p[0]===color&&p[1]===token);
    const angle=2*Math.PI*idx/peers.length;
    const radius=peers.length===2?9:peers.length<5?11:13;
    return [Math.cos(angle)*radius,Math.sin(angle)*radius];
  };
  const pieces=state.seats.flatMap(color=>state.pieces[color].map((progress,token)=>({color,token,progress,active:color===state.current&&options.includes(token)})));
  pieces.sort((a,b)=>Number(a.active)-Number(b.active));
  return <svg className="ludo-board" viewBox="-12 -12 624 624" role="group" aria-label="Tabuleiro de Ludo com quatro bases, casas seguras e percurso de 52 casas">
    <defs>
      <linearGradient id="board-ground" x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e8eefb"/></linearGradient>
      {PALETTE.map((color,i)=><linearGradient key={i} id={`pawn-${i}`} x1="0" x2=".8" y1="0" y2="1"><stop stopColor="#fff" stopOpacity=".7"/><stop offset=".25" stopColor={color}/><stop offset="1" stopColor={color}/></linearGradient>)}
      <clipPath id="board-clip"><rect x="0" y="0" width="600" height="600" rx="19"/></clipPath>
    </defs>
    <rect x="-9" y="-6" width="618" height="620" rx="29" fill="#090f20" opacity=".3"/>
    <rect x="-7" y="-9" width="614" height="614" rx="26" fill="#f9fcff" stroke="#a9b9d4" strokeWidth="3"/>
    <g clipPath="url(#board-clip)">
      <rect width="600" height="600" fill="url(#board-ground)"/>
      {[0,1,2,3].map(color => {
        const [x,y] = ([[0,0],[0,9],[9,9],[9,0]] as Point[])[color];
        const left=x*40, top=y*40;
        return <g key={color}>
          <rect x={left} y={top} width="240" height="240" fill={PALETTE[color]}/>
          <circle cx={left+34} cy={top+30} r="98" fill="#fff" opacity=".095"/>
          <circle cx={left+222} cy={top+220} r="94" fill="#11182e" opacity=".07"/>
          <rect x={left+23} y={top+23} width="194" height="194" rx="29" fill="#101a35" opacity=".19"/>
          <rect x={left+23} y={top+19} width="194" height="194" rx="29" fill="#fff" stroke="#fff" strokeWidth="3"/>
          <rect x={left+32} y={top+28} width="176" height="176" rx="22" fill={PALETTE[color]} opacity=".075"/>
          <text x={left+120} y={top+57} textAnchor="middle" fontSize="12" fontWeight="1000" letterSpacing="4" fill="#40516f">BASE</text>
          {YARDS[color].map((point,index)=>{
            const [cx,cy]=[point[0]*40+20,point[1]*40+20];
            return <g key={index}><circle cx={cx} cy={cy+2} r="22" fill="#25344e" opacity=".13"/><circle cx={cx} cy={cy} r="21" fill="#fff" stroke={PALETTE[color]} strokeWidth="3"/><circle cx={cx} cy={cy} r="16" fill={PALETTE[color]} opacity=".1"/><circle cx={cx} cy={cy} r="10" fill={PALETTE[color]} opacity=".16"/></g>;
          })}
        </g>;
      })}
      {TRACK.map(([x,y],i) => {
        const start=STARTS.indexOf(i as typeof STARTS[number]);
        const safe=SAFE.has(i);
        const fill=start>=0?PALETTE[start]:safe?'#e0eaff':'#fff';
        return <g key={i}>
          <rect x={x*40+.9} y={y*40+2.3} width="38.2" height="37" rx="4" fill="#b4bfd0" opacity=".8"/>
          <rect x={x*40+1} y={y*40+1} width="38" height="36.5" rx="4" fill={fill} stroke={start>=0?'#ffffff':'#cbd6e8'} strokeWidth="1.2"/>
          {safe && <path d={star(x*40+20,y*40+19.5,11,5.4)} fill={start>=0?'#fff':'#7d9ecf'}/>}
          {!safe && <circle cx={x*40+20} cy={y*40+19.5} r="2" fill="#d3dded"/>}
        </g>;
      })}
      {LANES.map((lane,color)=>lane.map(([x,y],i)=><g key={`${color}-${i}`}><rect x={x*40+1} y={y*40+2} width="38" height="36" rx="4" fill="#111a36" opacity=".12"/><rect x={x*40+1} y={y*40+1} width="38" height="35.5" rx="4" fill={PALETTE[color]} stroke="#fff" strokeWidth="1.2"/><circle cx={x*40+20} cy={y*40+18.5} r="3" fill="#fff" opacity=".55"/></g>))}
      <g>
        <rect x="241" y="241" width="118" height="118" rx="5" fill="#fff"/>
        <path d="M240 240 H360 L300 300 Z" fill={PALETTE[3]}/>
        <path d="M240 240 V360 L300 300 Z" fill={PALETTE[0]}/>
        <path d="M240 360 H360 L300 300 Z" fill={PALETTE[1]}/>
        <path d="M360 240 V360 L300 300 Z" fill={PALETTE[2]}/>
        <path d={star(300,300,25,12)} fill="#fff" stroke="#273956" strokeWidth="2"/>
        <circle cx="300" cy="300" r="5" fill="#ffd05d"/>
      </g>
    </g>
    {pieces.map(({color,token,progress,active})=>{
      if(animated?.color===color && animated.token===token) return null;
      const point=tokenPoint(color,token,progress); const [dx,dy]=offset(color,token,progress);
      return <Piece key={`${color}-${token}`} id={`${color+1}-${token+1}`} color={color} point={[point[0]+dx,point[1]+dy]} active={active} onClick={active?()=>onToken(token):undefined}/>;
    })}
    {animated&&<Piece id={`${animated.color+1}-${animated.token+1}`} color={animated.color} point={tokenPoint(animated.color,animated.token,animated.progress)} active={false} animated/>}
    <rect x=".75" y=".75" width="598.5" height="598.5" rx="19" fill="none" stroke="#fff" strokeWidth="2.5"/>
    <rect x="-7" y="-9" width="614" height="614" rx="26" fill="none" stroke="#a9b9d4" strokeWidth="3"/>
  </svg>;
}
