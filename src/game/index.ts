// Public API for the game layer, separate from src/index.ts (the modernized
// rot.js toolbox barrel) — for embedding the game outside the CLI shell
// (e.g. demo/'s browser renderer). Re-exports src/messages.ts too, so an
// embedder has a single import source instead of reaching into src/game/'s
// internals or past it into the shell-facing i18n module.

export {
	formatEvent,
	formatInventoryEntry,
	INVENTORY_EMPTY_MESSAGE,
	INVENTORY_TITLE,
} from "../messages.js";
export type { Cell } from "../renderer/index.js";
export { advanceTurn } from "./advanceTurn.js";
export { GOAL_FLOOR, PLAYER_MAX_HP } from "./balance.js";
export type { EnemyKind, GameEvent, ItemKind } from "./events.js";
export { buildFrameGrid } from "./frame.js";
export { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
export { toInventoryLetter, toUseItemAction } from "./inventoryKeymap.js";
export type { Replay } from "./replay.js";
export { buildReplayGameState } from "./replay.js";
export type { ReplayFileError } from "./replayFile.js";
export { parseReplayFileContent } from "./replayFile.js";
export type {
	Action,
	Direction,
	Enemy,
	GameState,
	GameStatus,
	InventoryEntry,
	Item,
	Position,
} from "./state.js";
