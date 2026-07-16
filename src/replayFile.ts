import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Replay } from "./game/replay.js";
import {
	buildReplayFileContent,
	parseReplayFileContent,
} from "./game/replayFormat.js";

// Shell-side file effects around the pure replay format (src/game/replayFile.ts).
// The path parameter exists for tests; the game always uses the default.

const REPLAY_FILE_PATH = join(homedir(), ".emoji-rogue", "replay.json");

/** Overwrites the single replay slot with this session's full action log. */
export const saveReplay = (
	replay: Replay,
	filePath: string = REPLAY_FILE_PATH,
): void => {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, buildReplayFileContent(replay), "utf8");
};

/**
 * Read the recorded replay, if any. Unlike loadSavedGameState, this does not
 * consume the file — a replay is a recording to inspect, not a save to
 * resume once. Invalid or unreadable content is undefined.
 */
export const loadReplay = (
	filePath: string = REPLAY_FILE_PATH,
): Replay | undefined => {
	let content: string;
	try {
		content = readFileSync(filePath, "utf8");
	} catch {
		return undefined;
	}
	const parsed = parseReplayFileContent(content);
	return parsed.ok ? parsed.value : undefined;
};
