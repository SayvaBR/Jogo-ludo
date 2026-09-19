import type { Game } from './engine';
import { FINISH, legalMoves, OUT, SAFE, square, STARTS } from './engine';

export type Point = readonly [number, number];
export const PALETTE = ['#ff5577', '#4b9eff', '#ffd05d', '#40d9b0'] as const;
const TRACK: Point[] = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const LANES: Point[][] = [[[7,1],[7,2],[7,3],[7,4],[7,5]],[[1,7],[2,7],[3,7],[4,7],[5,7]],[[7,13],[7,12],[7,11],[7,10],[7,9]],[[13,7],[12,7],[11,7],[10,7],[9,7]]];
const YARDS: Point[][] = [[[2,2],[4,2],[2,4],[4,4]],[[2,10],[4,10],[2,12],[4,12]],[[10,10],[12,10],[10,12],[12,12]],[[10,2],[12,2],[10,4],[12,4]]];
const FINISH_OFFSETS: Point[] = [[-10,-10],[-10,10],[10,10],[10,-10]];
const xy = ([x,y]: Point): Point => [x*40+20,y*40+20];
export function tokenPoint(color: number, token: number, progress: number): Point {
  if (progress === OUT) return xy(YARDS[color][token]);
  if (progress === FINISH) return [300+FINISH_OFFSETS[color][0],300+FINISH_OFFSETS[color][1]];
  if (progress < 52) return xy(TRACK[square(color,progress)]);
  return xy(LANES[color][progress-52]);
}
function Piece({color, point, active, onClick, id}: {color:number; point:Point; active:boolean; onClick?:()=>void; id:string}) {
  return <g className={`pawn ${active ? 'pawn--active' : ''} ${onClick ? 'pawn--clickable' : ''}`} transform={`translate(${point[0]} ${point[1]})`} onClick={onClick} role={onClick ? 'button' : undefined} aria-label={onClick ? `Mover peão ${id}` : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}} : undefined}>
    {active && <circle className="pawn-pulse" r="24" fill={PALETTE[color]} opacity=".32"/>}
    <circle cy="3" r="17" fill="#0b1733" opacity=".4"/>
    <circle r="15.5" fill={PALETTE[color]} stroke="#182544" strokeWidth="2.5"/>
    <ellipse cx="-4" cy="-6" rx="5" ry="3" transform="rotate(-28 -4 -6)" fill="white" opacity=".85"/>
    <circle r="19" fill="transparent" stroke="transparent" strokeWidth="15"/>
  </g>;
}
export function Board({state, animated, onToken}: {state: Game;animated: { color: number; token: number; progress: number } | null;onToken:(token:number)=>void}) {
  const options = state.phase === 'choose' ? legalMoves(state) : [];
  const positions = new Map<string, Point[]>();
  for (const color of state.seats) for(let token=0;token<4;token++) {
    const p=state.pieces[color][token];
    if(p<0 || p===FINISH) continue;
    const key = p < 52 ? `t${square(color,p)}` : `h${color}-${p}`;
    positions.set(key,[...(positions.get(key) || []),[color,token]]);
  }
  const offset = (color: number, token: number, progress: number): Point => {
    if(progress<0 || progress===FINISH) return [0,0];
    const key=progress<52 ? `t${square(color,progress)}` : `h${color}-${progress}`;
    const peers=positions.get(key) || [];
    if(peers.length<2) return [0,0];
    const idx=peers.findIndex(p=>p[0]===color&&p[1]===token);
    const angle=2*Math.PI*idx/peers.length;
    return [Math.cos(angle)*7,Math.sin(angle)*7];
  };
  return <svg className="ludo-board" viewBox="-5 -5 610 610" role="group" aria-label="Tabuleiro de Ludo com quatro bases e percurso de 52 casas">
    <defs><filter id="board-shadow"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#101933" floodOpacity=".25"/></filter></defs>
    <rect width="600" height="600" rx="22" fill="#f7f9ff"/>
    {[0,1,2,3].map(color => {
      const [x,y] = ([[0,0],[0,9],[9,9],[9,0]] as Point[])[color];
      return <g key={color}><rect x={x*40} y={y*40} width="240" height="240" fill={PALETTE[color]}/><rect x={x*40+26} y={y*40+26} width="188" height="188" rx="32" fill="#fff"/>{YARDS[color].map(([px,py],index)=><g key={index}><circle cx={px*40+20} cy={py*40+20} r="21" fill={PALETTE[color]} opacity=".25"/><circle cx={px*40+20} cy={py*40+20} r="17" fill="#fff" stroke={PALETTE[color]} strokeWidth="3"/></g>)}</g>;
    })}
    {TRACK.map(([x,y],i) => <g key={i}><rect x={x*40+.6} y={y*40+.6} width="38.8" height="38.8" fill={STARTS.includes(i as never)?PALETTE[STARTS.indexOf(i as never)] : SAFE.has(i)?'#deebff':'#fff'} stroke="#d1dbeb" strokeWidth="1.2"/>{SAFE.has(i) && <path d={`M ${x*40+20} ${y*40+10} L ${x*40+23} ${y*40+17} L ${x*40+31} ${y*40+18} L ${x*40+25} ${y*40+23} L ${x*40+27} ${y*40+31} L ${x*40+20} ${y*40+27} L ${x*40+13} ${y*40+31} L ${x*40+15} ${y*40+23} L ${x*40+9} ${y*40+18} L ${x*40+17} ${y*40+17} Z`} fill={STARTS.includes(i as never)?'#fff':'#8fa8da'}/>}</g>)}
    {LANES.map((lane,color)=>lane.map(([x,y],i)=><rect key={`${color}-${i}`} x={x*40+.5} y={y*40+.5} width="39" height="39" fill={PALETTE[color]} opacity=".85" stroke="#fff" strokeWidth="1.3"/>))}
    <g><path d="M240 240 H360 L300 300 Z" fill={PALETTE[3]}/><path d="M240 240 V360 L300 300 Z" fill={PALETTE[0]}/><path d="M240 360 H360 L300 300 Z" fill={PALETTE[1]}/><path d="M360 240 V360 L300 300 Z" fill={PALETTE[2]}/><circle cx="300" cy="300" r="13" fill="#fff" opacity=".9"/></g>
    {state.seats.flatMap(color=>state.pieces[color].map((progress,token)=>{
      if(animated?.color===color && animated.token===token) return null;
      const point=tokenPoint(color,token,progress); const [dx,dy]=offset(color,token,progress);
      return <Piece key={`${color}-${token}`} id={`${color+1}-${token+1}`} color={color} point={[point[0]+dx,point[1]+dy]} active={color===state.current&&options.includes(token)} onClick={color===state.current&&options.includes(token)?()=>onToken(token):undefined}/>;
    }))}
    {animated&&<Piece id="animado" color={animated.color} point={tokenPoint(animated.color,animated.token,animated.progress)} active={false}/>}
    <rect x="1.5" y="1.5" width="597" height="597" rx="20" fill="none" stroke="#101b35" strokeWidth="3"/>
  </svg>;
}
