import { type RngState, stepUniform } from "../../rng.js";
import type { EnemyKind } from "../events.js";
import { hasEquippedRing } from "../items/rings.js";
import type { Enemy, GameState } from "../state.js";
import { findPlayerRoom } from "../vision.js";
import { applyMedusaGaze } from "./medusaGaze.js";

/**
 * Original Rogue's ISMEAN flag per kind: a mean monster may start chasing
 * the moment the player comes close (wake_monster()); every other kind
 * sleeps on until something disturbs it (an attack, a wand, an aggravate).
 * A treasure room's monsters are made mean whatever their kind (Enemy.mean).
 */
export const ENEMY_IS_MEAN: Readonly<Record<EnemyKind, boolean>> = {
	aquator: true,
	bat: false,
	centaur: false,
	dragon: true,
	emu: true,
	"venus-flytrap": true,
	griffin: true,
	hobgoblin: true,
	"ice-monster": false,
	jabberwock: false,
	kestrel: true,
	thief: false,
	medusa: true,
	nymph: false,
	orc: false,
	phantom: false,
	quagga: true,
	scorpion: true,
	snake: true,
	troll: true,
	rhinoceros: true,
	vampire: true,
	wraith: false,
	xeroc: false,
	yeti: false,
	zombie: true,
};

/** Original Rogue's ISGREED: the orc wakes as soon as it is looked at, stealth or not. */
const isGreedy = (kind: EnemyKind): boolean => kind === "orc";

interface WakeRoll {
	readonly enemy: Enemy;
	readonly rng: RngState;
}

/**
 * One call of original Rogue's wake_monster() on a sleeping `enemy`: a mean
 * one wakes unless rnd(3) == 0, it is held, or the player wears a ring of
 * stealth or floats (`quiet`); a greedy one wakes regardless.
 */
const rollWake = (enemy: Enemy, rng: RngState, quiet: boolean): WakeRoll => {
	if (enemy.awake) {
		return { enemy, rng };
	}
	if (enemy.mean && !enemy.held && !quiet) {
		const roll = stepUniform(rng);
		const wakes = Math.floor(roll.value * 3) !== 0 || isGreedy(enemy.kind);
		return {
			enemy: wakes ? { ...enemy, awake: true } : enemy,
			rng: roll.state,
		};
	}
	if (isGreedy(enemy.kind)) {
		return { enemy: { ...enemy, awake: true }, rng };
	}
	return { enemy, rng };
};

/** `calls` wake_monster() calls on every enemy `isNear` picks, in array order — each one also the medusa's chance to gaze (medusaGaze.ts). */
const applyWakeRolls = (
	state: GameState,
	isNear: (enemy: Enemy) => boolean,
	calls: number,
): GameState => {
	const quiet =
		hasEquippedRing(state.inventory, "stealth-ring") ||
		state.levitationTurnsRemaining > 0;
	let running = state;
	const enemies = state.enemies.map((enemy) => {
		if (!isNear(enemy)) {
			return enemy;
		}
		let current = enemy;
		for (let i = 0; i < calls; i++) {
			const woken = rollWake(current, running.rng, quiet);
			const gazed = applyMedusaGaze(
				woken.rng === running.rng ? running : { ...running, rng: woken.rng },
				woken.enemy,
			);
			current = gazed.enemy;
			running = gazed.state;
		}
		return current;
	});
	return running === state &&
		enemies.every((enemy, index) => enemy === state.enemies[index])
		? state
		: { ...running, enemies };
};

/**
 * Original Rogue's enter_room(), which calls door_open() twice: every
 * monster in the room the player now stands in (walls and doors included)
 * gets two wake_monster() calls. Run whenever the player arrives in a room
 * — walking in through a door, teleporting, reaching a new floor.
 */
export const applyRoomEntryWake = (state: GameState): GameState => {
	const room = findPlayerRoom(state);
	if (room === undefined) {
		return state;
	}
	return applyWakeRolls(
		state,
		(enemy) =>
			enemy.x >= room.x1 - 1 &&
			enemy.x <= room.x2 + 1 &&
			enemy.y >= room.y1 - 1 &&
			enemy.y <= room.y2 + 1,
		2,
	);
};

const isFloor = (state: GameState, x: number, y: number): boolean =>
	state.terrain[x]?.[y] === 0;

/**
 * Original Rogue's look(true), run before every command: each monster on
 * the eight tiles around the player gets one wake_monster() call — except
 * one diagonal to the player across a corner, both tiles between them
 * being rock.
 */
export const applyLookWake = (state: GameState): GameState =>
	applyWakeRolls(
		state,
		(enemy) => {
			const deltaX = enemy.x - state.player.x;
			const deltaY = enemy.y - state.player.y;
			if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
				return false;
			}
			const diagonal = deltaX !== 0 && deltaY !== 0;
			return (
				!diagonal ||
				isFloor(state, enemy.x, state.player.y) ||
				isFloor(state, state.player.x, enemy.y)
			);
		},
		1,
	);
