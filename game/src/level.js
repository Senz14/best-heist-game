// The museum floor plan: rooms, walls with door gaps, display cases, loot,
// guard patrols, cameras, the player's start and the getaway van.
// Coordinates are canvas pixels; the HUD occupies the top 48 rows.
import { HUD_H } from './config.js';

const T = 12; // wall thickness

// Rooms are floor rectangles with a name and a tint. Walls sit on their
// borders; the room list is for rendering and labels only.
export const ROOMS = [
  { name: 'Gallery of Dawn', x: 28, y: 76, w: 456, h: 204, tint: '#2b3049' },
  { name: 'The Vault', x: 496, y: 76, w: 288, h: 204, tint: '#3a3145' },
  { name: 'Security Office', x: 796, y: 76, w: 456, h: 204, tint: '#26333a' },
  { name: 'Grand Corridor', x: 28, y: 292, w: 1224, h: 108, tint: '#23263a' },
  { name: 'Gallery of Tides', x: 28, y: 412, w: 372, h: 188, tint: '#2b3049' },
  { name: 'Lobby', x: 412, y: 412, w: 452, h: 188, tint: '#33354d' },
  { name: 'Gift Shop', x: 876, y: 412, w: 376, h: 188, tint: '#2f3a33' },
  { name: 'Hall of Statues', x: 28, y: 612, w: 372, h: 160, tint: '#2b3049' },
  { name: 'Service Hall', x: 412, y: 612, w: 452, h: 160, tint: '#2a2c40' },
  { name: 'Storage', x: 876, y: 612, w: 376, h: 160, tint: '#33302a' },
];

// Wall rectangles. Horizontal runs leave gaps where doors are.
export const WALLS = [
  // Outer shell (the bottom run has a gap at the van bay doors).
  { x: 16, y: 64, w: 1248, h: T },
  { x: 16, y: 776, w: 544, h: T },
  { x: 720, y: 776, w: 544, h: T },
  { x: 16, y: 64, w: T, h: 724 },
  { x: 1252, y: 64, w: T, h: 724 },
  // Top row / corridor divider, doors at Dawn, the Vault and Security.
  { x: 28, y: 280, w: 172, h: T },
  { x: 248, y: 280, w: 368, h: T },
  { x: 664, y: 280, w: 336, h: T },
  { x: 1048, y: 280, w: 204, h: T },
  // Top row vertical dividers.
  { x: 484, y: 76, w: T, h: 216 },
  { x: 784, y: 76, w: T, h: 216 },
  // Corridor / middle row divider, doors under each top door.
  { x: 28, y: 400, w: 172, h: T },
  { x: 248, y: 400, w: 368, h: T },
  { x: 664, y: 400, w: 336, h: T },
  { x: 1048, y: 400, w: 204, h: T },
  // Middle row vertical dividers.
  { x: 400, y: 412, w: T, h: 188 },
  { x: 864, y: 412, w: T, h: 188 },
  // Middle / bottom row divider.
  { x: 28, y: 600, w: 172, h: T },
  { x: 248, y: 600, w: 368, h: T },
  { x: 664, y: 600, w: 336, h: T },
  { x: 1048, y: 600, w: 204, h: T },
  // Bottom row vertical dividers.
  { x: 400, y: 612, w: T, h: 164 },
  { x: 864, y: 612, w: T, h: 164 },
  // Display plinths and counters that also block movement and sight.
  { x: 120, y: 150, w: 90, h: 26 },
  { x: 300, y: 190, w: 90, h: 26 },
  { x: 940, y: 470, w: 130, h: 24 },
  { x: 130, y: 480, w: 100, h: 24 },
  { x: 1000, y: 150, w: 110, h: 26 },
  { x: 150, y: 680, w: 90, h: 24 },
];

// Loot on display. The Crown is the prize in the Vault; the rest is gravy.
export const LOOT = [
  { id: 'crown', name: 'Crown of the Tide King', x: 640, y: 168, value: 2000, kind: 'crown' },
  { id: 'pearl', name: 'Moon Pearl', x: 640, y: 238, value: 600, kind: 'gem' },
  { id: 'dawn-painting', name: 'Dawn over Harbours', x: 165, y: 138, value: 450, kind: 'painting' },
  { id: 'mask', name: 'Jade Mask', x: 345, y: 178, value: 400, kind: 'mask' },
  { id: 'vase', name: 'Singing Vase', x: 120, y: 250, value: 300, kind: 'vase' },
  { id: 'tide-painting', name: 'The Long Tide', x: 180, y: 468, value: 500, kind: 'painting' },
  { id: 'astrolabe', name: 'Brass Astrolabe', x: 330, y: 540, value: 350, kind: 'gem' },
  { id: 'statue', name: 'Marble Dancer', x: 195, y: 668, value: 550, kind: 'statue' },
  { id: 'coin-hoard', name: 'Pirate Coin Hoard', x: 1005, y: 458, value: 380, kind: 'coins' },
  { id: 'necklace', name: 'Emerald Necklace', x: 1150, y: 540, value: 420, kind: 'gem' },
  { id: 'blueprint', name: 'Vault Blueprints', x: 1055, y: 138, value: 250, kind: 'scroll' },
];

// Guard patrol loops (waypoint lists, walked in order, looping).
export const PATROLS = [
  [{ x: 120, y: 346 }, { x: 620, y: 346 }, { x: 620, y: 250 }, { x: 224, y: 250 }, { x: 224, y: 346 }],
  [{ x: 1160, y: 346 }, { x: 700, y: 346 }, { x: 1024, y: 200 }, { x: 1160, y: 346 }],
  [{ x: 640, y: 470 }, { x: 640, y: 346 }, { x: 880, y: 346 }, { x: 880, y: 500 }, { x: 640, y: 560 }],
  [{ x: 200, y: 690 }, { x: 200, y: 470 }, { x: 330, y: 470 }, { x: 330, y: 690 }],
];

// Sweeping cameras: mount point, centre angle and sweep amplitude.
export const CAMERAS = [
  { x: 44, y: 84, centre: 0.5, sweep: 0.85 },
  { x: 640, y: 84, centre: Math.PI / 2, sweep: 0.7 },
  { x: 1236, y: 392, centre: Math.PI, sweep: 0.8 },
  { x: 428, y: 428, centre: Math.PI / 2, sweep: 0.9 },
];

export const PLAYER_START = { x: 640, y: 700 };
export const VAN = { x: 566, y: 726, w: 148, h: 46 };
export const PLAY_BOUNDS = { x: 28, y: 76 + 0, w: 1224, h: 700 };
export const FLOOR_TOP = HUD_H + 28;
