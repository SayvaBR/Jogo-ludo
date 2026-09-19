/** Pure, immutable Ludo rules. Every change creates a fresh state; no UI dependencies. */
export const COLORS = ['Vermelho', 'Azul', 'Amarelo', 'Verde'] as const;
export const STARTS = [0, 13, 26, 39] as const;
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const OUT = -1;
export const FINISH = 57;
export type Phase = 'roll' | 'choose' | 'finished';
export type Pieces = [number[], number[], number[], number[]];
export interface Game {
  version: 2;
  seats: number[];
  cpu: number[];
  pieces: Pieces;
  current: number;
  turn: number;
  phase: Phase;
  die: number;
  sixStreak: number;
  bank: number[];
  bankSixes: boolean;
  winner: number;
  moves: number;
  message: string;
}
export interface MoveResult { state: Game; from: number; to: number; captured: number[][]; event: 'move' | 'capture' | 'finish' | 'win'; }
const copy = (s: Game): Game => ({ ...s, seats: [...s.seats], cpu: [...s.cpu], pieces: s.pieces.map(p => [...p]) as Pieces, bank: [...s.bank] });
export function newGame(players = 4, versusCpu = false, bankSixes = false): Game {
  const count = Math.max(2, Math.min(4, Math.floor(players)));
  const seats = count === 2 ? [0, 2] : count === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return { version: 2, seats, cpu: versusCpu ? seats.slice(1) : [], pieces: [[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1]], current: seats[0], turn: 0, phase: 'roll', die: 0, sixStreak: 0, bank: [], bankSixes, winner: -1, moves: 0, message: 'Toque no dado para começar.' };
}
export function square(color: number, progress: number): number {
  return progress >= 0 && progress < 52 ? (STARTS[color] + progress) % 52 : -1;
}
export function isSafe(color: number, progress: number): boolean { return SAFE.has(square(color, progress)); }
export function legalMoves(s: Game, die = s.die): number[] {
  if (s.winner !== -1 || die < 1 || die > 6) return [];
  return s.pieces[s.current].flatMap((position, index) => position === OUT && die === 6 || position >= 0 && position < FINISH && position + die <= FINISH ? [index] : []);
}
/** Automatically pick a pawn only if exactly one move is legal. */
export function onlyLegalMove(s: Game): number | null {
  if (s.phase !== 'choose') return null;
  const options = legalMoves(s);
  return options.length === 1 ? options[0] : null;
}
function nextTurn(s: Game): Game {
  const turn = (s.turn + 1) % s.seats.length;
  return { ...s, turn, current: s.seats[turn], phase: 'roll', die: 0, sixStreak: 0, bank: [], message: `Vez de ${COLORS[s.seats[turn]]}.` };
}
function consumeBank(s: Game): Game {
  while (s.bank.length) {
    s.die = s.bank[0];
    if (legalMoves(s).length) return { ...s, phase: 'choose', message: `Dado ${s.die}: escolha um peão.` };
    s.bank.shift();
  }
  return nextTurn(s);
}
export function roll(game: Game, die: number): Game {
  if (game.phase !== 'roll' || game.winner !== -1 || !Number.isInteger(die) || die < 1 || die > 6) return game;
  const s = copy(game);
  s.die = die;
  s.sixStreak = die === 6 ? s.sixStreak + 1 : 0;
  if (s.sixStreak === 3) return { ...nextTurn(s), message: 'Três 6 seguidos: vez encerrada!' };
  if (s.bankSixes) {
    s.bank.push(die);
    if (die === 6) return { ...s, message: '6! Lance novamente antes de mover.' };
    return consumeBank(s);
  }
  if (legalMoves(s).length) return { ...s, phase: 'choose', message: 'Escolha um peão iluminado.' };
  if (die === 6) return { ...s, phase: 'roll', message: 'Nenhum movimento. Lance novamente pelo 6.' };
  return { ...nextTurn(s), message: 'Sem jogadas possíveis. Próxima vez.' };
}
export function move(game: Game, token: number): MoveResult | null {
  if (game.phase !== 'choose' || !legalMoves(game).includes(token)) return null;
  const s = copy(game);
  const color = s.current;
  const from = s.pieces[color][token];
  const to = from === OUT ? 0 : from + s.die;
  s.pieces[color][token] = to;
  s.moves++;
  const captured: number[][] = [];
  if (to < 52 && !isSafe(color, to)) {
    const landing = square(color, to);
    for (const opponent of s.seats) {
      if (opponent === color) continue;
      s.pieces[opponent].forEach((position, index) => {
        if (position >= 0 && position < 52 && square(opponent, position) === landing) {
          s.pieces[opponent][index] = OUT;
          captured.push([opponent, index]);
        }
      });
    }
  }
  const finished = to === FINISH;
  const won = finished && s.pieces[color].every(p => p === FINISH);
  let result: Game;
  if (won) result = { ...s, winner: color, phase: 'finished', bank: [], message: `${COLORS[color]} venceu!` };
  else {
    // A move earns at most one additional throw, even if a six also captures.
    // Banked dice remain available when a capture/finish interrupts their consumption.
    const bonus = captured.length > 0 || finished || s.die === 6;
    const bonusMessage = captured.length ? 'Captura! Você ganhou outra jogada.' : finished ? 'Peão chegou! Lance novamente.' : '6! Lance o dado novamente.';
    if (s.bankSixes) {
      s.bank.shift();
      // In this variant, a six has already awarded its additional throw before moving.
      result = captured.length || finished ? { ...s, phase: 'roll', die: 0, message: bonusMessage } : consumeBank(s);
    } else if (bonus) result = { ...s, phase: 'roll', die: 0, message: bonusMessage };
    else result = nextTurn(s);
  }
  return { state: result, from, to, captured, event: won ? 'win' : captured.length ? 'capture' : finished ? 'finish' : 'move' };
}
export function bestCpuMove(s: Game): number {
  const options = legalMoves(s);
  const color = s.current;
  let selected = -1;
  let best = -Infinity;
  for (const token of options) {
    const from = s.pieces[color][token];
    const to = from === OUT ? 0 : from + s.die;
    let score = to * .12 + (from === OUT ? 9 : 0) + (to === FINISH ? 35 : 0) + (isSafe(color, to) ? 5 : 0);
    if (to < 52 && !isSafe(color, to)) for (const opponent of s.seats) {
      if (opponent !== color) score += s.pieces[opponent].filter(p => p >= 0 && p < 52 && square(opponent, p) === square(color, to)).length * 28;
    }
    score -= token * .001;
    if (score > best) { best = score; selected = token; }
  }
  return selected;
}
export function loadGame(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const s: Game = JSON.parse(raw);
    const valid = s.version === 2 && Array.isArray(s.seats) && s.seats.length >= 2 && s.seats.length <= 4 && new Set(s.seats).size === s.seats.length && s.seats.every(c => Number.isInteger(c) && c >= 0 && c <= 3) && Array.isArray(s.cpu) && s.cpu.every(c => s.seats.includes(c) && c !== s.seats[0]) && Array.isArray(s.pieces) && s.pieces.length === 4 && s.pieces.every(p => Array.isArray(p) && p.length === 4 && p.every(n => Number.isInteger(n) && n >= -1 && n <= 57)) && Number.isInteger(s.turn) && s.turn >= 0 && s.turn < s.seats.length && s.current === s.seats[s.turn] && ['roll','choose','finished'].includes(s.phase) && Number.isInteger(s.die) && s.die >= 0 && s.die <= 6 && Number.isInteger(s.sixStreak) && s.sixStreak >= 0 && s.sixStreak < 3 && Array.isArray(s.bank) && s.bank.every(n => Number.isInteger(n) && n >= 1 && n <= 6) && typeof s.bankSixes === 'boolean' && Number.isInteger(s.winner) && (s.winner === -1 || s.seats.includes(s.winner)) && (s.phase === 'finished' ? s.winner !== -1 && s.pieces[s.winner].every(n => n === FINISH) : s.winner === -1) && (s.phase !== 'choose' || legalMoves(s).length > 0) && Number.isInteger(s.moves) && s.moves >= 0 && typeof s.message === 'string';
    return valid ? s : null;
  } catch { return null; }
}
