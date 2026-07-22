// System notices (app/session concerns, never part of GameState). They speak
// in polite style to contrast with the plain style of in-world log lines —
// see the log/notice distinction in docs/tasks/game.md.

/** Shown when keypresses arrive as full-width characters (IME in full-width mode). */
export const FULL_WIDTH_INPUT_WARNING =
	"全角入力モードになっています。半角入力に切り替えてください";

/** Shown once the shell is writing the suspend save and about to exit. */
export const GAME_SAVED_MESSAGE =
	"セーブしました。次回起動時に続きから再開します";

/** Shown once at boot when a save existed but couldn't be loaded (corrupted, or from an incompatible version). */
export const SAVE_LOAD_WARNING_MESSAGE =
	"保存データを読み込めませんでした(壊れているか、対応していない形式です)。新しく開始します";

/** Title line atop the inventory overlay while it's open. */
export const INVENTORY_TITLE = "持ち物(iかEscで閉じる)";

/** Shown inside the inventory overlay when nothing is held. */
export const INVENTORY_EMPTY_MESSAGE = "何も持っていません";

/** Shown while picking which held sword/armor a targeted scroll (enchant-weapon, enchant-armor, protect-armor) applies to. */
export const ITEM_TARGET_PROMPT = "対象を選んでください(iかEscで閉じる)";
