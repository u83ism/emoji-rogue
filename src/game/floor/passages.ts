import { encodePointKey } from "../../pointkey.js";
import type { DungeonRoom, GameState, Position } from "../state.js";
import { findRoomAt } from "../vision.js";

/** Where a tile lies, as original Rogue's rooms and passages (ISGONE rooms) do: a room, walls and doors included, or a corridor by its number. */
export type Area =
	| { readonly kind: "room"; readonly room: DungeonRoom }
	| { readonly kind: "passage"; readonly id: number };

/** Every corridor of the floor (numbered), and the doors each one leads to — derived from the terrain, never stored. */
export interface PassageMap {
	readonly passageAt: ReadonlyMap<string, number>;
	readonly exits: ReadonlyMap<number, readonly Position[]>;
}

const ORTHOGONAL: readonly (readonly [number, number])[] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
];

const isFloor = (state: GameState, x: number, y: number): boolean =>
	state.terrain[x]?.[y] === 0;

/** A room's doorways: the open tiles of its wall ring (a secret door, still wall, is none). */
export const findRoomExits = (
	state: GameState,
	room: DungeonRoom,
): readonly Position[] => {
	const exits: Position[] = [];
	for (let x = room.x1 - 1; x <= room.x2 + 1; x++) {
		for (let y = room.y1 - 1; y <= room.y2 + 1; y++) {
			const onRing =
				x === room.x1 - 1 ||
				x === room.x2 + 1 ||
				y === room.y1 - 1 ||
				y === room.y2 + 1;
			if (onRing && isFloor(state, x, y)) {
				exits.push({ x, y });
			}
		}
	}
	return exits;
};

/**
 * The corridors as original Rogue's passages[]: floor outside every room
 * (walls included), joined edge to edge, each numbered; its exits are the
 * doorways next to it.
 */
export const buildPassageMap = (state: GameState): PassageMap => {
	const passageAt = new Map<string, number>();
	const exits = new Map<number, Position[]>();
	const isCorridor = (x: number, y: number): boolean =>
		isFloor(state, x, y) && findRoomAt(state.rooms, { x, y }) === undefined;
	let nextId = 0;
	for (let x = 0; x < state.terrain.length; x++) {
		for (let y = 0; y < (state.terrain[x]?.length ?? 0); y++) {
			if (!isCorridor(x, y) || passageAt.has(encodePointKey(x, y))) {
				continue;
			}
			const id = nextId++;
			const doors: Position[] = [];
			const doorKeys = new Set<string>();
			const queue: Position[] = [{ x, y }];
			passageAt.set(encodePointKey(x, y), id);
			for (let index = 0; index < queue.length; index++) {
				const tile = queue[index];
				if (tile === undefined) {
					throw new Error("unreachable: index within the queue");
				}
				for (const [deltaX, deltaY] of ORTHOGONAL) {
					const next = { x: tile.x + deltaX, y: tile.y + deltaY };
					const key = encodePointKey(next.x, next.y);
					if (isCorridor(next.x, next.y)) {
						if (!passageAt.has(key)) {
							passageAt.set(key, id);
							queue.push(next);
						}
					} else if (isFloor(state, next.x, next.y) && !doorKeys.has(key)) {
						doorKeys.add(key);
						doors.push(next);
					}
				}
			}
			exits.set(id, doors);
		}
	}
	return { passageAt, exits };
};

/** The area `position` lies in, if any (a tile of rock lies in none). */
export const findArea = (
	state: GameState,
	passages: PassageMap,
	position: Position,
): Area | undefined => {
	const room = findRoomAt(state.rooms, position);
	if (room !== undefined) {
		return { kind: "room", room };
	}
	const id = passages.passageAt.get(encodePointKey(position.x, position.y));
	return id === undefined ? undefined : { kind: "passage", id };
};

/** Whether two areas are the same room or the same corridor. */
export const isSameArea = (
	left: Area | undefined,
	right: Area | undefined,
): boolean => {
	if (left === undefined || right === undefined) {
		return left === right;
	}
	if (left.kind === "room" && right.kind === "room") {
		return left.room === right.room;
	}
	if (left.kind === "passage" && right.kind === "passage") {
		return left.id === right.id;
	}
	return false;
};

/** The doorways out of `area`. */
export const findAreaExits = (
	state: GameState,
	passages: PassageMap,
	area: Area,
): readonly Position[] => {
	switch (area.kind) {
		case "room":
			return findRoomExits(state, area.room);
		case "passage":
			return passages.exits.get(area.id) ?? [];
	}
};

/** The corridor beyond `position` when it is a room's doorway (an open tile of a wall ring with a corridor tile next to it), if any. */
export const findDoorCorridor = (
	state: GameState,
	passages: PassageMap,
	position: Position,
): number | undefined => {
	const room = findRoomAt(state.rooms, position);
	const onRing =
		room !== undefined &&
		(position.x === room.x1 - 1 ||
			position.x === room.x2 + 1 ||
			position.y === room.y1 - 1 ||
			position.y === room.y2 + 1);
	if (!onRing) {
		return undefined;
	}
	return ORTHOGONAL.map(([deltaX, deltaY]) =>
		passages.passageAt.get(
			encodePointKey(position.x + deltaX, position.y + deltaY),
		),
	).find((id) => id !== undefined);
};
