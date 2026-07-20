import { describe, expect, it } from "vitest";
import type { GameEvent } from "../game/events.js";
import { formatConducts, formatEvent, formatScoreSummary } from "./messages.js";

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
				{ type: "player-healed", payload: { by: "heal-potion", amount: 5 } },
				"回復薬を飲んだ。HPが5回復した",
			],
			[
				{ type: "player-healed", payload: { by: "heal-potion", amount: 0 } },
				"回復薬を飲んだが、HPは満タンだった",
			],
			[{ type: "item-picked-up", payload: { kind: "sword" } }, "剣を拾った"],
			[
				{ type: "inventory-full", payload: { kind: "sword" } },
				"剣を持てなかった。持ち物がいっぱいだ",
			],
			[
				{ type: "item-dropped", payload: { kind: "sword" } },
				"剣を足元に置いた",
			],
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
				"剣を装備した。攻撃力+1",
			],
			[
				{ type: "armor-equipped", payload: { kind: "armor", bonus: 1 } },
				"鎧を装備した。防御力+1",
			],
			[
				{ type: "armor-equipped", payload: { kind: "armor", bonus: 0 } },
				"鎧を装備したが、錆びついていて防御力は上がらなかった",
			],
			[{ type: "item-unequipped", payload: { kind: "sword" } }, "剣を外した"],
			[
				{ type: "equip-blocked-cursed", payload: { kind: "armor" } },
				"鎧は呪われていて外せない!",
			],
			[
				{
					type: "curse-revealed",
					payload: { kind: "regeneration-ring" },
				},
				"指輪は呪われていた……外せなくなってしまった!",
			],
			[
				{ type: "items-decursed", payload: { count: 2 } },
				"解呪の巻物を読んだ。呪いが解け、2個のアイテムを外せるようになった!",
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
				{ type: "trap-triggered", payload: { kind: "trapdoor", damage: 0 } },
				"落とし穴を踏んでしまった!",
			],
			[
				{ type: "trap-triggered", payload: { kind: "teleport", damage: 0 } },
				"テレポートの罠を踏んでしまった!",
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
			[
				{ type: "item-picked-up", payload: { kind: "teleport-scroll" } },
				"巻物を拾った",
			],
			[
				{ type: "floor-mapped", payload: {} },
				"地図の巻物を読んだ。フロア全体が明らかになった!",
			],
			[
				{ type: "potion-identified", payload: { kind: "poison" } },
				"毒薬がどれか判明した。以後この種類は実名で表示される",
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
				{ type: "item-stolen", payload: { kind: "sword" } },
				"ニンフに剣を盗まれた!",
			],
			[
				{ type: "item-stolen", payload: { kind: undefined } },
				"ニンフに襲われたが、何も盗られなかった",
			],
			[
				{ type: "ring-equipped", payload: { kind: "regeneration-ring" } },
				"指輪を身につけた。じわじわとHPが回復するようになった!",
			],
			[
				{ type: "ring-equipped", payload: { kind: "sustenance-ring" } },
				"指輪を身につけた。空腹の進みがゆるやかになった!",
			],
			[
				{ type: "player-regenerated", payload: { amount: 1 } },
				"指輪の力でHPが1回復した",
			],
			[
				{ type: "weapon-enchanted", payload: { bonus: 1 } },
				"武器強化の巻物を読んだ。指定した剣の攻撃力が1上がった!",
			],
			[
				{ type: "armor-enchanted", payload: { bonus: 1 } },
				"防具強化の巻物を読んだ。指定した防具の防御力が1上がった!",
			],
			[
				{ type: "armor-rusted", payload: { amount: 1 } },
				"装備中の防具が錆びついた!防御力が1下がった",
			],
			[
				{ type: "wand-struck", payload: { target: "zombie", damage: 3 } },
				"杖から放たれた力がゾンビを貫いた!3のダメージを与えた!",
			],
			[
				{ type: "player-confused", payload: { turns: 10 } },
				"混乱の薬を飲んだ。頭がくらくらする!",
			],
			[{ type: "confusion-faded", payload: {} }, "混乱がおさまった"],
			[
				{ type: "enemy-slowed", payload: { target: "zombie", turns: 5 } },
				"杖の力でゾンビの動きを封じた!",
			],
			[
				{ type: "player-levitated", payload: { turns: 15 } },
				"浮遊の薬を飲んだ。体がふわりと浮いた!",
			],
			[{ type: "levitation-faded", payload: {} }, "浮遊の効果が切れた"],
			[
				{ type: "armor-protected", payload: {} },
				"防具保護の巻物を読んだ。指定した防具が錆びなくなった!",
			],
			[
				{ type: "player-blinded", payload: { turns: 20 } },
				"盲目の薬を飲んだ。目の前が真っ暗になった!",
			],
			[{ type: "blindness-faded", payload: {} }, "目が見えるようになった"],
			[
				{ type: "player-leveled-up", payload: { level: 2 } },
				"レベルが上がった!(Lv.2)",
			],
			[
				{ type: "player-paralyzed", payload: { turns: 3 } },
				"麻痺の薬を飲んだ。体が動かなくなった!",
			],
			[{ type: "paralysis-faded", payload: {} }, "体が動くようになった"],
			[
				{ type: "player-detected-monsters", payload: { turns: 20 } },
				"索敵の薬を飲んだ。敵の気配を感じ取れるようになった!",
			],
			[
				{ type: "detect-monsters-faded", payload: {} },
				"敵の気配を感じられなくなった",
			],
			[
				{ type: "player-revitalized", payload: { maxHpBonus: 5 } },
				"生命の薬を飲んだ。最大HPが5上がり、体力が全回復した!",
			],
			[
				{ type: "winds-of-kron-warning", payload: {} },
				"不気味な風を感じる。長居は禁物のようだ…",
			],
			[
				{ type: "winds-of-kron-eviction", payload: {} },
				"クロンの風に吹き飛ばされた!",
			],
			[
				{ type: "orc-gold-drop", payload: { amount: 7 } },
				"オークが金貨を落とした!7ゴールド手に入れた",
			],
			[
				{ type: "enemy-teleported", payload: { target: "zombie" } },
				"杖の力でゾンビをどこかへ飛ばした!",
			],
			[
				{ type: "ring-equipped", payload: { kind: "stealth-ring" } },
				"指輪を身につけた。足音が忍びやかになった!",
			],
			[
				{ type: "ring-equipped", payload: { kind: "awareness-ring" } },
				"指輪を身につけた。敵の気配を常に感じ取れるようになった!",
			],
			[
				{ type: "enemy-confused", payload: { target: "zombie", turns: 8 } },
				"混乱の巻物を読んだ。ゾンビが混乱した!",
			],
			[
				{ type: "player-hallucinated", payload: { turns: 20 } },
				"幻覚の薬を飲んだ。景色が歪んで見える!",
			],
			[{ type: "hallucination-faded", payload: {} }, "幻覚がおさまった"],
			[
				{ type: "enemy-held", payload: { target: "zombie", turns: 5 } },
				"束縛の巻物を読んだ。ゾンビの動きを封じた!",
			],
			[
				{
					type: "ring-equipped",
					payload: { kind: "aggravate-monster-ring" },
				},
				"指輪を身につけた。敵の気配に気づかれてしまった!",
			],
			[
				{ type: "enemy-slept", payload: { target: "zombie" } },
				"杖の力でゾンビを眠らせた!",
			],
		];
		for (const [event, expected] of cases) {
			expect(formatEvent(event, [])).toBe(expected);
		}
	});

	it("shows the generic unidentified name for a potion-family pickup not yet identified", () => {
		expect(
			formatEvent(
				{ type: "item-picked-up", payload: { kind: "heal-potion" } },
				[],
			),
		).toBe("未鑑定の薬を拾った");
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, []),
		).toBe("未鑑定の薬を拾った");
		expect(
			formatEvent(
				{ type: "item-picked-up", payload: { kind: "confusion" } },
				[],
			),
		).toBe("未鑑定の薬を拾った");
	});

	it("reveals the real name for a potion-family pickup once that kind is identified", () => {
		expect(
			formatEvent(
				{ type: "item-picked-up", payload: { kind: "heal-potion" } },
				["heal-potion"],
			),
		).toBe("回復薬を拾った");
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, [
				"poison",
			]),
		).toBe("毒薬を拾った");
		/* identifying one potion kind does not reveal the other */
		expect(
			formatEvent({ type: "item-picked-up", payload: { kind: "poison" } }, [
				"heal-potion",
			]),
		).toBe("未鑑定の薬を拾った");
	});

	it("respects identification state for inventory-full and item-dropped too", () => {
		expect(
			formatEvent({ type: "inventory-full", payload: { kind: "poison" } }, []),
		).toBe("未鑑定の薬を持てなかった。持ち物がいっぱいだ");
		expect(
			formatEvent({ type: "item-dropped", payload: { kind: "poison" } }, [
				"poison",
			]),
		).toBe("毒薬を足元に置いた");
	});

	it("respects identification state for a stolen potion-family item too", () => {
		expect(
			formatEvent({ type: "item-stolen", payload: { kind: "poison" } }, []),
		).toBe("ニンフに未鑑定の薬を盗まれた!");
		expect(
			formatEvent({ type: "item-stolen", payload: { kind: "poison" } }, [
				"poison",
			]),
		).toBe("ニンフに毒薬を盗まれた!");
	});
});

describe("formatScoreSummary", () => {
	it("includes the score, level, floor, gold, and amulet status", () => {
		expect(formatScoreSummary(1234, 5, 3, 150, true)).toBe(
			"スコア: 1234(Lv.3, B5F, 所持金150, 護符あり)",
		);
		expect(formatScoreSummary(100, 1, 1, 0, false)).toBe(
			"スコア: 100(Lv.1, B1F, 所持金0, 護符なし)",
		);
	});
});

describe("formatConducts", () => {
	it("lists every upheld conduct, joined by a middle dot", () => {
		expect(formatConducts(false, false)).toBe("非殺生・不食");
	});

	it("lists only the conducts actually upheld", () => {
		expect(formatConducts(true, false)).toBe("不食");
		expect(formatConducts(false, true)).toBe("非殺生");
	});

	it("is empty once both conducts are broken", () => {
		expect(formatConducts(true, true)).toBe("");
	});
});
