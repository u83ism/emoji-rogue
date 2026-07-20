import type { GameEvent, ItemKind } from "../game/events.js";
import {
	ENEMY_NAMES,
	ITEM_NAMES,
	resolveItemDisplayName,
	TRAP_NAMES,
} from "./gameNames.js";

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
		case "inventory-full":
			return `${resolveItemDisplayName(event.payload.kind, identifiedPotionKinds)}を持てなかった。持ち物がいっぱいだ`;
		case "item-dropped":
			return `${resolveItemDisplayName(event.payload.kind, identifiedPotionKinds)}を足元に置いた`;
		case "game-won":
			return "イェンダーの魔除けを手に地上に帰還した!";
		case "weapon-equipped":
			return `${ITEM_NAMES[event.payload.kind]}を装備した。攻撃力+${event.payload.bonus}`;
		case "armor-equipped":
			return event.payload.bonus > 0
				? `${ITEM_NAMES[event.payload.kind]}を装備した。防御力+${event.payload.bonus}`
				: `${ITEM_NAMES[event.payload.kind]}を装備したが、錆びついていて防御力は上がらなかった`;
		case "item-unequipped":
			return `${ITEM_NAMES[event.payload.kind]}を外した`;
		case "equip-blocked-cursed":
			return `${ITEM_NAMES[event.payload.kind]}は呪われていて外せない!`;
		case "curse-revealed":
			return `${ITEM_NAMES[event.payload.kind]}は呪われていた……外せなくなってしまった!`;
		case "items-decursed":
			return `${ITEM_NAMES["remove-curse-scroll"]}を読んだ。呪いが解け、${event.payload.count}個のアイテムを外せるようになった!`;
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
			/* Identification is per-kind and run-global, not per held item — the
			 * wording must not imply an item in the inventory transformed
			 * (2026-07-18 playtest: "見破った!" read as if a held potion changed,
			 * and kinds not held looked like vanished items). */
			return `${ITEM_NAMES[event.payload.kind]}がどれか判明した。以後この種類は実名で表示される`;
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
			if (event.payload.kind === "sustenance-ring") {
				return `${ITEM_NAMES[event.payload.kind]}を身につけた。空腹の進みがゆるやかになった!`;
			}
			if (event.payload.kind === "stealth-ring") {
				return `${ITEM_NAMES[event.payload.kind]}を身につけた。足音が忍びやかになった!`;
			}
			return `${ITEM_NAMES[event.payload.kind]}を身につけた。じわじわとHPが回復するようになった!`;
		case "player-regenerated":
			return `指輪の力でHPが${event.payload.amount}回復した`;
		case "weapon-enchanted":
			return `${ITEM_NAMES["enchant-weapon"]}を読んだ。指定した剣の攻撃力が${event.payload.bonus}上がった!`;
		case "armor-enchanted":
			return `${ITEM_NAMES["enchant-armor"]}を読んだ。指定した防具の防御力が${event.payload.bonus}上がった!`;
		case "armor-rusted":
			return `装備中の防具が錆びついた!防御力が${event.payload.amount}下がった`;
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
			return `${ITEM_NAMES["protect-armor"]}を読んだ。指定した防具が錆びなくなった!`;
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
		case "orc-gold-drop":
			return `オークが金貨を落とした!${event.payload.amount}ゴールド手に入れた`;
		case "enemy-teleported":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}をどこかへ飛ばした!`;
	}
};
