import test from 'node:test';
import assert from 'node:assert/strict';
import { fairDie } from './fair-die.ts';

test('each face has exactly the same share of a uniformly sampled range', () => {
  const counts = [0,0,0,0,0,0];
  for(let i=0;i<60_000;i++) counts[fairDie(()=>i)-1]++;
  assert.deepEqual(counts,[10_000,10_000,10_000,10_000,10_000,10_000]);
});

test('rejection samples away the four integers that would bias modulo six', () => {
  const values=[0xffff_fffc,0xffff_fffd,0xffff_fffe,0xffff_ffff,5];
  let draws=0;
  assert.equal(fairDie(()=>{draws++;return values.shift()!;}),6);
  assert.equal(draws,5);
  assert.throws(()=>fairDie(()=>-1),RangeError);
});

test('real Web Crypto returns every valid face without a forced anti-streak', () => {
  const counts = [0,0,0,0,0,0];
  for(let i=0;i<60_000;i++) counts[fairDie()-1]++;
  for(const count of counts) assert.ok(count>=9_200&&count<=10_800, `Suspicious distribution: ${counts}`);
  assert.equal(fairDie(()=>0),1);
  assert.equal(fairDie(()=>0),1); // genuine repeated numbers must remain possible
});
