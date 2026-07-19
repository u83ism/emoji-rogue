import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildFrameGrid } from "./frame.js";
import { buildArenaGameState } from "./initialState.js";

describe("buildFrameGrid", () => {
	const state = buildArenaGameState(5, 4, 1);
	const grid = buildFrameGrid(state);

	it("produces a row-major grid of the map's dimensions", () => {
		expect(grid.length).toBe(4);
		for (const row of grid) {
			expect(row.length).toBe(5);
		}
	});

	it("draws walls, floors, and the player with their glyphs", () => {
		expect(grid[0]?.[0]?.glyph).toBe("🧱");
		expect(grid[1]?.[1]?.glyph).toBe("🟫");
		expect(grid[state.player.y]?.[state.player.x]?.glyph).toBe("🧑");
	});

	it("follows the player as the state advances", () => {
		const moved = advanceTurn(state, {
			type: "move",
			payload: { direction: "west" },
		});
		const nextGrid = buildFrameGrid(moved);
		expect(nextGrid[moved.player.y]?.[moved.player.x]?.glyph).toBe("🧑");
		expect(nextGrid[state.player.y]?.[state.player.x]?.glyph).toBe("🟫");
	});

	it("draws enemies only while they are visible", () => {
		/* 30x5 arena: player (15,2), radius 8 */
		const wide = buildArenaGameState(30, 5, 1);
		const zombie = {
			kind: "zombie",
			hp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
		} as const;
		const seen = {
			...wide,
			enemies: [{ ...zombie, x: 20, y: 2 }] /* distance 5 */,
		};
		expect(buildFrameGrid(seen)[2]?.[20]?.glyph).toBe("🧟");

		const hidden = {
			...wide,
			enemies: [{ ...zombie, x: 27, y: 2 }] /* distance 12 */,
		};
		expect(buildFrameGrid(hidden)[2]?.[27]?.glyph).not.toBe("🧟");
	});

	it("draws enemies outside FOV too while detectMonstersTurnsRemaining is active", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const zombie = {
			kind: "zombie",
			hp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
		} as const;
		const detecting = {
			...wide,
			detectMonstersTurnsRemaining: 5,
			enemies: [{ ...zombie, x: 27, y: 2 }] /* distance 12, normally hidden */,
		};
		expect(buildFrameGrid(detecting)[2]?.[27]?.glyph).toBe("🧟");
	});

	it("draws bats with their own glyph, distinct from zombies", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const bat = {
			kind: "bat",
			hp: 1,
			awake: true,
			slowedTurnsRemaining: 0,
		} as const;
		const seen = { ...wide, enemies: [{ ...bat, x: 20, y: 2 }] };
		expect(buildFrameGrid(seen)[2]?.[20]?.glyph).toBe("🦇");
	});

	it("draws thieves with their own glyph", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const thief = {
			kind: "thief",
			hp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
		} as const;
		const seen = { ...wide, enemies: [{ ...thief, x: 20, y: 2 }] };
		expect(buildFrameGrid(seen)[2]?.[20]?.glyph).toBe("👺");
	});

	it("draws the player as a skull once the run has ended in death", () => {
		const dead = { ...state, status: "dead" as const };
		expect(buildFrameGrid(dead)[state.player.y]?.[state.player.x]?.glyph).toBe(
			"💀",
		);

		/* quitting is not dying — the player glyph stays */
		const exited = { ...state, status: "exited" as const };
		expect(
			buildFrameGrid(exited)[state.player.y]?.[state.player.x]?.glyph,
		).toBe("🧑");
	});

	it("draws the player celebrating once the run has ended in victory", () => {
		const won = { ...state, status: "won" as const };
		expect(buildFrameGrid(won)[state.player.y]?.[state.player.x]?.glyph).toBe(
			"🎉",
		);
	});

	it("renders the three vision layers", () => {
		/* 30x5 arena: player starts at (15,2); view radius is 8 */
		const wide = buildArenaGameState(30, 5, 1);
		const west = { type: "move", payload: { direction: "west" } } as const;
		const moved = advanceTurn(advanceTurn(wide, west), west); /* (13,2) */
		const layered = buildFrameGrid(moved);

		/* visible layer: emoji */
		expect(layered[2]?.[12]?.glyph).toBe("🟫");
		expect(layered[2]?.[13]?.glyph).toBe("🧑");
		/* remembered layer: silhouettes (seen from (15,2), now out of range) */
		expect(layered[2]?.[23]).toEqual({ glyph: "　", bg: "#262626" });
		expect(layered[0]?.[23]).toEqual({ glyph: "　", bg: "#666666" });
		/* unexplored layer: darkness */
		expect(layered[2]?.[29]).toEqual({ glyph: "　" });
	});

	it("draws a sword with its own glyph, distinct from potions", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const sword = {
			x: 12,
			y: 2,
			kind: "sword" as const,
			identity: { itemId: 1, cursed: false, attackBonus: 1 },
		}; /* distance 3 */
		expect(buildFrameGrid({ ...wide, items: [sword] })[2]?.[12]?.glyph).toBe(
			"🔪",
		);
	});

	it("draws armor with its own glyph, distinct from swords", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const armor = {
			x: 12,
			y: 2,
			kind: "armor" as const,
			identity: {
				itemId: 1,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			},
		}; /* distance 3 */
		expect(buildFrameGrid({ ...wide, items: [armor] })[2]?.[12]?.glyph).toBe(
			"🦺",
		);
	});

	it("draws a scroll with its glyph", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const scroll = {
			x: 12,
			y: 2,
			kind: "teleport-scroll" as const,
		}; /* distance 3 */
		expect(buildFrameGrid({ ...wide, items: [scroll] })[2]?.[12]?.glyph).toBe(
			"📜",
		);
	});

	it("draws every scroll kind with the same glyph — category art is fixed, identity comes from the name", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const mapping = {
			x: 12,
			y: 2,
			kind: "mapping-scroll" as const,
		}; /* distance 3 */
		const identify = {
			x: 12,
			y: 2,
			kind: "identify-scroll" as const,
		};
		expect(buildFrameGrid({ ...wide, items: [mapping] })[2]?.[12]?.glyph).toBe(
			"📜",
		);
		expect(buildFrameGrid({ ...wide, items: [identify] })[2]?.[12]?.glyph).toBe(
			"📜",
		);
	});

	it("draws poison and strength potions with the same glyph as a real potion (unidentified)", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const poison = { x: 12, y: 2, kind: "poison" as const };
		const strength = { x: 12, y: 2, kind: "strength" as const };
		expect(buildFrameGrid({ ...wide, items: [poison] })[2]?.[12]?.glyph).toBe(
			"💊",
		);
		expect(buildFrameGrid({ ...wide, items: [strength] })[2]?.[12]?.glyph).toBe(
			"💊",
		);
	});

	it("draws visible potions, with enemies taking precedence", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const potion = {
			x: 12,
			y: 2,
			kind: "heal-potion" as const,
		}; /* distance 3 */
		expect(buildFrameGrid({ ...wide, items: [potion] })[2]?.[12]?.glyph).toBe(
			"💊",
		);

		const covered = {
			...wide,
			items: [potion],
			enemies: [
				{
					x: 12,
					y: 2,
					kind: "zombie" as const,
					hp: 2,
					awake: true,
					slowedTurnsRemaining: 0,
				},
			],
		};
		expect(buildFrameGrid(covered)[2]?.[12]?.glyph).toBe("🧟");

		/* out of sight (distance 12): not drawn */
		const far = { ...wide, items: [{ ...potion, x: 27 }] };
		expect(buildFrameGrid(far)[2]?.[27]?.glyph).not.toBe("💊");
	});

	it("draws visible gold piles, with items taking precedence", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const pile = { x: 12, y: 2, amount: 5 }; /* distance 3 */
		expect(buildFrameGrid({ ...wide, goldPiles: [pile] })[2]?.[12]?.glyph).toBe(
			"💰",
		);

		const covered = {
			...wide,
			goldPiles: [pile],
			items: [{ x: 12, y: 2, kind: "heal-potion" as const }],
		};
		expect(buildFrameGrid(covered)[2]?.[12]?.glyph).toBe("💊");

		/* out of sight (distance 12): not drawn */
		const far = { ...wide, goldPiles: [{ ...pile, x: 27 }] };
		expect(buildFrameGrid(far)[2]?.[27]?.glyph).not.toBe("💰");
	});

	it("draws the staircase while visible, enemies take precedence on it", () => {
		const wide = buildArenaGameState(30, 5, 1);
		const seen = {
			...wide,
			stairs: { x: 18, y: 2, direction: "down" as const },
		}; /* distance 3 */
		expect(buildFrameGrid(seen)[2]?.[18]?.glyph).toBe("🔽");

		const covered = {
			...seen,
			enemies: [
				{
					x: 18,
					y: 2,
					kind: "zombie" as const,
					hp: 2,
					awake: true,
					slowedTurnsRemaining: 0,
				},
			],
		};
		expect(buildFrameGrid(covered)[2]?.[18]?.glyph).toBe("🧟");
	});

	it("remembers a seen staircase with its own silhouette color", () => {
		/* stairs at (23,2): inside view from the start (15,2), out of view
		 * after moving west twice — like the layered test above */
		const wide = buildArenaGameState(30, 5, 1);
		const withStairs = {
			...wide,
			stairs: { x: 23, y: 2, direction: "down" as const },
		};
		const west = { type: "move", payload: { direction: "west" } } as const;
		const moved = advanceTurn(advanceTurn(withStairs, west), west);
		const layered = buildFrameGrid(moved);
		expect(layered[2]?.[23]).toEqual({ glyph: "　", bg: "#26454a" });
		/* an unexplored staircase gives nothing away */
		const unseen = {
			...moved,
			stairs: { x: 28, y: 3, direction: "down" as const },
			explored: wide.explored,
		};
		expect(
			buildFrameGrid({ ...unseen, player: { x: 13, y: 2 } })[3]?.[28],
		).toEqual({
			glyph: "　",
		});
	});
});
