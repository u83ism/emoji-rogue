import { at } from "../indexing.js";
import {
	type Fov,
	type FovOptions,
	getCircle,
	type LightPassesCallback,
} from "./fov.js";

type Arc = [number, number];

/**
 * Precise shadowcasting algorithm.
 */
export const createPreciseShadowcastingFov = (
	lightPasses: LightPassesCallback,
	options: Partial<FovOptions> = {},
): Fov => {
	const topology = options.topology ?? 8;

	const checkVisibility = (
		a1: Arc,
		a2: Arc,
		blocks: boolean,
		shadows: Arc[],
	): number => {
		if (a1[0] > a2[0]) {
			/* split into two sub-arcs */
			const v1 = checkVisibility(a1, [a1[1], a1[1]], blocks, shadows);
			const v2 = checkVisibility([0, 1], a2, blocks, shadows);
			return (v1 + v2) / 2;
		}

		/* index1: first shadow >= a1 */
		let index1 = 0;
		let edge1 = false;
		while (index1 < shadows.length) {
			const old = at(shadows, index1);
			const diff = old[0] * a1[1] - a1[0] * old[1];
			if (diff >= 0) {
				/* old >= a1 */
				if (diff === 0 && !(index1 % 2)) {
					edge1 = true;
				}
				break;
			}
			index1++;
		}

		/* index2: last shadow <= a2 */
		let index2 = shadows.length;
		let edge2 = false;
		while (index2--) {
			const old = at(shadows, index2);
			const diff = a2[0] * old[1] - old[0] * a2[1];
			if (diff >= 0) {
				/* old <= a2 */
				if (diff === 0 && index2 % 2) {
					edge2 = true;
				}
				break;
			}
		}

		let visible = true;
		if (index1 === index2 && (edge1 || edge2)) {
			/* subset of existing shadow, one of the edges match */
			visible = false;
		} else if (edge1 && edge2 && index1 + 1 === index2 && index2 % 2) {
			/* completely equivalent with existing shadow */
			visible = false;
		} else if (index1 > index2 && index1 % 2) {
			/* subset of existing shadow, not touching */
			visible = false;
		}

		if (!visible) {
			return 0;
		} /* fast case: not visible */

		let visibleLength: number;

		/* compute the length of visible arc, adjust list of shadows (if blocking) */
		const remove = index2 - index1 + 1;
		if (remove % 2) {
			if (index1 % 2) {
				/* first edge within existing shadow, second outside */
				const p = at(shadows, index1);
				visibleLength = (a2[0] * p[1] - p[0] * a2[1]) / (p[1] * a2[1]);
				if (blocks) {
					shadows.splice(index1, remove, a2);
				}
			} else {
				/* second edge within existing shadow, first outside */
				const p = at(shadows, index2);
				visibleLength = (p[0] * a1[1] - a1[0] * p[1]) / (a1[1] * p[1]);
				if (blocks) {
					shadows.splice(index1, remove, a1);
				}
			}
		} else if (index1 % 2) {
			/* both edges within existing shadows */
			const p1 = at(shadows, index1);
			const p2 = at(shadows, index2);
			visibleLength = (p2[0] * p1[1] - p1[0] * p2[1]) / (p1[1] * p2[1]);
			if (blocks) {
				shadows.splice(index1, remove);
			}
		} else {
			/* both edges outside existing shadows */
			if (blocks) {
				shadows.splice(index1, remove, a1, a2);
			}
			return 1; /* whole arc visible! */
		}

		const arcLength = (a2[0] * a1[1] - a1[0] * a2[1]) / (a1[1] * a2[1]);

		return visibleLength / arcLength;
	};

	return (x: number, y: number, radius: number, callback) => {
		/* this place is always visible */
		callback(x, y, 0, 1);

		/* standing in a dark place. FIXME is this a good idea?  */
		if (!lightPasses(x, y)) {
			return;
		}

		/* list of all shadows */
		const shadows: Arc[] = [];

		/* analyze surrounding cells in concentric rings, starting from the center */
		for (let r = 1; r <= radius; r++) {
			const neighbors = getCircle(topology, x, y, r);
			const neighborCount = neighbors.length;

			for (let i = 0; i < neighborCount; i++) {
				const neighbor = neighbors[i];
				if (neighbor === undefined) {
					throw new Error("unreachable: i is within neighbors.length");
				}
				const [cx, cy] = neighbor;
				/* shift half-an-angle backwards to maintain consistency of 0-th cells */
				const a1: Arc = [
					i ? 2 * i - 1 : 2 * neighborCount - 1,
					2 * neighborCount,
				];
				const a2: Arc = [2 * i + 1, 2 * neighborCount];

				const blocks = !lightPasses(cx, cy);
				const visibility = checkVisibility(a1, a2, blocks, shadows);
				if (visibility) {
					callback(cx, cy, r, visibility);
				}

				const shadow0 = shadows[0];
				const shadow1 = shadows[1];
				if (
					shadows.length === 2 &&
					shadow0 !== undefined &&
					shadow1 !== undefined &&
					shadow0[0] === 0 &&
					shadow1[0] === shadow1[1]
				) {
					return;
				} /* cutoff? */
			} /* for all cells in this ring */
		} /* for all rings */
	};
};
