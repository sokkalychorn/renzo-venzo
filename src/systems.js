/**
 * Deterministic, rendering-agnostic gameplay systems.
 *
 * This module deliberately has no DOM dependencies so the browser game and
 * Node test suite exercise the same rules.
 */

export const SCOUT_STATES = Object.freeze({
  PATROL: "PATROL",
  SUSPICIOUS: "SUSPICIOUS",
  INVESTIGATE: "INVESTIGATE",
  ALERT: "ALERT",
  SEARCH: "SEARCH",
  RETURN: "RETURN",
});

export const BROTHERS = Object.freeze(["venzo", "renzo"]);
export const VETERAN_HABITS = Object.freeze({
  BACKWARD_DODGE: "backwardDodge",
  HEAVY_ATTACK: "heavyAttack",
  PARRY_ATTEMPT: "parryAttempt",
  HOOK_USE: "hookUse",
  SWITCH_AFTER_BLOCK: "switchAfterBlock",
});

const UINT32_MAX_PLUS_ONE = 0x100000000;
const VALID_SCENARIOS = new Set([1, 2, "village", "complete"]);
const VALID_UPGRADES = new Set([null, "venzo", "renzo", "brotherhood"]);
const SAVE_VERSION = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/** FNV-1a, used to convert display strings into a stable 32-bit seed. */
export function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? "TAKEKAGE");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG with serializable state (Mulberry32). */
export class SeededRNG {
  constructor(seed = 0x4b414745) {
    this.seed = hashSeed(seed);
    this.state = this.seed;
  }

  nextUint() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  next() {
    return this.nextUint() / UINT32_MAX_PLUS_ONE;
  }

  float(min = 0, max = 1) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new RangeError("RNG float range must be finite and ordered");
    }
    return min + this.next() * (max - min);
  }

  int(min, maxInclusive) {
    if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min) {
      throw new RangeError("RNG integer range must contain ordered integers");
    }
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }

  chance(probability = 0.5) {
    return this.next() < clamp(finite(probability), 0, 1);
  }

  pick(values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new RangeError("Cannot pick from an empty collection");
    }
    return values[this.int(0, values.length - 1)];
  }

  snapshot() {
    return { seed: this.seed, state: this.state };
  }

  restore(snapshot) {
    if (!snapshot || !Number.isInteger(snapshot.state)) {
      throw new TypeError("Invalid RNG snapshot");
    }
    this.seed = hashSeed(snapshot.seed);
    this.state = snapshot.state >>> 0;
    return this;
  }

  fork(label) {
    return new SeededRNG(hashSeed(`${this.seed}:${String(label)}`));
  }
}

function point(value, fallback = null) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return fallback;
  return { x: value.x, y: value.y };
}

export function createScoutMind(overrides = {}) {
  const state = Object.values(SCOUT_STATES).includes(overrides.state)
    ? overrides.state
    : SCOUT_STATES.PATROL;
  return {
    state,
    timeInState: Math.max(0, finite(overrides.timeInState)),
    awareness: clamp(finite(overrides.awareness), 0, 1),
    targetId: overrides.targetId ?? null,
    lastKnownPosition: point(overrides.lastKnownPosition),
    investigatePosition: point(overrides.investigatePosition),
    searchDuration: Math.max(0.1, finite(overrides.searchDuration, 4.5)),
    investigateDuration: Math.max(0.1, finite(overrides.investigateDuration, 3.5)),
    returnDuration: Math.max(0.1, finite(overrides.returnDuration, 1.5)),
  };
}

function scoutTransition(mind, state, changes = {}) {
  return { ...mind, ...changes, state, timeInState: 0 };
}

/** A meaningful sound creates local knowledge, never global knowledge. */
export function scoutHearSound(mind, sound) {
  const current = createScoutMind(mind);
  const location = point(sound?.position ?? sound);
  const intensity = clamp(finite(sound?.intensity, 1), 0, 1);
  if (!location || intensity <= 0 || current.state === SCOUT_STATES.ALERT) return current;
  if (intensity < 0.25) {
    return scoutTransition(current, SCOUT_STATES.SUSPICIOUS, {
      awareness: Math.max(current.awareness, intensity),
      investigatePosition: location,
    });
  }
  return scoutTransition(current, SCOUT_STATES.INVESTIGATE, {
    awareness: Math.max(current.awareness, intensity * 0.7),
    investigatePosition: location,
  });
}

