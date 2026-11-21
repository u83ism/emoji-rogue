import { applyEnemyHit } from "./combat/combat.js";
import { rollDamageDice, rollToHit } from "./combat/damage.js";
import { calculateThrowHitChancePercent } from "./combat/hitChance.js";
import { DIRECTION_VECTORS } from "./directions.js";
import { WEAPON_STATS } from "./items/equipment/equipmentKinds.js";
import {
	calculatePlayerStrengthBonus,
	findEquippedWeapon,
	type WeaponItem,
} from "./items/equipment/equipmentStats.js";
import { removeHeldItem, replaceHeldItem } from "./items/inventory.js";
import { applyMissileLanding } from "./missileLanding.js";
import type { Direction, Enemy, GameState, Position } from "./state.js";
import { nameEnemy } from "./vision.js";

const FLIGHT_STEPS = DIRECTION_VECTORS;

/**
 * Where a missile thrown `direction` stops, as original Rogue's do_motion():
 * it flies tile by tile from the player until the next tile holds a monster
 * (seen or not — an invisible one stops it too) or is not floor. It stops
 * on the monster's tile, or on the wall it ran into.
 */
/** Where a missile or a wand's bolt flying `direction` from the player stops, and the monster it stops at — see traceFlight's doc below. */
export const traceFlight = (
	state: GameState,
	direction: Direction,
): { readonly stop: Position; readonly target: Enemy | undefined } => {
	const [deltaX, deltaY] = FLIGHT_STEPS[direction];
	let x = state.player.x;
	let y = state.player.y;
	for (;;) {
		x += deltaX;
		y += deltaY;
		const target = state.enemies.find(
			(enemy) => enemy.x === x && enemy.y === y,
		);
		if (target !== undefined || state.terrain[x]?.[y] !== 0) {
			return { stop: { x, y }, target };
		}
	}
};

/**
 * Throws one of the held weapon `itemId` `direction`, as original Rogue's
 * missile(): it flies until it meets a monster or a wall (traceFlight). A
 * no-op (same reference, no turn spent) when the item is not a held
 * weapon or is the weapon currently wielded (the original refuses that
 * too). Thrown at no monster, it falls near where it stopped
 * (missile-landed).
 *
 * One leaves the stack (the slot empties with the last). To-hit is the
 * usual level + armor class + the missile's own hitBonus, +4 against a
 * target still asleep. An arrow shot with the bow wielded rolls its
 * hurlDice and adds the bow's bonuses; an arrow thrown by hand rolls its
 * plain damageDice; every other weapon rolls its hurlDice. A hit consumes
 * the missile; a miss drops it near the target (drawLandingTile), where it
 * can be picked up again. Either way the target wakes.
 */
export const applyThrowItem = (
	state: GameState,
	itemId: number,
	direction: Direction,
): GameState => {
	const item = state.inventory.find(
		(entry): entry is WeaponItem =>
			entry.kind === "weapon" && entry.itemId === itemId,
	);
	if (item === undefined || item.equipped) {
		return state;
	}
	const { stop, target } = traceFlight(state, direction);

	const stats = WEAPON_STATS[item.weaponKind];
	const wielded = findEquippedWeapon(state.inventory);
	const isLaunched =
		stats.launcher !== undefined && wielded?.weaponKind === stats.launcher;
	const damageDice =
		stats.launcher === undefined || isLaunched
			? stats.hurlDice
			: stats.damageDice;
	const hitBonus = item.hitBonus + (isLaunched ? (wielded?.hitBonus ?? 0) : 0);
	const damageBonus =
		item.damageBonus +
		(isLaunched ? (wielded?.damageBonus ?? 0) : 0) +
		calculatePlayerStrengthBonus(state);

	const inventory =
		item.quantity > 1
			? replaceHeldItem(state.inventory, item.itemId, {
					...item,
					quantity: item.quantity - 1,
				})
			: removeHeldItem(state.inventory, item.itemId);
	const thrown: GameState = {
		...state,
		inventory,
		quietTurns: 0,
	};

	if (target === undefined) {
		return applyMissileLanding(thrown, item, stop, state.rng, undefined);
	}
	const hitRoll = rollToHit(
		state.rng,
		calculateThrowHitChancePercent(state, target.kind, hitBonus),
	);
	if (hitRoll.hit) {
		const damageRoll = rollDamageDice(hitRoll.rng, damageDice, damageBonus, 0);
		return applyEnemyHit(
			{ ...thrown, rng: damageRoll.rng },
			target,
			damageRoll.damage,
			{
				type: "missile-hit",
				payload: {
					target: nameEnemy(state, target),
					variant: item.weaponKind,
					damage: damageRoll.damage,
				},
			},
		);
	}

	return applyMissileLanding(thrown, item, target, hitRoll.rng, target);
};
