import type { GameEvent, ItemKind } from "../game/events.js";
import { formatDungeonEvent } from "./dungeonEventMessages.js";
import {
	ENEMY_NAMES,
	EQUIPMENT_NAMES,
	formatDeathMessage,
	resolveItemDisplayName,
} from "./gameNames.js";
import { formatItemUseEvent } from "./itemEventMessages.js";

/**
 * The single place where game events become human-readable text (Japanese
 * for now). The core (src/game/) never produces strings, so swapping locale
 * means swapping this module only — the i18n discipline in docs/tasks/game.md.
 * `identifiedItemKinds` is needed only to decide whether item-picked-up
 * should reveal a potion-family kind's real name. Split out of messages.ts
 * (milestone 98 follow-up) to stay under the 200-line structure limit; the
 * item-use events live in itemEventMessages.ts for the same reason.
 */
export const formatEvent = (
	event: GameEvent,
	identifiedItemKinds: readonly ItemKind[],
): string => {
	switch (event.type) {
		case "player-hit" /* 0 for the aquator (its attacks just rust) and the nymph (0d0) */:
			return event.payload.damage > 0
				? `${ENEMY_NAMES[event.payload.by]}から${event.payload.damage}のダメージを受けた`
				: `${ENEMY_NAMES[event.payload.by]}の攻撃が当たった`;
		case "enemy-hit":
			return `${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}のダメージを与えた`;
		case "enemy-defeated":
			return `${ENEMY_NAMES[event.payload.target]}をたおした!`;
		case "player-healed":
		case "item-picked-up":
		case "inventory-full":
		case "item-dropped":
		case "weapon-equipped":
		case "armor-equipped":
		case "item-unequipped":
		case "equip-blocked-cursed":
		case "curse-revealed":
		case "ring-hands-full":
		case "strength-restored":
		case "player-hasted":
		case "player-fell-asleep":
		case "monster-created":
		case "monsters-aggravated":
		case "player-sees-invisible":
		case "player-exhausted":
		case "wand-empty":
		case "scroll-wasted":
		case "items-decursed":
		case "player-ate":
		case "player-poisoned":
		case "floor-mapped":
		case "potion-identified":
		case "player-strengthened":
		case "ring-equipped":
		case "weapon-enchanted":
		case "armor-enchanted":
		case "armor-protected":
		case "player-confused":
		case "player-levitated":
		case "player-blinded":
		case "player-detected-monsters":
		case "player-hallucinated":
			return formatItemUseEvent(event, identifiedItemKinds);
		case "stairs-refused":
		case "trap-triggered":
		case "trap-found":
		case "player-stuck":
		case "trap-mystery":
			return formatDungeonEvent(event);
		case "player-died":
			return formatDeathMessage(event.payload.by);
		case "floor-descended":
			return `${event.payload.floor}階に降りた`;
		case "floor-ascended":
			return `${event.payload.floor}階に上がった`;
		case "amulet-obtained":
			return "イェンダーの魔除けを手に入れた!";
		case "game-won":
			return "イェンダーの魔除けを手に地上に帰還した!";
		case "player-hungry":
			return "空腹を感じてきた";
		case "player-weak":
			return "空腹で力が入らなくなってきた";
		case "player-fainted":
			return "空腹で気を失った!";
		case "gold-collected":
			return `${event.payload.amount}ゴールドを手に入れた`;
		case "player-teleported":
			/* The trap already logged "テレポートの罠を踏んでしまった!" just before. */
			return event.payload.source === "teleport-scroll"
				? "巻物を読んだ。テレポートした!"
				: "テレポートした!"; /* a trap logs itself first; the ring's jump is just this */
		case "gold-stolen":
			return event.payload.amount > 0
				? `${ENEMY_NAMES.thief}に${event.payload.amount}ゴールド盗まれた!`
				: `${ENEMY_NAMES.thief}に襲われたが、何も盗られなかった`;
		case "item-stolen":
			return `${ENEMY_NAMES.nymph}に${resolveItemDisplayName(event.payload.kind, identifiedItemKinds, event.payload.variant)}を盗まれた!`;
		case "armor-rust-blocked":
			return "防具に付いた錆はたちまち消えた!";
		case "armor-rusted":
			return `装備中の防具が錆びついた!防御力が${event.payload.amount}下がった`;
		case "missile-hit":
			return `${EQUIPMENT_NAMES[event.payload.variant]}を投げた。${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}ダメージ`;
		case "missile-landed":
			return `${EQUIPMENT_NAMES[event.payload.variant]}を投げたが、何にも当たらなかった`;
		case "missile-missed":
			return `${EQUIPMENT_NAMES[event.payload.variant]}を投げたが、${ENEMY_NAMES[event.payload.target]}に当たらなかった`;
		case "wand-struck":
			return `杖から放たれた魔法の矢が${ENEMY_NAMES[event.payload.target]}を貫いた!${event.payload.damage}のダメージを与えた!`;
		case "magic-missile-vanished":
			return `魔法の矢は${ENEMY_NAMES[event.payload.target]}に届く前に煙となって消えた`;
		case "confusion-faded":
			return "混乱がおさまった";
		case "enemy-slowed":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}の動きが鈍くなった!`;
		case "enemy-slowed-removed":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}の素早さが元に戻った`;
		case "levitation-faded":
			return "浮遊の効果が切れた";
		case "blindness-faded":
			return "目が見えるようになった";
		case "player-leveled-up":
			return `レベルが上がった!(Lv.${event.payload.level})`;
		case "see-invisible-faded":
			return "透明なものが見えなくなった";
		case "haste-faded":
			return "動きが元の速さに戻った";
		case "paralysis-faded":
			return "体が動くようになった";
		case "detect-monsters-faded":
			return "敵の気配を感じられなくなった";
		case "enemy-gold-drop":
			return `${ENEMY_NAMES[event.payload.by]}が金貨を落とした!${event.payload.amount}ゴールド手に入れた`;
		case "enemy-teleported":
			return `杖の力で${ENEMY_NAMES[event.payload.target]}をどこかへ飛ばした!`;
		case "enemy-confused":
			return `混乱の巻物を読んだ。${ENEMY_NAMES[event.payload.target]}が混乱した!`;
		case "hallucination-faded":
			return "幻覚がおさまった";
		case "enemy-held":
			return `束縛の巻物を読んだ。${ENEMY_NAMES[event.payload.target]}が動きを止めた!`;
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