export function scoutSeeTarget(mind, observation) {
  const current = createScoutMind(mind);
  const location = point(observation?.position ?? observation, current.lastKnownPosition);
  return scoutTransition(current, SCOUT_STATES.ALERT, {
    awareness: 1,
    targetId: observation?.targetId ?? current.targetId ?? "brother",
    lastKnownPosition: location,
  });
}

export function scoutLoseContact(mind, lastKnownPosition = null) {
  const current = createScoutMind(mind);
  if (current.state !== SCOUT_STATES.ALERT) return current;
  return scoutTransition(current, SCOUT_STATES.SEARCH, {
    targetId: null,
    awareness: 0.75,
    lastKnownPosition: point(lastKnownPosition, current.lastKnownPosition),
  });
}

/** Advance timers. Context flags allow navigation to finish states early. */
export function tickScoutMind(mind, dt, context = {}) {
  let next = createScoutMind(mind);
  const elapsed = Math.max(0, finite(dt));
  if (context.visibleTarget) return scoutSeeTarget(next, context.visibleTarget);
  if (context.lostContact) next = scoutLoseContact(next, context.lastKnownPosition);
  next = { ...next, timeInState: next.timeInState + elapsed };

  switch (next.state) {
    case SCOUT_STATES.SUSPICIOUS:
      if (next.timeInState >= 0.55) {
        return scoutTransition(next, SCOUT_STATES.INVESTIGATE, {
          awareness: Math.max(0.3, next.awareness),
        });
      }
      break;
    case SCOUT_STATES.INVESTIGATE:
      if (context.reachedInvestigation || next.timeInState >= next.investigateDuration) {
        return scoutTransition(next, SCOUT_STATES.SEARCH, {
          lastKnownPosition: next.investigatePosition ?? next.lastKnownPosition,
          awareness: Math.max(0.45, next.awareness),
        });
      }
      break;
    case SCOUT_STATES.SEARCH:
      if (next.timeInState >= next.searchDuration) {
        return scoutTransition(next, SCOUT_STATES.RETURN, { awareness: 0.2 });
      }
      break;
    case SCOUT_STATES.RETURN:
      if (context.reachedPatrol || next.timeInState >= next.returnDuration) {
        return scoutTransition(next, SCOUT_STATES.PATROL, {
          awareness: 0,
          targetId: null,
          lastKnownPosition: null,
          investigatePosition: null,
        });
      }
      break;
    default:
      break;
  }
  return next;
}

export function createVeteranMemory(overrides = {}) {
  const habits = {};
  for (const habit of Object.values(VETERAN_HABITS)) {
    habits[habit] = Math.max(0, Math.floor(finite(overrides.habits?.[habit])));
  }
  return { habits, observations: Math.max(0, Math.floor(finite(overrides.observations))) };
}

export function recordVeteranHabit(memory, habit, amount = 1) {
  const current = createVeteranMemory(memory);
  if (!Object.values(VETERAN_HABITS).includes(habit)) return current;
  const increment = Math.max(0, Math.floor(finite(amount, 1)));
  return {
    observations: current.observations + increment,
    habits: { ...current.habits, [habit]: current.habits[habit] + increment },
  };
}

/**
 * Counterplay is deliberately visible: each repeated habit raises one named
 * response more strongly than the ordinary attack weights.
 */
export function veteranActionWeights(memory) {
  const { habits } = createVeteranMemory(memory);
  return {
    measuredStrike: 5,
    guard: 3 + habits[VETERAN_HABITS.HOOK_USE] * 0.45,
    forwardReach: 1 + habits[VETERAN_HABITS.BACKWARD_DODGE] * 2.2,
    waitAndPunish: 1 + habits[VETERAN_HABITS.HEAVY_ATTACK] * 2.1,
    feint: 0.5 + habits[VETERAN_HABITS.PARRY_ATTEMPT] * 2.35,
    closeDistance: 1 + habits[VETERAN_HABITS.HOOK_USE] * 1.65,
    switchBait: 0.5 + habits[VETERAN_HABITS.SWITCH_AFTER_BLOCK] * 2,
  };
}

