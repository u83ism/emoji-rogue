// Headless autoplay: runs the explore-everything bot (src/bot/) against a
// real dungeon run via the pure reducer, logging every turn as JSONL for
// offline analysis. Run:
//
//   npx unrun scripts/run-bot.ts [--seed=N] [--width=N] [--height=N] [--max-turns=N] [--quiet]
//     [--disable=kind1,kind2] [--summary-only]
//
// --disable is a balance-experiment knob (see itemUsePolicy.ts's
// decideItemToUse): item kinds listed are never used/equipped even when
// held, so the same seed can be re-run with e.g.
// --disable=regeneration-ring,sustenance-ring to measure how much of the
// run's outcome a given item actually explains.
// --summary-only skips the per-turn JSONL file and console chatter, printing
// one `RESULT_JSON: {...}` line instead — for scripting statistical batches
// over many seeds without generating hundreds of log files.
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
	type TurnLogEntry,
} from "../src/bot/index.js";
import {
	advanceTurn,
	buildDungeonGameState,
	calculateScore,
	type ItemKind,
} from "../src/game/index.js";

const parseNumberArgument = (
	argv: readonly string[],
	name: string,
	fallback: number,
): number => {
	const prefix = `--${name}=`;
	const match = argv.find((argument) => argument.startsWith(prefix));
	if (match === undefined) {
		return fallback;
	}
	const value = Number(match.slice(prefix.length));
	return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** Kind names come from a free-form CLI flag, so this is not validated against ITEM_KIND_VALUES — an unrecognized kind simply never matches anything in decideItemToUse, the same tolerance the original untyped script had. */
const parseDisabledKinds = (argv: readonly string[]): ReadonlySet<ItemKind> => {
	const prefix = "--disable=";
	const match = argv.find((argument) => argument.startsWith(prefix));
	if (match === undefined) {
		return new Set();
	}
	return new Set(
		match.slice(prefix.length).split(",").filter(Boolean),
	) as ReadonlySet<ItemKind>;
};

const argv = process.argv.slice(2);
const seed = parseNumberArgument(argv, "seed", Date.now());
const width = parseNumberArgument(argv, "width", 40);
const height = parseNumberArgument(argv, "height", 20);
const maxTurns = parseNumberArgument(argv, "max-turns", 20000);
const disabledItemKinds = parseDisabledKinds(argv);
const summaryOnly = argv.includes("--summary-only");
const quiet = argv.includes("--quiet") || summaryOnly;

const logLines: string[] | undefined = summaryOnly ? undefined : [];
let logFilePath: string | undefined;
if (!summaryOnly) {
	const logDirectory = join(homedir(), ".emoji-rogue", "bot-logs");
	mkdirSync(logDirectory, { recursive: true });
	logFilePath = join(logDirectory, `bot-${seed}-${Date.now()}.jsonl`);
}

const printStatusLine = (entry: TurnLogEntry): void => {
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
let deathCause: string | undefined;

if (!summaryOnly) {
	console.log(`シード: ${seed} (${width}x${height})`);
	console.log(`ログファイル: ${logFilePath}`);
}

while (state.status === "playing" && turn < maxTurns) {
	turn++;
	const decision = decideAction(state, memory, disabledItemKinds);
	memory = decision.memory;
	state = advanceTurn(state, decision.action);

	if (state.status === "dead" && deathCause === undefined) {
		const lastEvent = state.events.at(-1);
		deathCause =
			lastEvent?.type === "player-died" ? lastEvent.payload.by : "unknown";
	}

	const entry = buildTurnLogEntry(
		turn,
		state,
		decision.action,
		memory.goal,
		memory.stagnantTurns,
	);
	logLines?.push(JSON.stringify(entry));

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
				event.type === "game-won"
			) {
				console.log(`[turn ${entry.turn}] event: ${JSON.stringify(event)}`);
			}
		}
	}
}

if (!summaryOnly && logFilePath !== undefined && logLines !== undefined) {
	writeFileSync(logFilePath, `${logLines.join("\n")}\n`, "utf8");
}

const stoppedReason =
	state.status !== "playing" ? state.status : `max-turns-reached(${maxTurns})`;
const gaveUpFromStagnation =
	state.status === "exited" && memory.stagnantTurns >= STAGNATION_QUIT_TURNS;

const summary = {
	seed,
	stoppedReason,
	gaveUpFromStagnation,
	turns: turn,
	floor: state.floor,
	playerHp: state.playerHp,
	playerMaxHp: state.playerMaxHp,
	goldCollected: state.goldCollected,
	hasAmulet: state.hasAmulet,
	score: calculateScore(state),
	deathCause,
	equippedRingKind:
		state.inventory.find(
			(item) =>
				"equipped" in item && item.equipped && item.kind.endsWith("-ring"),
		)?.kind ?? null,
	disabledItemKinds: [...disabledItemKinds],
};

if (summaryOnly) {
	console.log(`RESULT_JSON: ${JSON.stringify(summary)}`);
} else {
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
	console.log(`死因: ${deathCause ?? "-"}`);
	console.log(`ログ行数: ${logLines?.length} (${logFilePath})`);
}
