import { INVENTORY_CAPACITY } from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import { EQUIPPED_GLYPH } from "../game/glyphs.js";
import type { HeldItem } from "../game/state.js";
import { resolveItemDisplayName } from "./gameNames.js";
import { INVENTORY_TITLE } from "./systemMessages.js";

// Inventory-row display wording, split out of messages.ts (which stays
// focused on formatEvent's log-line switch) once the two grew past the
// 200-line structure-lint limit together (milestone 81).

/** The inventory overlay's title line, with the fill level appended (e.g. "持ち物(iかEscで閉じる) 3/20"). */
export const formatInventoryTitle = (heldCount: number): string =>
	`${INVENTORY_TITLE} ${heldCount}/${INVENTORY_CAPACITY}`;

/**
 * The inventory row label for a held item: its display name, plus — only
 * once equipped, since that is the moment curse and bonus are revealed (see
 * HeldItem's doc comment) — an EQUIPPED_GLYPH prefix and a parenthetical of
 * its own bonus and curse status.
 */
export const formatHeldItemLabel = (
	item: HeldItem,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	const name = resolveItemDisplayName(item.kind, identifiedPotionKinds);
	if (!("equipped" in item) || !item.equipped) {
		return name;
	}
	const bonus =
		item.kind === "sword"
			? `攻撃+${item.attackBonus}`
			: item.kind === "armor"
				? `防御+${item.defenseBonus}`
				: undefined;
	const tags = [bonus, item.cursed ? "呪い" : undefined].filter(
		(tag): tag is string => tag !== undefined,
	);
	const suffix = tags.length > 0 ? `(${tags.join("・")})` : "";
	return `${EQUIPPED_GLYPH} ${name}${suffix}`;
};

/**
 * The verb prompt shown after selecting a row: "use" reads as 装備する/はずす
 * for a sword/armor/ring (matching what `u` actually does — toggle equip,
 * see items/equipment.ts and items/rings.ts) and つかう for everything else.
 * "drop" and the escape hint never change.
 */
export const resolveItemVerbPrompt = (item: HeldItem): string => {
	const useLabel = !("equipped" in item)
		? "つかう"
		: item.equipped
			? "はずす"
			: "装備する";
	return `u: ${useLabel}  d: すてる (Escで戻る)`;
};
