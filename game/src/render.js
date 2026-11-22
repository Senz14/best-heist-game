// Canvas rendering: the museum floor, vision cones, characters, loot and
// the HUD. All art is drawn with paths — there are no image assets.
import {
  ALARM_MAX, CAMERA_HALF_ANGLE, CAMERA_SIGHT, EMP_CHARGES,
  GUARD_HALF_ANGLE, GUARD_SIGHT, HUD_H, VIEW_H, VIEW_W,
} from './config.js';
import { LOOT, ROOMS, VAN, WALLS } from './level.js';
import { finalScore } from './world.js';

function conePath(ctx, x, y, facing, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - half, facing + half);
  ctx.closePath();
}

function drawLootShape(ctx, item) {
  const { x, y, kind } = item;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'crown') {
    ctx.fillStyle = '#ffd94d';
    ctx.strokeStyle = '#a87e12';
    ctx.beginPath();
    ctx.moveTo(-13, 8); ctx.lineTo(-13, -6); ctx.lineTo(-6, 2);
    ctx.lineTo(0, -10); ctx.lineTo(6, 2); ctx.lineTo(13, -6); ctx.lineTo(13, 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'painting') {
    ctx.fillStyle = '#7a4b21';
    ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = '#9fc7e8';
    ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath(); ctx.arc(3, -2, 3.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'gem') {
    ctx.fillStyle = '#63e6c4';
    ctx.strokeStyle = '#1f7a63';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'mask') {
    ctx.fillStyle = '#3fa66a';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c221a';
    ctx.beginPath(); ctx.arc(-3.4, -2, 1.8, 0, Math.PI * 2); ctx.arc(3.4, -2, 1.8, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'vase') {
    ctx.fillStyle = '#c9a0dc';
    ctx.beginPath();
    ctx.moveTo(-4, -10); ctx.lineTo(4, -10); ctx.lineTo(8, 2); ctx.lineTo(5, 10);
    ctx.lineTo(-5, 10); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill();
  } else if (kind === 'statue') {
    ctx.fillStyle = '#d8d8e0';
    ctx.beginPath(); ctx.arc(0, -6, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-3, -2, 6, 12);
    ctx.fillRect(-7, 10, 14, 3);
  } else if (kind === 'coins') {
    ctx.fillStyle = '#ffd94d';
    for (const [cx, cy] of [[-6, 4], [0, 7], [6, 4], [-3, -1], [3, -1], [0, -6]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, Math.PI * 2); ctx.fill();
    }
  } else { // scroll
    ctx.fillStyle = '#efe3c0';
    ctx.fillRect(-10, -6, 20, 12);
    ctx.strokeStyle = '#8a6d3b';
    ctx.strokeRect(-10, -6, 20, 12);
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Body: dark blue uniform with a cap, rotated to facing.
  ctx.rotate(guard.facing);
  ctx.fillStyle = guard.state === 'chase' ? '#b33951' : guard.state === 'investigate' ? '#c9862b' : '#33506e';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(3, 0, 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d2f45';
  ctx.fillRect(4, -6.4, 6, 12.8);
  ctx.restore();
  if (guard.state !== 'patrol') {
    ctx.fillStyle = guard.state === 'chase' ? '#ff5d5d' : '#ffb84d';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 20 - Math.sin(time * 5) * 1.5);
  }
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  ctx.fillStyle = player.sneak ? '#20242e' : '#11141c';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#11141c';
  ctx.fillRect(-2, -6, 7, 12); // hood / mask band
  ctx.restore();
  if (player.moving) {
    ctx.strokeStyle = 'rgba(255,217,77,0.35)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 16 + Math.sin(time * 10) * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawWorld(ctx, world, best) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#14151f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Room floors and names.
  for (const room of ROOMS) {
    ctx.fillStyle = room.tint;
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let gx = room.x + 32; gx < room.x + room.w; gx += 32) {
      ctx.beginPath(); ctx.moveTo(gx, room.y); ctx.lineTo(gx, room.y + room.h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(room.name.toUpperCase(), room.x + 10, room.y + 18);
  }

  // Getaway van, parked at the bay doors.
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(VAN.x, VAN.y, VAN.w, VAN.h);
  ctx.fillStyle = '#a3c585';
  ctx.fillRect(VAN.x + 8, VAN.y + 8, 34, VAN.h - 16);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(VAN.x + VAN.w - 26, VAN.y + 6, 18, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', VAN.x + VAN.w / 2 + 12, VAN.y + VAN.h / 2 + 4);
  if (!world.hasCrown) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('needs the Crown', VAN.x + VAN.w / 2 + 12, VAN.y + VAN.h / 2 + 18);
  }

  // Vision cones under the characters.
  for (const guard of world.guards) {
    ctx.fillStyle = guard.state === 'chase'
      ? 'rgba(255,70,70,0.20)'
      : guard.state === 'investigate' ? 'rgba(255,170,60,0.16)' : 'rgba(255,230,130,0.13)';
    conePath(ctx, guard.x, guard.y, guard.facing, GUARD_HALF_ANGLE, GUARD_SIGHT);
    ctx.fill();
  }
  const camerasDark = world.empTimer > 0;
  for (const cam of world.cameras) {
    ctx.fillStyle = camerasDark ? 'rgba(90,90,110,0.06)' : 'rgba(120,200,255,0.12)';
    conePath(ctx, cam.x, cam.y, cam.facing, CAMERA_HALF_ANGLE, CAMERA_SIGHT);
    ctx.fill();
  }

  // Display cases and the loot still on them.
  for (const item of LOOT) {
    ctx.fillStyle = 'rgba(10,10,16,0.55)';
    ctx.fillRect(item.x - 17, item.y - 17, 34, 34);
    ctx.strokeStyle = item.taken ? 'rgba(255,255,255,0.10)' : 'rgba(160,220,255,0.5)';
    ctx.strokeRect(item.x - 17, item.y - 17, 34, 34);
    if (!item.taken) {
      const live = world.loot.find((l) => l.id === item.id);
      if (live && !live.taken) drawLootShape(ctx, item);
    }
  }

  // Walls on top of the cones so sight blockers read clearly.
  ctx.fillStyle = '#08090f';
  for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.strokeStyle = 'rgba(200,210,255,0.20)';
  for (const w of WALLS) ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);

  // Camera bodies.
  for (const cam of world.cameras) {
    ctx.fillStyle = camerasDark ? '#3a3f4a' : '#dfe8ff';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = camerasDark ? '#222' : '#e5484d';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  // Decoy coin.
  if (world.coin) {
    const pulse = 10 + Math.sin(world.time * 9) * 4;
    ctx.strokeStyle = 'rgba(255,217,77,0.7)';
    ctx.beginPath(); ctx.arc(world.coin.x, world.coin.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(world.coin.x, world.coin.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  for (const guard of world.guards) drawGuard(ctx, guard, world.time);
  drawPlayer(ctx, world.player, world.time);

  drawHud(ctx, world, best);
}

function drawHud(ctx, world, best) {
  ctx.fillStyle = '#0b0c13';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.moveTo(0, HUD_H - 0.5); ctx.lineTo(VIEW_W, HUD_H - 0.5); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('MOONLIT MUSEUM HEIST', 14, 30);

  // Alarm meter.
  const ax = 330;
  const aw = 300;
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(ax, 14, aw, 18);
  const frac = world.alarm / ALARM_MAX;
  ctx.fillStyle = frac > 0.7 ? '#ff4747' : frac > 0.4 ? '#ff9f43' : '#f6c453';
  ctx.fillRect(ax, 14, aw * frac, 18);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(ax + 0.5, 14.5, aw - 1, 17);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`ALARM ${Math.floor(world.alarm)}%`, ax + aw + 10, 28);
  if (world.exposure > 0.05) {
    ctx.fillStyle = '#ff5d5d';
    ctx.fillText('SPOTTED!', ax + aw + 96, 28);
  }

  // Take, EMP, crown state, clock, best.
  ctx.fillStyle = '#9be15d';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`Take $${world.take}`, 800, 30);
  ctx.fillStyle = world.hasCrown ? '#ffd94d' : 'rgba(255,255,255,0.4)';
  ctx.fillText(world.hasCrown ? 'CROWN ✓' : 'CROWN —', 930, 30);
  ctx.fillStyle = '#8ecae6';
  ctx.fillText(`EMP ${'●'.repeat(world.empCharges)}${'○'.repeat(Math.max(0, EMP_CHARGES - world.empCharges))}`, 1052, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillText(`${mins}:${secs}   Best ${best || 0}`, VIEW_W - 12, 30);
  ctx.textAlign = 'left';

  if (world.empTimer > 0) {
    ctx.fillStyle = '#8ecae6';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`CAMERAS DARK ${world.empTimer.toFixed(0)}s`, 800, 12 + 32);
  }
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(5,6,10,0.78)';
    const wpx = Math.min(760, 26 + world.message.length * 7.4);
    ctx.fillRect((VIEW_W - wpx) / 2, VIEW_H - 46, wpx, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, VIEW_W / 2, VIEW_H - 26);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4,5,9,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffd94d';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 352 + i * 27));
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, best) {
  ctx.fillStyle = '#14151f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  overlay(ctx, 'MOONLIT MUSEUM HEIST', [
    'Slip through the galleries, lift the Crown of the Tide King, and vanish.',
    '',
    'WASD / arrows — move        Shift — sneak (slower, harder to see)',
    'Click — throw a decoy coin (costs $150 of the take, lures guards)',
    'E / Space — EMP: black out every camera for 6 seconds (2 charges)',
    'P — pause.  Touch a case to lift its treasure.  Do not let the alarm fill.',
    '',
    best ? `Best score so far: ${best}` : 'No score yet — be the first ghost.',
    'Press Enter or click to begin the heist',
  ]);
  ctx.fillStyle = 'rgba(4,5,9,0)';
  ctx.fillRect(0, 0, 1, 1);
}

export function drawEnd(ctx, world, best) {
  const score = finalScore(world);
  if (world.phase === 'escaped') {
    overlay(ctx, 'CLEAN GETAWAY', [
      `Loot taken: $${score.take}`,
      `Time bonus: $${score.timeBonus}`,
      score.ghost ? `Ghost bonus (never seen): $${score.ghost}` : 'You were seen — no ghost bonus.',
      `FINAL SCORE: ${score.total}`,
      best && best >= score.total ? `Best: ${best}` : 'A new best score!',
      '',
      'Press Enter to run it again',
    ], '#9be15d');
  } else {
    overlay(ctx, world.phase === 'lockdown' ? 'LOCKDOWN' : 'CAUGHT', [
      world.loseReason,
      `You had lifted $${world.take} before it went wrong.`,
      '',
      'Press Enter to try again',
    ], '#ff5d5d');
  }
}

export function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['Press P or Esc to slip back into the dark.'], '#8ecae6');
}
