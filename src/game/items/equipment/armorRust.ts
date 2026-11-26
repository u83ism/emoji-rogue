import type { GameEvent } from "../../events.js";
import type { HeldItem } from "../../state.js";
import { replaceHeldItem } from "../inventory/inventory.js";
import {
	RUST_ARMOR_CLASS_LIMIT,
	RUSTPROOF_ARMOR_KIND,
} from "./equipmentKinds.js";
import { calculateArmorClass, findEquippedArmor } from "./equipmentStats.js";

/** What one rust attempt did: the (possibly worsened) inventory and the event to log, if any. */
export interface ArmorRust {
	readonly inventory: readonly HeldItem[];
	readonly event: GameEvent | undefined;
}

/**
 * One rust attempt (an aquator's landed hit, a rust trap), as original
 * Rogue's rust_armor(): no armor, leather, or armor already rusted down to
 * RUST_ARMOR_CLASS_LIMIT is silently unaffected; protected armor or a worn
 * ring of maintain armor blocks the rust and logs armor-rust-blocked ("the rust vanishes instantly");
 * otherwise the armor loses a point (defenseBonus - 1) and armor-rusted is
 * logged.
 */
export const resolveArmorRust = (inventory: readonly HeldItem[]): ArmorRust => {
	const equippedArmor = findEquippedArmor(inventory);
	if (
		equippedArmor === undefined ||
		equippedArmor.armorKind === RUSTPROOF_ARMOR_KIND ||
		calculateArmorClass(equippedArmor) >= RUST_ARMOR_CLASS_LIMIT
	) {
		return { inventory, event: undefined };
	}
	if (
		equippedArmor.rustProtected ||
		inventory.some(
			(item) => item.kind === "maintain-armor-ring" && item.equipped,
		)
	) {
		return { inventory, event: { type: "armor-rust-blocked", payload: {} } };
	}
	return {
		inventory: replaceHeldItem(inventory, equippedArmor.itemId, {
			...equippedArmor,
			defenseBonus: equippedArmor.defenseBonus - 1,
		}),
		event: { type: "armor-rusted", payload: { amount: 1 } },
	};
};
