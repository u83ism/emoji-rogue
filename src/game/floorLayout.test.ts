import { describe, expect, it } from "vitest";
import { GOAL_FLOOR, MONSTER_HOUSE_ENEMY_COUNT } from "./balance.js";
import { descendStairs } from "./floor.js";
import { buildDungeonGameState } from "./initialState.js";

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
				(item) => item.kind === "teleport-scroll",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const scrollCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "teleport-scroll",
			).length;
			expect(scrollCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("mapping scroll spawning", () => {
	it("spawns a mapping scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "mapping-scroll",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one mapping scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const mappingCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "mapping-scroll",
			).length;
			expect(mappingCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("identify scroll spawning", () => {
	it("spawns an identify scroll on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "identify-scroll",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one identify scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const identifyCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "identify-scroll",
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

describe("levitation potion spawning", () => {
	it("spawns a levitation potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "levitation",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one levitation potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const levitationCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "levitation",
			).length;
			expect(levitationCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("protect armor scroll spawning", () => {
	it("spawns a protect armor scroll on some floors and not others (independent per-floor roll)", () => {
		/* 60 seeds, not 20 — at a 10% per-floor chance a 20-seed window can
		 * deterministically contain no spawn at all */
		const outcomes = Array.from({ length: 60 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "protect-armor",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one protect armor scroll on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const protectCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "protect-armor",
			).length;
			expect(protectCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("blindness potion spawning", () => {
	it("spawns a blindness potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "blindness",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one blindness potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const blindnessCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "blindness",
			).length;
			expect(blindnessCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("paralysis potion spawning", () => {
	it("spawns a paralysis potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "paralysis",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one paralysis potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const paralysisCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "paralysis",
			).length;
			expect(paralysisCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("raise-level potion spawning", () => {
	it("spawns a raise-level potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "raise-level",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one raise-level potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const raiseLevelCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "raise-level",
			).length;
			expect(raiseLevelCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("detect-monster potion spawning", () => {
	it("spawns a detect-monster potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "detect-monster",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one detect-monster potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const detectMonsterCount = buildDungeonGameState(
				40,
				20,
				seed,
			).items.filter((item) => item.kind === "detect-monster").length;
			expect(detectMonsterCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("life potion spawning", () => {
	it("spawns a life potion on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "life",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one life potion on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const lifeCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "life",
			).length;
			expect(lifeCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("monster house spawning", () => {
	/* every ordinary zombie/bat spawns asleep — any awake one is monster house evidence */
	const countAwakeZombiesAndBats = (seed: number): number =>
		buildDungeonGameState(40, 20, seed).enemies.filter(
			(enemy) =>
				(enemy.kind === "zombie" || enemy.kind === "bat") && enemy.awake,
		).length;

	it("spawns a room of awake enemies on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from(
			{ length: 30 },
			(_, index) => countAwakeZombiesAndBats(index + 1) > 0,
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never adds more than MONSTER_HOUSE_ENEMY_COUNT awake zombies/bats", () => {
		for (let seed = 1; seed <= 30; seed++) {
			expect(countAwakeZombiesAndBats(seed)).toBeLessThanOrEqual(
				MONSTER_HOUSE_ENEMY_COUNT,
			);
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

describe("ring spawning", () => {
	it("spawns a ring on some floors and not others (independent per-floor roll)", () => {
		/* 60 seeds, not 20 — at an 8% per-floor chance a 20-seed window can
		 * deterministically contain no spawn at all */
		const outcomes = Array.from({ length: 60 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "regeneration-ring",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one ring on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const ringCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "regeneration-ring",
			).length;
			expect(ringCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("wand spawning", () => {
	it("spawns a wand on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "striking-wand",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one wand on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const wandCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "striking-wand",
			).length;
			expect(wandCount).toBeLessThanOrEqual(1);
		}
	});
});

describe("slow wand spawning", () => {
	it("spawns a slow wand on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "slow-wand",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one slow wand on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const slowWandCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "slow-wand",
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
				(item) => item.kind === "sustenance-ring",
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
			).items.filter((item) => item.kind === "sustenance-ring").length;
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

describe("teleport trap spawning", () => {
	it("spawns a teleport trap on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).traps.some(
				(trap) => trap.kind === "teleport",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one teleport trap on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const teleportTrapCount = buildDungeonGameState(
				40,
				20,
				seed,
			).traps.filter((trap) => trap.kind === "teleport").length;
			expect(teleportTrapCount).toBeLessThanOrEqual(1);
		}
	});

	it("can spawn on GOAL_FLOOR too, unlike a trapdoor", () => {
		const spawnsOnGoalFloor = Array.from({ length: 30 }, (_, index) => {
			let state = buildDungeonGameState(40, 20, index + 1);
			for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
				state = descendStairs(state);
			}
			return state.traps.some((trap) => trap.kind === "teleport");
		});
		expect(spawnsOnGoalFloor.some((spawned) => spawned)).toBe(true);
	});
});
