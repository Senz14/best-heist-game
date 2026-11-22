// Screenshot staging: ?shot=cover|vault|alarm|escape arranges a showcase
// scene with the game's real entities so screenshots show actual play.
export function shotNameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  return ['cover', 'vault', 'alarm', 'escape'].includes(name) ? name : null;
}

export function stageShot(world, name) {
  const p = world.player;
  if (name === 'cover') {
    // The thief crossing the Grand Corridor, cones sweeping, loot all around.
    p.x = 470; p.y = 346; p.facing = 0;
    world.guards[0].x = 760; world.guards[0].y = 346; world.guards[0].facing = Math.PI;
    world.guards[1].x = 1080; world.guards[1].y = 346; world.guards[1].facing = Math.PI * 0.9;
    world.guards[2].x = 640; world.guards[2].y = 500; world.guards[2].facing = -Math.PI / 2;
    world.time = 42;
  } else if (name === 'vault') {
    // Inside the Vault, one step from the Crown, a guard closing in.
    p.x = 588; p.y = 196; p.facing = 0.4;
    world.guards[0].x = 640; world.guards[0].y = 330; world.guards[0].facing = -Math.PI / 2;
    world.guards[0].state = 'investigate';
    world.take = 750;
    world.lootCount = 2;
    world.loot.find((l) => l.id === 'dawn-painting').taken = true;
    world.loot.find((l) => l.id === 'vase').taken = true;
    world.time = 96;
    world.message = 'The Crown of the Tide King — one quiet step away.';
    world.messageTimer = 99;
  } else if (name === 'alarm') {
    // Spotted in the Gallery of Tides: alarm climbing, a guard giving chase.
    p.x = 250; p.y = 500; p.facing = Math.PI;
    world.guards[3].x = 330; world.guards[3].y = 470; world.guards[3].facing = Math.PI * 0.85;
    world.guards[3].state = 'chase';
    world.alarm = 76;
    world.exposure = 0.8;
    world.seenEver = true;
    world.take = 1250;
    world.lootCount = 3;
    world.time = 151;
    world.message = 'SPOTTED — break line of sight before the alarm fills!';
    world.messageTimer = 99;
  } else if (name === 'escape') {
    // Crown in the bag, alarm hot, the van idling at the bay doors.
    p.x = 600; p.y = 690; p.facing = Math.PI / 2;
    world.hasCrown = true;
    world.loot.find((l) => l.id === 'crown').taken = true;
    world.loot.find((l) => l.id === 'pearl').taken = true;
    world.loot.find((l) => l.id === 'tide-painting').taken = true;
    world.take = 3100;
    world.lootCount = 3;
    world.alarm = 48;
    world.seenEver = true;
    world.guards[2].x = 700; world.guards[2].y = 560; world.guards[2].facing = Math.PI / 2;
    world.guards[2].state = 'chase';
    world.time = 203;
    world.message = 'The Crown is yours — get to the van!';
    world.messageTimer = 99;
  }
  return world;
}
