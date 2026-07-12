import {
	type Fov,
	type FovOptions,
	getCircle,
	type LightPassesCallback,
} from "./fov.js";

/**
 * Discrete shadowcasting algorithm. Obsoleted by precise shadowcasting.
 */
export function createDiscreteShadowcastingFov(
	lightPasses: LightPassesCallback,
	options: Partial<FovOptions> = {},
): Fov {
	const topology = options.topology ?? 8;

	function isVisible(
		startAngle: number,
		endAngle: number,
		blocks: boolean,
		data: number[],
	): boolean {
		if (startAngle < 0) {
			const v1 = isVisible(0, endAngle, blocks, data);
			const v2 = isVisible(360 + startAngle, 360, blocks, data);
			return v1 || v2;
		}

		let index = 0;
		while (index < data.length && (data[index] as number) < startAngle) {
			index++;
		}

		if (index === data.length) {
			/* completely new shadow */
			if (blocks) {
				data.push(startAngle, endAngle);
			}
			return true;
		}

		let count = 0;

		if (index % 2) {
			/* this shadow starts in an existing shadow, or within its ending boundary */
			while (index < data.length && (data[index] as number) < endAngle) {
				index++;
				count++;
			}

			if (count === 0) {
				return false;
			}

			if (blocks) {
				if (count % 2) {
					data.splice(index - count, count, endAngle);
				} else {
					data.splice(index - count, count);
				}
			}

			return true;
		}

		/* this shadow starts outside an existing shadow, or within a starting boundary */
		while (index < data.length && (data[index] as number) < endAngle) {
			index++;
			count++;
		}

		/* visible when outside an existing shadow, or when overlapping */
		if (startAngle === data[index - count] && count === 1) {
			return false;
		}

		if (blocks) {
			if (count % 2) {
				data.splice(index - count, count, startAngle);
			} else {
				data.splice(index - count, count, startAngle, endAngle);
			}
		}

		return true;
	}

	return (x: number, y: number, radius: number, callback) => {
		/* this place is always visible */
		callback(x, y, 0, 1);

		/* standing in a dark place. FIXME is this a good idea?  */
		if (!lightPasses(x, y)) {
			return;
		}

		/* start and end angles, as a flat [start, end, start, end, ...] list of active shadows */
		const data: number[] = [];

		/* analyze surrounding cells in concentric rings, starting from the center */
		for (let r = 1; r <= radius; r++) {
			const neighbors = getCircle(topology, x, y, r);
			const angle = 360 / neighbors.length;

			for (let i = 0; i < neighbors.length; i++) {
				const neighbor = neighbors[i];
				if (neighbor === undefined) {
					throw new Error("unreachable: i is within neighbors.length");
				}
				const [cx, cy] = neighbor;
				const startAngle = angle * (i - 0.5);
				const endAngle = startAngle + angle;

				const blocks = !lightPasses(cx, cy);
				if (
					isVisible(Math.floor(startAngle), Math.ceil(endAngle), blocks, data)
				) {
					callback(cx, cy, r, 1);
				}

				if (data.length === 2 && data[0] === 0 && data[1] === 360) {
					return;
				} /* cutoff? */
			} /* for all cells in this ring */
		} /* for all rings */
	};
}
