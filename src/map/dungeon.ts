import type { Corridor, Room } from "./features.js";

/** Shared shape for map generators that expose their generated rooms/corridors. */
export interface DungeonMap {
	getRooms(): Room[];
	getCorridors(): Corridor[];
}
