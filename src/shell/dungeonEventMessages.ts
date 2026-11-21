import type { GameEvent } from "../game/events.js";
import { formatEnemyName, TRAP_NAMES } from "./gameNames.js";

/** Why `>`/`<` did nothing (original Rogue's d_level()/u_level() messages), by reason and direction. */
const STAIRS_REFUSAL_MESSAGES: Readonly<
	Record<
		"no-stairs" | "levitating" | "magically-blocked",
		Readonly<Record<"down" | "up", string>>
	>
> = {
	"no-stairs": { down: "ここに下りる階段はない", up: "ここに上る階段はない" },
	levitating: {
		down: "浮いているので階段を使えない",
		up: "浮いているので階段を使えない",
	},
	"magically-blocked": {
		down: "魔法の力で行く手をはばまれている",
		up: "魔法の力で行く手をはばまれている(アミュレットが無いと上れない)",
	},
};

/** A mysterious trap's sensations — original Rogue's eleven T_MYST messages, in its order. */
const MYSTERY_MESSAGES: readonly string[] = [
	"急に別の次元にいるような気がした",
	"このあたりの光の色が急に変わった",
	"首筋にちくりと痛みを感じた",
	"色とりどりの線が渦を巻き、消えていった",
	"目の前で光がまたたいた",
	"耳元を針がかすめていった!",
	"鎧の上で火花が踊った",
	"急にひどく喉が渇いた",
	"時間が急に速く流れだした気がした",
	"時間がゆっくり流れているように感じる",
	"持ち物の色が変わった!",
];

/** The events about the dungeon itself — its traps, staircase, secret doors and light — and the drain life wand's. */
const DUNGEON_EVENT_TYPES = [
	"stairs-refused",
	"trap-triggered",
	"trap-found",
	"secret-door-found",
	"tingling",
	"item-numbers-known",
	"food-detected",
	"magic-detected",
	"room-lit",
	"corridor-glowed",
	"life-drained",
	"enemy-drained",
	"player-stuck",
	"trap-mystery",
] as const satisfies readonly GameEvent["type"][];

type DungeonEvent = Extract<
	GameEvent,
	{ type: (typeof DUNGEON_EVENT_TYPES)[number] }
>;

/** Whether formatDungeonEvent writes `event`'s line — eventMessages.ts's formatEvent hands those over before its own switch. */
export const isDungeonEvent = (event: GameEvent): event is DungeonEvent =>
	DUNGEON_EVENT_TYPES.some((type) => type === event.type);

/**
 * The log line for a DungeonEvent — split out of eventMessages.ts's
 * formatEvent (which delegates here) once the traps of milestone 119 pushed
 * that file past the 200-line structure limit.
 */
export const formatDungeonEvent = (event: DungeonEvent): string => {
	switch (event.type) {
		case "stairs-refused":
			return STAIRS_REFUSAL_MESSAGES[event.payload.reason][
				event.payload.direction
			];
		case "trap-triggered":
			if (
				(event.payload.kind === "dart" || event.payload.kind === "arrow") &&
				event.payload.damage === 0
			) {
				return `${TRAP_NAMES[event.payload.kind]}を踏んだが、矢は外れた`;
			}
			return event.payload.damage > 0
				? `${TRAP_NAMES[event.payload.kind]}を踏んでしまった。${event.payload.damage}のダメージを受けた`
				: `${TRAP_NAMES[event.payload.kind]}を踏んでしまった!`;
		case "trap-found":
			return `${TRAP_NAMES[event.payload.kind]}を見つけた`;
		case "room-lit":
			return "部屋がぱっと明るくなった!";
		case "corridor-glowed":
			return "通路が光り、すぐに消えた";
		case "magic-detected":
			return event.payload.count > 0
				? "薬を飲んだ。この階に魔法の気配を感じる!"
				: "薬を飲んだ。一瞬妙な感じがしたが、すぐに消えた";
		case "food-detected":
			return event.payload.count > 0
				? "鼻がむずむずし、食べ物の匂いがした!"
				: "鼻がむずむずした";
		case "item-numbers-known":
			return "巻物を読んだ。その品の値が分かった(持ち物欄に出る)";
		case "tingling":
			return "体がぴりぴりした";
		case "life-drained":
			return `杖に生命力を吸い取られ、HPが${event.payload.lost}減った。その力が周りの敵を襲う!`;
		case "enemy-drained":
			return `${formatEnemyName(event.payload.target)}は生命力を奪われて倒れた!`;
		case "secret-door-found":
			return "隠し扉を見つけた!";
		case "player-stuck":
			return "まだ捕獲のわなに捕まっている";
		case "trap-mystery":
			return MYSTERY_MESSAGES[event.payload.variant] ?? "不思議な感覚がした";
	}
};
