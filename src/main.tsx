import { Box, render, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import type { GameEvent } from "./game/events.js";
import { buildFrameGrid } from "./game/frame.js";
import { isFullWidthInput, toAction } from "./game/keymap.js";
import { calculateScore } from "./game/score.js";
import { GameScreen } from "./renderer/index.js";
import { formatEvent } from "./shell/eventMessages.js";
import { useInventoryInteraction } from "./shell/inventoryInteraction.js";
import { InventoryOverlay } from "./shell/inventoryOverlay.js";
import { formatConducts, formatScoreSummary } from "./shell/messages.js";
import { saveReplay } from "./shell/replayFile.js";
import { saveGameState } from "./shell/saveFile.js";
import { createSession, recordAction } from "./shell/session.js";
import { StatusBar } from "./shell/statusBar.js";
import {
	FULL_WIDTH_INPUT_WARNING,
	GAME_SAVED_MESSAGE,
	SAVE_LOAD_WARNING_MESSAGE,
} from "./shell/systemMessages.js";

// The imperative shell: reads keys, dispatches actions into the pure reducer,
// hands the resulting frame to Ink. All game logic lives in src/game/; all
// human-readable wording comes from src/messages.ts. Session bootstrapping
// (resume-from-save vs. fresh dungeon) lives in shell/session.ts.

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

const App = () => {
	const { exit } = useApp();
	const [session, setSession] = useState(createSession);
	const { state, replay } = session;
	const [showFullWidthWarning, setShowFullWidthWarning] = useState(false);
	const [showSaveLoadWarning, setShowSaveLoadWarning] = useState(
		() => session.saveWasCorrupted,
	);
	/* The inventory overlay's open/selected-row/pending-target state machine —
	 * purely a display concern, not part of the simulated world, so it lives
	 * here (via the hook) instead of in GameState. See inventoryInteraction.ts. */
	const inventory = useInventoryInteraction();

	useInput((input, key) => {
		if (inventory.isOpen) {
			const action = inventory.handleInput(input, key.escape, state.inventory);
			if (action !== undefined) {
				setSession((current) => recordAction(current, action));
			}
			return;
		}
		if (input === "i") {
			if (state.status === "playing") {
				inventory.open();
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
		setShowSaveLoadWarning(false);
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
			{inventory.isOpen ? (
				/* Pinned to the map's exact footprint (width AND height): a
				 * full-terminal-width border row is exactly as wide as the
				 * viewport, and one mis-measured column there wraps the line
				 * and scrolls the status bar off the top. */
				<Box height={MAP_HEIGHT} width={MAP_WIDTH * 2} flexDirection="column">
					<InventoryOverlay
						state={state}
						selectedItem={inventory.selectedItem}
						pendingTargetFor={inventory.pendingTargetFor}
					/>
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
			{(showFullWidthWarning ||
				showSaveLoadWarning ||
				state.status === "suspended") && (
				<Box marginTop={1} flexDirection="column">
					{showFullWidthWarning && (
						<Text color="yellow">{FULL_WIDTH_INPUT_WARNING}</Text>
					)}
					{showSaveLoadWarning && (
						<Text color="yellow">{SAVE_LOAD_WARNING_MESSAGE}</Text>
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
