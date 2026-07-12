import type { LightPassesCallback, VisibilityCallback } from "./fov.js";

/** Octants used for translating recursive shadowcasting offsets */
const OCTANTS: ReadonlyArray<readonly [number, number, number, number]> = [
	[-1, 0, 0, 1],
	[0, -1, 1, 0],
	[0, -1, -1, 0],
	[-1, 0, 0, -1],
	[1, 0, 0, -1],
	[0, 1, -1, 0],
	[0, 1, 1, 0],
	[1, 0, 0, 1],
];

export interface RecursiveShadowcastingFov {
	/** Compute visibility for a full 360-degree circle. */
	compute(
		x: number,
		y: number,
		radius: number,
		callback: VisibilityCallback,
	): void;
	/** Compute visibility for a 180-degree arc facing `dir` (a ROT.DIRS index). */
	compute180(
		x: number,
		y: number,
		radius: number,
		dir: number,
		callback: VisibilityCallback,
	): void;
	/** Compute visibility for a 90-degree arc facing `dir` (a ROT.DIRS index). */
	compute90(
		x: number,
		y: number,
		radius: number,
		dir: number,
		callback: VisibilityCallback,
	): void;
}

function at(octant: number): readonly [number, number, number, number] {
	const value = OCTANTS[octant];
	if (value === undefined) {
		throw new Error(`invalid octant index: ${octant}`);
	}
	return value;
}

/**
 * Recursive shadowcasting algorithm. Currently only supports 4/8 topologies,
 * not hexagonal.
 * Based on Peter Harkins' implementation of Björn Bergström's algorithm
 * described here: http://www.roguebasin.com/index.php?title=FOV_using_recursive_shadowcasting
 */
export function createRecursiveShadowcastingFov(
	lightPasses: LightPassesCallback,
): RecursiveShadowcastingFov {
	function castVisibility(
		startX: number,
		startY: number,
		row: number,
		visSlopeStartInput: number,
		visSlopeEnd: number,
		radius: number,
		xx: number,
		xy: number,
		yx: number,
		yy: number,
		callback: VisibilityCallback,
	): void {
		if (visSlopeStartInput < visSlopeEnd) {
			return;
		}
		let visSlopeStart = visSlopeStartInput;

		for (let i = row; i <= radius; i++) {
			let dx = -i - 1;
			const dy = -i;
			let blocked = false;
			let newStart = 0;

			/* 'row' could be column; names here assume octant 0 and would be flipped for half the octants */
			while (dx <= 0) {
				dx += 1;

				/* translate from relative coordinates to map coordinates */
				const mapX = startX + dx * xx + dy * xy;
				const mapY = startY + dx * yx + dy * yy;

				/* range of the row */
				const slopeStart = (dx - 0.5) / (dy + 0.5);
				const slopeEnd = (dx + 0.5) / (dy - 0.5);

				/* ignore if not yet at left edge of octant */
				if (slopeEnd > visSlopeStart) {
					continue;
				}

				/* done if past right edge */
				if (slopeStart < visSlopeEnd) {
					break;
				}

				/* if it's in range, it's visible */
				if (dx * dx + dy * dy < radius * radius) {
					callback(mapX, mapY, i, 1);
				}

				if (!blocked) {
					/* if tile is a blocking tile, cast around it */
					if (!lightPasses(mapX, mapY) && i < radius) {
						blocked = true;
						castVisibility(
							startX,
							startY,
							i + 1,
							visSlopeStart,
							slopeStart,
							radius,
							xx,
							xy,
							yx,
							yy,
							callback,
						);
						newStart = slopeEnd;
					}
				} else {
					/* keep narrowing if scanning across a block */
					if (!lightPasses(mapX, mapY)) {
						newStart = slopeEnd;
						continue;
					}

					/* block has ended */
					blocked = false;
					visSlopeStart = newStart;
				}
			}
			if (blocked) {
				break;
			}
		}
	}

	function renderOctant(
		x: number,
		y: number,
		octant: readonly [number, number, number, number],
		radius: number,
		callback: VisibilityCallback,
	): void {
		/* radius incremented by 1 to provide same coverage area as other shadowcasting radiuses */
		castVisibility(
			x,
			y,
			1,
			1.0,
			0.0,
			radius + 1,
			octant[0],
			octant[1],
			octant[2],
			octant[3],
			callback,
		);
	}

	return {
		compute(x, y, radius, callback) {
			/* you can always see your own tile */
			callback(x, y, 0, 1);
			for (const octant of OCTANTS) {
				renderOctant(x, y, octant, radius, callback);
			}
		},

		compute180(x, y, radius, dir, callback) {
			/* you can always see your own tile */
			callback(x, y, 0, 1);
			const previousOctant =
				(dir - 1 + 8) %
				8; /* need to retrieve the previous octant to render a full 180 degrees */
			const nextPreviousOctant =
				(dir - 2 + 8) %
				8; /* need to retrieve the previous two octants to render a full 180 degrees */
			const nextOctant =
				(dir + 1 + 8) %
				8; /* need to grab the next octant to render a full 180 degrees */
			renderOctant(x, y, at(nextPreviousOctant), radius, callback);
			renderOctant(x, y, at(previousOctant), radius, callback);
			renderOctant(x, y, at(dir), radius, callback);
			renderOctant(x, y, at(nextOctant), radius, callback);
		},

		compute90(x, y, radius, dir, callback) {
			/* you can always see your own tile */
			callback(x, y, 0, 1);
			const previousOctant =
				(dir - 1 + 8) %
				8; /* need to retrieve the previous octant to render a full 90 degrees */
			renderOctant(x, y, at(dir), radius, callback);
			renderOctant(x, y, at(previousOctant), radius, callback);
		},
	};
}
