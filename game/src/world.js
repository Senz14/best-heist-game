// The simulation: player, guards (patrol / investigate / chase), cameras,
// loot, the alarm meter, decoy coins and the EMP. Pure logic — no DOM — so
// it can be stepped headlessly with a fixed timestep.
import {
  ALARM_CAMERA_RATE, ALARM_DECAY, ALARM_GUARD_RATE, ALARM_MAX,
  CAMERA_HALF_ANGLE, CAMERA_SIGHT, CAMERA_SWEEP, CATCH_DISTANCE,
  COIN_COST, COIN_HEAR, COIN_RANGE, CROWN_ALARM_SPIKE, EMP_BLACKOUT,
  EMP_CHARGES, GHOST_BONUS, GUARD_CHASE, GUARD_HALF_ANGLE,
  GUARD_INVESTIGATE, GUARD_PATROL, GUARD_RADIUS, GUARD_SIGHT,
  PICKUP_RADIUS, PLAYER_RADIUS, PLAYER_SNEAK, PLAYER_WALK,
  TIME_BONUS_BUDGET, TIME_BONUS_PER_SECOND,
} from './config.js';
import { CAMERAS, LOOT, PATROLS, PLAYER_START, VAN, WALLS } from './level.js';
import { angleDelta, angleTo, clamp, coneExposure, dist, moveCircle } from './geometry.js';
import { makeRng } from './rng.js';

export function createWorld(seed) {
  const rng = makeRng(seed || 20261122);
  const guards = PATROLS.map((patrol, i) => ({
    x: patrol[0].x, y: patrol[0].y,
    facing: angleTo(patrol[0].x, patrol[0].y, patrol[1].x, patrol[1].y),
    patrol, wp: 1, state: 'patrol',
    target: null, lookTimer: 0, loseTimer: 0, waitTimer: 0,
    speedBoost: 1, id: i,
  }));
  const cameras = CAMERAS.map((c, i) => ({
    x: c.x, y: c.y, centre: c.centre, sweep: c.sweep,
    phase: rng.range(0, Math.PI * 2), facing: c.centre, id: i,
  }));
  return {
    rng,
    time: 0,
    phase: 'playing', // playing | caught | escaped | lockdown
    loseReason: '',
    player: { x: PLAYER_START.x, y: PLAYER_START.y, facing: -Math.PI / 2, sneak: false, moving: false },
    guards,
    cameras,
    loot: LOOT.map((item) => ({ ...item, taken: false })),
    alarm: 0,
    exposure: 0, // strongest current sight exposure, for rendering
    seenEver: false,
    spottedLatch: false,
    take: 0, // value of loot in the bag
    lootCount: 0,
    hasCrown: false,
    empCharges: EMP_CHARGES,
    empTimer: 0,
    coin: null, // { x, y, ttl } while a decoy coin is ringing
    events: [], // sound/UI events the shell drains each frame
    message: '',
    messageTimer: 0,
    crownAlertDone: false,
  };
}

function emit(world, name) {
  world.events.push(name);
}

// Steer a guard toward a point at a speed; returns distance remaining.
function steer(world, guard, tx, ty, speed, dt) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d < 2) return 0;
  const want = angleTo(guard.x, guard.y, tx, ty);
  guard.facing += clamp(angleDelta(guard.facing, want), -6.5 * dt, 6.5 * dt);
  const step = Math.min(d, speed * dt);
  const pos = { x: guard.x, y: guard.y };
  moveCircle(pos, GUARD_RADIUS, Math.cos(guard.facing) * step, Math.sin(guard.facing) * step, WALLS);
  // If the wall slid us sideways, still make progress along the free axis.
  guard.x = pos.x;
  guard.y = pos.y;
  return dist(guard.x, guard.y, tx, ty);
}

