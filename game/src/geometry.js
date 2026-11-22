// Plain 2D geometry helpers: distances, angles, segment intersection and
// line-of-sight against the wall rectangles. No DOM, no globals.

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Do segments p1-p2 and p3-p4 cross? Touching at an endpoint counts.
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Is the straight line between two points blocked by any wall rectangle?
// A point inside a wall blocks too, which keeps cones honest at corners.
export function lineBlocked(ax, ay, bx, by, walls) {
  for (const w of walls) {
    if (bx > w.x && bx < w.x + w.w && by > w.y && by < w.y + w.h) return true;
    const x2 = w.x + w.w;
    const y2 = w.y + w.h;
    if (segmentsCross(ax, ay, bx, by, w.x, w.y, x2, w.y)) return true;
    if (segmentsCross(ax, ay, bx, by, x2, w.y, x2, y2)) return true;
    if (segmentsCross(ax, ay, bx, by, x2, y2, w.x, y2)) return true;
    if (segmentsCross(ax, ay, bx, by, w.x, y2, w.x, w.y)) return true;
  }
  return false;
}

// Is a point inside a vision cone (origin, facing, half-angle, range) with a
// clear line of sight? Returns 0 when unseen, else a 0..1 exposure strength
// that grows as the target gets closer to the watcher.
export function coneExposure(ox, oy, facing, halfAngle, range, tx, ty, walls) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return 0;
  const ang = angleTo(ox, oy, tx, ty);
  if (Math.abs(angleDelta(facing, ang)) > halfAngle) return 0;
  if (d > 26 && lineBlocked(ox, oy, tx, ty, walls)) return 0;
  return 1 - d / (range + 40);
}

// Move a circle against wall rectangles: try the full move, then each axis,
// then push out of any rectangle the circle ended up inside.
export function moveCircle(pos, radius, dx, dy, walls) {
  const tryMove = (mx, my) => {
    const nx = pos.x + mx;
    const ny = pos.y + my;
    for (const w of walls) {
      const cx = clamp(nx, w.x, w.x + w.w);
      const cy = clamp(ny, w.y, w.y + w.h);
      if (dist(nx, ny, cx, cy) < radius) return null;
    }
    return { x: nx, y: ny };
  };
  let next = tryMove(dx, dy);
  if (!next) next = tryMove(dx, 0);
  if (!next) next = tryMove(0, dy);
  if (next) {
    pos.x = next.x;
    pos.y = next.y;
  }
  return pos;
}
