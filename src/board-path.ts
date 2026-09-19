import { FINISH, OUT, square } from './engine.ts';

export type Point = readonly [number, number];
export const TRACK: Point[] = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
// The lane immediately after progress 51 must connect to its matching base's approach.
export const LANES: Point[][] = [[[1,7],[2,7],[3,7],[4,7],[5,7]],[[7,13],[7,12],[7,11],[7,10],[7,9]],[[13,7],[12,7],[11,7],[10,7],[9,7]],[[7,1],[7,2],[7,3],[7,4],[7,5]]];
export const YARDS: Point[][] = [[[2,2],[4,2],[2,4],[4,4]],[[2,10],[4,10],[2,12],[4,12]],[[10,10],[12,10],[10,12],[12,12]],[[10,2],[12,2],[10,4],[12,4]]];
const FINISH_OFFSETS: Point[] = [[-10,-10],[-10,10],[10,10],[10,-10]];
const xy = ([x,y]: Point): Point => [x*40+20,y*40+20];
export function tokenPoint(color: number, token: number, progress: number): Point {
  if (progress === OUT) return xy(YARDS[color][token]);
  if (progress === FINISH) return [300+FINISH_OFFSETS[color][0],300+FINISH_OFFSETS[color][1]];
  if (progress < 52) return xy(TRACK[square(color,progress)]);
  return xy(LANES[color][progress-52]);
}
