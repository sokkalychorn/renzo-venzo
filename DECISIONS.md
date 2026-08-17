# Decisions

This log records consequential autonomous choices. Amend it when implementation evidence changes a decision.

## D-001 — Runtime and delivery

- Decision: HTML5 Canvas, CSS, and vanilla JavaScript ES modules served by `python3 -m http.server 8000`.
- Reason: minimal dependencies and a transparent public-repository launch path; effort stays focused on game systems.

## D-002 — Simulation

- Decision: use a fixed simulation timestep with time-based rendering and a seeded, explicitly owned PRNG for gameplay variation.
- Reason: reproducible tests and encounters without procedural-level solvability risk.

## D-003 — Level structure

- Decision: two compact authored side-view scenarios plus a short walkable village epilogue. Scenario 1 emphasizes observation, sound and mechanism discovery; Scenario 2 emphasizes vertical route selection, protected enemies, evidence recovery, adaptation and escape.
- Reason: tactical distinction must arise from decisions, not palette or enemy-count changes.

## D-004 — Navigation reliability

- Decision: companion AI uses local steering, mirrored stealth stance, awareness-gated combat support, and bounded separation recovery. A separated off-camera companion may relocate safely behind the player.
- Reason: preserving the physical companion fantasy is important, but navigation purity must not create soft locks.

## D-005 — Hook physics

- Decision: represent hook behavior with a stable damped constraint/impulse whose acceleration is divided by movable mass. Anchored targets have effectively infinite mass; light targets travel to Renzo, comparable bodies converge, heavy/anchored targets pull Renzo.
- Reason: this makes relative mass mechanically real and readable while avoiding chaotic rope simulation.

## D-006 — Persistence boundary

- Decision: save world seed, scenario/checkpoint progression, completed milestones, alarm-cut flags, and settings. Rebuild authored checkpoint baselines; do not serialize transient hitboxes, enemy timers, or rope impulses.
- Reason: meaningful restoration with a low corruption surface.

## D-007 — Assets and identity

- Decision: use original procedural Canvas/CSS graphics, programmatic effects, and Web Audio sounds. No ripped, stock, or downloaded commercial assets are planned.
- Reason: original identity, small repository, and unambiguous provenance.

## D-008 — Optional systems

- Decision: omit morale, Brotherhood Sync, and progression initially. Consider only a single small feature after P0/P1/P2 and critical path QA pass.
- Reason: they are explicitly expendable and cannot threaten completion.

## D-009 — Observability

- Decision: important internal states receive restrained diegetic/UI signals: awareness arcs/state labels, local shout/alarm pulses, sabotaged-bell failure, hook tension/mass response, companion intent, Veteran adaptation callouts, save confirmation, and explicit defeat/victory overlays.
- Reason: competition judging begins with video; sophistication must be visible through ordinary play.
