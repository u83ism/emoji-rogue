// Public API for the game layer, separate from src/index.ts (the modernized
// rot.js toolbox barrel) — for embedding the game outside the CLI shell
// (e.g. demo/'s browser renderer). Re-exports src/messages.ts too, so an
// embedder has a single import source instead of reaching into src/game/'s
// internals or past it into the shell-facing i18n module.

export type { Cell } from "../renderer/index.js";
export { buildCatalogMarkdown } from "../shell/catalog/catalog.js";
export { formatEvent } from "../shell/eventMessages.js";
export { resolveItemDisplayName } from "../shell/gameNames.js";
export {
	formatHeldItemLabel,
	formatInventoryTitle,
	resolveItemVerbPrompt,
} from "../shell/inventoryLabels.js";
export {
	INVENTORY_EMPTY_MESSAGE,
	ITEM_TARGET_PROMPT,
	SAVE_LOAD_WARNING_MESSAGE,
} from "../shell/systemMessages.js";
export { advanceTurn } from "./advanceTurn.js";
export {
	GOAL_FLOOR,
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_MAX_FOOD,
	PLAYER_MAX_HP,
} from "./balance.js";
export type { EnemyKind, GameEvent, ItemKind } from "./events.js";
export type { Replay } from "./format/replay.js";
export { buildReplayGameState } from "./format/replay.js";
export type { ReplayFileError } from "./format/replayFormat.js";
export { parseReplayFileContent } from "./format/replayFormat.js";
export type { SaveFileError } from "./format/saveFormat.js";
export {
	buildSaveFileContent,
	parseSaveFileContent,
} from "./format/saveFormat.js";
export { buildFrameGrid } from "./frame.js";
export {
	BLINDNESS_GLYPH,
	CONFUSION_GLYPH,
	DETECT_MONSTER_GLYPH,
	HALLUCINATION_GLYPH,
	LEVITATION_GLYPH,
	PARALYSIS_GLYPH,
} from "./glyphs.js";
export { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
export {
	resolveTargetKind,
	toInventoryLetter,
	toItemVerbAction,
	toSelectedHeldItem,
	toTargetedUseAction,
} from "./inventoryKeymap.js";
export {
	calculatePlayerAttackDamage,
	calculatePlayerDefense,
} from "./items/equipment.js";
export { calculateScore } from "./score.js";
export type {
	Action,
	Direction,
	Enemy,
	GameState,
	GameStatus,
	HeldItem,
	Item,
	Position,
} from "./state.js";
