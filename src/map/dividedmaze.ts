import type { Rng } from "../rng.js";
import type { CreateCallback } from "./map.js";

type Room = [number, number, number, number];
type Point = [number, number];

function at(map: readonly number[][], x: number, y: number): number {
	const column = map[x];
	if (column === undefined) throw new Error("divided maze: x out of range");
	const value = column[y];
	if (value === undefined) throw new Error("divided maze: y out of range");
	return value;
}

function set(map: number[][], x: number, y: number, value: number): void {
	const column = map[x];
	if (column === undefined) throw new Error("divided maze: x out of range");
	column[y] = value;
}

function partitionRoom(
	rng: Rng,
	map: number[][],
	stack: Room[],
	room: Room,
): void {
	const availX: number[] = [];
	const availY: number[] = [];

	for (let i = room[0] + 1; i < room[2]; i++) {
		const top = at(map, i, room[1] - 1);
		const bottom = at(map, i, room[3] + 1);
		if (top && bottom && !(i % 2)) {
			availX.push(i);
		}
	}

	for (let j = room[1] + 1; j < room[3]; j++) {
		const left = at(map, room[0] - 1, j);
		const right = at(map, room[2] + 1, j);
		if (left && right && !(j % 2)) {
			availY.push(j);
		}
	}

	if (!availX.length || !availY.length) {
		return;
	}

	const x = rng.getItem(availX);
	const y = rng.getItem(availY);
	if (x === null || y === null) {
		throw new Error("unreachable: availX/availY are non-empty");
	}

	set(map, x, y, 1);

	const walls: Point[][] = [];

	let w: Point[] = [];
	walls.push(w); /* left part */
	for (let i = room[0]; i < x; i++) {
		set(map, i, y, 1);
		if (i % 2) w.push([i, y]);
	}

	w = [];
	walls.push(w); /* right part */
	for (let i = x + 1; i <= room[2]; i++) {
		set(map, i, y, 1);
		if (i % 2) w.push([i, y]);
	}

	w = [];
	walls.push(w); /* top part */
	for (let j = room[1]; j < y; j++) {
		set(map, x, j, 1);
		if (j % 2) w.push([x, j]);
	}

	w = [];
	walls.push(w); /* bottom part */
	for (let j = y + 1; j <= room[3]; j++) {
		set(map, x, j, 1);
		if (j % 2) w.push([x, j]);
	}

	const solid = rng.getItem(walls);
	for (const wallSegment of walls) {
		if (wallSegment === solid) {
			continue;
		}

		const hole = rng.getItem(wallSegment);
		if (hole === null) continue;
		set(map, hole[0], hole[1], 0);
	}

	stack.push([room[0], room[1], x - 1, y - 1]); /* left top */
	stack.push([x + 1, room[1], room[2], y - 1]); /* right top */
	stack.push([room[0], y + 1, x - 1, room[3]]); /* left bottom */
	stack.push([x + 1, y + 1, room[2], room[3]]); /* right bottom */
}

/**
 * Recursively divided maze, http://en.wikipedia.org/wiki/Maze_generation_algorithm#Recursive_division_method
 */
export function createDividedMazeMap(
	width: number,
	height: number,
	rng: Rng,
	callback: CreateCallback,
): void {
	const map: number[][] = [];
	for (let i = 0; i < width; i++) {
		const column: number[] = [];
		for (let j = 0; j < height; j++) {
			const border = i === 0 || j === 0 || i + 1 === width || j + 1 === height;
			column.push(border ? 1 : 0);
		}
		map.push(column);
	}

	const stack: Room[] = [[1, 1, width - 2, height - 2]];
	while (stack.length) {
		const room = stack.shift();
		if (room === undefined) throw new Error("unreachable: stack is non-empty");
		partitionRoom(rng, map, stack, room);
	}

	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			callback(i, j, at(map, i, j));
		}
	}
}
