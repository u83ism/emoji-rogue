import { describe, expect, it } from "vitest";
import type { GameEvent } from "./game/events.js";
import { formatEvent, formatInventoryEntry } from "./messages.js";

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
			[
				{ type: "player-hit", payload: { by: "bat", damage: 1 } },
				"コウモリから1のダメージを受けた",
			],
			[{ type: "floor-descended", payload: { floor: 2 } }, "2階に降りた"],
			[
				{ type: "player-healed", payload: { by: "potion", amount: 5 } },
				"回復薬を飲んだ。HPが5回復した",
			],
			[
				{ type: "player-healed", payload: { by: "potion", amount: 0 } },
				"回復薬を飲んだが、HPは満タンだった",
			],
			[
				{ type: "item-picked-up", payload: { kind: "potion" } },
				"回復薬を拾った",
			],
		];
		for (const [event, expected] of cases) {
			expect(formatEvent(event)).toBe(expected);
		}
	});
});

describe("formatInventoryEntry", () => {
	it("formats a stack as name and quantity", () => {
		expect(formatInventoryEntry({ kind: "potion", quantity: 2 })).toBe(
			"回復薬 x2",
		);
	});
});
