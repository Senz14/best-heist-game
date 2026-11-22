// Shared tuning constants for Moonlit Museum Heist.
// Everything the simulation needs lives here so the balance is easy to read.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 48;

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK = 168; // px per second on foot
export const PLAYER_SNEAK = 92; // px per second while sneaking
export const PICKUP_RADIUS = 46; // generous grab distance for loot

export const GUARD_RADIUS = 13;
export const GUARD_PATROL = 74;
export const GUARD_INVESTIGATE = 118;
export const GUARD_CHASE = 178;
export const GUARD_SIGHT = 178; // vision cone length
export const GUARD_HALF_ANGLE = 0.56; // radians, half of the cone spread
export const CATCH_DISTANCE = 24;

export const CAMERA_SIGHT = 196;
export const CAMERA_HALF_ANGLE = 0.42;
export const CAMERA_SWEEP = 0.55; // radians per second of pan

export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 34; // per second at point blank in a cone
export const ALARM_CAMERA_RATE = 22;
export const ALARM_DECAY = 3.2; // per second while nobody sees the thief
export const CROWN_ALARM_SPIKE = 32;

export const COIN_COST = 150; // throwing a decoy coin spends part of the take
export const COIN_RANGE = 280;
export const COIN_HEAR = 330; // guards within this distance go and look

export const EMP_CHARGES = 2;
export const EMP_BLACKOUT = 6; // seconds the cameras stay dark

export const GHOST_BONUS = 1500;
export const TIME_BONUS_PER_SECOND = 2;
export const TIME_BONUS_BUDGET = 600; // seconds of bonus on the clock
