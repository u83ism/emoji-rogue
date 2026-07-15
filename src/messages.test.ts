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
				{ type: "player-died", payload: { by: "hunger" } },
				"空腹のあまり倒れた……",
			],
			[{ type: "player-died", payload: { by: "trap" } }, "わなにやられた……"],
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
			[
				{ type: "game-won", payload: { floor: 10 } },
				"10階に到達し、生還に成功した!",
			],
			[
				{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
				"剣を装備した。攻撃力が1上がった!",
			],
			[
				{ type: "armor-equipped", payload: { kind: "shield", bonus: 1 } },
				"盾を装備した。防御力が1上がった!",
			],
			[{ type: "player-hungry", payload: {} }, "空腹を感じてきた"],
			[
				{ type: "player-starved", payload: { damage: 1 } },
				"空腹で1のダメージを受けた",
			],
			[
				{ type: "player-ate", payload: { amount: 50 } },
				"食料を食べた。空腹度が50回復した",
			],
			[
				{ type: "player-ate", payload: { amount: 0 } },
				"食料を食べたが、空腹度は満タンだった",
			],
			[
				{ type: "gold-collected", payload: { amount: 7 } },
				"7ゴールドを手に入れた",
			],
			[
				{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
				"矢のわなを踏んでしまった。2のダメージを受けた",
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
		expect(formatInventoryEntry({ kind: "sword", quantity: 1 })).toBe("剣 x1");
		expect(formatInventoryEntry({ kind: "shield", quantity: 1 })).toBe("盾 x1");
		expect(formatInventoryEntry({ kind: "food", quantity: 3 })).toBe("食料 x3");
	});
});
