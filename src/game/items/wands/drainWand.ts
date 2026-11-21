import { applyEnemyHit } from "../../combat/combat.js";
import { buildEventLog } from "../../events.js";
import {
	type Area,
	buildPassageMap,
	findArea,
	findAreaExits,
	findDoorCorridor,
	isSameArea,
} from "../../floor/passages.js";
import type { Direction, Enemy, GameState } from "../../state.js";
import { nameEnemy } from "../../vision.js";

/**
 * The monsters a drain life zap reaches, as original Rogue's drain(): those
 * in the player's room or corridor — standing in a doorway, the corridor
 * beyond too; in a corridor, those in its doorways as well.
 */
const findDrainees = (state: GameState): readonly Enemy[] => {
	const passages = buildPassageMap(state);
	const here = findArea(state, passages, state.player);
	const corridor = findDoorCorridor(state, passages, state.player);
	const beyond: Area | undefined =
		corridor === undefined ? undefined : { kind: "passage", id: corridor };
	const doorways =
		here?.kind === "passage" ? findAreaExits(state, passages, here) : [];
	return state.enemies.filter((enemy) => {
		const area = findArea(state, passages, enemy);
		return (
			isSameArea(area, here) ||
			(beyond !== undefined && isSameArea(area, beyond)) ||
			doorways.some((door) => door.x === enemy.x && door.y === enemy.y)
		);
	});
};

/**
 * A wand of drain life, as original Rogue's do_zap() (WS_DRAIN): with under
 * 2 HP the player is too weak to use it (no charge spent). Otherwise half
 * the player's HP is lost, and that much shared out among the monsters in
 * reach (findDrainees) — each awake now, any left at 0 HP killed as the
 * player's kill. With none in reach only a tingle (the charge spent all the
 * same). Zapping it does not name it.
 */
export const applyUseDrainLifeWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState => {
	if (direction === undefined || state.playerHp < 2) {
		return state;
	}
	const drainees = findDrainees(state);
	if (drainees.length === 0) {
		return {
			...state,
			events: buildEventLog(state.events, [{ type: "tingling", payload: {} }]),
		};
	}
	const playerHp = Math.floor(state.playerHp / 2);
	const share = Math.floor(playerHp / drainees.length);
	let current: GameState = {
		...state,
		playerHp,
		events: buildEventLog(state.events, [
			{ type: "life-drained", payload: { lost: state.playerHp - playerHp } },
		]),
	};
	for (const drainee of drainees) {
		const target = current.enemies.find(
			(enemy) => enemy.x === drainee.x && enemy.y === drainee.y,
		);
		if (target === undefined) {
			continue;
		}
		if (target.hp - share > 0) {
			current = {
				...current,
				enemies: current.enemies.map((enemy) =>
					enemy === target
						? { ...enemy, hp: enemy.hp - share, awake: true, held: false }
						: enemy,
				),
			};
			continue;
		}
		/* killed outright (killed()) — not a blow, so the glowing hands keep their glow */
		const killed = applyEnemyHit(
			{ ...current, nextHitConfuses: false },
			target,
			share,
			{
				type: "enemy-drained",
				payload: { target: nameEnemy(current, target), damage: share },
			},
		);
		current = { ...killed, nextHitConfuses: current.nextHitConfuses };
	}
	return current;
};
