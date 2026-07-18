// Browser shell for emoji-rogue. Imports the built game layer directly —
// no bundler, no build step of its own (see docs/tasks/game-history.md milestone 17).
// Deliberately does not wire quit (no process to exit). Save uses localStorage
// as the CLI's suspend-save comment anticipated, but auto-saves every turn
// instead of on an explicit key — a browser tab can be closed at any moment
// with no equivalent of the CLI's "press s before you quit" (milestone 79).
import {
	advanceTurn,
	BLINDNESS_GLYPH,
	buildDungeonGameState,
	buildFrameGrid,
	buildSaveFileContent,
	CONFUSION_GLYPH,
	DETECT_MONSTER_GLYPH,
	formatEvent,
	formatInventoryEntry,
	GOAL_FLOOR,
	INVENTORY_EMPTY_MESSAGE,
	INVENTORY_TITLE,
	LEVITATION_GLYPH,
	PARALYSIS_GLYPH,
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_MAX_FOOD,
	parseSaveFileContent,
	SAVE_LOAD_WARNING_MESSAGE,
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

const SAVE_STORAGE_KEY = "emoji-rogue-save";

/**
 * Read and consume the one save slot from localStorage — same "resumes
 * exactly once" semantics as the CLI's saveFile.ts (roguelike suspend
 * convention: a save must not survive the run it resumed). Distinguishes
 * "no save" from "a save existed but failed to parse" so the caller can
 * warn instead of failing silently, mirroring src/shell/saveFile.ts's
 * LoadSaveOutcome.
 */
const loadSavedState = () => {
	const content = localStorage.getItem(SAVE_STORAGE_KEY);
	if (content === null) {
		return { kind: "none" };
	}
	localStorage.removeItem(SAVE_STORAGE_KEY);
	const parsed = parseSaveFileContent(content);
	return parsed.ok
		? { kind: "loaded", state: parsed.value }
		: { kind: "corrupted" };
};

/**
 * Auto-saves after every turn (unlike the CLI's explicit `s` key) since a
 * tab can be closed at any moment. Clears the slot once the run is no
 * longer playing so a finished run's save can't be resumed (same
 * save-scumming guard as the CLI never suspend-saving a dead/won state).
 */
const persistSaveState = (currentState) => {
	if (currentState.status === "playing") {
		localStorage.setItem(SAVE_STORAGE_KEY, buildSaveFileContent(currentState));
	} else {
		localStorage.removeItem(SAVE_STORAGE_KEY);
	}
};

const savedOutcome = loadSavedState();
const seed = savedOutcome.kind === "loaded" ? undefined : readSeedFromUrl();
let state =
	savedOutcome.kind === "loaded"
		? savedOutcome.state
		: buildDungeonGameState(WIDTH, HEIGHT, seed);
let isInventoryOpen = false;
let showSaveLoadWarning = savedOutcome.kind === "corrupted";

const mapElement = document.getElementById("map");
const statusElement = document.getElementById("status");
const logElement = document.getElementById("log");
const inventoryElement = document.getElementById("inventory");
const warningElement = document.getElementById("warning");
const seedElement = document.getElementById("seed");

const renderMap = () => {
	/* the inventory panel replaces the map while open — same exclusivity as the CLI (milestone 70) */
	mapElement.hidden = isInventoryOpen;
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

// Same chip-per-status table as the CLI's statusBar.tsx — adding a status is
// one entry here too. Glyphs are imported from the shared game core (see
// glyphs.js) so the two never drift; only color/label stay per-shell.
const STATUS_CHIPS = [
	{
		label: "混乱中",
		glyph: CONFUSION_GLYPH,
		color: "#f6f",
		remaining: (s) => s.confusedTurnsRemaining,
	},
	{
		label: "浮遊中",
		glyph: LEVITATION_GLYPH,
		color: "#6ff",
		remaining: (s) => s.levitationTurnsRemaining,
	},
	{
		label: "盲目",
		glyph: BLINDNESS_GLYPH,
		color: "#999",
		remaining: (s) => s.blindTurnsRemaining,
	},
	{
		label: "麻痺",
		glyph: PARALYSIS_GLYPH,
		color: "#f66",
		remaining: (s) => s.paralyzedTurnsRemaining,
	},
	{
		label: "索敵中",
		glyph: DETECT_MONSTER_GLYPH,
		color: "#6f6",
		remaining: (s) => s.detectMonstersTurnsRemaining,
	},
];

const appendStatusSegment = (text, color) => {
	const segment = document.createElement("span");
	segment.textContent = text;
	if (color !== undefined) {
		segment.style.color = color;
	}
	statusElement.appendChild(segment);
};

// Mirrors the CLI status bar (statusBar.tsx): floor, level, HP, food, attack
// and defense, gold, then one chip per active temporary status.
const renderStatus = () => {
	statusElement.textContent = "";
	appendStatusSegment(`${state.floor}F (目標 ${GOAL_FLOOR}F) `);
	appendStatusSegment(`Lv.${state.playerLevel} `, "#69f");
	appendStatusSegment(
		`💓 ${state.playerHp}/${state.playerMaxHp}`,
		state.playerHp <= LOW_HP_THRESHOLD ? "#f66" : "#6f6",
	);
	appendStatusSegment(
		` 🍖 ${state.playerFood}/${PLAYER_MAX_FOOD}`,
		state.playerFood <= 0
			? "#f66"
			: state.playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD
				? "#ff6"
				: undefined,
	);
	appendStatusSegment(
		` 💪 ${state.playerAttackDamage} 🦺 ${state.playerDefense}`,
	);
	appendStatusSegment(` 💰 ${state.goldCollected}`, "#fd6");
	for (const chip of STATUS_CHIPS) {
		const remaining = chip.remaining(state);
		if (remaining > 0) {
			appendStatusSegment(` ${chip.glyph} (${remaining})`, chip.color);
		}
	}
};

const renderLog = () => {
	logElement.textContent = "";
	for (const event of state.events.slice(-LOG_LINE_COUNT)) {
		const line = document.createElement("div");
		line.textContent = formatEvent(event, state.identifiedPotionKinds);
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
		row.textContent = `${toInventoryLetter(index)}) ${formatInventoryEntry(entry, state.identifiedPotionKinds)}`;
		inventoryElement.appendChild(row);
	});
};

const render = () => {
	renderMap();
	renderStatus();
	renderLog();
	renderInventory();
	warningElement.hidden = !showSaveLoadWarning;
	warningElement.textContent = showSaveLoadWarning
		? SAVE_LOAD_WARNING_MESSAGE
		: "";
	seedElement.textContent =
		seed === undefined ? "再開したセーブデータ" : `seed: ${seed}`;
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
			persistSaveState(state);
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
	showSaveLoadWarning = false;
	state = advanceTurn(state, action);
	persistSaveState(state);
	render();
});

render();
