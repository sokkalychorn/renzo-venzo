# Renzo & Venzo: Bend Before Breaking

An original two-scenario 2D browser action-stealth game about two macaque brothers returning through occupied Kageyama. Venzo masters the battlefield through timing, defense, and Resolve. Renzo changes it with a transforming staff, mass-aware chain physics, and environmental engineering.

The game is designed for one 8–15 minute sitting and has a complete route from title screen through two scenarios, a village epilogue, and an unmistakable `CHAPTER COMPLETE` win screen. Both brothers can be downed; if both fall, the player gets a defeat screen and checkpoint retry.

## Run

From this directory:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000> in a desktop browser. No install or build is required. Chrome, Edge, Firefox, and Safari versions with Canvas, ES modules, `structuredClone`, Web Audio, and localStorage support are expected.

Optional developer commands:

```bash
npm test
npm run check
```

## Controls

| Control | Action |
|---|---|
| `A` / `D` | Move |
| `W` or `Space` | Jump / contextual upward movement |
| `S` | Crouch and move quietly |
| `J` | Light attack; Renzo hooks in Chain mode |
| `K` | Heavy / stagger attack |
| `L` | Block; a late Venzo block is a precision parry |
| `Shift` | Dodge; direction can be independent of facing |
| `E` | Revive, sabotage, recover evidence, release tension; otherwise Engineer Focus as Renzo |
| `Q` | Instantly switch controlled brother |
| `R` | Renzo Staff/Chain transform; Venzo Resolve at 60% |
| `Esc` | Pause menu |
| `M` | Mute from title |

The title screen and pause menu include the same field manual.

## Scenarios

### I — Rain at Kageyama Pass

A discovery-focused rainy pass. Learn sound and vision, distract Scouts, cut an alarm line, release suspended cargo, disrupt a Shield Guard, compare light/anchored/heavy hook responses, and turn the waterwheel to open the route. Stealth, combat, engineering, and hybrid approaches all work.

### II — The Broken Crest

A fortified archive and supply watchpost built around a multi-stage objective: infiltrate, recover the stolen dispatch, survive an archive lockdown, defeat the route-blocking adaptive Veteran, open the eastern mechanism, and escape. Multiple elevations, paired guards, local alarms, machinery, and the mandatory evidence/Veteran sequence make it tactically different from the pass.

Afterward, walk through Takekage Village for five short encounters. A messenger reveals the assassination of a Gorilla Samurai commander and a broken fragment bearing the Takekage two-leaf bamboo kamon.

## Major systems

- **Two physical brothers:** instant player transfer plus conservative companion follow, defense, combat support, stealth mirroring, and off-camera recovery.
- **Independent survival:** separate health, automatic takeover when the active brother falls, proximity revive, both-down defeat, and checkpoint retry.
- **Scout perception:** facing, distance, height, crouch, lantern light, movable cover, local sound, last-known-position memory, and readable `SUSPICIOUS → INVESTIGATE → ALERT → SEARCH → RETURN` behavior.
- **Believable communication:** detection creates a local shout. Scouts physically run to alarms; nearby enemies learn only from a shout or a ringing bell. Cut lines visibly fail.
- **Mass-aware hook:** the same damped constraint pulls light targets toward Renzo, brings comparable masses together, pulls Renzo toward heavy targets, and grapples him toward anchors.
- **Environmental properties:** reusable light/movable/noisy crates, anchored points, tensioned ropes, heavy suspended cargo, bells, alarms, waterwheels, and mechanical gates. Engineer Focus shows properties and linked mechanisms without displaying a solution.
- **Shield Guards:** strong frontal defense, ally protection, hook disruption, flank vulnerability, and cumulative heavy guard pressure.
- **Adaptive Veterans:** encounter-local habit counts change deterministic action weights. Repeated backward dodges produce reaching advances; repeated heavies encourage retreat-and-punish behavior; parries, hooks, and switch rhythms influence feinting, spacing, and guard choices. Visible callouts identify the read.
- **Feedback:** procedural silhouettes, parallax mountains, rain/mist, combat arcs, awareness bars/state names, hook rope, noise rings, alarm status, impact shake, and original Web Audio cues.

## Save and Continue

The game autosaves at scenario starts, authored checkpoints, evidence recovery, and story milestones. The pause menu also has `SAVE GAME` and `QUIT TO TITLE`. `CONTINUE` restores the world seed, scenario, safe checkpoint baseline, completed scenarios, alarm sabotage flags, and mute setting. Transient attack, AI, and rope-spring states are intentionally rebuilt rather than serialized.

Recommended demonstration: pause → `SAVE GAME` → pause again → `QUIT TO TITLE` → `CONTINUE`. A gold confirmation appears for save and load.

## Deterministic variation

The top-right HUD displays `SEED #####`. A Mulberry32 generator derives repeatable Scout starting directions and bounded starting-position offsets. The same seed and scenario reproduce these tactical choices; different seeds vary them without moving objectives, gates, anchors, or checkpoints. The authored maps themselves remain guaranteed-solvable.

## Architecture

- `src/game.js` — fixed-step orchestration, characters, combat, companion behavior, enemy runtime, objectives, persistence integration
- `src/systems.js` — DOM-free deterministic RNG, Scout transitions, Veteran weights, hook physics, brother-party rules, validated saves
- `src/scenarios.js` — authored scenario geometry, enemies, mechanisms, seeded instantiation
- `src/render.js` — all Canvas graphics and state observability
- `src/input.js` — keyboard edge/held state
- `src/audio.js` — original procedural Web Audio cues
- `tests/` — Node behavior and integrated game-flow tests

The project has no runtime dependencies, backend, account, remote data, or downloaded art/audio.

## Testing status

`npm test` currently runs 26 behavior tests covering RNG reproducibility, the complete Scout transition model, Veteran weighting/runtime response, all hook mass classes, save validation, switching/downed/revive/defeat, block/parry, directional dodge, scenario gates, alarm travel/failure, evidence checkpoint safety, hook mechanisms, walkable epilogue gating, and render-scene smoke coverage. `npm run check` validates every shipped module. See [TEST_RESULTS.md](TEST_RESULTS.md) for exact evidence and limitations.
