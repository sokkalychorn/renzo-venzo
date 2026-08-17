import test from "node:test";
import assert from "node:assert/strict";

import {
  SCOUT_STATES,
  SeededRNG,
  VETERAN_HABITS,
  applyBrotherDamage,
  chooseWeightedAction,
  computeHookImpulse,
  createBrotherParty,
  createSavePayload,
  createScoutMind,
  createVeteranMemory,
  deserializeSave,
  loadFromStorage,
  partyOutcome,
  recordVeteranHabit,
  reviveBrother,
  saveToStorage,
  scoutHearSound,
  scoutLoseContact,
  scoutSeeTarget,
  serializeSave,
  stepHookSpring,
  switchActiveBrother,
  tickScoutMind,
  veteranActionWeights,
} from "../src/systems.js";

test("seeded RNG reproduces a sequence and can restore a snapshot", () => {
  const first = new SeededRNG("KAGEYAMA-1042");
  const second = new SeededRNG("KAGEYAMA-1042");
  assert.deepEqual(
    Array.from({ length: 12 }, () => first.nextUint()),
    Array.from({ length: 12 }, () => second.nextUint()),
  );
  const snapshot = first.snapshot();
  const expected = [first.next(), first.next(), first.int(2, 8)];
  first.restore(snapshot);
  assert.deepEqual([first.next(), first.next(), first.int(2, 8)], expected);
  assert.notDeepEqual(new SeededRNG(1).nextUint(), new SeededRNG(2).nextUint());
});

test("Scout hears local sound and investigates it", () => {
  const mind = scoutHearSound(createScoutMind(), { position: { x: 12, y: 5 }, intensity: 0.8 });
  assert.equal(mind.state, SCOUT_STATES.INVESTIGATE);
  assert.deepEqual(mind.investigatePosition, { x: 12, y: 5 });
  assert.ok(mind.awareness > 0);
});

test("Scout vision alerts, loss creates memory search, timeout returns to patrol", () => {
  let mind = scoutSeeTarget(createScoutMind(), { targetId: "renzo", position: { x: 8, y: 2 } });
  assert.equal(mind.state, SCOUT_STATES.ALERT);
  assert.equal(mind.targetId, "renzo");
  mind = scoutLoseContact(mind);
  assert.equal(mind.state, SCOUT_STATES.SEARCH);
  assert.deepEqual(mind.lastKnownPosition, { x: 8, y: 2 });
  mind = tickScoutMind(mind, mind.searchDuration + 0.01);
  assert.equal(mind.state, SCOUT_STATES.RETURN);
  mind = tickScoutMind(mind, 0.1, { reachedPatrol: true });
  assert.equal(mind.state, SCOUT_STATES.PATROL);
  assert.equal(mind.lastKnownPosition, null);
});

test("Veteran repeated habits materially shift specific action weights", () => {
  let memory = createVeteranMemory();
  const baseline = veteranActionWeights(memory);
  for (let i = 0; i < 4; i += 1) memory = recordVeteranHabit(memory, VETERAN_HABITS.BACKWARD_DODGE);
  for (let i = 0; i < 3; i += 1) memory = recordVeteranHabit(memory, VETERAN_HABITS.HEAVY_ATTACK);
  for (let i = 0; i < 3; i += 1) memory = recordVeteranHabit(memory, VETERAN_HABITS.PARRY_ATTEMPT);
  const adapted = veteranActionWeights(memory);
  assert.ok(adapted.forwardReach > baseline.forwardReach * 5);
  assert.ok(adapted.waitAndPunish > baseline.waitAndPunish * 5);
  assert.ok(adapted.feint > baseline.feint * 10);
  const rngA = new SeededRNG(99);
  const rngB = new SeededRNG(99);
  assert.deepEqual(
    Array.from({ length: 10 }, () => chooseWeightedAction(adapted, rngA)),
    Array.from({ length: 10 }, () => chooseWeightedAction(adapted, rngB)),
  );
});

test("hook impulse pulls a light target much more than Renzo", () => {
  const result = computeHookImpulse({ actorMass: 8, targetMass: 1, tension: 120, dt: 0.1 });
  assert.equal(result.mode, "pull-target");
  assert.ok(Math.abs(result.targetDeltaV.x) > Math.abs(result.actorDeltaV.x) * 7);
  assert.ok(result.actorDeltaV.x > 0 && result.targetDeltaV.x < 0);
});

test("hook impulse pulls Renzo toward a heavy target", () => {
  const result = computeHookImpulse({ actorMass: 2, targetMass: 12, tension: 120, dt: 0.1 });
  assert.equal(result.mode, "pull-actor");
  assert.ok(Math.abs(result.actorDeltaV.x) > Math.abs(result.targetDeltaV.x) * 5);
});

test("fixed hook target acts as an anchor and spring is capped", () => {
  const result = stepHookSpring({
    actor: { x: 0, y: 0, vx: 0, vy: 0, mass: 2 },
    target: { x: 100, y: 0, vx: 0, vy: 0, mass: 100, fixed: true },
    restLength: 20,
    stiffness: 100,
    dt: 1,
    maxImpulse: 9,
  });
  assert.equal(result.mode, "anchor");
  assert.equal(result.impulse, 9);
  assert.ok(result.actorDeltaV.x > 0);
  assert.deepEqual(result.targetDeltaV, { x: 0, y: 0 });
});

test("switch transfers control but cannot select a downed brother", () => {
  let party = createBrotherParty();
  party = switchActiveBrother(party);
  assert.equal(party.active, "renzo");
  party = applyBrotherDamage(party, "venzo", 200);
  assert.equal(switchActiveBrother(party, "venzo").active, "renzo");
});

test("active brother down automatically transfers control and can be revived", () => {
  let party = applyBrotherDamage(createBrotherParty({ active: "venzo" }), "venzo", 200);
  assert.equal(party.active, "renzo");
  assert.equal(party.brothers.venzo.downed, true);
  assert.equal(partyOutcome(party), "rescue");
  party = reviveBrother(party, "venzo", { healthFraction: 0.4 });
  assert.equal(party.brothers.venzo.downed, false);
  assert.equal(party.brothers.venzo.health, 40);
  assert.equal(partyOutcome(party), "fighting");
});

test("both brothers down produces defeat and blocks impossible revival", () => {
  let party = applyBrotherDamage(createBrotherParty(), "renzo", 200);
  party = applyBrotherDamage(party, "venzo", 200);
  assert.equal(party.defeat, true);
  assert.equal(partyOutcome(party), "defeat");
  assert.equal(reviveBrother(party, "renzo").defeat, true);
});

test("save state round-trips through injectable storage", () => {
  const storage = new Map();
  const adapter = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const state = {
    scenario: 2,
    checkpoint: "watchpost-courtyard",
    worldSeed: 92831,
    completedScenarios: [1],
    upgrade: "renzo",
    settings: { masterVolume: 0.4, muted: false, reducedMotion: true },
  };
  assert.equal(saveToStorage(adapter, "takekage-save", state), true);
  assert.deepEqual(loadFromStorage(adapter, "takekage-save"), createSavePayload(state));
});

test("save validation rejects corrupt or semantically invalid data", () => {
  const valid = serializeSave({ scenario: 2, worldSeed: 7 });
  assert.equal(deserializeSave(`${valid}garbage`), null);
  const changed = JSON.parse(valid);
  changed.payload.scenario = 99;
  assert.equal(deserializeSave(JSON.stringify(changed)), null);
  const tampered = JSON.parse(valid);
  tampered.payload.checkpoint = "cheated";
  assert.equal(deserializeSave(JSON.stringify(tampered)), null);
});

