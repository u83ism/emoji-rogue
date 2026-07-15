import {
	type EnemyKind,
	type GameEvent,
	type ItemKind,
	POTION_KINDS,
	type TrapKind,
} from "./game/events.js";
import type { InventoryEntry } from "./game/state.js";

const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
	bat: "コウモリ",
	thief: "盗賊",
	nymph: "ニンフ",
	aquator: "アクエーター",
};

const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	potion: "回復薬",
	sword: "剣",
	shield: "盾",
	food: "食料",
	poison: "毒薬",
	scroll: "巻物",
	mapping: "地図の巻物",
	identify: "識別の巻物",
	strength: "怪力の薬",
	ring: "指輪",
	/* Same generic name as ring — which effect it grants only shows once worn. */
	sustenance: "指輪",
	"enchant-weapon": "武器強化の巻物",
	"enchant-armor": "防具強化の巻物",
	/* Generic name, like ring/sustenance — which effect it grants only shows once used. */
	wand: "杖",
	confusion: "混乱の薬",
	slow: "杖",
	levitation: "浮遊の薬",
	"protect-armor": "防具保護の巻物",
	blindness: "盲目の薬",
	paralysis: "麻痺の薬",
	"raise-level": "レベルアップの薬",
	"detect-monster": "索敵の薬",
	life: "生命の薬",
};

/** Shown for any potion-family item not yet identified this run. */
const UNIDENTIFIED_POTION_NAME = "未鑑定の薬";

const TRAP_NAMES: Readonly<Record<TrapKind, string>> = {
	dart: "矢のわな",
	trapdoor: "落とし穴",
	teleport: "テレポートの罠",
};

/**
 * The name to show for `kind`: the real name once identified (or for any
 * non-potion kind), the shared generic name otherwise — this is what makes
 * a potion and a poison potion indistinguishable until drunk or identified.
 */
const resolveItemDisplayName = (
	kind: ItemKind,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	if (POTION_KINDS.includes(kind) && !identifiedPotionKinds.includes(kind)) {
		return UNIDENTIFIED_POTION_NAME;
	}
	return ITEM_NAMES[kind];
};

// System notices (app/session concerns, never part of GameState). They speak
// in polite style to contrast with the plain style of in-world log lines.

/** Shown when keypresses arrive as full-width characters (IME in full-width mode). */
export const FULL_WIDTH_INPUT_WARNING =
	"全角入力モードになっています。半角入力に切り替えてください";

/** Shown once the shell is writing the suspend save and about to exit. */
export const GAME_SAVED_MESSAGE =
	"セーブしました。次回起動時に続きから再開します";

/** Title line atop the inventory overlay while it's open. */
export const INVENTORY_TITLE = "持ち物(iかEscで閉じる)";

/** Shown inside the inventory overlay when nothing is held. */
export const INVENTORY_EMPTY_MESSAGE = "何も持っていません";

/**
 * One inventory row, e.g. "回復薬 x2" — or "未鑑定の薬 x2" for a potion-family
 * kind not yet identified this run (see identifiedPotionKinds).
 */
export const formatInventoryEntry = (
	entry: InventoryEntry,
	identifiedPotionKinds: readonly ItemKind[],
): string =>
	`${resolveItemDisplayName(entry.kind, identifiedPotionKinds)} x${entry.quantity}`;

/** The one-line run summary shown once the game ends — see calculateScore in game/score.ts. */
export const formatScoreSummary = (
	score: number,
	floor: number,
	playerLevel: number,
	goldCollected: number,
	hasAmulet: boolean,
): string =>
	`スコア: ${score}(Lv.${playerLevel}, B${floor}F, 所持金${goldCollected}, ${
		hasAmulet ? "護符あり" : "護符なし"
	})`;

/**
 * Conducts upheld for the whole run (NetHack-style self-imposed challenge
 * record) — "・"-joined, or "" if none were upheld. See calculateScore.
 */
