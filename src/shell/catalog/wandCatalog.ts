import {
	LIGHT_WAND_CHARGES_MAX,
	LIGHT_WAND_CHARGES_MIN,
	MAGIC_MISSILE_DAMAGE_BONUS,
	MAGIC_MISSILE_DAMAGE_DICE,
	WAND_CHARGES_MAX,
	WAND_CHARGES_MIN,
} from "../../game/balance.js";
import type { WandKind } from "../../game/events.js";
import { type ItemCatalogEntry, itemDrawShare } from "./catalogData.js";

/** How many zaps a found wand holds — appended to every wand's effect. */
const WAND_CHARGES_TEXT = `使える回数は${WAND_CHARGES_MIN}〜${WAND_CHARGES_MAX}回で、尽きると振っても何も起きない(杖は残る)`;

/** The wand rows of the item catalog (itemCatalog.ts) — split out once the wands of original Rogue made it too long. */
export const WAND_CATALOG: Readonly<Record<WandKind, ItemCatalogEntry>> = {
	"slow-wand": {
		catalogName: "鈍足の杖",
		category: "杖",
		spawn: itemDrawShare("slow-wand"),
		effect: `選んだ方向へ振り、最初に当たった敵を恒久的に鈍足にする(2回に1回しか動けない)。加速している敵なら加速を解くだけ。${WAND_CHARGES_TEXT}`,
	},
	"teleport-wand": {
		catalogName: "テレポートの杖",
		category: "杖",
		spawn: itemDrawShare("teleport-wand"),
		effect: `選んだ方向へ振り、最初に当たった敵をフロア内のランダムな床へ強制移動させる。${WAND_CHARGES_TEXT}`,
	},
	"magic-missile-wand": {
		catalogName: "魔法の矢の杖",
		category: "杖",
		spawn: itemDrawShare("magic-missile-wand"),
		effect: `選んだ方向へ撃ち、最初に当たった敵に${MAGIC_MISSILE_DAMAGE_DICE.count}d${MAGIC_MISSILE_DAMAGE_DICE.sides}+${MAGIC_MISSILE_DAMAGE_BONUS}(+力と装備中の武器のダメージ補正)の必中ダメージ。敵が魔法へのセーブに成功すると消える。${WAND_CHARGES_TEXT}`,
	},
	"haste-monster-wand": {
		catalogName: "加速の杖",
		category: "杖",
		spawn: itemDrawShare("haste-monster-wand"),
		effect: `選んだ方向へ振り、最初に当たった敵を加速させる(1ターンに2回動く)。鈍足の敵なら鈍足を解くだけ。振っても正体は分からない。${WAND_CHARGES_TEXT}`,
	},
	"teleport-to-wand": {
		catalogName: "引き寄せの杖",
		category: "杖",
		spawn: itemDrawShare("teleport-to-wand"),
		effect: `選んだ方向へ振り、最初に当たった敵をその方向のプレイヤーの隣まで引き寄せる(敵は起きて向かってくる)。振っても正体は分からない。${WAND_CHARGES_TEXT}`,
	},
	"nothing-wand": {
		catalogName: "無の杖",
		category: "杖",
		spawn: itemDrawShare("nothing-wand"),
		effect: `振っても何も起きない(使用回数だけ減る)。振っても正体は分からない。${WAND_CHARGES_TEXT}`,
	},
	"light-wand": {
		catalogName: "光の杖",
		category: "杖",
		spawn: itemDrawShare("light-wand"),
		effect: `振ると今いる部屋が明るくなり、以後ずっと全体が見える(部屋の敵は部屋に入ったときと同じく目を覚ますことがある)。通路では光ってすぐ消える。振ると正体が分かる。使える回数は${LIGHT_WAND_CHARGES_MIN}〜${LIGHT_WAND_CHARGES_MAX}回`,
	},
	"fire-wand": {
		catalogName: "炎の杖",
		category: "杖",
		spawn: itemDrawShare("fire-wand"),
		effect: `選んだ方向へ炎を放つ。炎は6マス飛んで壁で跳ね返り、当たった敵(魔法への抵抗で外れる)に6d6+力のボーナス。ドラゴンには効かない。跳ね返った炎は自分にも当たる(抵抗でかわせる、6d6)。振ると正体が分かる。${WAND_CHARGES_TEXT}`,
	},
	"cold-wand": {
		catalogName: "冷気の杖",
		category: "杖",
		spawn: itemDrawShare("cold-wand"),
		effect: `選んだ方向へ冷気を放つ。6マス飛んで壁で跳ね返り、当たった敵(魔法への抵抗で外れる)に6d6+力のボーナス。跳ね返った冷気は自分にも当たる(抵抗でかわせる、6d6)。振ると正体が分かる。${WAND_CHARGES_TEXT}`,
	},
	"lightning-wand": {
		catalogName: "電撃の杖",
		category: "杖",
		spawn: itemDrawShare("lightning-wand"),
		effect: `選んだ方向へ電撃を放つ。6マス飛んで壁で跳ね返り、当たった敵(魔法への抵抗で外れる)に6d6+力のボーナス。跳ね返った電撃は自分にも当たる(抵抗でかわせる、6d6)。振ると正体が分かる。${WAND_CHARGES_TEXT}`,
	},
	"drain-life-wand": {
		catalogName: "吸命の杖",
		category: "杖",
		spawn: itemDrawShare("drain-life-wand"),
		effect: `振ると自分のHPの半分を失い、その分を同じ部屋(通路)の敵みんなで分けて受けさせる(倒れた敵は自分が倒したことになる)。敵がいなければ何も起きない。HPが2未満だと使えない。振っても正体は分からない。${WAND_CHARGES_TEXT}`,
	},
};
