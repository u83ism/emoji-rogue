import type { Rng } from "../rng.js";
import {
	POTION_KIND_VALUES,
	type PotionKind,
	RING_KINDS,
	type RingKind,
	SCROLL_KIND_VALUES,
	type ScrollKind,
	WAND_KIND_VALUES,
	type WandKind,
} from "./events.js";

/**
 * How many appearances original Rogue's init.c draws from: the colors of
 * rainbow[], the syllables of sylls[], the stones of stones[] and the woods
 * and metals of wood[]/metal[]. The words themselves are the shell's
 * (shell/appearanceNames.ts) — the core keeps only indices, no text.
 */
export const POTION_COLOR_COUNT = 27;
export const SCROLL_SYLLABLE_COUNT = 147;
export const WAND_WOOD_COUNT = 33;
export const WAND_METAL_COUNT = 22;

/** What each of stones[] adds to a ring's worth (init_stones()), in its order. */
export const RING_STONE_VALUES: readonly number[] = [
	25, 40, 50, 40, 300, 300, 225, 5, 50, 150, 300, 50, 50, 15, 60, 200, 220, 63,
	350, 285, 200, 50, 60, 70, 300, 80,
];

/**
 * The run's look for every kind still to be identified, as original Rogue's
 * init_colors()/init_names()/init_stones()/init_materials(): each potion a
 * color, each scroll a title (words of syllables), each ring a stone and
 * each wand a material — a wood (a staff) below WAND_WOOD_COUNT, a metal
 * above. No two kinds of a family share a color, stone or material.
 */
export interface ItemAppearances {
	readonly potionColors: Readonly<Record<PotionKind, number>>;
	readonly scrollTitles: Readonly<
		Record<ScrollKind, readonly (readonly number[])[]>
	>;
	readonly ringStones: Readonly<Record<RingKind, number>>;
	readonly wandMaterials: Readonly<Record<WandKind, number>>;
}

/** One distinct index per kind out of 0..count-1 (init.c's `do j = rnd(n) while (used[j])`). */
const drawDistinct = <Kind extends string>(
	rng: Rng,
	kinds: readonly Kind[],
	count: number,
): Record<Kind, number> => {
	const used = new Set<number>();
	const picks: Partial<Record<Kind, number>> = {};
	for (const kind of kinds) {
		let pick = rng.getUniformInt(0, count - 1);
		while (used.has(pick)) {
			pick = rng.getUniformInt(0, count - 1);
		}
		used.add(pick);
		picks[kind] = pick;
	}
	return picks as Record<Kind, number>;
};

/** A scroll title: 2..4 words of 1..3 syllables each (init_names()). */
const drawTitle = (rng: Rng): readonly (readonly number[])[] =>
	Array.from({ length: rng.getUniformInt(2, 4) }, () =>
		Array.from({ length: rng.getUniformInt(1, 3) }, () =>
			rng.getUniformInt(0, SCROLL_SYLLABLE_COUNT - 1),
		),
	);

/** A wand's material: a coin flip between an unused metal and an unused wood (init_materials()). */
const drawMaterials = (rng: Rng): Record<WandKind, number> => {
	const used = new Set<number>();
	const picks: Partial<Record<WandKind, number>> = {};
	for (const kind of WAND_KIND_VALUES) {
		for (;;) {
			const pick =
				rng.getUniformInt(0, 1) === 0
					? WAND_WOOD_COUNT + rng.getUniformInt(0, WAND_METAL_COUNT - 1)
					: rng.getUniformInt(0, WAND_WOOD_COUNT - 1);
			if (!used.has(pick)) {
				used.add(pick);
				picks[kind] = pick;
				break;
			}
		}
	}
	return picks as Record<WandKind, number>;
};

/** A run's appearances, drawn once at the start (initialState.ts). Consumes `rng`. */
export const rollItemAppearances = (rng: Rng): ItemAppearances => {
	const potionColors = drawDistinct(
		rng,
		POTION_KIND_VALUES,
		POTION_COLOR_COUNT,
	);
	const scrollTitles = Object.fromEntries(
		SCROLL_KIND_VALUES.map((kind) => [kind, drawTitle(rng)]),
	) as Record<ScrollKind, readonly (readonly number[])[]>;
	const ringStones = drawDistinct(rng, RING_KINDS, RING_STONE_VALUES.length);
	const wandMaterials = drawMaterials(rng);
	return { potionColors, scrollTitles, ringStones, wandMaterials };
};
