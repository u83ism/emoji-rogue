// System notices (app/session concerns, never part of GameState). They speak
// in polite style to contrast with the plain style of in-world log lines —
// see the log/notice distinction in docs/tasks/game.md.

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
