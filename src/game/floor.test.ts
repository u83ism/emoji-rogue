import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { calculateEnemyCountForFloor, GOAL_FLOOR } from "./balance.js";
import { ascendStairs, descendStairs } from "./floor.js";
import { buildDungeonGameState } from "./initialState.js";

describe("descendStairs", () => {
	const start = buildDungeonGameState(40, 20, 12345);
	const below = descendStairs({ ...start, playerHp: 5 });

	it("is deterministic: the whole run replays from (dimensions, seed)", () => {
		expect(descendStairs({ ...start, playerHp: 5 })).toEqual(below);
	});

	it("generates a fresh floor: terrain, enemies, stairs, explored", () => {
		expect(below.terrain).not.toEqual(start.terrain);
		expect(below.rng).not.toEqual(start.rng);
		/* the explored grid restarts from the new starting view only */
		expect(below.explored[below.stairs.x]?.[below.stairs.y]).toBe(false);
	});

	it("carries over hp, log and the incremented floor counter", () => {
		expect(below.floor).toBe(start.floor + 1);
		expect(below.playerHp).toBe(5);
		expect(below.events).toEqual([
			{ type: "floor-descended", payload: { floor: 2 } },
		]);
		expect(below.status).toBe("playing");
	});

	it("spawns both zombies and bats", () => {
		for (const state of [start, below]) {
			const kinds = state.enemies.map((enemy) => enemy.kind);
			expect(kinds.filter((kind) => kind === "zombie").length).toBe(3);
			expect(kinds.filter((kind) => kind === "bat").length).toBe(2);
		}
	});

	it("places everything on distinct floor tiles", () => {
		for (const state of [start, below]) {
			/* potions and food rations are guaranteed; the sword is a per-floor chance (0 or 1) */
			expect(state.items.filter((item) => item.kind === "potion").length).toBe(
				2,
			);
			expect(state.items.filter((item) => item.kind === "food").length).toBe(1);
			expect(
				state.items.filter((item) => item.kind === "sword").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "shield").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "poison").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "scroll").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "mapping").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "identify").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "strength").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.enemies.filter((enemy) => enemy.kind === "thief").length,
			).toBeLessThanOrEqual(1);
			expect(state.goldPiles.length).toBe(3);
			for (const pile of state.goldPiles) {
				expect(pile.amount).toBeGreaterThanOrEqual(2);
				expect(pile.amount).toBeLessThanOrEqual(20);
			}
			expect(state.traps.filter((trap) => trap.kind === "dart").length).toBe(2);
			expect(
				state.traps.filter((trap) => trap.kind === "trapdoor").length,
			).toBeLessThanOrEqual(1);
			const occupied = new Set([
				encodePointKey(state.player.x, state.player.y),
			]);
			const spawned = [
				state.stairs,
				...state.enemies,
				...state.items,
				...state.goldPiles,
				...state.traps,
			];
			for (const position of spawned) {
				expect(state.terrain[position.x]?.[position.y]).toBe(0);
				const key = encodePointKey(position.x, position.y);
				expect(occupied.has(key)).toBe(false);
				occupied.add(key);
			}
		}
	});

	it("keeps descending: several floors without breaking invariants", () => {
		/* stays comfortably below GOAL_FLOOR — reaching it is covered separately */
		let state = buildDungeonGameState(40, 20, 7);
		for (let i = 0; i < 5; i++) {
			state = descendStairs(state);
			expect(state.floor).toBe(i + 2);
			expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
			expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
		}
	});

	it("GOAL_FLOOR is a real floor: an up staircase and the amulet, not an instant win", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		expect(state.floor).toBe(GOAL_FLOOR);
		expect(state.status).toBe("playing");
		expect(state.stairs.direction).toBe("up");
		expect(state.amulet).not.toBeUndefined();
		expect(state.hasAmulet).toBe(false);
		expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
	});

	it("spawns more enemies on deeper floors, matching the scaling formula", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const kinds = state.enemies.map((enemy) => enemy.kind);
			expect(kinds.filter((kind) => kind === "zombie").length).toBe(
				calculateEnemyCountForFloor("zombie", floor),
			);
			expect(kinds.filter((kind) => kind === "bat").length).toBe(
				calculateEnemyCountForFloor("bat", floor),
			);
		}
	});
});

