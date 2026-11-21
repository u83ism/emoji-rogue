import {
	HASTE_EXHAUSTION_TURNS_MAX,
	HASTE_POTION_TURNS_MAX,
	HASTE_POTION_TURNS_MIN,
	POISON_POTION_STRENGTH_LOSS_MAX,
	STRENGTH_POTION_STRENGTH_GAIN,
} from "../../balance.js";
import { rollDamageDice } from "../../combat/damage.js";
import { applyLevelUp } from "../../combat/experience.js";
import {
	applyStrengthChange,
	calculateRestoredStrength,
	isStrengthSustained,
} from "../../combat/strength.js";
import {
	buildEventLog,
	type GameEvent,
	type PotionKind,
} from "../../events.js";
import type { GameState } from "../../state.js";
import { applyTimedPotion } from "../../turnEnd/statusCountdowns.js";
import { applyHealingPotion } from "./healing.js";
import { applyMagicDetectionPotion } from "./magicDetection.js";

const withEvents = (state: GameState, events: readonly GameEvent[]) => ({
	...state,
	events: buildEventLog(state.events, events),
});

/**
 * Original Rogue's add_haste(): hasted for HASTE_POTION_TURNS_MIN..MAX
 * turns — two moves to every one of the monsters' (advanceTurn). Drinking
 * one while already hasted instead makes the player faint from exhaustion
 * for 0..HASTE_EXHAUSTION_TURNS_MAX turns, ending the haste and taking the
 * run flag away.
 */
const applyHastePotion = (state: GameState): GameState => {
	const roll = rollDamageDice(
		state.rng,
		state.hasteTurnsRemaining > 0
			? { count: 1, sides: HASTE_EXHAUSTION_TURNS_MAX + 1 }
			: {
					count: 1,
					sides: HASTE_POTION_TURNS_MAX - HASTE_POTION_TURNS_MIN + 1,
				},
		0,
		0,
	);
	if (state.hasteTurnsRemaining > 0) {
		const turns = roll.damage - 1;
		return withEvents(
			{
				...state,
				hasteTurnsRemaining: 0,
				hasteMoveSpent: false,
				paralyzedTurnsRemaining: state.paralyzedTurnsRemaining + turns,
				frozen: false,
				playerRunFlag: false,
				rng: roll.rng,
			},
			[{ type: "player-exhausted", payload: { turns } }],
		);
	}
	const turns = HASTE_POTION_TURNS_MIN + roll.damage - 1;
	/* the haste starts with the next turn: this one already had its single move */
	return withEvents(
		{
			...state,
			hasteTurnsRemaining: turns,
			hasteMoveSpent: true,
			rng: roll.rng,
		},
		[{ type: "player-hasted", payload: { turns } }],
	);
};

/**
 * Drinking one potion of `kind`. Drinking also identifies the kind for the
 * rest of the run, but that happens in the dispatcher (items/use.ts), like
 * every other item kind's identification on use. Consumption from
 * inventory happens there too.
 */
export const applyUsePotion = (
	state: GameState,
	kind: PotionKind,
): GameState => {
	switch (kind) {
		case "heal-potion":
		case "extra-healing-potion":
			return applyHealingPotion(state, kind);
		case "poison": {
			/* original Rogue: strength drops 1-3 and any hallucination ends (come_down) — no HP lost */
			const lossRoll = rollDamageDice(
				state.rng,
				{ count: 1, sides: POISON_POTION_STRENGTH_LOSS_MAX },
				0,
				0,
			);
			/* a ring of sustain strength keeps it all ("you feel momentarily sick") */
			const weakened = isStrengthSustained(state.inventory)
				? state
				: applyStrengthChange(state, -lossRoll.damage);
			return withEvents(
				{ ...weakened, hallucinatingTurnsRemaining: 0, rng: lossRoll.rng },
				[
					{
						type: "player-poisoned",
						payload: {
							strengthLost: state.playerStrength - weakened.playerStrength,
						},
					},
				],
			);
		}
		case "strength": {
			const stronger = applyStrengthChange(
				state,
				STRENGTH_POTION_STRENGTH_GAIN,
			);
			return withEvents(stronger, [
				{
					type: "player-strengthened",
					payload: { strength: stronger.playerStrength },
				},
			]);
		}
		case "restore-strength-potion":
			return withEvents(
				{ ...state, playerStrength: calculateRestoredStrength(state) },
				[
					{
						type: "strength-restored",
						payload: { strength: calculateRestoredStrength(state) },
					},
				],
			);
		case "haste-self-potion":
			return applyHastePotion(state);
		case "confusion":
		case "levitation":
		case "blindness":
		case "detect-monster":
		case "hallucination":
		case "see-invisible-potion":
			return applyTimedPotion(state, kind);
		case "raise-level":
			return applyLevelUp(state);
		case "magic-detection-potion":
			return applyMagicDetectionPotion(state);
	}
};
