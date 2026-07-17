import { encodePointKey } from "../pointkey.js";
import { createRng } from "../rng.js";
import { buildEventLog } from "./events.js";
import type { GameState, Position } from "./state.js";
import { deriveExploredState } from "./vision.js";

/**
 * Every floor tile a teleport scroll (or teleport trap) may land on: not the
 * player's own tile, not one occupied by an enemy (the "enemies never share
 * the player's tile" invariant must survive teleporting too). Falls back to
 * the player's own tile only if the map has no other floor tile at all (tiny
 * arenas).
 */
const collectTeleportTargets = (state: GameState): readonly Position[] => {
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);
	const tiles: Position[] = [];
	for (let x = 0; x < state.terrain.length; x++) {
		const column = state.terrain[x] ?? [];
		for (let y = 0; y < column.length; y++) {
			if (column[y] !== 0) {
				continue;
			}
			if (x === state.player.x && y === state.player.y) {
				continue;
			}
			if (occupied.has(encodePointKey(x, y))) {
				continue;
			}
			tiles.push({ x, y });
		}
	}
	return tiles.length > 0 ? tiles : [state.player];
};

/**
 * Relocates the player to a random floor tile (consuming state.rng) and
 * refreshes the explored grid from the new position. Shared by the teleport
 * scroll (items/scrolls.ts) and the teleport trap (trapTrigger.ts).
 */
export const applyRandomTeleport = (state: GameState): GameState => {
	const targets = collectTeleportTargets(state);
	const rng = createRng(1).setState(state.rng);
	const target = targets[rng.getUniformInt(0, targets.length - 1)];
	if (target === undefined) {
		throw new Error(
			"unreachable: collectTeleportTargets always returns at least one tile",
		);
	}
	return deriveExploredState({
		...state,
		player: target,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "player-teleported", payload: { x: target.x, y: target.y } },
		]),
	});
};
