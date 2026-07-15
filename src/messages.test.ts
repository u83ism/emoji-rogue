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
				{ type: "sneak-attack", payload: { target: "zombie", damage: 3 } },
				"ゾンビに不意打ち!3のダメージを与えた!",
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
			[{ type: "item-picked-up", payload: { kind: "sword" } }, "剣を拾った"],
			[
				{ type: "game-won", payload: {} },
				"イェンダーの魔除けを手に地上に帰還した!",
			],
			[{ type: "floor-ascended", payload: { floor: 3 } }, "3階に上がった"],
			[
				{ type: "amulet-obtained", payload: {} },
				"イェンダーの魔除けを手に入れた!",
			],
			[
				{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
				"剣を装備した。攻撃力が1上がった!",
			],
			[
				{ type: "armor-equipped", payload: { kind: "shield", bonus: 1 } },
				"盾を装備した。防御力が1上がった!",
			],
			[
				{ type: "weapon-equipped", payload: { kind: "sword", bonus: -1 } },
				"剣を装備したが、呪われていた……攻撃力が1下がった",
			],
			[
				{ type: "weapon-equipped", payload: { kind: "sword", bonus: 0 } },
				"剣を装備したが、呪われていた……攻撃力は変わらなかった",
			],
			[
				{ type: "armor-equipped", payload: { kind: "shield", bonus: -1 } },
				"盾を装備したが、呪われていた……防御力が1下がった",
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
			[
				{ type: "player-poisoned", payload: { damage: 4 } },
				"毒薬を飲んでしまった。4のダメージを受けた",
			],
			[
				{ type: "player-died", payload: { by: "poison" } },
				"毒薬を飲んで倒れた……",
			],
			[
				{ type: "player-teleported", payload: { x: 5, y: 3 } },
				"巻物を読んだ。テレポートした!",
			],
			[{ type: "item-picked-up", payload: { kind: "scroll" } }, "巻物を拾った"],
			[
				{ type: "floor-mapped", payload: {} },
				"地図の巻物を読んだ。フロア全体が明らかになった!",
			],
			[
				{ type: "potion-identified", payload: { kind: "poison" } },
				"毒薬の正体を見破った!",
			],
			[
				{ type: "player-strengthened", payload: { bonus: 1 } },
				"怪力の薬を飲んだ。攻撃力が1上がった!",
			],
			[
				{ type: "gold-stolen", payload: { amount: 10 } },
				"盗賊に10ゴールド盗まれた!",
			],
			[
				{ type: "gold-stolen", payload: { amount: 0 } },
				"盗賊に襲われたが、何も盗られなかった",
			],
			[
				{ type: "ring-equipped", payload: { kind: "ring" } },
				"指輪を身につけた。じわじわとHPが回復するようになった!",
			],
			[
				{ type: "ring-equipped", payload: { kind: "sustenance" } },
				"指輪を身につけた。空腹の進みがゆるやかになった!",
			],
			[
				{ type: "player-regenerated", payload: { amount: 1 } },
				"指輪の力でHPが1回復した",
			],
		];
		for (const [event, expected] of cases) {
			expect(formatEvent(event, [])).toBe(expected);
		}
	});

	it("shows the generic unidentified name for a potion-family pickup not yet identified", () => {
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "potion" } }, []),
		).toBe("未鑑定の薬を拾った");
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, []),
		).toBe("未鑑定の薬を拾った");
	});

	it("reveals the real name for a potion-family pickup once that kind is identified", () => {
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "potion" } }, [
				"potion",
			]),
		).toBe("回復薬を拾った");
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, [
				"poison",
			]),
		).toBe("毒薬を拾った");
		/* identifying one potion kind does not reveal the other */
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, [
				"potion",
			]),
		).toBe("未鑑定の薬を拾った");
	});
});

describe("formatInventoryEntry", () => {
	it("formats a stack as name and quantity", () => {
		expect(
			formatInventoryEntry({ kind: "potion", quantity: 2 }, ["potion"]),
		).toBe("回復薬 x2");
		expect(formatInventoryEntry({ kind: "sword", quantity: 1 }, [])).toBe(
			"剣 x1",
		);
		expect(formatInventoryEntry({ kind: "shield", quantity: 1 }, [])).toBe(
			"盾 x1",
		);
		expect(formatInventoryEntry({ kind: "food", quantity: 3 }, [])).toBe(
			"食料 x3",
		);
		expect(formatInventoryEntry({ kind: "scroll", quantity: 1 }, [])).toBe(
			"巻物 x1",
		);
		expect(formatInventoryEntry({ kind: "mapping", quantity: 1 }, [])).toBe(
			"地図の巻物 x1",
		);
		expect(formatInventoryEntry({ kind: "identify", quantity: 1 }, [])).toBe(
			"識別の巻物 x1",
		);
	});

	it("shows the generic unidentified name for an unidentified potion-family stack", () => {
		expect(formatInventoryEntry({ kind: "potion", quantity: 2 }, [])).toBe(
			"未鑑定の薬 x2",
		);
		expect(formatInventoryEntry({ kind: "poison", quantity: 1 }, [])).toBe(
			"未鑑定の薬 x1",
		);
		expect(formatInventoryEntry({ kind: "strength", quantity: 1 }, [])).toBe(
			"未鑑定の薬 x1",
		);
	});

	it("reveals the real name once that potion kind is identified", () => {
		expect(
			formatInventoryEntry({ kind: "poison", quantity: 1 }, ["poison"]),
		).toBe("毒薬 x1");
		expect(
			formatInventoryEntry({ kind: "strength", quantity: 1 }, ["strength"]),
		).toBe("怪力の薬 x1");
	});
});