export function chooseWeightedAction(weights, rng) {
  const entries = Object.entries(weights).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = (rng instanceof SeededRNG ? rng.next() : 0) * total;
  for (const [action, weight] of entries) {
    roll -= weight;
    if (roll < 0) return action;
  }
  return entries.at(-1)[0];
}

export function classifyHookMass(actorMass, targetMass, targetFixed = false) {
  const actor = Math.max(0.001, finite(actorMass, 1));
  const target = Math.max(0.001, finite(targetMass, 1));
  if (targetFixed) return "anchor";
  const ratio = target / actor;
  if (ratio <= 0.6) return "pull-target";
  if (ratio >= 1.75) return "pull-actor";
  return "meet";
}

/**
 * Apply one stable, capped rope impulse along actor -> target. Equal/opposite
 * impulses combined with inverse mass make relative mass materially matter.
 */
export function computeHookImpulse({
  actorMass = 1,
  targetMass = 1,
  targetFixed = false,
  tension = 1,
  dt = 1 / 60,
  maxImpulse = 18,
  direction = { x: 1, y: 0 },
} = {}) {
  const actor = Math.max(0.001, finite(actorMass, 1));
  const target = Math.max(0.001, finite(targetMass, 1));
  const length = Math.hypot(finite(direction?.x, 1), finite(direction?.y));
  const nx = length > 0.0001 ? finite(direction?.x, 1) / length : 1;
  const ny = length > 0.0001 ? finite(direction?.y) / length : 0;
  const impulse = clamp(Math.max(0, finite(tension, 1)) * Math.max(0, finite(dt, 1 / 60)), 0, Math.max(0, finite(maxImpulse, 18)));
  const actorDeltaV = { x: (nx * impulse) / actor, y: (ny * impulse) / actor };
  const targetDeltaV = targetFixed
    ? { x: 0, y: 0 }
    : { x: (-nx * impulse) / target, y: (-ny * impulse) / target };
  return {
    mode: classifyHookMass(actor, target, targetFixed),
    impulse,
    actorDeltaV,
    targetDeltaV,
  };
}

/** Calculate spring tension from positions/velocities, then return its impulse. */
export function stepHookSpring({ actor, target, restLength = 40, stiffness = 34, damping = 7, dt = 1 / 60, maxImpulse = 18 } = {}) {
  const dx = finite(target?.x) - finite(actor?.x);
  const dy = finite(target?.y) - finite(actor?.y);
  const distance = Math.hypot(dx, dy);
  const direction = distance > 0.0001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
  const relativeAlong =
    (finite(target?.vx) - finite(actor?.vx)) * direction.x +
    (finite(target?.vy) - finite(actor?.vy)) * direction.y;
  const stretch = Math.max(0, distance - Math.max(0, finite(restLength, 40)));
  const tension = Math.max(0, stretch * Math.max(0, finite(stiffness, 34)) + relativeAlong * Math.max(0, finite(damping, 7)));
  return {
    ...computeHookImpulse({
      actorMass: actor?.mass,
      targetMass: target?.mass,
      targetFixed: Boolean(target?.fixed),
      tension,
      dt,
      maxImpulse,
      direction,
    }),
    distance,
    stretch,
    tension,
  };
}

export function createBrotherState(name, overrides = {}) {
  if (!BROTHERS.includes(name)) throw new RangeError(`Unknown brother: ${name}`);
  const maxHealth = Math.max(1, finite(overrides.maxHealth, 100));
  const health = clamp(finite(overrides.health, maxHealth), 0, maxHealth);
  return {
    name,
    maxHealth,
    health,
    downed: Boolean(overrides.downed) || health <= 0,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !["name", "maxHealth", "health", "downed"].includes(key))),
  };
}

export function createBrotherParty(overrides = {}) {
  const venzo = createBrotherState("venzo", overrides.brothers?.venzo);
  const renzo = createBrotherState("renzo", overrides.brothers?.renzo);
  const active = BROTHERS.includes(overrides.active) ? overrides.active : "venzo";
  return {
    active,
    brothers: { venzo, renzo },
    defeat: venzo.downed && renzo.downed,
  };
}

