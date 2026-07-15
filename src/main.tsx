import { Box, render, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { advanceTurn } from "./game/advanceTurn.js";
import { PLAYER_MAX_HP } from "./game/balance.js";
import { buildFrameGrid } from "./game/frame.js";
import { buildDungeonGameState } from "./game/initialState.js";
import { toInventoryLetter, toUseItemAction } from "./game/inventoryKeymap.js";
import { isFullWidthInput, toAction } from "./game/keymap.js";
import {
	FULL_WIDTH_INPUT_WARNING,
	formatEvent,
	formatInventoryEntry,
	GAME_SAVED_MESSAGE,
	INVENTORY_EMPTY_MESSAGE,
	INVENTORY_TITLE,
} from "./messages.js";
import { GameScreen } from "./renderer/index.js";
import { loadSavedGameState, saveGameState } from "./saveFile.js";

// The imperative shell: reads keys, dispatches actions into the pure reducer,
// hands the resulting frame to Ink. All game logic lives in src/game/; all
// human-readable wording comes from src/messages.ts.

const MAP_WIDTH = 40;
const MAP_HEIGHT = 20;
const LOG_LINE_COUNT = 3;
const LOW_HP_THRESHOLD = 3;

const App = () => {
	const { exit } = useApp();
	const [state, setState] = useState(
		() =>
			loadSavedGameState() ??
			buildDungeonGameState(MAP_WIDTH, MAP_HEIGHT, Date.now()),
	);
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
				setState((current) => advanceTurn(current, action));
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
		setState((current) => advanceTurn(current, action));
	});

	useEffect(() => {
		if (state.status === "suspended") {
			/* the file must record an in-progress run, ready to resume */
			saveGameState({ ...state, status: "playing" });
		}
		if (state.status !== "playing") {
			exit();
		}
	}, [state, exit]);

	/* keyed by position in the full log so React keys stay stable per event */
	const logLines = state.events
		.map((event, eventIndex) => ({ eventIndex, event }))
		.slice(-LOG_LINE_COUNT);

	return (
		<Box flexDirection="column">
			<GameScreen grid={buildFrameGrid(state)} />
			<Box>
				<Text>{state.floor}F </Text>
				<Text color={state.playerHp <= LOW_HP_THRESHOLD ? "red" : "green"}>
					HP {state.playerHp}/{PLAYER_MAX_HP}
				</Text>
			</Box>
			{logLines.map(({ eventIndex, event }) => (
				<Text
					key={eventIndex}
					{...(event.type === "player-died"
						? { color: "red", bold: true }
						: {})}
				>
					{formatEvent(event)}
				</Text>
			))}
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
			{isInventoryOpen && (
				<Box marginTop={1} flexDirection="column" borderStyle="round">
					<Text>{INVENTORY_TITLE}</Text>
					{state.inventory.length === 0 ? (
						<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
					) : (
						state.inventory.map((entry, index) => (
							<Text key={entry.kind}>
								{toInventoryLetter(index)}) {formatInventoryEntry(entry)}
							</Text>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

render(<App />);
