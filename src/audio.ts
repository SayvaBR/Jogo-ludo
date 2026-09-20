/* Short, synthesized game sounds: no network requests or per-frame AudioContext allocations. */
type Effect = 'tap' | 'roll' | 'land' | 'step' | 'capture' | 'finish' | 'win';
let audio: AudioContext | null = null;
function context(): AudioContext | null {
  try {
    if (!audio) audio = new window.AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    return audio;
  } catch { return null; }
}
/** Call from an actual click/touch to unlock sound on Android and iOS. */
export function unlockAudio(enabled = true): void { if (enabled) void context(); }
function tone(ctx: AudioContext, start: number, frequency: number, duration: number, level: number, kind: OscillatorType = 'sine', endFrequency = frequency): void {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(Math.max(1, frequency), start);
  if (frequency !== endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + Math.min(.012, duration*.2));
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(start); osc.stop(start + duration + .008);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
export function playSound(effect: Effect, enabled: boolean): void {
  if (!enabled) return;
  const ctx = context(); if (!ctx) return;
  const t = ctx.currentTime + .008;
  switch(effect) {
    case 'tap': tone(ctx,t,520,.06,.024,'sine',460); break;
    case 'roll':
      // A sequence of wooden clacks accelerates, then slows while the cube settles.
      [0,.065,.125,.20,.295,.41,.54].forEach((delay,i)=>{
        tone(ctx,t+delay,235+(i%3)*47,.045+(i%2)*.015,.033-i*.002,'triangle',105+(i%2)*35);
        tone(ctx,t+delay,970-i*55,.018,.010,'square',620);
      });
      break;
    case 'land':
      tone(ctx,t,250,.11,.06,'triangle',105);
      tone(ctx,t+.026,670,.095,.023,'sine',410);
      break;
    case 'step':
      tone(ctx,t,380,.047,.014,'sine',210);
      break;
    case 'capture':
      tone(ctx,t,260,.16,.057,'triangle',120);
      [510,680,870].forEach((freq,i)=>tone(ctx,t+.055+i*.08,freq,.18,.038,'sine',freq*1.12));
      break;
    case 'finish':
      [440,554,660,880].forEach((freq,i)=>tone(ctx,t+i*.09,freq,.2,.039,'sine'));
      break;
    case 'win':
      [392,494,588,784,988].forEach((freq,i)=>{
        tone(ctx,t+i*.12,freq,.32,.048,'triangle');
        tone(ctx,t+i*.12,freq*2,.19,.012,'sine');
      });
  }
}
