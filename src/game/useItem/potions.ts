import {
	BLIND_POTION_DURATION,
	CONFUSION_POTION_DURATION,
	DETECT_MONSTER_POTION_DURATION,
	LEVITATION_POTION_DURATION,
	LIFE_POTION_MAX_HP_BONUS,
	PARALYSIS_POTION_DURATION,
	POISON_DAMAGE,
	POTION_HEAL_AMOUNT,
	STRENGTH_POTION_ATTACK_BONUS,
} from "../balance.js";
import {
	buildEventLog,
	type GameEvent,
	type ItemKind,
	type PotionKind,
} from "../events.js";
import { applyLevelUp } from "../experience.js";
import type { GameState, InventoryEntry } from "../state.js";

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
 */
export const applyUsePotion = (
	state: GameState,
	inventory: readonly InventoryEntry[],
	kind: PotionKind,
): GameState => {
	const identifiedPotionKinds = identifyPotionKind(
		state.identifiedPotionKinds,
		kind,
	);

	switch (kind) {
		case "potion": {
			const amount = Math.min(
				POTION_HEAL_AMOUNT,
				state.playerMaxHp - state.playerHp,
			);
			return {
				...state,
				playerHp: state.playerHp + amount,
				inventory,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{ type: "player-healed", payload: { by: kind, amount } },
				]),
			};
		}
		case "poison": {
			const playerHp = state.playerHp - POISON_DAMAGE;
			const events: GameEvent[] = [
				{ type: "player-poisoned", payload: { damage: POISON_DAMAGE } },
			];
			if (playerHp <= 0) {
				events.push({ type: "player-died", payload: { by: "poison" } });
			}
			return {
				...state,
				playerHp: Math.max(0, playerHp),
				inventory,
				identifiedPotionKinds,
				status: playerHp <= 0 ? "dead" : state.status,
				events: buildEventLog(state.events, events),
			};
		}
		case "strength":
			return {
				...state,
				playerAttackDamage:
					state.playerAttackDamage + STRENGTH_POTION_ATTACK_BONUS,
				inventory,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-strengthened",
						payload: { bonus: STRENGTH_POTION_ATTACK_BONUS },
					},
				]),
			};
		case "confusion":
			return {
				...state,
				confusedTurnsRemaining: CONFUSION_POTION_DURATION,
				inventory,
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
				inventory,
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
				inventory,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{ type: "player-blinded", payload: { turns: BLIND_POTION_DURATION } },
				]),
			};
		case "paralysis":
			return {
				...state,
				paralyzedTurnsRemaining: PARALYSIS_POTION_DURATION,
				inventory,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-paralyzed",
						payload: { turns: PARALYSIS_POTION_DURATION },
					},
				]),
			};
		case "raise-level":
			return { ...applyLevelUp(state), inventory, identifiedPotionKinds };
		case "detect-monster":
			return {
				...state,
				detectMonstersTurnsRemaining: DETECT_MONSTER_POTION_DURATION,
				inventory,
				identifiedPotionKinds,
				events: buildEventLog(state.events, [
					{
						type: "player-detected-monsters",
						payload: { turns: DETECT_MONSTER_POTION_DURATION },
					},
				]),
			};
		case "life": {
			const playerMaxHp = state.playerMaxHp + LIFE_POTION_MAX_HP_BONUS;
			return {
				...state,
				playerMaxHp,
				playerHp: playerMaxHp,
				inventory,
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
