import type { RngState } from "../../rng.js";
import {
	LEVEL_EXPERIENCE_THRESHOLDS,
	VITALITY_DRAIN_CHANCE_PERCENT,
	VITALITY_DRAIN_DICE,
} from "../balance.js";
import { rollDamageDice, rollToHit } from "../combat/damage.js";
import type { GameEvent } from "../events.js";

/** The two kinds whose landed hit can drain the player's vitality (original Rogue's 'V' and 'W'). */
export type VitalityDrainerKind = "vampire" | "wraith";

/** The player's side of a drain — everything it can change. */
export interface VitalityDrainTarget {
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerLevel: number;
	readonly playerExperience: number;
	readonly rng: RngState;
}

export interface VitalityDrainResult {
	readonly target: VitalityDrainTarget;
	readonly events: readonly GameEvent[];
	/** The drain itself killed the player: max HP fell to 0, or a wraith found no experience left to take. */
	readonly died: boolean;
}

/**
 * A wraith takes one level, as original Rogue's attack() does: with no
 * experience at all the player dies outright; dropping to level 0 leaves
 * level 1 with no experience; otherwise playerExperience becomes one past
 * LEVEL_EXPERIENCE_THRESHOLDS[newLevel - 1]. That is the threshold of the
 * level just lost, so the next experience gain gives the level (and its HP
 * die) back at once — the original's own quirk, kept as it is.
 */
const drainLevel = (
	playerLevel: number,
	playerExperience: number,
): { readonly level: number; readonly experience: number } | undefined => {
	if (playerExperience === 0) {
		return undefined;
	}
	const level = playerLevel - 1;
	if (level === 0) {
		return { level: 1, experience: 0 };
	}
	return {
		level,
		experience: (LEVEL_EXPERIENCE_THRESHOLDS[level - 1] ?? 0) + 1,
	};
};

/**
 * A vampire's or wraith's landed hit (original Rogue's attack(), the 'V'/'W'
 * case): VITALITY_DRAIN_CHANCE_PERCENT of the time it drains — a wraith
 * first takes a level (drainLevel) — then max HP and HP both drop by a roll
 * of VITALITY_DRAIN_DICE. HP never drops below 1 from this; max HP reaching
 * 0 kills. A failed chance roll changes nothing but the rng.
 */
export const resolveVitalityDrain = (
	kind: VitalityDrainerKind,
	target: VitalityDrainTarget,
): VitalityDrainResult => {
	const chance = rollToHit(target.rng, VITALITY_DRAIN_CHANCE_PERCENT[kind]);
	if (!chance.hit) {
		return { target: { ...target, rng: chance.rng }, events: [], died: false };
	}
	const events: GameEvent[] = [];
	let { playerLevel, playerExperience } = target;
	if (kind === "wraith") {
		const drained = drainLevel(playerLevel, playerExperience);
		if (drained === undefined) {
			return {
				target: { ...target, playerHp: 0, rng: chance.rng },
				events: [],
				died: true,
			};
		}
		if (drained.level !== playerLevel) {
			events.push({
				type: "player-level-drained",
				payload: { level: drained.level },
			});
		}
		playerLevel = drained.level;
		playerExperience = drained.experience;
	}
	const roll = rollDamageDice(chance.rng, VITALITY_DRAIN_DICE[kind], 0, 0);
	const playerMaxHp = target.playerMaxHp - roll.damage;
	const died = playerMaxHp <= 0;
	events.push({
		type: "player-drained",
		payload: { by: kind, maxHpLost: roll.damage },
	});
	return {
		target: {
			playerHp: died ? 0 : Math.max(1, target.playerHp - roll.damage),
			playerMaxHp: Math.max(0, playerMaxHp),
			playerLevel,
			playerExperience,
			rng: roll.rng,
		},
		events,
		died,
	};
};