export function otherBrother(name) {
  if (!BROTHERS.includes(name)) throw new RangeError(`Unknown brother: ${name}`);
  return name === "venzo" ? "renzo" : "venzo";
}

export function switchActiveBrother(party, requested = null) {
  const current = createBrotherParty(party);
  if (current.defeat) return current;
  const nextName = requested ?? otherBrother(current.active);
  if (!BROTHERS.includes(nextName) || current.brothers[nextName].downed) return current;
  return { ...current, active: nextName };
}

export function applyBrotherDamage(party, name, amount) {
  const current = createBrotherParty(party);
  if (!BROTHERS.includes(name) || current.defeat) return current;
  const victim = current.brothers[name];
  if (victim.downed) return current;
  const health = clamp(victim.health - Math.max(0, finite(amount)), 0, victim.maxHealth);
  const downed = health <= 0;
  const brothers = { ...current.brothers, [name]: { ...victim, health, downed } };
  let active = current.active;
  if (downed && active === name) {
    const survivor = otherBrother(name);
    if (!brothers[survivor].downed) active = survivor;
  }
  return { active, brothers, defeat: brothers.venzo.downed && brothers.renzo.downed };
}

export function reviveBrother(party, name, { inRange = true, healthFraction = 0.35 } = {}) {
  const current = createBrotherParty(party);
  if (!BROTHERS.includes(name) || !inRange || !current.brothers[name].downed) return current;
  const rescuer = otherBrother(name);
  if (current.brothers[rescuer].downed) return current;
  const fallen = current.brothers[name];
  const health = Math.max(1, Math.round(fallen.maxHealth * clamp(finite(healthFraction, 0.35), 0.01, 1)));
  return {
    ...current,
    defeat: false,
    brothers: { ...current.brothers, [name]: { ...fallen, health, downed: false } },
  };
}

export function partyOutcome(party) {
  const current = createBrotherParty(party);
  if (current.defeat) return "defeat";
  if (current.brothers.venzo.downed || current.brothers.renzo.downed) return "rescue";
  return "fighting";
}

function sanitizeSettings(settings = {}) {
  return {
    masterVolume: clamp(finite(settings.masterVolume, 0.75), 0, 1),
    muted: Boolean(settings.muted),
    reducedMotion: Boolean(settings.reducedMotion),
  };
}

function sanitizeFlags(flags = {}) {
  return {
    passAlarmCut: Boolean(flags.passAlarmCut),
    crestAlarmCut: Boolean(flags.crestAlarmCut),
  };
}

export function createSavePayload(state = {}) {
  const scenario = VALID_SCENARIOS.has(state.scenario) ? state.scenario : 1;
  const completedScenarios = [...new Set((Array.isArray(state.completedScenarios) ? state.completedScenarios : [])
    .filter((value) => value === 1 || value === 2))].sort();
  return {
    scenario,
    checkpoint: typeof state.checkpoint === "string" ? state.checkpoint.slice(0, 80) : "scenario-start",
    worldSeed: hashSeed(state.worldSeed ?? 0x4b414745),
    completedScenarios,
    upgrade: VALID_UPGRADES.has(state.upgrade) ? state.upgrade : null,
    flags: sanitizeFlags(state.flags),
    settings: sanitizeSettings(state.settings),
  };
}

function checksum(text) {
  return hashSeed(text).toString(16).padStart(8, "0");
}

export function serializeSave(state) {
  const payload = createSavePayload(state);
  const payloadText = JSON.stringify(payload);
  return JSON.stringify({ version: SAVE_VERSION, payload, checksum: checksum(payloadText) });
}

export function deserializeSave(serialized) {
  try {
    const envelope = JSON.parse(serialized);
    if (!envelope || envelope.version !== SAVE_VERSION || typeof envelope.payload !== "object") return null;
    if (checksum(JSON.stringify(envelope.payload)) !== envelope.checksum) return null;
    const clean = createSavePayload(envelope.payload);
    // Reject structurally valid but semantically altered/corrupt payloads.
    if (JSON.stringify(clean) !== JSON.stringify(envelope.payload)) return null;
    return clean;
  } catch {
    return null;
  }
}

export function saveToStorage(storage, key, state) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, serializeSave(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(storage, key) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? deserializeSave(value) : null;
  } catch {
    return null;
  }
}
