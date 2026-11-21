import type { Direction, GameState, HeldItem } from "../state.js";
import {
	applyToggleArmorEquip,
	applyToggleWeaponEquip,
} from "./equipment/equipment.js";
import {
	applyUseEnchantArmorScroll,
	applyUseEnchantWeaponScroll,
	applyUseProtectArmorScroll,
	applyUseRemoveCurseScroll,
} from "./equipment/equipmentScrolls.js";
import { applyUseFood } from "./food.js";
import { applyUsePotion } from "./potions/potions.js";
import { applyToggleRingEquip } from "./rings/rings.js";
import {
	applyUseAggravateMonstersScroll,
	applyUseConfuseMonsterScroll,
	applyUseCreateMonsterScroll,
	applyUseHoldMonsterScroll,
	applyUseIdentifyScroll,
	applyUseMappingScroll,
	applyUseSleepScroll,
	applyUseTeleportScroll,
} from "./scrolls/scrolls.js";
import { applyUseFireWand } from "./wands/boltWands.js";
import { applyUseLightWand } from "./wands/lightWand.js";
import {
	applyUseTeleportToWand,
	applyUseTeleportWand,
} from "./wands/teleportWands.js";
import {
	applyUseHasteMonsterWand,
	applyUseMagicMissileWand,
	applyUseNothingWand,
	applyUseSlowWand,
} from "./wands/wands.js";

/**
 * The per-item effect. Deliberately exhaustive with no default: adding an
 * ItemKind without wiring a handler here must be a compile error, never a
 * silent fallthrough into some other item's effect. Weapon/armor/ring toggle
 * equip state instead of being consumed — see applyUseItem, which reads
 * item.kind (not a same-reference check) to decide whether to remove the
 * item from inventory afterward. Every other handler may return the input
 * state unchanged (same reference) to signal "nothing happened", which
 * applyUseItem reads as "don't consume" — a wand with no visible target.
 * A scroll is always used up once read, even when it finds nothing to work
 * on (original Rogue's read_scroll()) — see applyScrollWasted.
 */
export const applyItemEffect = (
	state: GameState,
	item: HeldItem,
	targetItemId: number | undefined,
	direction: Direction | undefined,
): GameState => {
	switch (item.kind) {
		case "weapon":
			return applyToggleWeaponEquip(state, item);
		case "armor":
			return applyToggleArmorEquip(state, item);
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "aggravate-monster-ring":
		case "protection-ring":
		case "add-strength-ring":
		case "sustain-strength-ring":
		case "adornment-ring":
		case "dexterity-ring":
		case "increase-damage-ring":
		case "teleportation-ring":
		case "maintain-armor-ring":
		case "see-invisible-ring":
		case "searching-ring":
			return applyToggleRingEquip(state, item);
		case "enchant-weapon":
			return applyUseEnchantWeaponScroll(state);
		case "enchant-armor":
			return applyUseEnchantArmorScroll(state);
		case "protect-armor":
			return applyUseProtectArmorScroll(state);
		case "remove-curse-scroll":
			return applyUseRemoveCurseScroll(state);
		case "teleport-scroll":
			return applyUseTeleportScroll(state);
		case "mapping-scroll":
			return applyUseMappingScroll(state);
		case "identify-scroll":
			return applyUseIdentifyScroll(state, targetItemId);
		case "confuse-monster-scroll":
			return applyUseConfuseMonsterScroll(state);
		case "hold-monster-scroll":
			return applyUseHoldMonsterScroll(state);
		case "sleep-scroll":
			return applyUseSleepScroll(state);
		case "create-monster-scroll":
			return applyUseCreateMonsterScroll(state);
		case "aggravate-monsters-scroll":
			return applyUseAggravateMonstersScroll(state);
		case "food":
			return applyUseFood(state);
		case "slow-wand":
			return applyUseSlowWand(state, direction);
		case "teleport-wand":
			return applyUseTeleportWand(state, direction);
		case "magic-missile-wand":
			return applyUseMagicMissileWand(state, direction);
		case "fire-wand":
			return applyUseFireWand(state, direction);
		case "light-wand":
			return applyUseLightWand(state, direction);
		case "nothing-wand":
			return applyUseNothingWand(state, direction);
		case "teleport-to-wand":
			return applyUseTeleportToWand(state, direction);
		case "haste-monster-wand":
			return applyUseHasteMonsterWand(state, direction);
		case "heal-potion":
		case "poison":
		case "strength":
		case "confusion":
		case "levitation":
		case "blindness":
		case "raise-level":
		case "detect-monster":
		case "hallucination":
		case "restore-strength-potion":
		case "extra-healing-potion":
		case "haste-self-potion":
		case "see-invisible-potion":
			return applyUsePotion(state, item.kind);
	}
};
