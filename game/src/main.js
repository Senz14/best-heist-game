// Boot and game loop: title screen, play, pause, end screens, best-score
// persistence, and the ?shot= staging mode used for screenshots.
import { VIEW_H, VIEW_W } from './config.js';
import { createWorld, finalScore, stepWorld } from './world.js';
import { drawEnd, drawPaused, drawTitle, drawWorld } from './render.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { shotNameFromUrl, stageShot } from './shots.js';

const BEST_KEY = 'moonlit-museum-heist-best';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const audio = makeAudio();
const input = makeInput(canvas);
const shot = shotNameFromUrl();

let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { best = 0; }

let world = createWorld(20261122);
let mode = 'title'; // title | playing | paused | over
if (shot) {
  stageShot(world, shot);
  mode = 'shot';
  drawWorld(ctx, world, best);
}

function saveBest() {
  const score = finalScore(world).total;
  if (world.phase === 'escaped' && score > best) {
    best = score;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
  }
}

function drainEvents() {
  for (const name of world.events) {
    if (name === 'pickup') audio.pickup();
    else if (name === 'crown') audio.crown();
    else if (name === 'coin') audio.coin();
    else if (name === 'emp') audio.emp();
    else if (name === 'spotted') audio.spotted();
    else if (name === 'caught') audio.caught();
    else if (name === 'win') audio.win();
  }
  world.events.length = 0;
}

let last = performance.now();
let accumulator = 0;
const STEP = 1 / 120;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  const snap = input.snapshot();

  if (mode === 'shot') return; // static staged frame, drawn once

  if (mode === 'title') {
    drawTitle(ctx, best);
    if (snap.confirm || snap.click) {
      audio.unlock();
      audio.click();
      world = createWorld(20261122);
      mode = 'playing';
    }
    return;
  }
  if (mode === 'over') {
    drawWorld(ctx, world, best);
    drawEnd(ctx, world, best);
    if (snap.confirm) {
      world = createWorld(20261122);
      mode = 'playing';
    }
    return;
  }
  if (snap.pause) {
    mode = mode === 'playing' ? 'paused' : 'playing';
  }
  if (mode === 'paused') {
    drawWorld(ctx, world, best);
    drawPaused(ctx);
    return;
  }

  accumulator += dt;
  while (accumulator >= STEP) {
    stepWorld(world, snap, STEP);
    accumulator -= STEP;
    // One-shot inputs must not repeat across substeps.
    snap.click = null;
    snap.emp = false;
    if (world.phase !== 'playing') break;
  }
  drainEvents();
  drawWorld(ctx, world, best);
  if (world.phase !== 'playing') {
    saveBest();
    mode = 'over';
  }
}
requestAnimationFrame(frame);
