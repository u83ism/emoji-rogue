import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../rng.js";
import {
	FOOD_COUNT_PER_FLOOR,
	GOAL_FLOOR,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	GOLD_PILES_PER_FLOOR,
	POTION_COUNT_PER_FLOOR,
	TRAP_COUNT_PER_FLOOR,
} from "./balance.js";
import type { ItemKind } from "./events.js";
import { drawFloorItems } from "./floorItems.js";
import type { Position } from "./state.js";

// Deterministic spawn tests: instead of hunting for real seeds whose rolls
// happen to land (which breaks every time a spawn chance is tuned — see the
// milestone 56/63 history), the rng is scripted so every percent roll either
// always hits or always misses.

/** Every roll lands: getUniformInt returns its lower bound (0 < any chance). */
const createAlwaysHitRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll misses: getUniformInt returns its upper bound (99 < no chance). */
const createAlwaysMissRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

const buildPool = (size: number): Position[] =>
	Array.from({ length: size }, (_, index) => ({ x: index, y: 0 }));

/**
 * Every chance-rolled kind, deliberately hardcoded: adding an entry to
 * ITEM_SPAWN_TABLE must consciously extend this list too.
 */
const CHANCE_ROLLED_KINDS: readonly ItemKind[] = [
	"sword",
	"enchant-weapon",
	"shield",
	"enchant-armor",
	"poison",
	"strength",
	"confusion",
	"levitation",
	"blindness",
	"paralysis",
	"raise-level",
	"detect-monster",
	"life",
	"protect-armor",
	"teleport-scroll",
	"mapping-scroll",
	"identify-scroll",
	"regeneration-ring",
	"sustenance-ring",
	"striking-wand",
	"slow-wand",
];

describe("drawFloorItems", () => {
	it("with every roll hitting, spawns each chance-rolled kind exactly once plus the guaranteed items", () => {
		const drawn = drawFloorItems(buildPool(100), createAlwaysHitRng(), 1);
		expect(
			drawn.items.filter((item) => item.kind === "heal-potion").length,
		).toBe(POTION_COUNT_PER_FLOOR);
		expect(drawn.items.filter((item) => item.kind === "food").length).toBe(
			FOOD_COUNT_PER_FLOOR,
		);
		for (const kind of CHANCE_ROLLED_KINDS) {
			expect(drawn.items.filter((item) => item.kind === kind).length).toBe(1);
		}
		/* nothing beyond the guaranteed and the table — the list above is complete */
		expect(drawn.items.length).toBe(
			POTION_COUNT_PER_FLOOR +
				FOOD_COUNT_PER_FLOOR +
				CHANCE_ROLLED_KINDS.length,
		);
	});

	it("with every roll missing, spawns only the guaranteed items", () => {
		const drawn = drawFloorItems(buildPool(100), createAlwaysMissRng(), 1);
		expect(drawn.items.length).toBe(
			POTION_COUNT_PER_FLOOR + FOOD_COUNT_PER_FLOOR,
		);
		expect(
			drawn.items.every(
				(item) => item.kind === "heal-potion" || item.kind === "food",
			),
		).toBe(true);
	});

	it("always spawns the guaranteed gold piles; the amount range follows the roll", () => {
		const generous = drawFloorItems(buildPool(100), createAlwaysHitRng(), 1);
		expect(generous.goldPiles.length).toBe(GOLD_PILES_PER_FLOOR);
		for (const pile of generous.goldPiles) {
			expect(pile.amount).toBe(GOLD_AMOUNT_MIN); /* lower bound of the roll */
		}
		const stingy = drawFloorItems(buildPool(100), createAlwaysMissRng(), 1);
		for (const pile of stingy.goldPiles) {
			expect(pile.amount).toBe(GOLD_AMOUNT_MAX); /* upper bound of the roll */
		}
	});

	it("with every roll hitting, spawns dart traps plus one trapdoor and one teleport trap", () => {
		const drawn = drawFloorItems(buildPool(100), createAlwaysHitRng(), 1);
		expect(drawn.traps.filter((trap) => trap.kind === "dart").length).toBe(
			TRAP_COUNT_PER_FLOOR,
		);
		expect(drawn.traps.filter((trap) => trap.kind === "trapdoor").length).toBe(
			1,
		);
		expect(drawn.traps.filter((trap) => trap.kind === "teleport").length).toBe(
			1,
		);
	});

	it("with every roll missing, spawns only the guaranteed dart traps", () => {
		const drawn = drawFloorItems(buildPool(100), createAlwaysMissRng(), 1);
		expect(drawn.traps.length).toBe(TRAP_COUNT_PER_FLOOR);
		expect(drawn.traps.every((trap) => trap.kind === "dart")).toBe(true);
	});

	it("never spawns a trapdoor on GOAL_FLOOR, even when its roll would hit", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			GOAL_FLOOR,
		);
		expect(drawn.traps.some((trap) => trap.kind === "trapdoor")).toBe(false);
		/* the teleport trap is still allowed there — it stays within the floor */
		expect(drawn.traps.some((trap) => trap.kind === "teleport")).toBe(true);
	});
});
