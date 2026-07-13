import { Box, render, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { advanceTurn } from "./game/advanceTurn.js";
import { PLAYER_MAX_HP } from "./game/balance.js";
import { buildFrameGrid } from "./game/frame.js";
import { buildDungeonGameState } from "./game/initialState.js";
import { isFullWidthInput, toAction } from "./game/keymap.js";
import { FULL_WIDTH_INPUT_WARNING, formatEvent } from "./messages.js";
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

	useInput((input, key) => {
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
			<Text color={state.playerHp <= LOW_HP_THRESHOLD ? "red" : "green"}>
				HP {state.playerHp}/{PLAYER_MAX_HP}
			</Text>
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
			{/* Not a game event (never saved) — an input-environment notice,
			 * kept visually apart from the log by a blank line. */}
			{showFullWidthWarning && (
				<Box marginTop={1}>
					<Text color="yellow">{FULL_WIDTH_INPUT_WARNING}</Text>
				</Box>
			)}
		</Box>
	);
};

render(<App />);
