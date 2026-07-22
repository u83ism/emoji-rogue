import { advanceTurn } from "../game/advanceTurn.js";
import type { Replay } from "../game/format/replay.js";
import { buildDungeonGameState } from "../game/initialState.js";
import type { Action, GameState } from "../game/state.js";
import { parseSeedArgument } from "./cliArgs.js";
import { loadSavedGameState } from "./saveFile.js";

const MAP_WIDTH = 40;
const MAP_HEIGHT = 20;

/** A run in progress, plus the bookkeeping main.tsx needs but GameState doesn't. */
export interface Session {
	readonly state: GameState;
	/**
	 * Undefined when this session resumed from a save: a resumed run has no
	 * true initial state to replay from, so it is deliberately left
	 * unrecorded (docs/tasks/game-history.md milestone 18).
	 */
	readonly replay: Replay | undefined;
	/** Whether a save file existed but failed to load — shown once as a warning. */
	readonly saveWasCorrupted: boolean;
}

/** Resumes from the suspend save if one loaded cleanly, else starts a fresh dungeon. */
export const createSession = (): Session => {
	const outcome = loadSavedGameState();
	if (outcome.kind === "loaded") {
		return { state: outcome.state, replay: undefined, saveWasCorrupted: false };
	}
	const seed = parseSeedArgument(process.argv.slice(2)) ?? Date.now();
	return {
		state: buildDungeonGameState(MAP_WIDTH, MAP_HEIGHT, seed),
		replay: { width: MAP_WIDTH, height: MAP_HEIGHT, seed, actions: [] },
		saveWasCorrupted: outcome.kind === "corrupted",
	};
};

/** Advances the reducer and, if this session is recording one, appends to the replay. */
export const recordAction = (session: Session, action: Action): Session => ({
	...session,
	state: advanceTurn(session.state, action),
	replay:
		session.replay === undefined
			? undefined
			: { ...session.replay, actions: [...session.replay.actions, action] },
});
