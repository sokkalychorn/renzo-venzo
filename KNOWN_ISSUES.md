# Known Issues

Last updated: 2026-08-16

No known critical crash or deterministic progression soft lock remains in the automated coverage.

## Noncritical limitations

- The agent's in-app browser service had no available browser binding. Visual and interactive QA therefore used Canvas-contract smoke rendering, live server probes, and stateful simulation rather than a full automated keyboard playthrough or screenshots.
- Companion navigation is intentionally steering-based rather than a full navmesh. When separated far enough off-camera, the companion safely rejoins near the active brother; the reposition is a reliability fallback.
- Save/Continue restores authored checkpoint baselines and durable progression/alarm-cut flags, not defeated ordinary enemies or transient physics/combat state.
- Closed gates are objective barriers rather than collision bodies. A player can stand past a drawn closed gate, but cannot complete the scenario until its linked mechanism is engaged (and Scenario II's evidence/Veteran requirements are satisfied).
- Environmental cargo is primarily a damage, stagger, cover, and noise tool. It does not become a persistent bridge.
- Perception line-of-sight uses facing/range/elevation and movable crate/cargo cover rather than polygon raycasts against decorative scenery.
- Generated Web Audio starts only after a user gesture, as required by modern browser autoplay policy.

These limitations do not remove the two-scenario route, win/lose/retry, brother identity, or central P2 interactions.
