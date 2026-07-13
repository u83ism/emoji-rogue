import { render, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { advanceTurn } from "./game/advanceTurn.js";
import { buildFrameGrid } from "./game/frame.js";
import { buildInitialGameState } from "./game/initialState.js";
import { toAction } from "./game/keymap.js";
import { GameScreen } from "./renderer/index.js";

// The imperative shell: reads keys, dispatches actions into the pure reducer,
// hands the resulting frame to Ink. All game logic lives in src/game/.

const MAP_WIDTH = 24;
const MAP_HEIGHT = 14;

const App = () => {
	const { exit } = useApp();
	const [state, setState] = useState(() =>
		buildInitialGameState(MAP_WIDTH, MAP_HEIGHT, Date.now()),
	);

	useInput((input, key) => {
		const action = toAction(input, key);
		if (action === undefined) {
			return;
		}
		setState((current) => advanceTurn(current, action));
	});

	useEffect(() => {
		if (state.status === "exited") {
			exit();
		}
	}, [state.status, exit]);

	return <GameScreen grid={buildFrameGrid(state)} />;
};

render(<App />);
