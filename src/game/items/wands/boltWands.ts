import { stepUniform } from "../../../rng.js";
import {
	calculateEnemyLevelBonus,
	calculateMagicSaveChancePercent,
	calculatePlayerMagicSaveChancePercent,
} from "../../balance.js";
import { applyEnemyHit } from "../../combat/combat.js";
import { calculateStrengthDamageBonus } from "../../combat/strength.js";
import { DIRECTION_VECTORS } from "../../directions.js";
import { ENEMY_STATS } from "../../enemies/enemyStats.js";
import { type BoltKind, buildEventLog, type GameEvent } from "../../events.js";
import type { Direction, GameState, Position } from "../../state.js";
import { nameEnemy } from "../../vision.js";
import { sumRingBonus } from "../equipment/equipmentStats.js";

/** Original Rogue's BOLT_LENGTH: how many tiles a bolt flies. */
const BOLT_LENGTH = 6;

const isFloor = (state: GameState, position: Position): boolean =>
	state.terrain[position.x]?.[position.y] === 0;

/** 6d6 off the state's rng — a bolt's hurl dice. */
const rollBoltDamage = (
	state: GameState,
): { damage: number; state: GameState } => {
	let rng = state.rng;
	let damage = 0;
	for (let die = 0; die < 6; die++) {
		const roll = stepUniform(rng);
		rng = roll.state;
		damage += Math.floor(roll.value * 6) + 1;
	}
	return { damage, state: { ...state, rng } };
};

const withEvent = (state: GameState, event: GameEvent): GameState => ({
	...state,
	events: buildEventLog(state.events, [event]),
});

/**
 * A bolt zapped by the player, as original Rogue's fire_bolt() from the
 * hero: BOLT_LENGTH tiles \`direction\`, bouncing back off walls (a bounce
 * costs no length). It first can reach only monsters; each bounce — unless
 * it has just met something — switches it between reaching monsters and
 * reaching the player. A monster it meets saves against magic (the bolt
 * whizzes past, waking it) or is struck: a dragon turns a flame aside, any
 * other takes 6d6 plus the player's strength bonus as the player's own hit
 * (hit_monster()). Coming back at the player, it is dodged with a save
 * against magic or deals 6d6. A strike ends the flight.
 */
export const applyBolt = (
	start: GameState,
	direction: Direction,
	kind: BoltKind,
): GameState => {
	let [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	let state = start;
	let position: Position = start.player;
	let reachesPlayer = false;
	let changed = false;
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
			const save = stepUniform(state.rng);
			state = { ...state, rng: save.state };
			const level =
				ENEMY_STATS[monster.kind].level + calculateEnemyLevelBonus(state.floor);
			const name = nameEnemy(state, monster);
			if (save.value * 100 < calculateMagicSaveChancePercent(level)) {
				state = withEvent(
					{
						...state,
						enemies: state.enemies.map((enemy) =>
							enemy === monster
								? { ...enemy, awake: true, held: false }
								: enemy,
						),
					},
					{ type: "bolt-missed", payload: { kind, target: name } },
				);
				continue;
			}
			if (monster.kind === "dragon" && kind === "flame") {
				return withEvent(state, { type: "bolt-deflected", payload: {} });
			}
			const roll = rollBoltDamage(state);
			const damage =
				roll.damage + calculateStrengthDamageBonus(state.playerStrength);
			return applyEnemyHit(roll.state, monster, damage, {
				type: "bolt-hit",
				payload: { kind, target: name, damage },
			});
		}
		if (
			reachesPlayer &&
			next.x === state.player.x &&
			next.y === state.player.y
		) {
			reachesPlayer = false;
			changed = !changed;
			const save = stepUniform(state.rng);
			state = { ...state, rng: save.state };
			const dodges =
				save.value * 100 <
				calculatePlayerMagicSaveChancePercent(
					state.playerLevel,
					sumRingBonus(state.inventory, "protection-ring"),
				);
			if (dodges) {
				state = withEvent(state, { type: "bolt-dodged", payload: { kind } });
				continue;
			}
			const roll = rollBoltDamage(state);
			const playerHp = roll.state.playerHp - roll.damage;
			const struck = withEvent(
				{ ...roll.state, playerHp: Math.max(0, playerHp) },
				{ type: "player-bolted", payload: { kind, damage: roll.damage } },
			);
			return playerHp > 0
				? struck
				: withEvent(
						{ ...struck, status: "dead" },
						{ type: "player-died", payload: { by: "bolt" } },
					);
		}
	}
	return state;
};

/** A wand of fire (original Rogue's WS_FIRE): a flame bolt \`direction\` (applyBolt). Zapping it names it. */
export const applyUseFireWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState =>
	direction === undefined ? state : { ...applyBolt(state, direction, "flame") };