export const formatConducts = (
	hasAttacked: boolean,
	hasEaten: boolean,
): string =>
	[hasAttacked ? undefined : "非殺生", hasEaten ? undefined : "不食"]
		.filter((label): label is string => label !== undefined)
		.join("・");

/**
 * The single place where game events become human-readable text (Japanese
 * for now). The core (src/game/) never produces strings, so swapping locale
 * means swapping this module only — the i18n discipline in docs/tasks/game.md.
 * `identifiedPotionKinds` is needed only to decide whether item-picked-up
 * should reveal a potion-family kind's real name.
 */
export const formatEvent = (
	event: GameEvent,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	switch (event.type) {
		case "player-hit":
			return `${ENEMY_NAMES[event.payload.by]}から${event.payload.damage}のダメージを受けた`;
		case "enemy-hit":
			return `${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}のダメージを与えた`;
		case "sneak-attack":
			return `${ENEMY_NAMES[event.payload.target]}に不意打ち!${event.payload.damage}のダメージを与えた!`;
		case "enemy-defeated":
			return `${ENEMY_NAMES[event.payload.target]}をたおした!`;
		case "player-died":
			if (event.payload.by === "hunger") {
				return "空腹のあまり倒れた……";
			}
			if (event.payload.by === "trap") {
				return "わなにやられた……";
			}
			if (event.payload.by === "poison") {
				return "毒薬を飲んで倒れた……";
			}
			return `${ENEMY_NAMES[event.payload.by]}にやられた……`;
		case "floor-descended":
			return `${event.payload.floor}階に降りた`;
		case "floor-ascended":
			return `${event.payload.floor}階に上がった`;
		case "amulet-obtained":
			return "イェンダーの魔除けを手に入れた!";
		case "player-healed":
			return event.payload.amount > 0
				? `${ITEM_NAMES[event.payload.by]}を飲んだ。HPが${event.payload.amount}回復した`
				: `${ITEM_NAMES[event.payload.by]}を飲んだが、HPは満タンだった`;
		case "item-picked-up":
			return `${resolveItemDisplayName(event.payload.kind, identifiedPotionKinds)}を拾った`;
		case "game-won":
			return "イェンダーの魔除けを手に地上に帰還した!";
		case "weapon-equipped":
			if (event.payload.bonus > 0) {
				return `${ITEM_NAMES[event.payload.kind]}を装備した。攻撃力が${event.payload.bonus}上がった!`;
			}
			return event.payload.bonus < 0
				? `${ITEM_NAMES[event.payload.kind]}を装備したが、呪われていた……攻撃力が${-event.payload.bonus}下がった`
				: `${ITEM_NAMES[event.payload.kind]}を装備したが、呪われていた……攻撃力は変わらなかった`;
		case "armor-equipped":
			if (event.payload.bonus > 0) {
				return `${ITEM_NAMES[event.payload.kind]}を装備した。防御力が${event.payload.bonus}上がった!`;
			}
			return event.payload.bonus < 0
				? `${ITEM_NAMES[event.payload.kind]}を装備したが、呪われていた……防御力が${-event.payload.bonus}下がった`
				: `${ITEM_NAMES[event.payload.kind]}を装備したが、呪われていた……防御力は変わらなかった`;
		case "player-hungry":
			return "空腹を感じてきた";
		case "player-starved":
			return `空腹で${event.payload.damage}のダメージを受けた`;
		case "player-ate":
			return event.payload.amount > 0
				? `${ITEM_NAMES.food}を食べた。空腹度が${event.payload.amount}回復した`
				: `${ITEM_NAMES.food}を食べたが、空腹度は満タンだった`;
		case "gold-collected":
			return `${event.payload.amount}ゴールドを手に入れた`;
		case "trap-triggered":
			return event.payload.damage > 0
				? `${TRAP_NAMES[event.payload.kind]}を踏んでしまった。${event.payload.damage}のダメージを受けた`
				: `${TRAP_NAMES[event.payload.kind]}を踏んでしまった!`;
		case "player-poisoned":
			return `毒薬を飲んでしまった。${event.payload.damage}のダメージを受けた`;
		case "player-teleported":
			return "巻物を読んだ。テレポートした!";
		case "floor-mapped":
			return "地図の巻物を読んだ。フロア全体が明らかになった!";
		case "potion-identified":
			return `${ITEM_NAMES[event.payload.kind]}の正体を見破った!`;
		case "player-strengthened":
			return `${ITEM_NAMES.strength}を飲んだ。攻撃力が${event.payload.bonus}上がった!`;
		case "gold-stolen":
			return event.payload.amount > 0
				? `${ENEMY_NAMES.thief}に${event.payload.amount}ゴールド盗まれた!`
				: `${ENEMY_NAMES.thief}に襲われたが、何も盗られなかった`;
		case "item-stolen":
			return event.payload.kind !== undefined
				? `${ENEMY_NAMES.nymph}に${resolveItemDisplayName(event.payload.kind, identifiedPotionKinds)}を盗まれた!`
				: `${ENEMY_NAMES.nymph}に襲われたが、何も盗られなかった`;
		case "ring-equipped":
			return event.payload.kind === "sustenance"
				? `${ITEM_NAMES[event.payload.kind]}を身につけた。空腹の進みがゆるやかになった!`
				: `${ITEM_NAMES[event.payload.kind]}を身につけた。じわじわとHPが回復するようになった!`;
		case "player-regenerated":
			return `指輪の力でHPが${event.payload.amount}回復した`;
		case "weapon-enchanted":
			return `${ITEM_NAMES["enchant-weapon"]}を読んだ。攻撃力が${event.payload.bonus}上がった!`;
		case "armor-enchanted":
			return `${ITEM_NAMES["enchant-armor"]}を読んだ。防御力が${event.payload.bonus}上がった!`;
		case "armor-rusted":
			return `防具が錆びついた!防御力が${event.payload.amount}下がった`;
		case "wand-struck":
			return `杖から放たれた力が${ENEMY_NAMES[event.payload.target]}を貫いた!${event.payload.damage}のダメージを与えた!`;
		case "player-confused":
			return `${ITEM_NAMES.confusion}を飲んだ。頭がくらくらする!`;
		case "confusion-faded":
			return "混乱がおさまった";
		case "enemy-slowed":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}の動きを封じた!`;
		case "player-levitated":
			return `${ITEM_NAMES.levitation}を飲んだ。体がふわりと浮いた!`;
		case "levitation-faded":
			return "浮遊の効果が切れた";
		case "armor-protected":
			return `${ITEM_NAMES["protect-armor"]}を読んだ。防具が錆びなくなった!`;
		case "player-blinded":
			return `${ITEM_NAMES.blindness}を飲んだ。目の前が真っ暗になった!`;
		case "blindness-faded":
			return "目が見えるようになった";
		case "player-leveled-up":
			return `レベルが上がった!(Lv.${event.payload.level})`;
		case "player-paralyzed":
			return `${ITEM_NAMES.paralysis}を飲んだ。体が動かなくなった!`;
		case "paralysis-faded":
			return "体が動くようになった";
		case "player-detected-monsters":
			return `${ITEM_NAMES["detect-monster"]}を飲んだ。敵の気配を感じ取れるようになった!`;
		case "detect-monsters-faded":
			return "敵の気配を感じられなくなった";
		case "player-revitalized":
			return `${ITEM_NAMES.life}を飲んだ。最大HPが${event.payload.maxHpBonus}上がり、体力が全回復した!`;
		case "winds-of-kron-warning":
			return "不気味な風を感じる。長居は禁物のようだ…";
		case "winds-of-kron-eviction":
			return "クロンの風に吹き飛ばされた!";
	}
};
