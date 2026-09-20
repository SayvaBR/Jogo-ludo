import type { Game } from './engine';
import { FINISH, OUT, legalMoves, SAFE, square, STARTS } from './engine';
import { TRACK, LANES, YARDS, tokenPoint, type Point } from './board-path';
export { tokenPoint } from './board-path';

export const PALETTE = ['#f43f58', '#2386ed', '#ffca35', '#13ba83'] as const;
const DARK = ['#9f1839', '#104baf', '#b57b07', '#087755'] as const;
const BASES: Point[] = [[0,0],[0,9],[9,9],[9,0]];
const center = ([x,y]:Point):Point => [x*40+20,y*40+20];
function star(x:number,y:number,r:number):string {
  return Array.from({length:10},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI/5, d=i%2?r*.45:r;
    return `${i?'L':'M'}${(x+Math.cos(a)*d).toFixed(2)} ${(y+Math.sin(a)*d).toFixed(2)}`;
  }).join(' ')+'Z';
}
function Pawn({color,point,active,onClick,animated=false}: {color:number;point:Point;active:boolean;onClick?:()=>void;animated?:boolean}) {
  return <g className={`pawn ${active?'pawn--active':''} ${onClick?'pawn--clickable':''}`} transform={`translate(${point[0]} ${point[1]})`} data-animated-pawn={animated?'true':undefined} onClick={onClick} role={onClick?'button':undefined} aria-label={onClick?`Mover peão ${color+1}`:undefined} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}}:undefined}>
    {active&&<><circle className="pawn-pulse" r="23" fill={PALETTE[color]} opacity=".45"/><circle r="19.5" fill="none" stroke="#fff" strokeWidth="2.2"/></>}
    <ellipse cx="1.3" cy="10" rx="16" ry="6.5" fill="#08162c" opacity=".30"/>
    <ellipse cy="7.5" rx="14.2" ry="7.1" fill={DARK[color]}/>
    <ellipse cy="4.8" rx="13.8" ry="6.6" fill={PALETTE[color]} stroke={DARK[color]} strokeWidth=".8"/>
    <path d="M-7 3 C-4 -1 -4 -5 -5 -9 L5 -9 C4 -5 4 -1 7 3 Q0 9 -7 3Z" fill={`url(#pawn-body-${color})`}/>
    <circle cx="0" cy="-9" r="9.4" fill={`url(#pawn-head-${color})`} stroke={DARK[color]} strokeWidth=".65"/>
    <ellipse cx="-3.2" cy="-12.7" rx="2.8" ry="2" transform="rotate(-28 -3.2 -12.7)" fill="#fff" opacity=".72"/>
    <circle r="23" fill="transparent" stroke="transparent" strokeWidth="6"/>
  </g>;
}
export function Board({state,animated,onToken}: {state:Game;animated:{color:number;token:number;progress:number}|null;onToken:(token:number)=>void}) {
  const options=state.phase==='choose'?legalMoves(state):[];
  const occupancy=new Map<string,Point[]>();
  for(const color of state.seats) for(let token=0;token<4;token++) {
    const p=state.pieces[color][token];if(p===OUT||p===FINISH)continue;
    const k=p<52?`track-${square(color,p)}`:`lane-${color}-${p}`;
    occupancy.set(k,[...(occupancy.get(k)||[]),[color,token]]);
  }
  const displace=(color:number,token:number,progress:number):Point=>{
    if(progress===OUT||progress===FINISH)return [0,0];
    const k=progress<52?`track-${square(color,progress)}`:`lane-${color}-${progress}`;
    const peers=occupancy.get(k)||[];
    if(peers.length<2)return [0,0];
    const i=peers.findIndex(([c,t])=>c===color&&t===token);
    const a=i*Math.PI*2/peers.length,r=peers.length===2?8:11;
    return [Math.cos(a)*r,Math.sin(a)*r];
  };
  const pawns=state.seats.flatMap(color=>state.pieces[color].map((progress,token)=>({color,token,progress,active:color===state.current&&options.includes(token)}))).filter(p=>p.progress!==FINISH);
  pawns.sort((a,b)=>Number(a.active)-Number(b.active));
  return <svg className="ludo-board" viewBox="-6 -6 612 612" aria-label="Tabuleiro clássico de Ludo: quatro bases, percurso e casas de saída protegidas" role="group">
    <defs>
      <linearGradient id="tile-white" x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#eef3ff"/></linearGradient>
      {PALETTE.map((color,i)=><g key={i}>
        <radialGradient id={`pawn-head-${i}`} cx=".31" cy=".2" r=".8"><stop stopColor="#fff" stopOpacity=".9"/><stop offset=".27" stopColor={color}/><stop offset="1" stopColor={DARK[i]}/></radialGradient>
        <linearGradient id={`pawn-body-${i}`} x2="1" y2=".2"><stop stopColor={DARK[i]}/><stop offset=".43" stopColor={color}/><stop offset=".76" stopColor={color}/><stop offset="1" stopColor={DARK[i]}/></linearGradient>
      </g>)}
      <clipPath id="board-mask"><rect width="600" height="600" rx="21"/></clipPath>
    </defs>
    <rect x="-4" y="1" width="608" height="605" rx="26" fill="#060e22" opacity=".34"/>
    <rect x="-3" y="-4" width="606" height="606" rx="25" fill="#f8fbff" stroke="#91b7ef" strokeWidth="3"/>
    <g clipPath="url(#board-mask)">
      <rect width="600" height="600" fill="#f8fbff"/>
      {BASES.map(([bx,by],color)=>{
        const x=bx*40,y=by*40;
        return <g key={color}>
          <rect x={x} y={y} width="240" height="240" fill={PALETTE[color]}/>
          <path d={`M${x+8} ${y+12}H${x+220}`} stroke="#fff" strokeWidth="3" opacity=".27" strokeLinecap="round"/>
          <rect x={x+18} y={y+24} width="204" height="202" rx="34" fill="#082044" opacity=".23"/>
          <rect x={x+18} y={y+16} width="204" height="202" rx="34" fill={color===2?'#fff4b2':'#f8fbff'} stroke="#fff" strokeWidth="3"/>
          <rect x={x+25} y={y+23} width="190" height="188" rx="29" fill={PALETTE[color]} opacity=".13"/>
          {YARDS[color].map((pos,i)=>{const [px,py]=center(pos);return <g key={i}><ellipse cx={px} cy={py+2.5} rx="23" ry="22" fill={DARK[color]} opacity=".15"/><circle cx={px} cy={py} r="21" fill="#fff" stroke={PALETTE[color]} strokeWidth="3"/><circle cx={px} cy={py} r="16" fill={PALETTE[color]} opacity=".15"/></g>;})}
        </g>;
      })}
      {TRACK.map(([x,y],i)=>{
        const start=STARTS.indexOf(i as typeof STARTS[number]),safe=SAFE.has(i),fill=start>=0?PALETTE[start]:safe?'#e6eeff':'url(#tile-white)';
        const px=x*40,py=y*40;
        return <g key={i}>
          <rect x={px} y={py} width="40" height="40" fill="#b4c5e0"/>
          <rect x={px+1.05} y={py+.9} width="37.9" height="37.5" rx="2.5" fill={fill} stroke={start>=0?'#fff':'#bdcde6'} strokeWidth="1.05"/>
          {safe?<path d={star(px+20,py+20,12)} fill={start>=0?'#fff':'#6c90cb'}/>:<circle cx={px+20} cy={py+20} r="2.15" fill="#9fb2cf" opacity=".85"/>}
        </g>;
      })}
      {LANES.map((lane,color)=>lane.map(([x,y],i)=><g key={`${color}-${i}`}>
        <rect x={x*40} y={y*40} width="40" height="40" fill={DARK[color]}/>
        <rect x={x*40+1} y={y*40+1} width="38" height="37" rx="2.5" fill={PALETTE[color]} stroke="#ffffff9c" strokeWidth="1"/>
        <circle cx={x*40+20} cy={y*40+19} r="2.1" fill="#fff" opacity=".65"/>
      </g>))}
      <rect x="240" y="240" width="120" height="120" fill="#fff"/>
      <path d="M240 240 L360 240 L300 300Z" fill={PALETTE[3]}/>
      <path d="M240 240 L240 360 L300 300Z" fill={PALETTE[0]}/>
      <path d="M240 360 L360 360 L300 300Z" fill={PALETTE[1]}/>
      <path d="M360 240 L360 360 L300 300Z" fill={PALETTE[2]}/>
      <path d={star(300,300,28)} fill="#fff5bb" stroke="#fff" strokeWidth="3"/>
      <circle cx="300" cy="300" r="6" fill="#ffcf4a"/>
    </g>
    {pawns.map(({color,token,progress,active})=>{
      if(animated?.color===color&&animated.token===token)return null;
      const [x,y]=tokenPoint(color,token,progress),[dx,dy]=displace(color,token,progress);
      return <Pawn key={`${color}-${token}`} color={color} point={[x+dx,y+dy]} active={active} onClick={active?()=>onToken(token):undefined}/>;
    })}
    {animated&&<Pawn color={animated.color} point={tokenPoint(animated.color,animated.token,animated.progress)} active={false} animated/>}
    <rect x="1.2" y="1.2" width="597.6" height="597.6" rx="21" fill="none" stroke="#fff" strokeWidth="3"/>
    <rect x="-3" y="-4" width="606" height="606" rx="25" fill="none" stroke="#9fbee9" strokeWidth="2"/>
  </svg>;
}
