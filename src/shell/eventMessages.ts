import { UNARMORED_ARMOR_CLASS } from "../game/balance.js";
import type { GameEvent, ItemKind } from "../game/events.js";
import {
	ENEMY_NAMES,
	EQUIPMENT_NAMES,
	formatDeathMessage,
	ITEM_NAMES,
	RING_EQUIPPED_EFFECT,
	resolveItemDisplayName,
	TRAP_NAMES,
} from "./gameNames.js";
import { formatSignedBonus } from "./inventoryLabels.js";

/**
 * The single place where game events become human-readable text (Japanese
 * for now). The core (src/game/) never produces strings, so swapping locale
 * means swapping this module only — the i18n discipline in docs/tasks/game.md.
 * `identifiedItemKinds` is needed only to decide whether item-picked-up
 * should reveal a potion-family kind's real name. Split out of messages.ts
 * (milestone 98 follow-up) to stay under the 200-line structure limit.
 */
export const formatEvent = (
	event: GameEvent,
	identifiedItemKinds: readonly ItemKind[],
): string => {
	switch (event.type) {
		case "player-hit" /* 0 only for the aquator, whose attacks just rust */:
			return event.payload.damage > 0
				? `${ENEMY_NAMES[event.payload.by]}から${event.payload.damage}のダメージを受けた`
				: `${ENEMY_NAMES[event.payload.by]}の攻撃が当たった`;
		case "enemy-hit":
			return `${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}のダメージを与えた`;
		case "enemy-defeated":
			return `${ENEMY_NAMES[event.payload.target]}をたおした!`;
		case "player-died":
			return formatDeathMessage(event.payload.by);
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
			return `${resolveItemDisplayName(event.payload.kind, identifiedItemKinds, event.payload.variant)}を拾った`;
		case "inventory-full":
			return `${resolveItemDisplayName(event.payload.kind, identifiedItemKinds, event.payload.variant)}を持てなかった。持ち物がいっぱいだ`;
		case "item-dropped":
			return `${resolveItemDisplayName(event.payload.kind, identifiedItemKinds, event.payload.variant)}を足元に置いた`;
		case "game-won":
			return "イェンダーの魔除けを手に地上に帰還した!";
		case "weapon-equipped":
			return `${EQUIPMENT_NAMES[event.payload.weaponKind]}を装備した。命中${formatSignedBonus(event.payload.hitBonus)}・ダメージ${formatSignedBonus(event.payload.damageBonus)}`;
		case "armor-equipped":
			return `${EQUIPMENT_NAMES[event.payload.armorKind]}を装備した。防御力${UNARMORED_ARMOR_CLASS - event.payload.armorClass}`;
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
		case "player-weak":
			return "空腹で力が入らなくなってきた";
		case "player-fainted":
			return "空腹で気を失った!";
		case "player-ate":
			return event.payload.amount > 0
				? `${ITEM_NAMES.food}を食べた。満腹度が${event.payload.amount}回復した`
				: `${ITEM_NAMES.food}を食べたが、もう腹に入らなかった`;
		case "gold-collected":
			return `${event.payload.amount}ゴールドを手に入れた`;
		case "trap-triggered":
			if (event.payload.kind === "dart" && event.payload.damage === 0) {
				return `${TRAP_NAMES.dart}を踏んだが、矢は外れた`;
			}
			return event.payload.damage > 0
				? `${TRAP_NAMES[event.payload.kind]}を踏んでしまった。${event.payload.damage}のダメージを受けた`
				: `${TRAP_NAMES[event.payload.kind]}を踏んでしまった!`;
		case "player-poisoned":
			return event.payload.strengthLost > 0
				? `毒薬を飲んでしまった。力が${event.payload.strengthLost}下がった`
				: "毒薬を飲んでしまった。ひどく気分が悪い";
		case "player-teleported":
			/* The trap already logged "テレポートの罠を踏んでしまった!" just before. */
			return event.payload.source === "teleport-scroll"
				? "巻物を読んだ。テレポートした!"
				: "テレポートした!";
		case "floor-mapped":
			return "地図の巻物を読んだ。フロア全体が明らかになった!";
		case "potion-identified":
			/* Identification is per-kind and run-global, not per held item — the
			 * wording must not imply an item in the inventory transformed
			 * (2026-07-18 playtest: "見破った!" read as if a held potion changed,
			 * and kinds not held looked like vanished items). */
			return `${ITEM_NAMES[event.payload.kind]}がどれか判明した。以後この種類は実名で表示される`;
		case "player-strengthened":
			return `${ITEM_NAMES.strength}を飲んだ。力が${event.payload.strength}になった!`;
		case "gold-stolen":
			return event.payload.amount > 0
				? `${ENEMY_NAMES.thief}に${event.payload.amount}ゴールド盗まれた!`
				: `${ENEMY_NAMES.thief}に襲われたが、何も盗られなかった`;
		case "item-stolen":
			return event.payload.kind !== undefined
				? `${ENEMY_NAMES.nymph}に${resolveItemDisplayName(event.payload.kind, identifiedItemKinds, event.payload.variant)}を盗まれた!`
				: `${ENEMY_NAMES.nymph}に襲われたが、何も盗られなかった`;
		case "ring-equipped": {
			const effect = RING_EQUIPPED_EFFECT[event.payload.kind];
			if (effect === undefined) {
				throw new Error(
					`unreachable: ring-equipped fired for non-ring kind ${event.payload.kind}`,
				);
			}
			return `${ITEM_NAMES[event.payload.kind]}を身につけた。${effect}`;
		}
		case "weapon-enchanted":
			return `${ITEM_NAMES["enchant-weapon"]}を読んだ。指定した武器の${event.payload.stat === "hit" ? "命中" : "ダメージ"}が${event.payload.bonus}上がった!`;
		case "armor-enchanted":
			return `${ITEM_NAMES["enchant-armor"]}を読んだ。指定した防具の防御力が${event.payload.bonus}上がった!`;
		case "armor-rust-blocked":
			return "防具に付いた錆はたちまち消えた!";
		case "armor-rusted":
			return `装備中の防具が錆びついた!防御力が${event.payload.amount}下がった`;
		case "missile-hit":
			return `${EQUIPMENT_NAMES[event.payload.variant]}を投げた。${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}ダメージ`;
		case "missile-missed":
			return `${EQUIPMENT_NAMES[event.payload.variant]}を投げたが、${ENEMY_NAMES[event.payload.target]}に当たらなかった`;
		case "wand-struck":
			return `杖から放たれた魔法の矢が${ENEMY_NAMES[event.payload.target]}を貫いた!${event.payload.damage}のダメージを与えた!`;
		case "magic-missile-vanished":
			return `魔法の矢は${ENEMY_NAMES[event.payload.target]}に届く前に煙となって消えた`;
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
		case "paralysis-faded":
			return "体が動くようになった";
		case "player-detected-monsters":
			return `${ITEM_NAMES["detect-monster"]}を飲んだ。敵の気配を感じ取れるようになった!`;
		case "detect-monsters-faded":
			return "敵の気配を感じられなくなった";
		case "enemy-gold-drop":
			return `${ENEMY_NAMES[event.payload.by]}が金貨を落とした!${event.payload.amount}ゴールド手に入れた`;
		case "enemy-teleported":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}をどこかへ飛ばした!`;
		case "enemy-confused":
			return `混乱の巻物を読んだ。${ENEMY_NAMES[event.payload.target]}が混乱した!`;
		case "player-hallucinated":
			return `${ITEM_NAMES.hallucination}を飲んだ。景色が歪んで見える!`;
		case "hallucination-faded":
			return "幻覚がおさまった";
		case "enemy-held":
			return `束縛の巻物を読んだ。${ENEMY_NAMES[event.payload.target]}の動きを封じた!`;
		case "player-drained":
			return `${ENEMY_NAMES[event.payload.by]}に生命力を吸われ、急に体が弱った。最大HPが${event.payload.maxHpLost}下がった`;
		case "player-level-drained":
			return `レベルが${event.payload.level}に下がった`;
		case "player-gazed":
			return `${ENEMY_NAMES.medusa}の視線を受けた。頭がくらくらする!`;
		case "player-strength-drained":
			return `毒が回って力が${event.payload.strengthLost}下がった`;
		case "player-frozen":
			return `${ENEMY_NAMES["ice-monster"]}に凍らされた!${event.payload.turns}ターン動けない`;
		case "player-held":
			return `${ENEMY_NAMES[event.payload.by]}に捕まっていて動けない!`;
		case "player-attack-missed":
			return `${ENEMY_NAMES[event.payload.target]}への攻撃は外れた`;
		case "enemy-attack-missed":
			return `${ENEMY_NAMES[event.payload.by]}の攻撃は外れた`;
	}
};
