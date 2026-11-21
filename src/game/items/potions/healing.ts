import {
	EXTRA_HEALING_POTION_DICE_SIDES,
	HEAL_POTION_DICE_SIDES,
} from "../../balance.js";
import { rollDamageDice } from "../../combat/damage.js";
import { buildEventLog, type GameEvent } from "../../events.js";
import type { GameState } from "../../state.js";

const withEvents = (state: GameState, events: readonly GameEvent[]) => ({
	...state,
	events: buildEventLog(state.events, events),
});

/** Blindness cured by a healing potion (original Rogue's sight()) — logged only if the player was blind. */
const cureBlindness = (state: GameState): GameState =>
	state.blindTurnsRemaining > 0
		? withEvents({ ...state, blindTurnsRemaining: 0 }, [
				{ type: "blindness-faded", payload: {} },
			])
		: state;

/**
 * A healing potion, as original Rogue's quaff(): level × d\`sides\` HP. Past
 * the maximum, the maximum goes up by 1 and HP fills it — an extra healing
 * potion overhealing by more than level + 1 raises it by 2. Either cures
 * blindness; extra healing also ends a hallucination (come_down()).
 */
export const applyHealingPotion = (
	state: GameState,
	kind: "heal-potion" | "extra-healing-potion",
): GameState => {
	const extra = kind === "extra-healing-potion";
	const healRoll = rollDamageDice(
		state.rng,
		{
			count: state.playerLevel,
			sides: extra ? EXTRA_HEALING_POTION_DICE_SIDES : HEAL_POTION_DICE_SIDES,
		},
		0,
		0,
	);
	const healed = state.playerHp + healRoll.damage;
	const overheals = healed > state.playerMaxHp;
	const bigOverheal =
		extra && healed > state.playerMaxHp + state.playerLevel + 1;
	const playerMaxHp =
		state.playerMaxHp + (overheals ? 1 : 0) + (bigOverheal ? 1 : 0);
	const playerHp = overheals ? playerMaxHp : healed;
	const drunk = withEvents(
		{
			...state,
			playerHp,
			playerMaxHp,
			hallucinatingTurnsRemaining: extra
				? 0
				: state.hallucinatingTurnsRemaining,
			rng: healRoll.rng,
		},
		[
			{
				type: "player-healed",
				payload: { by: kind, amount: playerHp - state.playerHp },
			},
		],
	);
	return cureBlindness(drunk);
};
