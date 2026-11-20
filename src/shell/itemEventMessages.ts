import { UNARMORED_ARMOR_CLASS } from "../game/balance.js";
import type { GameEvent, ItemKind } from "../game/events.js";
import {
	EQUIPMENT_NAMES,
	ITEM_NAMES,
	resolveItemDisplayName,
} from "./gameNames.js";
import { formatSignedBonus } from "./inventoryLabels.js";

/**
 * The flavor text for ring-equipped log line, one entry per ring
 * kind. A lookup table rather than an if-chain (converted here at the 4th
 * ring — functional-style.md's if-chain limit is 3 branches): the payload's
 * `kind` is the wider ItemKind, so this is a Partial map, not a total one —
 * messages.ts treats a missing entry as unreachable (ring-equipped never
 * fires for a non-ring kind).
 */
const RING_EQUIPPED_EFFECT: Readonly<Partial<Record<ItemKind, string>>> = {
	"regeneration-ring": "じわじわとHPが回復するようになった!",
	"sustenance-ring": "空腹の進みがゆるやかになった!",
	"stealth-ring": "足音が忍びやかになった!",
	"aggravate-monster-ring": "敵の気配に気づかれてしまった!",
	"protection-ring": "身を守る力に包まれた",
	"add-strength-ring": "力がみなぎる",
	"sustain-strength-ring": "力が抜けにくくなった",
	"adornment-ring": "きらきらと輝いている",
	"dexterity-ring": "手先が器用になった",
	"increase-damage-ring": "一撃に重みが乗った",
	"teleportation-ring": "体がそわそわと落ち着かない",
	"maintain-armor-ring": "鎧が錆びにくくなった",
};

/** The events about the player's own items — picking up, wearing, drinking, reading, zapping. */
export type ItemUseEvent = Extract<
	GameEvent,
	{
		type:
			| "player-healed"
			| "item-picked-up"
			| "inventory-full"
			| "item-dropped"
			| "weapon-equipped"
			| "armor-equipped"
			| "item-unequipped"
			| "equip-blocked-cursed"
			| "curse-revealed"
			| "wand-empty"
			| "ring-hands-full"
			| "strength-restored"
			| "player-hasted"
			| "player-exhausted"
			| "scroll-wasted"
			| "items-decursed"
			| "player-ate"
			| "player-poisoned"
			| "floor-mapped"
			| "potion-identified"
			| "player-strengthened"
			| "ring-equipped"
			| "weapon-enchanted"
			| "armor-enchanted"
			| "armor-protected"
			| "player-confused"
			| "player-levitated"
			| "player-blinded"
			| "player-detected-monsters"
			| "player-hallucinated";
	}
>;

/**
 * The log line for an ItemUseEvent — split out of eventMessages.ts's
 * formatEvent (which delegates here) once that file passed the 200-line
 * structure limit. Same i18n discipline: the only place these strings live.
 */
export const formatItemUseEvent = (
	event: ItemUseEvent,
	identifiedItemKinds: readonly ItemKind[],
): string => {
	switch (event.type) {
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
		case "strength-restored":
			return `${ITEM_NAMES["restore-strength-potion"]}を飲んだ。体じゅうが温かい(力${event.payload.strength})`;
		case "player-hasted":
			return `${ITEM_NAMES["haste-self-potion"]}を飲んだ。体が軽い!${event.payload.turns}ターン素早く動ける`;
		case "player-exhausted":
			return `${ITEM_NAMES["haste-self-potion"]}を重ねて飲み、疲れ果てて気を失った!`;
		case "ring-hands-full":
			return "もう両手に指輪をはめている";
		case "wand-empty":
			return `${resolveItemDisplayName(event.payload.kind, identifiedItemKinds)}を振ったが、何も起きなかった`;
		case "scroll-wasted":
			return `${ITEM_NAMES[event.payload.kind]}を読んだが、何も起きなかった`;
		case "items-decursed":
			return `${ITEM_NAMES["remove-curse-scroll"]}を読んだ。呪いが解け、${event.payload.count}個のアイテムを外せるようになった!`;
		case "player-ate":
			return event.payload.amount > 0
				? `${ITEM_NAMES.food}を食べた。満腹度が${event.payload.amount}回復した`
				: `${ITEM_NAMES.food}を食べたが、もう腹に入らなかった`;
		case "player-poisoned":
			return event.payload.strengthLost > 0
				? `毒薬を飲んでしまった。力が${event.payload.strengthLost}下がった`
				: "毒薬を飲んでしまった。ひどく気分が悪い";
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
			return `${ITEM_NAMES["enchant-weapon"]}を読んだ。装備中の武器の${event.payload.stat === "hit" ? "命中" : "ダメージ"}が${event.payload.bonus}上がった!`;
		case "armor-enchanted":
			return `${ITEM_NAMES["enchant-armor"]}を読んだ。装備中の防具の防御力が${event.payload.bonus}上がった!`;
		case "armor-protected":
			return `${ITEM_NAMES["protect-armor"]}を読んだ。装備中の防具が錆びなくなった!`;
		case "player-confused":
			return `${ITEM_NAMES.confusion}を飲んだ。頭がくらくらする!`;
		case "player-levitated":
			return `${ITEM_NAMES.levitation}を飲んだ。体がふわりと浮いた!`;
		case "player-blinded":
			return `${ITEM_NAMES.blindness}を飲んだ。目の前が真っ暗になった!`;
		case "player-detected-monsters":
			return `${ITEM_NAMES["detect-monster"]}を飲んだ。敵の気配を感じ取れるようになった!`;
		case "player-hallucinated":
			return `${ITEM_NAMES.hallucination}を飲んだ。景色が歪んで見える!`;
	}
};
