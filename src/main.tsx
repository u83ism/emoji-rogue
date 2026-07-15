import { Box, render, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { parseSeedArgument } from "./cliArgs.js";
import { advanceTurn } from "./game/advanceTurn.js";
import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_MAX_FOOD,
	PLAYER_MAX_HP,
} from "./game/balance.js";
import type { GameEvent } from "./game/events.js";
import { buildFrameGrid } from "./game/frame.js";
import { buildDungeonGameState } from "./game/initialState.js";
import { toInventoryLetter, toUseItemAction } from "./game/inventoryKeymap.js";
import { isFullWidthInput, toAction } from "./game/keymap.js";
import type { Replay } from "./game/replay.js";
import type { Action, GameState } from "./game/state.js";
import {
	FULL_WIDTH_INPUT_WARNING,
	formatEvent,
	formatInventoryEntry,
	GAME_SAVED_MESSAGE,
	INVENTORY_EMPTY_MESSAGE,
	INVENTORY_TITLE,
} from "./messages.js";
import { GameScreen } from "./renderer/index.js";
import { saveReplay } from "./replayFile.js";
import { loadSavedGameState, saveGameState } from "./saveFile.js";

// The imperative shell: reads keys, dispatches actions into the pure reducer,
// hands the resulting frame to Ink. All game logic lives in src/game/; all
// human-readable wording comes from src/messages.ts.

const MAP_WIDTH = 40;
const MAP_HEIGHT = 20;
const LOG_LINE_COUNT = 3;
const LOW_HP_THRESHOLD = 3;

/** Warns in yellow once food drops to the hunger threshold. */
const resolveFoodTextStyle = (
	playerFood: number,
): { readonly color?: string } =>
	playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD ? { color: "yellow" } : {};

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
	 * unrecorded (docs/tasks/game.md milestone 18).
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
			<GameScreen grid={buildFrameGrid(state)} />
			<Box>
				<Text>{state.floor}F </Text>
				<Text color={state.playerHp <= LOW_HP_THRESHOLD ? "red" : "green"}>
					HP {state.playerHp}/{PLAYER_MAX_HP}
				</Text>
				<Text> </Text>
				<Text {...resolveFoodTextStyle(state.playerFood)}>
					満腹度 {state.playerFood}/{PLAYER_MAX_FOOD}
				</Text>
				<Text> </Text>
				<Text color="yellow">💰{state.goldCollected}</Text>
				{state.confusedTurnsRemaining > 0 && (
					<>
						<Text> </Text>
						<Text color="magenta">混乱中({state.confusedTurnsRemaining})</Text>
					</>
				)}
				{state.levitationTurnsRemaining > 0 && (
					<>
						<Text> </Text>
						<Text color="cyan">浮遊中({state.levitationTurnsRemaining})</Text>
					</>
				)}
			</Box>
			{logLines.map(({ eventIndex, event }) => (
				<Text key={eventIndex} {...resolveLogLineStyle(event)}>
					{formatEvent(event, state.identifiedPotionKinds)}
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
								{toInventoryLetter(index)}){" "}
								{formatInventoryEntry(entry, state.identifiedPotionKinds)}
							</Text>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

render(<App />);
