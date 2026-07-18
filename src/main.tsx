import { Box, render, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { advanceTurn } from "./game/advanceTurn.js";
import type { GameEvent } from "./game/events.js";
import type { Replay } from "./game/format/replay.js";
import { buildFrameGrid } from "./game/frame.js";
import { buildDungeonGameState } from "./game/initialState.js";
import { toUseItemAction } from "./game/inventoryKeymap.js";
import { isFullWidthInput, toAction } from "./game/keymap.js";
import { calculateScore } from "./game/score.js";
import type { Action, GameState } from "./game/state.js";
import { GameScreen } from "./renderer/index.js";
import { parseSeedArgument } from "./shell/cliArgs.js";
import { InventoryOverlay } from "./shell/inventoryOverlay.js";
import {
	formatConducts,
	formatEvent,
	formatScoreSummary,
} from "./shell/messages.js";
import { saveReplay } from "./shell/replayFile.js";
import { loadSavedGameState, saveGameState } from "./shell/saveFile.js";
import { StatusBar } from "./shell/statusBar.js";
import {
	FULL_WIDTH_INPUT_WARNING,
	GAME_SAVED_MESSAGE,
} from "./shell/systemMessages.js";

// The imperative shell: reads keys, dispatches actions into the pure reducer,
// hands the resulting frame to Ink. All game logic lives in src/game/; all
// human-readable wording comes from src/messages.ts.

const MAP_WIDTH = 40;
const MAP_HEIGHT = 20;
const LOG_LINE_COUNT = 3;

/** Death and victory get their own color to stand out from ordinary log lines. */
const resolveLogLineStyle = (
	event: GameEvent,
): { readonly color?: string; readonly bold?: boolean } => {
	if (event.type === "player-died") {
		return { color: "red", bold: true };
	}
	if (event.type === "game-won") {
		return { color: "green", bold: true };
	}
	return {};
};

interface Session {
	readonly state: GameState;
	/**
	 * Undefined when this session resumed from a save: a resumed run has no
	 * true initial state to replay from, so it is deliberately left
	 * unrecorded (docs/tasks/game-history.md milestone 18).
	 */
	readonly replay: Replay | undefined;
}

const createSession = (): Session => {
	const loaded = loadSavedGameState();
	if (loaded !== undefined) {
		return { state: loaded, replay: undefined };
	}
	const seed = parseSeedArgument(process.argv.slice(2)) ?? Date.now();
	return {
		state: buildDungeonGameState(MAP_WIDTH, MAP_HEIGHT, seed),
		replay: { width: MAP_WIDTH, height: MAP_HEIGHT, seed, actions: [] },
	};
};

const recordAction = (session: Session, action: Action): Session => ({
	state: advanceTurn(session.state, action),
	replay:
		session.replay === undefined
			? undefined
			: { ...session.replay, actions: [...session.replay.actions, action] },
});

const App = () => {
	const { exit } = useApp();
	const [session, setSession] = useState(createSession);
	const { state, replay } = session;
	const [showFullWidthWarning, setShowFullWidthWarning] = useState(false);
	/* Whether the inventory overlay is open. Purely a display concern (which
	 * panel is showing), not part of the simulated world, so it lives here
	 * instead of in GameState — it must never end up in a save file. */
	const [isInventoryOpen, setIsInventoryOpen] = useState(false);

	useInput((input, key) => {
		if (isInventoryOpen) {
			if (input === "i" || key.escape) {
				setIsInventoryOpen(false);
				return;
			}
			const action = toUseItemAction(input, state.inventory);
			setIsInventoryOpen(false);
			if (action !== undefined) {
				setSession((current) => recordAction(current, action));
			}
			return;
		}
		if (input === "i") {
			if (state.status === "playing") {
				setIsInventoryOpen(true);
			}
			return;
		}
		const action = toAction(input, key);
		if (action === undefined) {
			if (isFullWidthInput(input)) {
				setShowFullWidthWarning(true);
			}
			return;
		}
		setShowFullWidthWarning(false);
		setSession((current) => recordAction(current, action));
	});

	useEffect(() => {
		if (state.status === "suspended") {
			/* the file must record an in-progress run, ready to resume */
			saveGameState({ ...state, status: "playing" });
		}
		if (state.status !== "playing") {
			if (replay !== undefined) {
				saveReplay(replay);
			}
			exit();
		}
	}, [state, replay, exit]);

	/* keyed by position in the full log so React keys stay stable per event */
	const logLines = state.events
		.map((event, eventIndex) => ({ eventIndex, event }))
		.slice(-LOG_LINE_COUNT);

	return (
		<Box flexDirection="column">
			{/* Status above the map, ログ類 below — the 不思議のダンジョン layout
			 * ratified in milestone 68. The inventory panel replaces the map
			 * while open (milestone 70), pinned to the map's height so the
			 * status bar and log lines never shift. */}
			<StatusBar state={state} />
			{isInventoryOpen ? (
				<Box height={MAP_HEIGHT} flexDirection="column">
					<InventoryOverlay state={state} />
				</Box>
			) : (
				<GameScreen grid={buildFrameGrid(state)} />
			)}
			{logLines.map(({ eventIndex, event }) => (
				<Text key={eventIndex} {...resolveLogLineStyle(event)}>
					{formatEvent(event, state.identifiedPotionKinds)}
				</Text>
			))}
			{(state.status === "dead" || state.status === "won") && (
				<>
					<Text bold color="yellow">
						{formatScoreSummary(
							calculateScore(state),
							state.floor,
							state.playerLevel,
							state.goldCollected,
							state.hasAmulet,
						)}
					</Text>
					{formatConducts(state.hasAttacked, state.hasEaten) !== "" && (
						<Text color="cyan">
							称号: {formatConducts(state.hasAttacked, state.hasEaten)}
						</Text>
					)}
				</>
			)}
			{/* System notices (app/session concerns — never game events, never
			 * saved), kept visually apart from the log by a blank line. */}
			{(showFullWidthWarning || state.status === "suspended") && (
				<Box marginTop={1} flexDirection="column">
					{showFullWidthWarning && (
						<Text color="yellow">{FULL_WIDTH_INPUT_WARNING}</Text>
					)}
					{state.status === "suspended" && (
						<Text color="cyan">{GAME_SAVED_MESSAGE}</Text>
					)}
				</Box>
			)}
		</Box>
	);
};

render(<App />);
