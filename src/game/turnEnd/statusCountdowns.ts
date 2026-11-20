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
