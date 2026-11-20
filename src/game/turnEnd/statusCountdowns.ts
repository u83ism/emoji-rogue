import { createRng } from "../../rng.js";
import {
	BLIND_POTION_DURATION,
	CONFUSION_POTION_DURATION,
	DETECT_MONSTER_POTION_DURATION,
	HALLUCINATION_POTION_DURATION,
	LEVITATION_POTION_DURATION,
	SEE_INVISIBLE_POTION_DURATION,
} from "../balance.js";
import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Every timed status whose whole per-turn behavior is "count down by one,
 * log a faded event the turn it reaches 0". What each status actually does
 * while positive lives with whatever reads its field (applyMove for
 * confusion, applyTrapTrigger for levitation, vision.ts's resolveViewRadius
 * for blindness, advanceTurn for paralysis, frame.ts for detect monsters
 * and hallucination) — none of that is here.
 */
const COUNTDOWN_FIELDS = [
	"confusedTurnsRemaining",
	"levitationTurnsRemaining",
	"blindTurnsRemaining",
	"paralyzedTurnsRemaining",
	"detectMonstersTurnsRemaining",
	"hallucinatingTurnsRemaining",
	"hasteTurnsRemaining",
	"seeInvisibleTurnsRemaining",
] as const;

type CountdownField = (typeof COUNTDOWN_FIELDS)[number];

/** The event logged when a countdown runs out. */
const FADED_EVENTS: Readonly<Record<CountdownField, GameEvent>> = {
	confusedTurnsRemaining: { type: "confusion-faded", payload: {} },
	levitationTurnsRemaining: { type: "levitation-faded", payload: {} },
	blindTurnsRemaining: { type: "blindness-faded", payload: {} },
	paralyzedTurnsRemaining: { type: "paralysis-faded", payload: {} },
	detectMonstersTurnsRemaining: { type: "detect-monsters-faded", payload: {} },
	hallucinatingTurnsRemaining: { type: "hallucination-faded", payload: {} },
	hasteTurnsRemaining: { type: "haste-faded", payload: {} },
	seeInvisibleTurnsRemaining: { type: "see-invisible-faded", payload: {} },
};

const applyCountdownTick = (
	state: GameState,
	field: CountdownField,
): GameState => {
	if (state[field] <= 0) {
		return state;
	}
	const remaining = state[field] - 1;
	if (remaining > 0) {
		return { ...state, [field]: remaining };
	}
	return {
		...state,
		[field]: 0,
		events: buildEventLog(state.events, [FADED_EVENTS[field]]),
	};
};

/**
 * Ticks every active status countdown once (in COUNTDOWN_FIELDS order),
 * after every turn-consuming action. Deterministic — nothing to roll. A no-op (same reference) when no
 * countdown is active or the run is no longer playing.
 */
export const applyStatusCountdownTicks = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	const ticked = COUNTDOWN_FIELDS.reduce(applyCountdownTick, state);
	/* original Rogue's "you can move again" turns the run flag back on */
	return state.paralyzedTurnsRemaining > 0 &&
		ticked.paralyzedTurnsRemaining === 0
		? { ...ticked, playerRunFlag: true }
		: ticked;
};

/** The potions (items/potions.ts) that only start one of these timed statuses: which countdown, for how long, and the event that says so. */
const TIMED_POTIONS = {
	confusion: {
		field: "confusedTurnsRemaining",
		turns: CONFUSION_POTION_DURATION,
		event: "player-confused",
	},
	levitation: {
		field: "levitationTurnsRemaining",
		turns: LEVITATION_POTION_DURATION,
		event: "player-levitated",
	},
	blindness: {
		field: "blindTurnsRemaining",
		turns: BLIND_POTION_DURATION,
		event: "player-blinded",
	},
	"detect-monster": {
		field: "detectMonstersTurnsRemaining",
		turns: DETECT_MONSTER_POTION_DURATION,
		event: "player-detected-monsters",
	},
	hallucination: {
		field: "hallucinatingTurnsRemaining",
		turns: HALLUCINATION_POTION_DURATION,
		event: "player-hallucinated",
	},
	"see-invisible-potion": {
		field: "seeInvisibleTurnsRemaining",
		turns: SEE_INVISIBLE_POTION_DURATION,
		event: "player-sees-invisible",
	},
} as const;

/** The potions whose time original Rogue's do_pot() spreads (spread()); the detect monster potion's fuse is exact. */
const SPREAD_POTIONS: ReadonlySet<keyof typeof TIMED_POTIONS> = new Set([
	"confusion",
	"levitation",
	"blindness",
	"hallucination",
	"see-invisible-potion",
]);

/**
 * Starting one of TIMED_POTIONS' statuses, as original Rogue's do_pot(): the
 * time is spread(base) — base - base/20 + rnd(base/10) — for the spread
 * potions, and a status already running is lengthened by that much
 * instead of restarted (lengthen()).
 */
export const applyTimedPotion = (
	state: GameState,
	kind: keyof typeof TIMED_POTIONS,
): GameState => {
	const { field, turns: base, event } = TIMED_POTIONS[kind];
	const rng = createRng(1).setState(state.rng);
	const turns = SPREAD_POTIONS.has(kind)
		? base -
			Math.floor(base / 20) +
			(Math.floor(base / 10) > 0
				? rng.getUniformInt(0, Math.floor(base / 10) - 1)
				: 0)
		: base;
	return {
		...state,
		[field]: state[field] + turns,
		rng: rng.getState(),
		events: buildEventLog(state.events, [{ type: event, payload: { turns } }]),
	};
};