function updateGuard(world, guard, dt) {
  const p = world.player;
  const sight = coneExposure(
    guard.x, guard.y, guard.facing, GUARD_HALF_ANGLE, GUARD_SIGHT, p.x, p.y, WALLS,
  );
  const sneakFactor = p.sneak && p.moving === false ? 0.45 : p.sneak ? 0.65 : 1;
  const seen = sight * sneakFactor > 0.12;

  if (seen) {
    guard.state = 'chase';
    guard.target = { x: p.x, y: p.y };
    guard.loseTimer = 1.6;
  } else if (guard.state === 'chase') {
    guard.loseTimer -= dt;
    if (guard.loseTimer <= 0) {
      guard.state = 'investigate';
      guard.lookTimer = 2.4;
    }
  }

  const crownBoost = world.hasCrown ? 1.25 : 1;
  if (guard.state === 'patrol') {
    const wp = guard.patrol[guard.wp];
    if (steer(world, guard, wp.x, wp.y, GUARD_PATROL * crownBoost, dt) < 8) {
      guard.wp = (guard.wp + 1) % guard.patrol.length;
      guard.waitTimer = 0.5;
    }
    if (guard.waitTimer > 0) guard.waitTimer -= dt;
  } else if (guard.state === 'investigate') {
    if (guard.target && steer(world, guard, guard.target.x, guard.target.y, GUARD_INVESTIGATE * crownBoost, dt) > 10) {
      // still walking to the point of interest
    } else {
      guard.lookTimer -= dt;
      guard.facing += Math.sin(world.time * 1.7 + guard.id * 2.1) * 1.4 * dt;
      if (guard.lookTimer <= 0) {
        guard.state = 'patrol';
        guard.target = null;
        // resume at the nearest waypoint
        let best = 0;
        let bestD = Infinity;
        guard.patrol.forEach((wp, i) => {
          const d = dist(guard.x, guard.y, wp.x, wp.y);
          if (d < bestD) { bestD = d; best = i; }
        });
        guard.wp = best;
      }
    }
  } else if (guard.state === 'chase') {
    if (guard.target) steer(world, guard, guard.target.x, guard.target.y, GUARD_CHASE * crownBoost, dt);
    if (dist(guard.x, guard.y, p.x, p.y) < CATCH_DISTANCE) {
      world.phase = 'caught';
      world.loseReason = 'A guard caught you red-handed.';
      emit(world, 'caught');
    }
  }
  return seen ? sight * sneakFactor : 0;
}

function updateCameras(world, dt) {
  let exposure = 0;
  const dark = world.empTimer > 0;
  for (const cam of world.cameras) {
    cam.facing = cam.centre + Math.sin(world.time * CAMERA_SWEEP + cam.phase) * cam.sweep;
    if (dark) continue;
    const p = world.player;
    const sneakFactor = p.sneak ? 0.6 : 1;
    const seen = coneExposure(
      cam.x, cam.y, cam.facing, CAMERA_HALF_ANGLE, CAMERA_SIGHT, p.x, p.y, WALLS,
    ) * sneakFactor;
    if (seen > exposure) exposure = seen;
  }
  return exposure;
}

// Throw a decoy coin toward a clicked point. Costs part of the take.
export function throwCoin(world, tx, ty) {
  const p = world.player;
  const d = dist(p.x, p.y, tx, ty);
  if (d > COIN_RANGE) {
    const a = angleTo(p.x, p.y, tx, ty);
    tx = p.x + Math.cos(a) * COIN_RANGE;
    ty = p.y + Math.sin(a) * COIN_RANGE;
  }
  if (world.take < COIN_COST) {
    world.message = 'Not enough loot to spare a decoy coin.';
    world.messageTimer = 2;
    return false;
  }
  world.take -= COIN_COST;
  world.coin = { x: tx, y: ty, ttl: 3.2 };
  for (const guard of world.guards) {
    if (dist(guard.x, guard.y, tx, ty) < COIN_HEAR && guard.state !== 'chase') {
      guard.state = 'investigate';
      guard.target = { x: tx, y: ty };
      guard.lookTimer = 2.2;
    }
  }
  emit(world, 'coin');
  return true;
}

export function fireEmp(world) {
  if (world.empCharges <= 0) {
    world.message = 'EMP is spent.';
    world.messageTimer = 1.6;
    return false;
  }
  if (world.empTimer > 0) return false;
  world.empCharges -= 1;
  world.empTimer = EMP_BLACKOUT;
  emit(world, 'emp');
  return true;
}

