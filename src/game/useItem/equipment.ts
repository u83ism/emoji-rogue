import { createRng, type RngState } from "../../rng.js";
import {
	MIN_PLAYER_ATTACK_DAMAGE,
	SHIELD_CURSE_CHANCE_PERCENT,
	SHIELD_DEFENSE_BONUS,
	SWORD_ATTACK_BONUS,
	SWORD_CURSE_CHANCE_PERCENT,
} from "../balance.js";
import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Whether an equipped sword/shield turns out cursed, rolled fresh at use
 * time (see SWORD_CURSE_CHANCE_PERCENT's comment for why not at spawn),
 * consuming (and advancing) the rng in the same temporary-stateful-Rng
 * pattern floor.ts's descendStairs and the teleport scroll both use.
 */
const rollCurse = (
	rngState: RngState,
	chancePercent: number,
): { readonly cursed: boolean; readonly rng: RngState } => {
	const rng = createRng(1).setState(rngState);
	return {
		cursed: rng.getUniformInt(0, 99) < chancePercent,
		rng: rng.getState(),
	};
};

/**
 * A sword permanently raises playerAttackDamage — stacking, no cap — unless
 * the curse roll lands, which lowers it instead (clamped at
 * MIN_PLAYER_ATTACK_DAMAGE so attacks never hit for zero). Consumption from
 * inventory happens in the dispatcher (useItem/index.ts), not here.
 */
export const applyUseSword = (state: GameState): GameState => {
	const { cursed, rng } = rollCurse(state.rng, SWORD_CURSE_CHANCE_PERCENT);
	const rawBonus = cursed ? -SWORD_ATTACK_BONUS : SWORD_ATTACK_BONUS;
	const playerAttackDamage = Math.max(
		MIN_PLAYER_ATTACK_DAMAGE,
		state.playerAttackDamage + rawBonus,
	);
	return {
		...state,
		playerAttackDamage,
		rng,
		events: buildEventLog(state.events, [
			{
				type: "weapon-equipped",
				payload: {
					kind: "sword",
					bonus: playerAttackDamage - state.playerAttackDamage,
				},
			},
		]),
	};
};

/**
 * A shield permanently raises playerDefense — stacking, no cap — unless the
 * curse roll lands, which lowers it instead (allowed to go negative; see
 * MIN_DAMAGE_TAKEN for why no clamp is needed on the damage side).
 */
export const applyUseShield = (state: GameState): GameState => {
	const { cursed, rng } = rollCurse(state.rng, SHIELD_CURSE_CHANCE_PERCENT);
	const bonus = cursed ? -SHIELD_DEFENSE_BONUS : SHIELD_DEFENSE_BONUS;
	return {
		...state,
		playerDefense: state.playerDefense + bonus,
		rng,
		events: buildEventLog(state.events, [
			{ type: "armor-equipped", payload: { kind: "shield", bonus } },
		]),
	};
};
