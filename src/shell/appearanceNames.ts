import type { ItemAppearances } from "../game/appearances.js";
import {
	type ItemKind,
	POTION_KIND_VALUES,
	POTION_KINDS,
	type PotionKind,
	RING_KINDS,
	type RingKind,
	SCROLL_KIND_VALUES,
	type ScrollKind,
	WAND_KIND_VALUES,
	type WandKind,
} from "../game/events.js";

// The words behind a run's appearances (game/appearances.ts keeps only
// indices) — original Rogue 5.4's init.c lists, in their order, put into
// Japanese. The scroll syllables stay as they are: nonsense either way.

// biome-ignore format: one list entry per original entry
const POTION_COLORS: readonly string[] = [
	"琥珀色", "藍緑色", "黒", "青", "茶色", "透明", "深紅", "水色", "生成り色",
	"金色", "緑", "灰色", "赤紫", "橙色", "桃色", "格子柄", "紫", "赤", "銀色",
	"黄褐色", "蜜柑色", "トパーズ色", "青緑", "朱色", "菫色", "白", "黄色",
];

// biome-ignore format: one list entry per original entry
const SYLLABLES: readonly string[] = [
	"a", "ab", "ag", "aks", "ala", "an", "app", "arg", "arze", "ash",
	"bek", "bie", "bit", "bjor", "blu", "bot", "bu", "byt", "comp",
	"con", "cos", "cre", "dalf", "dan", "den", "do", "e", "eep", "el",
	"eng", "er", "ere", "erk", "esh", "evs", "fa", "fid", "fri", "fu",
	"gan", "gar", "glen", "gop", "gre", "ha", "hyd", "i", "ing", "ip",
	"ish", "it", "ite", "iv", "jo", "kho", "kli", "klis", "la", "lech",
	"mar", "me", "mi", "mic", "mik", "mon", "mung", "mur", "nej",
	"nelg", "nep", "ner", "nes", "nes", "nih", "nin", "o", "od", "ood",
	"org", "orn", "ox", "oxy", "pay", "ple", "plu", "po", "pot",
	"prok", "re", "rea", "rhov", "ri", "ro", "rog", "rok", "rol", "sa",
	"san", "sat", "sef", "seh", "shu", "ski", "sna", "sne", "snik",
	"sno", "so", "sol", "sri", "sta", "sun", "ta", "tab", "tem",
	"ther", "ti", "tox", "trol", "tue", "turs", "u", "ulk", "um", "un",
	"uni", "ur", "val", "viv", "vly", "vom", "wah", "wed", "werg",
	"wex", "whon", "wun", "xo", "y", "yot", "yu", "zant", "zeb", "zim",
	"zok", "zon", "zum",
];

// biome-ignore format: one list entry per original entry
const RING_STONES: readonly string[] = [
	"瑪瑙", "アレキサンドライト", "紫水晶", "紅玉髄", "ダイヤモンド", "エメラルド",
	"ゲルマニウム", "花崗岩", "ガーネット", "翡翠", "クリプトナイト", "ラピスラズリ",
	"月長石", "黒曜石", "オニキス", "オパール", "真珠", "ペリドット", "ルビー",
	"サファイア", "スチビオタンタライト", "虎目石", "トパーズ", "トルコ石",
	"ターフェアイト", "ジルコン",
];

/** The woods (a staff), then the metals (a wand) — one index space, see WAND_WOOD_COUNT. */
// biome-ignore format: one list entry per original entry
const WAND_MATERIALS: readonly string[] = [
	"アボカド材", "バルサ", "竹", "ベンガルボダイジュ", "樺", "杉", "桜", "辰砂",
	"糸杉", "ハナミズキ", "流木", "黒檀", "楡", "ユーカリ", "落葉材", "ツガ", "柊",
	"鉄木", "ククイ材", "マホガニー", "マンザニータ", "楓", "樫", "柿材", "ペカン",
	"松", "ポプラ", "セコイア", "紫檀", "トウヒ", "チーク", "クルミ", "ゼブラウッド",
	"アルミニウム", "ベリリウム", "骨", "真鍮", "青銅", "銅", "エレクトラム", "金",
	"鉄", "鉛", "マグネシウム", "水銀", "ニッケル", "ピューター", "白金", "鋼",
	"銀", "シリコン", "錫", "チタン", "タングステン", "亜鉛",
];

const isOf = <Kind extends ItemKind>(
	kinds: readonly Kind[],
	kind: ItemKind,
): kind is Kind => kinds.some((candidate) => candidate === kind);

/**
 * How an unidentified `kind` looks this run — "琥珀色の薬", "『zim blu』と
 * 書かれた巻物", "ルビーの指輪", "樫の杖" — or undefined for a kind that is
 * always known.
 */
export const formatAppearanceName = (
	kind: ItemKind,
	appearances: ItemAppearances,
): string | undefined => {
	if (isOf<PotionKind>(POTION_KIND_VALUES, kind)) {
		return `${POTION_COLORS[appearances.potionColors[kind]] ?? "?"}の薬`;
	}
	if (isOf<ScrollKind>(SCROLL_KIND_VALUES, kind)) {
		const title = appearances.scrollTitles[kind]
			.map((word) => word.map((syllable) => SYLLABLES[syllable] ?? "").join(""))
			.join(" ");
		return `『${title}』と書かれた巻物`;
	}
	if (isOf<RingKind>(RING_KINDS, kind)) {
		return `${RING_STONES[appearances.ringStones[kind]] ?? "?"}の指輪`;
	}
	if (isOf<WandKind>(WAND_KIND_VALUES, kind)) {
		/* a wood (below WAND_WOOD_COUNT) is the original's staff, a metal its wand — both 杖 in Japanese */
		return `${WAND_MATERIALS[appearances.wandMaterials[kind]] ?? "?"}の杖`;
	}
	return undefined;
};

const UNIDENTIFIED_RING_NAME = "指輪";
const UNIDENTIFIED_WAND_NAME = "杖";
const UNIDENTIFIED_SCROLL_NAME = "巻物";

/**
 * What an IDENTIFIABLE_ITEM_KINDS kind looks like until identified this run
 * (see GameState.identifiedItemKinds): its appearance (appearanceNames.ts)
 * when the run's appearances are given, otherwise a shared generic name —
 * the catalog, which describes every run, uses that.
 */
export const resolveUnidentifiedName = (
	kind: ItemKind,
	appearances: ItemAppearances | undefined,
): string => {
	const looks =
		appearances === undefined
			? undefined
			: formatAppearanceName(kind, appearances);
	if (looks !== undefined) {
		return looks;
	}
	if (POTION_KINDS.includes(kind)) {
		return "未鑑定の薬";
	}
	if (RING_KINDS.some((ringKind) => ringKind === kind)) {
		return UNIDENTIFIED_RING_NAME;
	}
	return SCROLL_KIND_VALUES.some((scrollKind) => scrollKind === kind)
		? UNIDENTIFIED_SCROLL_NAME
		: UNIDENTIFIED_WAND_NAME;
};