export function stepWorld(world, input, dt) {
  if (world.phase !== 'playing') return world;
  world.time += dt;
  world.events.length = 0;
  const p = world.player;

  // Player movement.
  const speed = input.sneak ? PLAYER_SNEAK : PLAYER_WALK;
  p.sneak = input.sneak;
  p.moving = input.mx !== 0 || input.my !== 0;
  if (p.moving) {
    const len = Math.hypot(input.mx, input.my);
    const pos = { x: p.x, y: p.y };
    moveCircle(pos, PLAYER_RADIUS, (input.mx / len) * speed * dt, (input.my / len) * speed * dt, WALLS);
    p.x = pos.x;
    p.y = pos.y;
    p.facing = angleTo(0, 0, input.mx, input.my);
  }

  // Actions.
  if (input.click) throwCoin(world, input.click.x, input.click.y);
  if (input.emp) fireEmp(world);
  if (world.empTimer > 0) world.empTimer -= dt;
  if (world.coin) {
    world.coin.ttl -= dt;
    if (world.coin.ttl <= 0) world.coin = null;
  }

  // Loot pickup by proximity.
  for (const item of world.loot) {
    if (item.taken) continue;
    if (dist(p.x, p.y, item.x, item.y) < PICKUP_RADIUS) {
      item.taken = true;
      world.take += item.value;
      world.lootCount += 1;
      if (item.kind === 'crown') {
        world.hasCrown = true;
        world.alarm = clamp(world.alarm + CROWN_ALARM_SPIKE, 0, ALARM_MAX);
        emit(world, 'crown');
        world.message = 'The Crown is yours — the museum wakes up! Get to the van!';
        world.messageTimer = 4;
        for (const guard of world.guards) {
          if (guard.state === 'patrol') {
            guard.state = 'investigate';
            guard.target = { x: item.x, y: item.y + 60 };
            guard.lookTimer = 2.5;
          }
        }
      } else {
        emit(world, 'pickup');
        world.message = `${item.name} — $${item.value}`;
        world.messageTimer = 2;
      }
    }
  }
  if (world.messageTimer > 0) world.messageTimer -= dt;

  // Senses: guards and cameras feed the alarm.
  let exposure = 0;
  for (const guard of world.guards) {
    const seen = updateGuard(world, guard, dt);
    if (seen > exposure) exposure = seen;
    if (world.phase !== 'playing') return world;
  }
  const camExposure = updateCameras(world, dt);
  if (camExposure > exposure) exposure = camExposure;
  world.exposure = exposure;

  if (exposure > 0.05) {
    world.seenEver = true;
    const rate = Math.max(exposure * ALARM_GUARD_RATE, camExposure * ALARM_CAMERA_RATE);
    world.alarm = clamp(world.alarm + rate * dt, 0, ALARM_MAX);
    if (!world.spottedLatch && world.alarm > 12) {
      world.spottedLatch = true;
      emit(world, 'spotted');
    }
    if (world.alarm >= ALARM_MAX) {
      world.phase = 'lockdown';
      world.loseReason = 'The alarm hit full and the museum locked down.';
      emit(world, 'caught');
      return world;
    }
  } else {
    world.alarm = clamp(world.alarm - ALARM_DECAY * dt, 0, ALARM_MAX);
    if (world.alarm < 6) world.spottedLatch = false;
  }

  // Escape: reach the van with the Crown.
  const inVan = p.x > VAN.x && p.x < VAN.x + VAN.w && p.y > VAN.y - 6 && p.y < VAN.y + VAN.h;
  if (inVan) {
    if (world.hasCrown) {
      world.phase = 'escaped';
      emit(world, 'win');
    } else if (world.messageTimer <= 0) {
      world.message = 'The van is ready — but the Crown is still inside.';
      world.messageTimer = 1.2;
    }
  }
  return world;
}

export function finalScore(world) {
  const timeLeft = Math.max(0, TIME_BONUS_BUDGET - world.time);
  const timeBonus = Math.floor(timeLeft * TIME_BONUS_PER_SECOND);
  const ghost = world.seenEver ? 0 : GHOST_BONUS;
  return { take: world.take, timeBonus, ghost, total: world.take + timeBonus + ghost };
}
