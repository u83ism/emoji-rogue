import { type RngState, stepUniform } from "../../../rng.js";
import {
	calculateEnemyLevelBonus,
	calculateMagicSaveChancePercent,
	calculatePlayerMagicSaveChancePercent,
} from "../../balance.js";
import { calculateStrengthDamageBonus } from "../../combat/strength.js";
import type { GameEvent } from "../../events.js";
import { buildPassageMap, findArea, isSameArea } from "../../floor/passages.js";
import { sumRingBonus } from "../../items/equipment/equipmentStats.js";
import type { GameState, Position } from "../../state.js";
import { nameEnemy } from "../../vision.js";
import { ENEMY_STATS } from "../enemyStats.js";
import type { EnemyTurnProgress } from "../turn/action.js";

/** Original Rogue's BOLT_LENGTH: how many tiles a bolt flies, and how far (squared) a dragon breathes from. */
const BOLT_LENGTH = 6;
/** Original Rogue's DRAGONSHOT: a dragon in reach breathes one time in this many. */
const DRAGON_SHOT_DENOMINATOR = 5;

const isFloor = (state: GameState, position: Position): boolean =>
	state.terrain[position.x]?.[position.y] === 0;

/** rnd(sides) == 0 off the rng. */
const rollsZero = (
	rng: RngState,
	sides: number,
): { readonly zero: boolean; readonly rng: RngState } => {
	const roll = stepUniform(rng);
	return { zero: Math.floor(roll.value * sides) === 0, rng: roll.state };
};

/** 6d6 off the rng — the flame's hurl dice. */
const rollFlameDamage = (
	rng: RngState,
): { readonly damage: number; readonly rng: RngState } => {
	let current = rng;
	let damage = 0;
	for (let die = 0; die < 6; die++) {
		const roll = stepUniform(current);
		current = roll.state;
		damage += Math.floor(roll.value * 6) + 1;
	}
	return { damage, rng: current };
};

/**
 * A dragon's flame in flight, as original Rogue's fire_bolt() started from
 * a monster: BOLT_LENGTH tiles, bouncing back off walls (a bounce costs no
 * length). It first can reach only the player; each bounce — unless it has
 * just struck something — switches it between reaching the player and
 * reaching monsters. A monster in reach saves against magic or is struck:
 * a dragon (the breather itself too) just turns it aside, any other takes
 * 6d6 plus the player's strength bonus (the original credits the player —
 * applied after the monsters' turn, enemies.ts). The player saves against
 * magic to dodge, or takes 6d6. A strike ends the flight.
 */
const flyFlame = (
	state: GameState,
	from: Position,
	direction: readonly [number, number],
	breathed: EnemyTurnProgress,
): EnemyTurnProgress => {
	let [deltaX, deltaY] = direction;
	let position = from;
	let reachesPlayer = true;
	let changed = false;
	let progress = breathed;
	const events: GameEvent[] = [...breathed.events];
	for (let flown = 0; flown < BOLT_LENGTH; ) {
		const next = { x: position.x + deltaX, y: position.y + deltaY };
		position = next;
		if (!isFloor(state, next)) {
			if (!changed) {
				reachesPlayer = !reachesPlayer;
			}
			changed = false;
			deltaX = -deltaX;
			deltaY = -deltaY;
			continue;
		}
		flown++;
		const monster = state.enemies.find(
			(enemy) => enemy.x === next.x && enemy.y === next.y,
		);
		if (!reachesPlayer && monster !== undefined) {
			reachesPlayer = true;
			changed = !changed;
			const save = stepUniform(progress.rng);
			progress = { ...progress, rng: save.state };
			const level =
				ENEMY_STATS[monster.kind].level + calculateEnemyLevelBonus(state.floor);
			if (save.value * 100 < calculateMagicSaveChancePercent(level)) {
				continue;
			}
			if (monster.kind === "dragon") {
				return { ...progress, events };
			}
			const roll = rollFlameDamage(progress.rng);
			return {
				...progress,
				rng: roll.rng,
				events,
				flameStrikes: [
					...progress.flameStrikes,
					{
						target: monster,
						name: nameEnemy(state, monster),
						damage:
							roll.damage +
							calculateStrengthDamageBonus(progress.playerStrength),
					},
				],
			};
		}
		if (
			reachesPlayer &&
			next.x === state.player.x &&
			next.y === state.player.y
		) {
			reachesPlayer = false;
			changed = !changed;
			const save = stepUniform(progress.rng);
			progress = { ...progress, rng: save.state };
			const dodges =
				save.value * 100 <
				calculatePlayerMagicSaveChancePercent(
					progress.playerLevel,
					sumRingBonus(progress.inventory, "protection-ring"),
				);
			if (dodges) {
				events.push({ type: "flame-dodged", payload: {} });
				continue;
			}
			const roll = rollFlameDamage(progress.rng);
			const playerHp = progress.playerHp - roll.damage;
			events.push({ type: "player-flamed", payload: { damage: roll.damage } });
			if (playerHp <= 0) {
				events.push({ type: "player-died", payload: { by: "dragon" } });
			}
			return {
				...progress,
				rng: roll.rng,
				playerHp,
				died: progress.died || playerHp <= 0,
				events,
			};
		}
	}
	return { ...progress, events };
};

/**
 * A dragon's turn spent breathing fire, as original Rogue's do_chase(): in
 * the player's own room or corridor, on a straight line to them (row,
 * column or diagonal) within BOLT_LENGTH, one time in DRAGON_SHOT_DENOMINATOR
 * it breathes instead of moving or biting (flyFlame). \`breathed\` false
 * leaves the turn to its usual action, with whatever rng the roll used.
 */
export const resolveDragonFlame = (
	state: GameState,
	dragon: Position,
	progress: EnemyTurnProgress,
): { readonly breathed: boolean; readonly progress: EnemyTurnProgress } => {
	const deltaX = state.player.x - dragon.x;
	const deltaY = state.player.y - dragon.y;
	const inLine =
		deltaX === 0 || deltaY === 0 || Math.abs(deltaX) === Math.abs(deltaY);
	const passages = buildPassageMap(state);
	if (
		!inLine ||
		deltaX * deltaX + deltaY * deltaY > BOLT_LENGTH * BOLT_LENGTH ||
		!isSameArea(
			findArea(state, passages, dragon),
			findArea(state, passages, state.player),
		)
	) {
		return { breathed: false, progress };
	}
	const shot = rollsZero(progress.rng, DRAGON_SHOT_DENOMINATOR);
	if (!shot.zero) {
		return { breathed: false, progress: { ...progress, rng: shot.rng } };
	}
	return {
		breathed: true,
		progress: flyFlame(state, dragon, [Math.sign(deltaX), Math.sign(deltaY)], {
			...progress,
			rng: shot.rng,
			playerAttacked: true,
		}),
	};
};
