import type { ItemAppearances } from "../game/appearances.js";
import { INVENTORY_CAPACITY, UNARMORED_ARMOR_CLASS } from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import { EQUIPPED_GLYPH } from "../game/glyphs.js";
import { canThrowItem } from "../game/inventoryKeymap.js";
import { calculateArmorClass } from "../game/items/equipment/equipmentStats.js";
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

/** Strength beside its run maximum, as original Rogue's status line shows it ("16/16", "14/17" once poisoned). */
export const formatPlayerStrength = (state: GameState): string =>
	`${state.playerStrength}/${state.playerMaxStrength}`;

/**
 * The inventory row label for a held item: its display name (a weapon or
 * armor by which one it is), plus — only once equipped, since that is the
 * moment curse and bonus are revealed (see HeldItem's doc comment) — an
 * EQUIPPED_GLYPH prefix and a parenthetical of its own bonus and curse
 * status.
 */
export const formatHeldItemLabel = (
	item: HeldItem,
	identifiedItemKinds: readonly ItemKind[],
	appearances?: ItemAppearances,
	knownItemIds: readonly number[] = [],
): string => {
	const name =
		item.kind === "weapon"
			? `${EQUIPMENT_NAMES[item.weaponKind]}${item.quantity > 1 ? `×${item.quantity}` : ""}`
			: item.kind === "armor"
				? EQUIPMENT_NAMES[item.armorKind]
				: resolveItemDisplayName(
						item.kind,
						identifiedItemKinds,
						undefined,
						appearances,
					);
	/* a ring's bonus or a wand's charges, once identified (ISKNOW) */
	const known = !knownItemIds.includes(item.itemId)
		? ""
		: "charges" in item
			? `(残り${item.charges}回)`
			: "bonus" in item
				? `(${formatSignedBonus(item.bonus)})`
				: item.kind === "weapon"
					? `(命中${formatSignedBonus(item.hitBonus)}・ダメージ${formatSignedBonus(item.damageBonus)})`
					: "";
	if (!("equipped" in item) || !item.equipped) {
		return `${name}${known}`;
	}
	const bonus =
		item.kind === "weapon"
			? `命中${formatSignedBonus(item.hitBonus)}・ダメージ${formatSignedBonus(item.damageBonus)}`
			: item.kind === "armor"
				? `防御${UNARMORED_ARMOR_CLASS - calculateArmorClass(item)}`
				: undefined;
	const tags = [
		bonus ?? (known === "" ? undefined : known.slice(1, -1)),
		item.cursed ? "呪い" : undefined,
	].filter((tag): tag is string => tag !== undefined);
	const suffix = tags.length > 0 ? `(${tags.join("・")})` : "";
	return `${EQUIPPED_GLYPH} ${name}${suffix}`;
};

/**
 * The verb prompt shown after selecting a row: "use" reads as 装備する/はずす
 * for a weapon/armor/ring (matching what `u` actually does — toggle equip,
 * see items/equipment/equipment.ts and items/rings/rings.ts) and つかう for everything else.
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
