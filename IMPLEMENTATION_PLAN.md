# Implementation Plan

Status: implemented through Phase 19. Optional P3 systems were deliberately omitted; the only incomplete verification item is a real browser playthrough because the provided browser binding was unavailable.

## Delivery strategy

Build a small, deterministic HTML5 Canvas game with vanilla JavaScript ES modules and no required build step. Preserve system depth by using compact reusable state machines and authored levels rather than framework or asset complexity.

## Phases and gates

1. **Audit and boot** — record disqualification risks; add `index.html`, styles, module entry point, title screen, fixed-timestep loop, and visible runtime error handling.
2. **World fundamentals** — input, movement, jump/crouch/dodge, authored collision geometry, camera, simple navigation anchors, debug-safe scenario reset.
3. **Brothers** — Renzo and Venzo entities, distinct silhouettes/moves, instant Q switching, companion follow/support/reposition recovery.
4. **Combat and failure** — hitboxes, stagger, Venzo combo/heavy/block/parry/Resolve, Renzo staff attacks/weak defense, health, downed/takeover/revive, both-down defeat and checkpoint retry.
5. **Perception and Scout** — line of sight, facing, light/motion/noise factors, sound events, memory, PATROL→SUSPICIOUS→INVESTIGATE→ALERT→SEARCH→RETURN, readable indicators and local shouts.
6. **Renzo systems** — readable staff/chain transform; contextual hook; damped mass-aware responses for light/comparable/heavy/anchored targets; Engineer Focus relationship cues.
7. **Environment and alarm** — reusable property components for ropes/pulleys, weights/crates, lantern/fire, bells/noise, and waterwheel/gates. Connect mechanics to traversal, AI, sound, and combat. Alarm requires physical activation; sabotage produces visible failure.
8. **Advanced enemies** — frontal Shield Guard defense/protection/disruption and encounter-local Veteran habit tracking with observable weighted adaptations.
9. **Scenario 1: Rain at Kageyama Pass** — discovery-focused stealth/engineering/combat routes, alarm lesson, hook-mass examples, checkpoint completion.
10. **Scenario 2: The Broken Crest** — fortified vertical installation, evidence recovery and escape, denser combined systems, Veteran interaction, tactically distinct structure.
11. **Persistence and determinism** — seeded PRNG for safe tactical variations; localStorage save with explicit confirmation; title Continue; meaningful scenario/checkpoint restoration; exact save→quit→continue test.
12. **Epilogue and presentation** — short walkable Takekage Village, at most five interactions, assassination/kamon reveal, motto and unmistakable CHAPTER COMPLETE; procedural visuals and Web Audio.
13. **Adversarial QA** — automated logic tests plus browser playthrough; Builder/Critic/Repairer passes; exercise critical path, failure/revive/retry, alarms, all hook mass classes, AI state transitions, spam inputs, and save reload.
14. **Final audit** — rerun launch and tests, inspect files and browser console, truthfully update all durable records and acceptance gates, verify asset provenance and repository hygiene.

## Implementation constraints

- Prefer stable deterministic impulses to fragile full rope simulation.
- Prefer simple waypoint/anchor navigation plus safe off-camera recovery to soft-lock-prone pathfinding.
- Author both levels and vary only bounded, solvability-safe elements by seed.
- Keep transient combat/physics out of saves; restore at authored checkpoints.
- Remove optional P3 features before weakening any P0–P2 requirement.
- Once P0/P1 work, avoid architecture rewrites without a demonstrated critical defect.

## Verification loop

For each increment: reread state → inspect related code → implement smallest coherent change → syntax/static check → automated test → actual runtime inspection → adversarial critique → repair → retest → update state and evidence.
