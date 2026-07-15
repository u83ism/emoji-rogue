import { describe, expect, it } from "vitest";
import { at } from "../indexing.js";
import { createRng } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import { PLAYER_MAX_HP } from "./balance.js";
import { buildDungeonGameState } from "./initialState.js";
import { buildReplayGameState, type Replay } from "./replay.js";
import type { Action } from "./state.js";

describe("buildReplayGameState", () => {
	it("with no actions, reproduces the initial dungeon exactly", () => {
		const replay: Replay = { width: 20, height: 12, seed: 42, actions: [] };
		expect(buildReplayGameState(replay)).toEqual(
			buildDungeonGameState(20, 12, 42),
		);
	});

	it("is deterministic: the same replay always reproduces the same result", () => {
		const replay: Replay = {
			width: 20,
			height: 12,
			seed: 42,
			actions: [{ type: "wait" }, { type: "wait" }, { type: "quit" }],
		};
		expect(buildReplayGameState(replay)).toEqual(buildReplayGameState(replay));
	});

	it("matches folding advanceTurn over the same actions by hand", () => {
		const actions: readonly Action[] = [
			{ type: "move", payload: { direction: "north" } },
			{ type: "wait" },
			{ type: "move", payload: { direction: "east" } },
		];
		let expected = buildDungeonGameState(20, 12, 42);
		for (const action of actions) {
			expected = advanceTurn(expected, action);
		}

		const replay: Replay = { width: 20, height: 12, seed: 42, actions };
		expect(buildReplayGameState(replay)).toEqual(expected);
	});

	it("reconstructs a fuzzed run turn-for-turn, including floor descents and item use", () => {
		const candidateActions: readonly Action[] = [
			{ type: "move", payload: { direction: "north" } },
			{ type: "move", payload: { direction: "south" } },
			{ type: "move", payload: { direction: "west" } },
			{ type: "move", payload: { direction: "east" } },
			{ type: "wait" },
			{ type: "use-item", payload: { kind: "potion" } },
			{ type: "use-item", payload: { kind: "sword" } },
			{ type: "use-item", payload: { kind: "shield" } },
		];

		for (const seed of [1, 2, 3]) {
			const actionPicker = createRng(seed + 1000);
			const actions: Action[] = [];
			let expected = buildDungeonGameState(40, 20, seed);
			for (let turn = 0; turn < 300 && expected.status === "playing"; turn++) {
				const picked = at(
					candidateActions,
					actionPicker.getUniformInt(0, candidateActions.length - 1),
				);
				actions.push(picked);
				expected = advanceTurn(expected, picked);
			}

			const replay: Replay = { width: 40, height: 20, seed, actions };
			const replayed = buildReplayGameState(replay);
			expect(replayed).toEqual(expected);
			expect(replayed.playerHp).toBeGreaterThanOrEqual(0);
			expect(replayed.playerHp).toBeLessThanOrEqual(PLAYER_MAX_HP);
		}
	});
});
