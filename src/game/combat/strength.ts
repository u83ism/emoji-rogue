import { at } from "../../indexing.js";
import type { RngState } from "../../rng.js";
import { calculatePoisonSaveChancePercent } from "../balance.js";
import type { GameState, HeldItem } from "../state.js";
import { rollToHit } from "./damage.js";

/** Strength never leaves this range — original Rogue's add_str(). */
export const STRENGTH_MIN = 3;
export const STRENGTH_MAX = 31;

// Original Rogue 5.4's str_plus[] and add_dam[] (fight.c), indexed by the
// strength score itself (0-31): what a strength adds to every to-hit roll
// and every damage roll. 7 to 16 is neutral for to-hit, 7 to 15 for damage;
// the starting 16 already deals +1.
// biome-ignore format: one row of the original table per line
const STRENGTH_HIT_BONUS: readonly number[] = [
	-7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
	1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
];
// biome-ignore format: one row of the original table per line
const STRENGTH_DAMAGE_BONUS: readonly number[] = [
	-7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3,
	3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6,
];

/** What `strength` adds to the player's to-hit rolls (melee and thrown). */
export const calculateStrengthHitBonus = (strength: number): number =>
	at(STRENGTH_HIT_BONUS, strength);

/** What `strength` adds to the player's damage rolls (melee and thrown). */
export const calculateStrengthDamageBonus = (strength: number): number =>
	at(STRENGTH_DAMAGE_BONUS, strength);

/** What a poisoned wound did to strength — see resolvePoisonDrain. */
export interface PoisonDrain {
	readonly playerStrength: number;
	/** 0 when the save was passed or strength was already at STRENGTH_MIN. */
	readonly strengthLost: number;
	readonly rng: RngState;
}

/**
 * A poisoned wound (a dart trap's dart, a scorpion's sting): unless the
 * player passes a save against poison (calculatePoisonSaveChancePercent)
 * or wears a ring of sustain strength (`sustained`), strength drops by one
 * — original Rogue's `if (!save(VS_POISON)) chg_str(-1)`. The maximum is
 * untouched, as for every drain. Consumes one rng step either way.
 */
export const resolvePoisonDrain = (
	playerStrength: number,
	playerLevel: number,
	rng: RngState,
	sustained: boolean,
): PoisonDrain => {
	const saveRoll = rollToHit(
		rng,
		calculatePoisonSaveChancePercent(playerLevel),
	);
	const drained =
		saveRoll.hit || sustained
			? playerStrength
			: Math.max(STRENGTH_MIN, playerStrength - 1);
	return {
		playerStrength: drained,
		strengthLost: playerStrength - drained,
		rng: saveRoll.rng,
	};
};

/** original Rogue's add_str(): `strength` moved by `amount`, kept within STRENGTH_MIN..STRENGTH_MAX. */
export const addStrength = (strength: number, amount: number): number =>
	Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, strength + amount));

/** Whether a ring of sustain strength is worn — no poison costs strength then (original Rogue's ISWEARING(R_SUSTSTR)). */
export const isStrengthSustained = (inventory: readonly HeldItem[]): boolean =>
	inventory.some(
		(item) => item.kind === "sustain-strength-ring" && item.equipped,
	);

/** The values of the add strength rings being worn — read here directly, not through items/rings.ts, which builds on this module. */
export const findWornAddStrengthBonuses = (
	inventory: readonly HeldItem[],
): readonly number[] =>
	inventory.flatMap((item) =>
		item.kind === "add-strength-ring" && item.equipped ? [item.bonus] : [],
	);

/**
 * Strength raised or lowered by `amount` — original Rogue's chg_str():
 * playerStrength (which includes what worn add strength rings add) moves
 * within STRENGTH_MIN..STRENGTH_MAX, and if that strength without the
 * rings is a new high it becomes playerMaxStrength (what a restore
 * strength potion brings a drained strength back to). A drain leaves the
 * maximum where it was.
 */
export const applyStrengthChange = (
	state: GameState,
	amount: number,
): GameState => {
	if (amount === 0) {
		return state;
	}
	const playerStrength = addStrength(state.playerStrength, amount);
	const withoutRings = findWornAddStrengthBonuses(state.inventory).reduce(
		(strength, bonus) => addStrength(strength, -bonus),
		playerStrength,
	);
	return {
		...state,
		playerStrength,
		playerMaxStrength: Math.max(state.playerMaxStrength, withoutRings),
	};
};
