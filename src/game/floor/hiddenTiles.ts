import type { Room } from "../../map/features.js";
import { decodePointKey, encodePointKey } from "../../pointkey.js";
import type { Rng } from "../../rng.js";
import type { HiddenTile } from "../state.js";

const isInsideRoom = (rooms: readonly Room[], x: number, y: number): boolean =>
	rooms.some(
		(room) => x >= room.x1 && x <= room.x2 && y >= room.y1 && y <= room.y2,
	);

/**
 * The floor's secret doors and passages, as original Rogue's door() and
 * putpass(): each doorway is hidden when rnd(10) + 1 < level and rnd(5)
 * is 0, each corridor tile when rnd(10) + 1 < level and rnd(40) is 0 — so
 * never on the first floor, and more often the deeper. A tile something
 * already stands on (`occupied`) is never hidden. The caller turns every
 * returned tile to wall until it is searched out (search.ts).
 */
export const drawHiddenTiles = (
	terrain: readonly (readonly number[])[],
	rooms: readonly Room[],
	rng: Rng,
	floor: number,
	occupied: ReadonlySet<string>,
): readonly HiddenTile[] => {
	const deepEnough = (): boolean => rng.getUniformInt(0, 9) + 1 < floor;
	const hidden: HiddenTile[] = [];
	const doorKeys = new Set<string>();
	for (const room of rooms) {
		for (const key of Object.keys(room.doors)) {
			doorKeys.add(key);
			const [x, y] = decodePointKey(key);
			if (deepEnough() && rng.getUniformInt(0, 4) === 0 && !occupied.has(key)) {
				hidden.push({ x, y, kind: "door" });
			}
		}
	}
	for (let x = 0; x < terrain.length; x++) {
		const column = terrain[x] ?? [];
		for (let y = 0; y < column.length; y++) {
			const key = encodePointKey(x, y);
			const isCorridor =
				column[y] === 0 && !isInsideRoom(rooms, x, y) && !doorKeys.has(key);
			if (
				isCorridor &&
				deepEnough() &&
				rng.getUniformInt(0, 39) === 0 &&
				!occupied.has(key)
			) {
				hidden.push({ x, y, kind: "passage" });
			}
		}
	}
	return hidden;
};
