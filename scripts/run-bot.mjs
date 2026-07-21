#!/usr/bin/env node
// Headless autoplay: runs the explore-everything bot (src/bot/) against a
// real dungeon run via the pure reducer, logging every turn as JSONL for
// offline analysis. Run after `npm run build`:
//
//   node scripts/run-bot.mjs [--seed=N] [--width=N] [--height=N] [--max-turns=N] [--quiet]
//
// Exists purely to gather balance/AI-behavior statistics — not part of the
// shipped game (see src/bot/index.ts's own note).
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	buildTurnLogEntry,
	createInitialBotMemory,
	decideAction,
	STAGNATION_QUIT_TURNS,
} from "../dist/bot/index.mjs";
import {
	advanceTurn,
	buildDungeonGameState,
	calculateScore,
} from "../dist/game/index.mjs";

const parseNumberArgument = (argv, name, fallback) => {
	const prefix = `--${name}=`;
	const match = argv.find((argument) => argument.startsWith(prefix));
	if (match === undefined) {
		return fallback;
	}
	const value = Number(match.slice(prefix.length));
	return Number.isFinite(value) && value > 0 ? value : fallback;
};

const argv = process.argv.slice(2);
const seed = parseNumberArgument(argv, "seed", Date.now());
const width = parseNumberArgument(argv, "width", 40);
const height = parseNumberArgument(argv, "height", 20);
const maxTurns = parseNumberArgument(argv, "max-turns", 20000);
const quiet = argv.includes("--quiet");

const logDirectory = join(homedir(), ".emoji-rogue", "bot-logs");
mkdirSync(logDirectory, { recursive: true });
const logFilePath = join(logDirectory, `bot-${seed}-${Date.now()}.jsonl`);
const logLines = [];

const printStatusLine = (entry) => {
	console.log(
		`[turn ${entry.turn}] floor=${entry.floor} hp=${entry.playerHp}/${entry.playerMaxHp} ` +
			`food=${entry.playerFood} gold=${entry.goldCollected} amulet=${entry.hasAmulet} ` +
			`goal=${entry.goalKind ?? "-"} action=${entry.action.type}`,
	);
};

let state = buildDungeonGameState(width, height, seed);
let memory = createInitialBotMemory();
let turn = 0;
let previousFloor = state.floor;

console.log(`シード: ${seed} (${width}x${height})`);
console.log(`ログファイル: ${logFilePath}`);

while (state.status === "playing" && turn < maxTurns) {
	turn++;
	const decision = decideAction(state, memory);
	memory = decision.memory;
	state = advanceTurn(state, decision.action);

	const entry = buildTurnLogEntry(
		turn,
		state,
		decision.action,
		memory.goal,
		memory.stagnantTurns,
	);
	logLines.push(JSON.stringify(entry));

	const floorChanged = state.floor !== previousFloor;
	previousFloor = state.floor;
	if (!quiet && (floorChanged || turn % 1000 === 0)) {
		printStatusLine(entry);
	}
	if (!quiet && entry.recentEvents.length > 0) {
		for (const event of entry.recentEvents) {
			if (
				event.type === "player-died" ||
				event.type === "amulet-obtained" ||
				event.type === "game-won" ||
				event.type === "winds-of-kron-eviction"
			) {
				console.log(`[turn ${entry.turn}] event: ${JSON.stringify(event)}`);
			}
		}
	}
}

writeFileSync(logFilePath, `${logLines.join("\n")}\n`, "utf8");

const stoppedReason =
	state.status !== "playing" ? state.status : `max-turns-reached(${maxTurns})`;
const gaveUpFromStagnation =
	state.status === "exited" && memory.stagnantTurns >= STAGNATION_QUIT_TURNS;

console.log("--- 結果 ---");
console.log(
	`終了理由: ${stoppedReason}${gaveUpFromStagnation ? " (stuck-no-progress)" : ""}`,
);
console.log(`ターン数: ${turn}`);
console.log(`到達フロア: ${state.floor}`);
console.log(`HP: ${state.playerHp}/${state.playerMaxHp}`);
console.log(`所持金: ${state.goldCollected}`);
console.log(`アミュレット: ${state.hasAmulet}`);
console.log(`スコア: ${calculateScore(state)}`);
console.log(`ログ行数: ${logLines.length} (${logFilePath})`);
