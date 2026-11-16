import { INVENTORY_CAPACITY, UNARMORED_ARMOR_CLASS } from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import { EQUIPPED_GLYPH } from "../game/glyphs.js";
import { canThrowItem } from "../game/inventoryKeymap.js";
import {
	calculateArmorClass,
	calculatePlayerDamageBonus,
	calculatePlayerDamageDice,
} from "../game/items/equipmentStats.js";
import type { GameState, HeldItem } from "../game/state.js";
import { EQUIPMENT_NAMES, resolveItemDisplayName } from "./gameNames.js";
import { INVENTORY_TITLE } from "./systemMessages.js";

// Inventory-row display wording, split out of messages.ts (which stays
// focused on formatEvent's log-line switch) once the two grew past the
// 200-line structure-lint limit together (milestone 81).

/** The inventory overlay's title line, with the fill level appended (e.g. "持ち物(Escで閉じる) 3/26"). */
export const formatInventoryTitle = (heldCount: number): string =>
	`${INVENTORY_TITLE} ${heldCount}/${INVENTORY_CAPACITY}`;

/** A weapon/armor bonus with its sign spelled out ("+2", "+0", "-1") — a cursed item's bonus can be negative. */
export const formatSignedBonus = (bonus: number): string =>
	bonus < 0 ? `${bonus}` : `+${bonus}`;

/** What the player's hits roll right now, in dice notation with the flat bonus appended ("2d4+2", "1d4+1", "3d4-1") — the status bar's attack readout. */
export const formatPlayerAttack = (state: GameState): string => {
	const dice = calculatePlayerDamageDice(state.inventory);
	const bonus = calculatePlayerDamageBonus(state);
	return `${dice.count}d${dice.sides}${bonus === 0 ? "" : formatSignedBonus(bonus)}`;
};

/**
 * The inventory row label for a held item: its display name (a weapon or
 * armor by which one it is), plus — only once equipped, since that is the
 * moment curse and bonus are revealed (see HeldItem's doc comment) — an
 * EQUIPPED_GLYPH prefix and a parenthetical of its own bonus and curse
 * status.
 */
export const formatHeldItemLabel = (
	item: HeldItem,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	const name =
		item.kind === "weapon"
			? `${EQUIPMENT_NAMES[item.weaponKind]}${item.quantity > 1 ? `×${item.quantity}` : ""}`
			: item.kind === "armor"
				? EQUIPMENT_NAMES[item.armorKind]
				: resolveItemDisplayName(item.kind, identifiedPotionKinds);
	if (!("equipped" in item) || !item.equipped) {
		return name;
	}
	const bonus =
		item.kind === "weapon"
			? `命中${formatSignedBonus(item.hitBonus)}・ダメージ${formatSignedBonus(item.damageBonus)}`
			: item.kind === "armor"
				? `防御${UNARMORED_ARMOR_CLASS - calculateArmorClass(item)}`
				: undefined;
	const tags = [bonus, item.cursed ? "呪い" : undefined].filter(
		(tag): tag is string => tag !== undefined,
	);
	const suffix = tags.length > 0 ? `(${tags.join("・")})` : "";
	return `${EQUIPPED_GLYPH} ${name}${suffix}`;
};

/**
 * The verb prompt shown after selecting a row: "use" reads as 装備する/はずす
 * for a weapon/armor/ring (matching what `u` actually does — toggle equip,
 * see items/equipment.ts and items/rings.ts) and つかう for everything else.
 * "drop" and the escape hint never change; "throw" appears for a weapon
 * that is not the one wielded (see inventoryKeymap.ts's canThrowItem).
 */
export const resolveItemVerbPrompt = (item: HeldItem): string => {
	const useLabel = !("equipped" in item)
		? "つかう"
		: item.equipped
			? "はずす"
			: "装備する";
	const throwLabel = canThrowItem(item) ? "  t: なげる" : "";
	return `u: ${useLabel}  d: すてる${throwLabel} (Escで戻る)`;
};
