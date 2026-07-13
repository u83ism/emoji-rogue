import { err, ok, type Result } from "../result.js";
import type { RngState } from "../rng.js";
import { PLAYER_MAX_HP } from "./balance.js";
import type { GameEvent } from "./events.js";
import type { Enemy, GameState } from "./state.js";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** A column-major width×height grid whose every cell satisfies `isCell`. */
const isGrid = <CellValue>(
	value: unknown,
	width: number,
	height: number,
	isCell: (cell: unknown) => cell is CellValue,
): value is readonly (readonly CellValue[])[] =>
	Array.isArray(value) &&
	value.length === width &&
	value.every(
		(column) =>
			Array.isArray(column) && column.length === height && column.every(isCell),
	);

const isTerrainValue = (value: unknown): value is number =>
	value === 0 || value === 1;

const isBooleanValue = (value: unknown): value is boolean =>
	typeof value === "boolean";

/** A position inside the grid, standing on a floor tile. */
const standsOnFloor = (
	value: Record<string, unknown>,
	terrain: readonly (readonly number[])[],
): boolean => {
	const { x, y } = value;
	if (!isFiniteNumber(x) || !Number.isInteger(x) || x < 0) {
		return false;
	}
	if (!isFiniteNumber(y) || !Number.isInteger(y) || y < 0) {
		return false;
	}
	return terrain[x]?.[y] === 0;
};

const isEnemyArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly Enemy[] =>
	Array.isArray(value) &&
	value.every(
		(enemy) =>
			isRecord(enemy) &&
			standsOnFloor(enemy, terrain) &&
			enemy.kind === "zombie" &&
			isPositiveInteger(enemy.hp),
	);

const isGameEvent = (value: unknown): boolean => {
	if (!isRecord(value) || !isRecord(value.payload)) {
		return false;
	}
	const payload = value.payload;
	switch (value.type) {
		case "player-hit":
			return payload.by === "zombie" && isPositiveInteger(payload.damage);
		case "enemy-hit":
			return payload.target === "zombie" && isPositiveInteger(payload.damage);
		case "enemy-defeated":
			return payload.target === "zombie";
		case "player-died":
			return payload.by === "zombie";
		case "floor-descended":
			return isPositiveInteger(payload.floor);
		default:
			return false;
	}
};

const isGameEventArray = (value: unknown): value is readonly GameEvent[] =>
	Array.isArray(value) && value.every(isGameEvent);

const isRngState = (value: unknown): value is RngState =>
	isRecord(value) &&
	isFiniteNumber(value.s0) &&
	isFiniteNumber(value.s1) &&
	isFiniteNumber(value.s2) &&
	isFiniteNumber(value.c);

/**
 * Checks that an untrusted value (a parsed save file) is a well-formed,
 * in-progress GameState, and rebuilds it from known fields only so unknown
 * extras never leak in. The error is the name of the first offending field.
 * Structural checks plus basic semantic ones (dimensions agree, actors stand
 * on floor tiles, hp in range); a save is only ever written mid-run, so
 * status must be "playing".
 */
export const validateGameState = (
	value: unknown,
): Result<GameState, string> => {
	if (!isRecord(value)) {
		return err("root");
	}
	const { width, height } = value;
	if (!isPositiveInteger(width)) {
		return err("width");
	}
	if (!isPositiveInteger(height)) {
		return err("height");
	}
	const terrain = value.terrain;
	if (!isGrid(terrain, width, height, isTerrainValue)) {
		return err("terrain");
	}
	const explored = value.explored;
	if (!isGrid(explored, width, height, isBooleanValue)) {
		return err("explored");
	}
	const player = value.player;
	if (
		!isRecord(player) ||
		!standsOnFloor(player, terrain) ||
		!isFiniteNumber(player.x) ||
		!isFiniteNumber(player.y)
	) {
		return err("player");
	}
	const playerHp = value.playerHp;
	if (!isPositiveInteger(playerHp) || playerHp > PLAYER_MAX_HP) {
		return err("playerHp");
	}
	const floor = value.floor;
	if (!isPositiveInteger(floor)) {
		return err("floor");
	}
	const stairs = value.stairs;
	if (
		!isRecord(stairs) ||
		!standsOnFloor(stairs, terrain) ||
		!isFiniteNumber(stairs.x) ||
		!isFiniteNumber(stairs.y)
	) {
		return err("stairs");
	}
	const enemies = value.enemies;
	if (!isEnemyArray(enemies, terrain)) {
		return err("enemies");
	}
	const events = value.events;
	if (!isGameEventArray(events)) {
		return err("events");
	}
	const rng = value.rng;
	if (!isRngState(rng)) {
		return err("rng");
	}
	if (value.status !== "playing") {
		return err("status");
	}

	return ok({
		width,
		height,
		terrain,
		explored,
		player: { x: player.x, y: player.y },
		playerHp,
		floor,
		stairs: { x: stairs.x, y: stairs.y },
		enemies: enemies.map((enemy) => ({
			x: enemy.x,
			y: enemy.y,
			kind: enemy.kind,
			hp: enemy.hp,
		})),
		events: [...events],
		rng: { s0: rng.s0, s1: rng.s1, s2: rng.s2, c: rng.c },
		status: "playing",
	});
};
