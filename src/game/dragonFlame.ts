import { type RngState, stepUniform } from "../rng.js";
import { calculatePlayerMagicSaveChancePercent } from "./balance.js";
import type { EnemyTurnProgress } from "./enemies/action.js";
import { buildPassageMap, findArea, isSameArea } from "./floor/passages.js";
import { sumRingBonus } from "./items/equipmentStats.js";
import type { GameState, Position } from "./state.js";

/** Original Rogue's BOLT_LENGTH: how many tiles a bolt flies, and how far (squared) a dragon breathes from. */
const BOLT_LENGTH = 6;
/** Original Rogue's DRAGONSHOT: a dragon in reach breathes one time in this many. */
const DRAGON_SHOT_DENOMINATOR = 5;

const isFloor = (state: GameState, position: Position): boolean =>
	state.terrain[position.x]?.[position.y] === 0;

/** rnd(sides) == 0 off the state's rng. */
const rollsZero = (
	rng: RngState,
	sides: number,
): { readonly zero: boolean; readonly rng: RngState } => {
	const roll = stepUniform(rng);
	return { zero: Math.floor(roll.value * sides) === 0, rng: roll.state };
};

/**
 * Where a dragon's flame meets the player, as original Rogue's fire_bolt()
 * started from a monster: it flies BOLT_LENGTH tiles, bouncing back off
 * walls (a bounce costs no length), and can reach the player only while it
 * has bounced an even number of times. (The
 * original's flame also strikes the monsters in its way after a bounce —
 * not done here.)
 */
const reachesPlayer = (
	state: GameState,
	from: Position,
	direction: readonly [number, number],
): boolean => {
	let [deltaX, deltaY] = direction;
	let position = from;
	let towardPlayer = true;
	for (let flown = 0; flown < BOLT_LENGTH; ) {
		const next = { x: position.x + deltaX, y: position.y + deltaY };
		if (!isFloor(state, next)) {
			towardPlayer = !towardPlayer;
			deltaX = -deltaX;
			deltaY = -deltaY;
			position = next;
			continue;
		}
		position = next;
		flown++;
		if (
			towardPlayer &&
			position.x === state.player.x &&
			position.y === state.player.y
		) {
			return true;
		}
	}
	return false;
};

/**
 * A dragon's turn spent breathing fire, as original Rogue's do_chase(): in
 * the player's own room or corridor, on a straight line to them (row,
 * column or diagonal) within BOLT_LENGTH, one time in DRAGON_SHOT_DENOMINATOR
 * it breathes instead of moving or biting. The player saves against magic
 * to dodge (flame-dodged), or takes 6d6 (player-flamed). `breathed` false
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
	const breathed = { ...progress, rng: shot.rng, playerAttacked: true };
	if (!reachesPlayer(state, dragon, [Math.sign(deltaX), Math.sign(deltaY)])) {
		return { breathed: true, progress: breathed };
	}
	const save = stepUniform(shot.rng);
	if (
		save.value * 100 <
		calculatePlayerMagicSaveChancePercent(
			progress.playerLevel,
			sumRingBonus(progress.inventory, "protection-ring"),
		)
	) {
		return {
			breathed: true,
			progress: {
				...breathed,
				rng: save.state,
				events: [...progress.events, { type: "flame-dodged", payload: {} }],
			},
		};
	}
	let rng = save.state;
	let damage = 0;
	for (let die = 0; die < 6; die++) {
		const roll = stepUniform(rng);
		rng = roll.state;
		damage += Math.floor(roll.value * 6) + 1;
	}
	const playerHp = progress.playerHp - damage;
	const died = playerHp <= 0;
	return {
		breathed: true,
		progress: {
			...breathed,
			rng,
			playerHp,
			died: progress.died || died,
			events: [
				...progress.events,
				{ type: "player-flamed", payload: { damage } },
				...(died
					? [
							{
								type: "player-died" as const,
								payload: { by: "dragon" as const },
							},
						]
					: []),
			],
		},
	};
};
