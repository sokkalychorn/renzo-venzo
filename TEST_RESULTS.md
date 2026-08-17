# Test Results

Last updated: 2026-08-16

## Final automated run

- `npm test`: **26 passed, 0 failed**.
- `npm run check`: **passed** for `main.js`, `game.js`, `render.js`, and `audio.js`.
- Static-server probe: `index.html` and `src/main.js` both returned **HTTP 200** from `python3 -m http.server 8000`.

## Behavior covered

- Seeded RNG reproduces sequences and restores snapshots.
- Scout sound causes investigation; sight causes alert; lost sight causes remembered search; timeout returns to patrol.
- Veteran habit repetition materially changes action weights.
- Hook impulses distinguish light, heavy, comparable, and anchored targets and cap spring impulses.
- Switching rejects a downed target; active-brother down transfers control; revive works; both down yields defeat.
- Save payloads round-trip and reject corruption/semantic tampering.
- Both authored scenarios instantiate with distinct enemy/objective mixes.
- Scenario I completion saves a Scenario II Continue point.
- Scenario II cannot complete without evidence, its waterwheel gate, and the route Veteran's defeat.
- A Scout crosses actual distance to a sabotaged alarm and produces visible failure.
- Crossing the archive checkpoint without evidence cannot grant it on Continue.
- Renzo's live targeting selects light, anchored, and wheel targets; the wheel opens its linked gate.
- Sustained `E` interaction revives a downed companion.
- Title, gameplay, village, and revelation renderer paths execute against a Canvas API contract without throwing.

## Builder → Critic → Repairer evidence

Adversarial review found and repaired:

- alarm runners returning before physics, leaving them stationary;
- late blocks returning before reduced damage was applied;
- local communication changing state without resetting its timer;
- checkpoint 2 granting uncollected archive evidence;
- backward-dodge tracking without actual backward motion;
- companion aggression toward unaware patrols;
- Veteran callouts whose major response lacked combat behavior;
- Shield Guard heavies never building a real guard break;
- identical first two revelation frames;
- a transient syntax error introduced during village conversion.

Affected tests and syntax checks were rerun after repair.

## Runtime-testing limitation

The provided in-app browser runtime reported no available browser binding, so a genuine automated click-through and screenshot review could not be completed in this session. This is recorded rather than hidden. The fallback verification consisted of the live HTTP server probes, module syntax checks, deterministic/game-flow harnesses, render smoke execution, and direct stateful simulation of the alarm runner, save/Continue, failure, revive, scenario transitions, and win prerequisites.

## Acceptance assessment

- Boot and served assets: pass by server probe and module/render checks.
- P0/P1/P2 logic and critical transitions: pass by 26 automated behavior checks and adversarial repairs.
- Real browser manual playthrough: **not tool-verifiable in this environment**; no claim of screenshot or interactive browser inspection is made.
