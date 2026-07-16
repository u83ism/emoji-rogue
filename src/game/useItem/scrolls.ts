import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../balance.js";
import { buildEventLog, POTION_KINDS } from "../events.js";
import type { GameState, InventoryEntry } from "../state.js";
import { applyTrapTeleport } from "../teleport.js";

/** An enchant weapon scroll always raises playerAttackDamage — never cursed, unlike a found sword. */
export const applyUseEnchantWeaponScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => ({
	...state,
	playerAttackDamage: state.playerAttackDamage + ENCHANT_WEAPON_BONUS,
	inventory,
	events: buildEventLog(state.events, [
		{ type: "weapon-enchanted", payload: { bonus: ENCHANT_WEAPON_BONUS } },
	]),
});

/** An enchant armor scroll always raises playerDefense — never cursed, unlike a found shield. */
export const applyUseEnchantArmorScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => ({
	...state,
	playerDefense: state.playerDefense + ENCHANT_ARMOR_BONUS,
	inventory,
	events: buildEventLog(state.events, [
		{ type: "armor-enchanted", payload: { bonus: ENCHANT_ARMOR_BONUS } },
	]),
});

/** A protect armor scroll sets armorProtected for good — aquator rust never lands again. */
export const applyUseProtectArmorScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => ({
	...state,
	armorProtected: true,
	inventory,
	events: buildEventLog(state.events, [
		{ type: "armor-protected", payload: {} },
	]),
});

/** A teleport scroll relocates the player exactly like a teleport trap does. */
export const applyUseTeleportScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => ({ ...applyTrapTeleport(state), inventory });

/** A magic mapping scroll reveals the whole floor as explored. */
export const applyUseMappingScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => ({
	...state,
	explored: state.terrain.map((column) => column.map(() => true)),
	inventory,
	events: buildEventLog(state.events, [{ type: "floor-mapped", payload: {} }]),
});

/**
 * An identify scroll reveals the first potion kind (in POTION_KINDS order)
 * not yet identified this run. With everything already identified it is a
 * no-op — same reference, no turn spent, scroll not consumed, matching how
 * using an unheld item behaves.
 */
export const applyUseIdentifyScroll = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => {
	const target = POTION_KINDS.find(
		(potionKind) => !state.identifiedPotionKinds.includes(potionKind),
	);
	if (target === undefined) {
		return state;
	}
	return {
		...state,
		inventory,
		identifiedPotionKinds: [...state.identifiedPotionKinds, target],
		events: buildEventLog(state.events, [
			{ type: "potion-identified", payload: { kind: target } },
		]),
	};
};
