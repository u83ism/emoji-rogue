import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	buildSaveFileContent,
	parseSaveFileContent,
} from "../game/format/saveFormat.js";
import type { GameState } from "../game/state.js";

// Shell-side file effects around the pure save format (src/game/save.ts).
// The path parameter exists for tests; the game always uses the default.

const SAVE_FILE_PATH = join(homedir(), ".emoji-rogue", "save.json");

/** Write the single suspend-save slot, overwriting any previous one. */
export const saveGameState = (
	state: GameState,
	filePath: string = SAVE_FILE_PATH,
): void => {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, buildSaveFileContent(state), "utf8");
};

/**
 * `loadSavedGameState`'s result: distinguishes "no save file" (the normal
 * first-boot case, no warning warranted) from "a save file existed but
 * couldn't be loaded" (corrupted content or an incompatible
 * SAVE_FORMAT_VERSION — the shell should tell the player, not fail silently).
 */
export type LoadSaveOutcome =
	| { readonly kind: "none" }
	| { readonly kind: "loaded"; readonly state: GameState }
	| { readonly kind: "corrupted" };

/**
 * Read and consume the suspend save. The file is deleted as soon as it is
 * read — roguelike suspend semantics: a save resumes exactly once and never
 * survives the run it resumed. Invalid or unreadable content also consumes
 * the file and starts a fresh run, but is reported back as "corrupted" so
 * the shell can warn the player instead of silently discarding it.
 */
export const loadSavedGameState = (
	filePath: string = SAVE_FILE_PATH,
): LoadSaveOutcome => {
	let content: string;
	try {
		content = readFileSync(filePath, "utf8");
	} catch {
		return { kind: "none" }; /* no save file — the normal first-boot case */
	}
	rmSync(filePath, { force: true });
	const parsed = parseSaveFileContent(content);
	return parsed.ok
		? { kind: "loaded", state: parsed.value }
		: { kind: "corrupted" };
};
