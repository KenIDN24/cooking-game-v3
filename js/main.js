/* Sizzle & Serve v3 — bootstrap: find the canvas, start the game.
   The ?shot=cover|serve|rush|vip|title query stages a frozen scene of
   the game's own render for screenshots; ?selftest=1 runs the
   in-page self test instead of playing. */

import { OrderRushGame } from './game.js';

const canvas = document.getElementById('game');
const fallback = document.getElementById('fallback');

if (!canvas || !canvas.getContext) {
  if (fallback) fallback.hidden = false;
} else {
  const game = new OrderRushGame(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (params.get('selftest') === '1') {
    game.selfTest();
  } else if (shot) {
    game.applyShot(shot);
  } else if (params.get('autostart') === '1') {
    game.startShift();
  }
  requestAnimationFrame((t) => game.frame(t));
}
