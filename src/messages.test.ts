import { describe, expect, it } from "vitest";
import type { GameEvent } from "./game/events.js";
import { formatEvent } from "./messages.js";

describe("formatEvent", () => {
	it("turns every event kind into a Japanese log line", () => {
		const cases: readonly (readonly [GameEvent, string])[] = [
			[
				{ type: "player-hit", payload: { by: "zombie", damage: 3 } },
				"ゾンビから3のダメージを受けた",
			],
			[
				{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
				"ゾンビに1のダメージを与えた",
			],
			[
				{ type: "enemy-defeated", payload: { target: "zombie" } },
				"ゾンビをたおした!",
			],
			[
				{ type: "player-died", payload: { by: "zombie" } },
				"ゾンビにやられた……",
			],
			[{ type: "floor-descended", payload: { floor: 2 } }, "2階に降りた"],
		];
		for (const [event, expected] of cases) {
			expect(formatEvent(event)).toBe(expected);
		}
	});
});