describe("sword spawning", () => {
	it("spawns a sword on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "sword",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one sword on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const swordCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "sword",
			).length;
			expect(swordCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("enchant weapon scroll spawning", () => {
	it("spawns an enchant weapon scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "enchant-weapon",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one enchant weapon scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const enchantCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "enchant-weapon",
			).length;
			expect(enchantCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("shield spawning", () => {
	it("spawns a shield on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "shield",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one shield on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const shieldCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "shield",
			).length;
			expect(shieldCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("enchant armor scroll spawning", () => {
	it("spawns an enchant armor scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "enchant-armor",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one enchant armor scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const enchantCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "enchant-armor",
			).length;
			expect(enchantCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("poison potion spawning", () => {
	it("spawns a poison potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "poison",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one poison potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const poisonCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "poison",
			).length;
			expect(poisonCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("teleport scroll spawning", () => {
	it("spawns a scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "scroll",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const scrollCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "scroll",
			).length;
			expect(scrollCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("mapping scroll spawning", () => {
	it("spawns a mapping scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "mapping",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one mapping scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const mappingCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "mapping",
			).length;
			expect(mappingCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("identify scroll spawning", () => {
	it("spawns an identify scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "identify",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one identify scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const identifyCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "identify",
			).length;
			expect(identifyCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("strength potion spawning", () => {
	it("spawns a strength potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "strength",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one strength potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const strengthCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "strength",
			).length;
			expect(strengthCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("confusion potion spawning", () => {
	it("spawns a confusion potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "confusion",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one confusion potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const confusionCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "confusion",
			).length;
			expect(confusionCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("thief spawning", () => {
	it("spawns a thief on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).enemies.some(
				(enemy) => enemy.kind === "thief",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one thief on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const thiefCount = buildDungeonGameState(40, 20, seed).enemies.filter(
				(enemy) => enemy.kind === "thief",
			).length;
			expect(thiefCount).toBeLessThanOrEqual(1);
		}
	});

	it("does not scale with floor depth (unlike zombies and bats)", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const thiefCount = state.enemies.filter(
				(enemy) => enemy.kind === "thief",
			).length;
			expect(thiefCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("nymph spawning", () => {
	it("spawns a nymph on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).enemies.some(
				(enemy) => enemy.kind === "nymph",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one nymph on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const nymphCount = buildDungeonGameState(40, 20, seed).enemies.filter(
				(enemy) => enemy.kind === "nymph",
			).length;
			expect(nymphCount).toBeLessThanOrEqual(1);
		}
	});

	it("does not scale with floor depth (unlike zombies and bats)", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const nymphCount = state.enemies.filter(
				(enemy) => enemy.kind === "nymph",
			).length;
			expect(nymphCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("aquator spawning", () => {
	it("spawns an aquator on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).enemies.some(
				(enemy) => enemy.kind === "aquator",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one aquator on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const aquatorCount = buildDungeonGameState(40, 20, seed).enemies.filter(
				(enemy) => enemy.kind === "aquator",
			).length;
			expect(aquatorCount).toBeLessThanOrEqual(1);
		}
	});

	it("does not scale with floor depth (unlike zombies and bats)", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const aquatorCount = state.enemies.filter(
				(enemy) => enemy.kind === "aquator",
			).length;
			expect(aquatorCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("ascendStairs", () => {
	it("is the mirror of descendStairs: decrements the floor and regenerates it with an up staircase", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		const back = ascendStairs({ ...deep, playerHp: 5 });
		expect(back.floor).toBe(1);
		expect(back.status).toBe("exited"); /* no amulet — see below */
	});

	it("generating a floor mid-retrace always gets an up staircase", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		/* now at GOAL_FLOOR carrying nothing; simulate having taken the amulet */
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 2; floor--) {
			state = ascendStairs(state);
			expect(state.floor).toBe(floor);
			expect(state.stairs.direction).toBe("up");
			expect(state.status).toBe("playing");
		}
	});

	it("surfacing with the amulet wins the run without generating a floor 0", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 2; floor--) {
			state = ascendStairs(state);
		}
		const surfaced = ascendStairs(state);
		expect(surfaced.status).toBe("won");
		expect(surfaced.events.at(-1)).toEqual({
			type: "game-won",
			payload: {},
		});
	});

	it("surfacing without the amulet exits instead of winning", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		expect(deep.hasAmulet).toBe(false);
		const surfaced = ascendStairs(deep);
		expect(surfaced.status).toBe("exited");
		expect(surfaced.events).toEqual(deep.events); /* no event logged */
	});

	it("is deterministic, like descendStairs", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 3; floor++) {
			state = descendStairs(state);
		}
		expect(ascendStairs(state)).toEqual(ascendStairs(state));
	});
});

describe("ring spawning", () => {
	it("spawns a ring on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "ring",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one ring on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const ringCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "ring",
			).length;
			expect(ringCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("wand spawning", () => {
	it("spawns a wand on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "wand",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one wand on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const wandCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "wand",
			).length;
			expect(wandCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("slow wand spawning", () => {
	it("spawns a slow wand on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "slow",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one slow wand on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const slowWandCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "slow",
			).length;
			expect(slowWandCount).toBeLessThanOrEqual(1);
		}
	});

	it("spawned enemies start with slowedTurnsRemaining at 0", () => {
		const state = buildDungeonGameState(40, 20, 12345);
		for (const enemy of state.enemies) {
			expect(enemy.slowedTurnsRemaining).toBe(0);
		}
	});
});

describe("sustenance ring spawning", () => {
	it("spawns a sustenance ring on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "sustenance",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one sustenance ring on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const sustenanceRingCount = buildDungeonGameState(
				40,
				20,
				seed,
			).items.filter((item) => item.kind === "sustenance").length;
			expect(sustenanceRingCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("trapdoor spawning", () => {
	it("spawns a trapdoor on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).traps.some(
				(trap) => trap.kind === "trapdoor",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one trapdoor on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const trapdoorCount = buildDungeonGameState(40, 20, seed).traps.filter(
				(trap) => trap.kind === "trapdoor",
			).length;
			expect(trapdoorCount).toBeLessThanOrEqual(1);
		}
	});

	it("never spawns on GOAL_FLOOR (there is nothing lower to fall to)", () => {
		for (let seed = 1; seed <= 20; seed++) {
			let state = buildDungeonGameState(40, 20, seed);
			for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
				state = descendStairs(state);
			}
			expect(state.floor).toBe(GOAL_FLOOR);
			expect(state.traps.some((trap) => trap.kind === "trapdoor")).toBe(false);
		}
	});
});
