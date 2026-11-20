import { err, ok, type Result } from "../../result.js";
import type { GameState } from "../state.js";
import { isRecord, validateGameState } from "./validateGameState.js";

/** Bump on any breaking change to the GameState shape. 2: floor + stairs. 3: items. 4: inventory. 5: playerAttackDamage. 6: playerDefense. 7: playerFood. 8: goldPiles + goldCollected. 9: traps. 10: identifiedPotionKinds. 11: enemies[].awake. 12: hasRingOfRegeneration. 13: stairs.direction + amulet + hasAmulet. 14: hasRingOfSustenance. 15: confusedTurnsRemaining. 16: enemies[].slowedTurnsRemaining. 17: levitationTurnsRemaining. 18: armorProtected. 19: blindTurnsRemaining. 20: playerMaxHp + playerLevel + playerExperience. 21: paralyzedTurnsRemaining. 22: detectMonstersTurnsRemaining. 23: turnsOnCurrentFloor. 24: hasAttacked + hasEaten. 25: ItemKind renames (heal-potion, teleport-scroll, mapping-scroll, identify-scroll, regeneration-ring, sustenance-ring, striking-wand, slow-wand). 26: ItemKind rename (shield -> armor). 27: inventory stacks removed — `InventoryEntry[]` ({kind,quantity}) became plain `ItemKind[]`, one slot per held item. 28: real equipment (milestone 81) — inventory entries became `HeldItem[]` (itemId + equip/curse/bonus state for weapon/armor/ring), `nextItemId` added, `playerAttackDamage`/`playerDefense`/`hasRingOfRegeneration`/`hasRingOfSustenance`/`armorProtected` removed, `playerPower` added, `ItemKind` gained `remove-curse-scroll`. 29: floor `items[]` weapon/armor/ring entries gained an optional `identity` (itemId/cursed/bonus) — fixes a dropped equipped item rerolling into a fresh one on re-pickup. 30: `enemies[].confusedTurnsRemaining` added (confuse monster scroll). 31: `hallucinatingTurnsRemaining` added (hallucination potion). 32: `winds-of-kron-warning`/`winds-of-kron-eviction` removed from the GameEvent union (Winds of Kron mechanic deleted — no precedent in Rogue 5.4, see docs/design.md's コンセプト方針). `turnsOnCurrentFloor` itself is unchanged (still ticks every turn, now only for frame.ts's hallucination decoy glyph). 33: `orc-gold-drop` generalized into `enemy-gold-drop` (payload gains `by`) — a thief now drops gold when killed too, like original Rogue's leprechaun. 34: `enemies[].maxHp` added (milestone 111 — enemy HP is rolled per individual as level d8, original Rogue's scale). 35: ItemKind rename (sword -> weapon), ahead of weapon kinds. 36: weapon/armor kinds (milestone 111) — a held/floor weapon gained `weaponKind` and split `attackBonus` into `hitBonus`/`damageBonus`, armor gained `armorKind`; `weapon-equipped`/`armor-equipped`/`weapon-enchanted` payloads changed and the item pickup/drop/steal events gained an optional `variant`. 37: `quietTurns` added (natural healing, original Rogue's doctor()); `player-regenerated` removed from the GameEvent union (healing ticks are silent now). 38: hunger on original Rogue's scale (milestone 112) — `floorsWithoutFood` added, `playerFood` can go negative while starving, `player-starved` replaced by `player-fainted`. 39: throwing (milestone 113) — a weapon gained `quantity`, four weapon kinds (short-bow, arrow, dart, shuriken) and the `missile-hit`/`missile-missed` events were added. 40: wandering monsters (milestone 114) — `wandererDelayTurns` and `wandererRollTurns` added. 41: original Rogue's small rules (milestone 115) — `deepestFloor` and `flytrapHoldDamage` added. 42: EnemyKind renames (ur-vile -> rhinoceros, icky-thing -> ice-monster), `player-frozen` event and the `hypothermia` death cause added. 43: strength (milestone 117) — `playerPower` replaced by `playerStrength`/`playerMaxStrength`, `player-strengthened` carries the new strength; `player-poisoned` carries the strength lost instead of damage, and the `poison` death cause is gone; `player-strength-drained` added. 44: EnemyKind rename (rat -> scorpion). 45: `identifiedPotionKinds` renamed `identifiedItemKinds` — wearing a ring or zapping a wand identifies its kind too, like drinking a potion. */
export const SAVE_FORMAT_VERSION = 46;

export type SaveFileError =
	| { readonly kind: "malformed-json" }
	| { readonly kind: "unsupported-version"; readonly foundVersion: unknown }
	| { readonly kind: "invalid-state"; readonly field: string };

/** The exact text written to a save file: a versioned GameState as JSON. */
export const buildSaveFileContent = (state: GameState): string =>
	JSON.stringify({ formatVersion: SAVE_FORMAT_VERSION, state });

/**
 * The inverse of buildSaveFileContent for untrusted input. A save file is
 * user-editable data on disk, so every failure here is an expected outcome
 * (Result), never a throw.
 */
export const parseSaveFileContent = (
	content: string,
): Result<GameState, SaveFileError> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return err({ kind: "malformed-json" });
	}
	if (!isRecord(parsed)) {
		return err({ kind: "malformed-json" });
	}
	if (parsed.formatVersion !== SAVE_FORMAT_VERSION) {
		return err({
			kind: "unsupported-version",
			foundVersion: parsed.formatVersion,
		});
	}
	const validated = validateGameState(parsed.state);
	if (!validated.ok) {
		return err({ kind: "invalid-state", field: validated.error });
	}
	return ok(validated.value);
};
