# best-heist-game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Senz14/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Senz14/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Moonlit Museum Heist** is a top-down stealth game played on one full-screen
museum floor plan. You are a thief in the dark galleries: cross the Grand
Corridor, slip past four patrolling guards and their vision cones, dodge the
sweeping security cameras, and lift the treasures from their display cases —
above all the Crown of the Tide King in the Vault. Being seen feeds the alarm
meter; a full meter means lockdown. Sneak with Shift to stay dim, click to
toss a decoy coin that costs part of your take and pulls guards away, and
fire one of two EMP charges to black out the cameras for six seconds.
Grabbing the Crown wakes the whole museum up, so plan the run back to the
getaway van before you touch it. Your score is the loot you carried out, plus
a time bonus, plus a ghost bonus if nobody ever saw you; the best score is
kept between visits.

Controls: WASD or arrow keys move, Shift sneaks, mouse click throws a coin,
E or Space fires the EMP, P pauses. The game is plain static files under
`game/` with no build step and no network calls, and all of its sound is
procedural Web Audio bleeps.

## Run it

```sh
node serve.ts          # serves the game at http://localhost:8173/
# then open http://localhost:8173/ in desktop Chrome
# hand-in check: MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jkmc4mts&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
