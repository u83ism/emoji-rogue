import { createRng } from "../rng.js";
import { SLEEPING_TARGET_HIT_BONUS } from "./balance.js";
import { applyEnemyHit } from "./combat/combat.js";
import { rollDamageDice, rollToHit } from "./combat/damage.js";
import { calculateThrowHitChancePercent } from "./combat/hitChance.js";
import { buildEventLog } from "./events.js";
import { WEAPON_STATS } from "./items/equipmentKinds.js";
import {
	calculatePlayerStrengthBonus,
	findEquippedWeapon,
	type WeaponItem,
} from "./items/equipmentStats.js";
import { removeHeldItem, replaceHeldItem } from "./items/inventory.js";
import type { Enemy, GameState, Item, Position } from "./state.js";
import { findNearestVisibleEnemy } from "./vision.js";

/**
 * The tile a missile that missed comes to rest on: a random floor tile out
 * of the 3x3 around `target` (original Rogue's fallpos), skipping the
 * player's own tile and any tile that already holds an item or the
 * staircase. Undefined when none qualifies — the missile is simply lost.
 */
const drawLandingTile = (
	state: GameState,
	target: Position,
	rng: ReturnType<typeof createRng>,
): Position | undefined => {
	const candidates: Position[] = [];
	for (let x = target.x - 1; x <= target.x + 1; x++) {
		for (let y = target.y - 1; y <= target.y + 1; y++) {
			const isFree =
				state.terrain[x]?.[y] === 0 &&
				!(x === state.player.x && y === state.player.y) &&
				!(x === state.stairs.x && y === state.stairs.y) &&
				!state.items.some((item) => item.x === x && item.y === y);
			if (isFree) {
				candidates.push({ x, y });
			}
		}
	}
	return candidates.length === 0
		? undefined
		: candidates[rng.getUniformInt(0, candidates.length - 1)];
};

/**
 * Throws one of the held weapon `itemId` at the nearest visible enemy —
 * original Rogue's missile(), with the wands' automatic aim standing in for
 * its direction prompt. A no-op (same reference, no turn spent) when the
 * item is not a held weapon, is the weapon currently wielded (the original
 * refuses that too), or no enemy is in view.
 *
 * One leaves the stack (the slot empties with the last). To-hit is the
 * usual level + armor class + the missile's own hitBonus, +4 against a
 * target still asleep. An arrow shot with the bow wielded rolls its
 * hurlDice and adds the bow's bonuses; an arrow thrown by hand rolls its
 * plain damageDice; every other weapon rolls its hurlDice. A hit consumes
 * the missile; a miss drops it near the target (drawLandingTile), where it
 * can be picked up again. Either way the target wakes.
 */
export const applyThrowItem = (state: GameState, itemId: number): GameState => {
	const item = state.inventory.find(
		(entry): entry is WeaponItem =>
			entry.kind === "weapon" && entry.itemId === itemId,
	);
	if (item === undefined || item.equipped) {
		return state;
	}
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}

	const stats = WEAPON_STATS[item.weaponKind];
	const wielded = findEquippedWeapon(state.inventory);
	const isLaunched =
		stats.launcher !== undefined && wielded?.weaponKind === stats.launcher;
	const damageDice =
		stats.launcher === undefined || isLaunched
			? stats.hurlDice
			: stats.damageDice;
	const hitBonus =
		item.hitBonus +
		(isLaunched ? (wielded?.hitBonus ?? 0) : 0) +
		(target.awake ? 0 : SLEEPING_TARGET_HIT_BONUS);
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
					target: target.kind,
					variant: item.weaponKind,
					damage: damageRoll.damage,
				},
			},
		);
	}

	const rng = createRng(1).setState(hitRoll.rng);
	const landing = drawLandingTile(state, target, rng);
	/* the last of a stack keeps its own id; one split off a stack needs a fresh one */
	const splitsStack = item.quantity > 1;
	const landed: Item | undefined =
		landing === undefined
			? undefined
			: {
					...landing,
					kind: "weapon",
					identity: {
						itemId: splitsStack ? state.nextItemId : item.itemId,
						weaponKind: item.weaponKind,
						cursed: item.cursed,
						hitBonus: item.hitBonus,
						damageBonus: item.damageBonus,
						quantity: 1,
					},
				};
	return {
		...thrown,
		rng: rng.getState(),
		nextItemId:
			landed !== undefined && splitsStack
				? state.nextItemId + 1
				: state.nextItemId,
		items: landed === undefined ? state.items : [...state.items, landed],
		enemies: state.enemies.map(
			(enemy): Enemy => (enemy === target ? { ...enemy, awake: true } : enemy),
		),
		events: buildEventLog(state.events, [
			{
				type: "missile-missed",
				payload: { target: target.kind, variant: item.weaponKind },
			},
		]),
	};
};
