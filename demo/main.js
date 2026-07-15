// Browser shell for emoji-rogue. Imports the built game layer directly —
// no bundler, no build step of its own (see docs/tasks/game.md milestone 17).
// Deliberately does not wire save/quit: the browser has no filesystem and no
// process to exit (localStorage would be the drop-in point for save later).
import {
	advanceTurn,
	buildDungeonGameState,
	buildFrameGrid,
	formatEvent,
	formatInventoryEntry,
	GOAL_FLOOR,
	INVENTORY_EMPTY_MESSAGE,
	INVENTORY_TITLE,
	PLAYER_MAX_HP,
	toInventoryLetter,
	toUseItemAction,
} from "../dist/game/index.mjs";

const WIDTH = 40;
const HEIGHT = 20;
const LOG_LINE_COUNT = 3;
const LOW_HP_THRESHOLD = 3;

const KEY_TO_DIRECTION = {
	ArrowUp: "north",
	k: "north",
	ArrowDown: "south",
	j: "south",
	ArrowLeft: "west",
	h: "west",
	ArrowRight: "east",
	l: "east",
};

const toAction = (key) => {
	const direction = KEY_TO_DIRECTION[key];
	if (direction !== undefined) {
		return { type: "move", payload: { direction } };
	}
	if (key === "." || key === " ") {
		return { type: "wait" };
	}
	return undefined;
};

const readSeedFromUrl = () => {
	const requested = Number(new URLSearchParams(location.search).get("seed"));
	return Number.isFinite(requested) && requested > 0 ? requested : Date.now();
};

const seed = readSeedFromUrl();
let state = buildDungeonGameState(WIDTH, HEIGHT, seed);
let isInventoryOpen = false;

const mapElement = document.getElementById("map");
const statusElement = document.getElementById("status");
const logElement = document.getElementById("log");
const inventoryElement = document.getElementById("inventory");
const seedElement = document.getElementById("seed");

const renderMap = () => {
	const grid = buildFrameGrid(state);
	mapElement.style.gridTemplateColumns = `repeat(${state.width}, 1.4em)`;
	mapElement.textContent = "";
	for (const row of grid) {
		for (const cell of row) {
			const cellElement = document.createElement("span");
			cellElement.className = "cell";
			cellElement.textContent = cell.glyph;
			if (cell.bg !== undefined) {
				cellElement.style.backgroundColor = cell.bg;
			}
			mapElement.appendChild(cellElement);
		}
	}
};

const renderStatus = () => {
	statusElement.textContent = `${state.floor}F (目標 ${GOAL_FLOOR}F)  HP ${state.playerHp}/${PLAYER_MAX_HP}`;
	statusElement.style.color =
		state.playerHp <= LOW_HP_THRESHOLD ? "#f66" : "#6f6";
};

const renderLog = () => {
	logElement.textContent = "";
	for (const event of state.events.slice(-LOG_LINE_COUNT)) {
		const line = document.createElement("div");
		line.textContent = formatEvent(event);
		if (event.type === "player-died") {
			line.className = "log-died";
		} else if (event.type === "game-won") {
			line.className = "log-won";
		}
		logElement.appendChild(line);
	}
};

const renderInventory = () => {
	inventoryElement.hidden = !isInventoryOpen;
	if (!isInventoryOpen) {
		return;
	}
	inventoryElement.textContent = "";
	const title = document.createElement("div");
	title.textContent = INVENTORY_TITLE;
	inventoryElement.appendChild(title);
	if (state.inventory.length === 0) {
		const empty = document.createElement("div");
		empty.textContent = INVENTORY_EMPTY_MESSAGE;
		inventoryElement.appendChild(empty);
		return;
	}
	state.inventory.forEach((entry, index) => {
		const row = document.createElement("div");
		row.textContent = `${toInventoryLetter(index)}) ${formatInventoryEntry(entry)}`;
		inventoryElement.appendChild(row);
	});
};

const render = () => {
	renderMap();
	renderStatus();
	renderLog();
	renderInventory();
	seedElement.textContent = `seed: ${seed}`;
};

window.addEventListener("keydown", (event) => {
	if (isInventoryOpen) {
		if (event.key === "i" || event.key === "Escape") {
			isInventoryOpen = false;
			render();
			return;
		}
		const action = toUseItemAction(event.key, state.inventory);
		isInventoryOpen = false;
		if (action !== undefined) {
			state = advanceTurn(state, action);
		}
		render();
		return;
	}
	if (event.key === "i") {
		if (state.status === "playing") {
			isInventoryOpen = true;
			render();
		}
		return;
	}
	const action = toAction(event.key);
	if (action === undefined) {
		return;
	}
	event.preventDefault();
	state = advanceTurn(state, action);
	render();
});

render();
