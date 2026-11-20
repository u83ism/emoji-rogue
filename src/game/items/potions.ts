import {
	BLIND_POTION_DURATION,
	CONFUSION_POTION_DURATION,
	DETECT_MONSTER_POTION_DURATION,
	HALLUCINATION_POTION_DURATION,
	HEAL_POTION_DICE_SIDES,
	LEVITATION_POTION_DURATION,
	LIFE_POTION_MAX_HP_BONUS,
	PARALYSIS_POTION_DURATION,
	POISON_POTION_STRENGTH_LOSS_MAX,
	STRENGTH_POTION_STRENGTH_GAIN,
} from "../balance.js";
import { rollDamageDice } from "../damage.js";
import { buildEventLog, type ItemKind, type PotionKind } from "../events.js";
import { applyLevelUp } from "../experience.js";
import type { GameState } from "../state.js";
import { applyStrengthChange } from "../strength.js";

/** `identifiedPotionKinds` with `kind` added, if it was not already there. */
const identifyPotionKind = (
	identifiedPotionKinds: readonly ItemKind[],
	kind: PotionKind,
): readonly ItemKind[] =>
	identifiedPotionKinds.includes(kind)
		? identifiedPotionKinds
		: [...identifiedPotionKinds, kind];

/**
 * Drinking one potion of `kind`. Every branch also identifies that kind for
 * the rest of the run (see GameState.identifiedPotionKinds) — drinking is
 * what reveals an unidentified potion's true name. The healing potion heals
 * up to the cap (drinking at full health wastes it); poison can end the run.
 * Consumption from inventory happens in the dispatcher (items/use.ts).
 */
export const applyUsePotion = (
	state: GameState,
	kind: PotionKind,
): GameState => {
	const identifiedPotionKinds = identifyPotionKind(
		state.identifiedPotionKinds,
		kind,
	);

	switch (kind) {
		case "heal-potion": {
			/* original Rogue: level d4, and a potion that would overheal raises max HP by 1 instead */
			const healRoll = rollDamageDice(
				state.rng,
				{ count: state.playerLevel, sides: HEAL_POTION_DICE_SIDES },
				0,
				0,
			);
			const overheals = state.playerHp + healRoll.damage > state.playerMaxHp;
			const playerMaxHp = overheals ? state.playerMaxHp + 1 : state.playerMaxHp;
			const playerHp = overheals
				? playerMaxHp
				: state.playerHp + healRoll.damage;
			const amount = playerHp - state.playerHp;
			return {
				...state,
				playerHp,
				playerMaxHp,
				rng: healRoll.rng,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{ type: "player-healed", payload: { by: kind, amount } },
				]),
			};
		}
		case "poison": {
			/* original Rogue: strength drops 1-3 and any hallucination ends (come_down) — no HP lost */
			const lossRoll = rollDamageDice(
				state.rng,
				{ count: 1, sides: POISON_POTION_STRENGTH_LOSS_MAX },
				0,
				0,
			);
			const weakened = applyStrengthChange(state, -lossRoll.damage);
			return {
				...weakened,
				hallucinatingTurnsRemaining: 0,
				rng: lossRoll.rng,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-poisoned",
						payload: {
							strengthLost: state.playerStrength - weakened.playerStrength,
						},
					},
				]),
			};
		}
		case "strength": {
			const stronger = applyStrengthChange(
				state,
				STRENGTH_POTION_STRENGTH_GAIN,
			);
			return {
				...stronger,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-strengthened",
						payload: { strength: stronger.playerStrength },
					},
				]),
			};
		}
		case "confusion":
			return {
				...state,
				confusedTurnsRemaining: CONFUSION_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-confused",
						payload: { turns: CONFUSION_POTION_DURATION },
					},
				]),
			};
		case "levitation":
			return {
				...state,
				levitationTurnsRemaining: LEVITATION_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-levitated",
						payload: { turns: LEVITATION_POTION_DURATION },
					},
				]),
			};
		case "blindness":
			return {
				...state,
				blindTurnsRemaining: BLIND_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{ type: "player-blinded", payload: { turns: BLIND_POTION_DURATION } },
				]),
			};
		case "paralysis":
			return {
				...state,
				paralyzedTurnsRemaining: PARALYSIS_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-paralyzed",
						payload: { turns: PARALYSIS_POTION_DURATION },
					},
				]),
			};
		case "raise-level":
			return { ...applyLevelUp(state), identifiedPotionKinds };
		case "detect-monster":
			return {
				...state,
				detectMonstersTurnsRemaining: DETECT_MONSTER_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-detected-monsters",
						payload: { turns: DETECT_MONSTER_POTION_DURATION },
					},
				]),
			};
		case "hallucination":
			return {
				...state,
				hallucinatingTurnsRemaining: HALLUCINATION_POTION_DURATION,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-hallucinated",
						payload: { turns: HALLUCINATION_POTION_DURATION },
					},
				]),
			};
		case "life": {
			const playerMaxHp = state.playerMaxHp + LIFE_POTION_MAX_HP_BONUS;
			return {
				...state,
				playerMaxHp,
				playerHp: playerMaxHp,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-revitalized",
						payload: { maxHpBonus: LIFE_POTION_MAX_HP_BONUS },
					},
				]),
			};
		}
	}
};
