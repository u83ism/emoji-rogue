// Manual check for the replay recorded by the last CLI session
// (~/.emoji-rogue/replay.json, written by src/main.tsx on exit). Run after
// playing (and quitting/dying/winning) at least once:
//
//   npx unrun scripts/replay-verify.ts
//
// Reconstructs the run from (width, height, seed) + the recorded actions and
// prints a summary — compare it against what you actually remember seeing.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	buildReplayGameState,
	parseReplayFileContent,
} from "../src/game/index.js";

const replayFilePath = join(homedir(), ".emoji-rogue", "replay.json");

let content: string;
try {
	content = readFileSync(replayFilePath, "utf8");
} catch {
	console.error(`リプレイファイルが見つかりません: ${replayFilePath}`);
	console.error("先にCLI版を一度プレイして終了(死亡/勝利/quit)してください。");
	process.exit(1);
}

const parsed = parseReplayFileContent(content);
if (!parsed.ok) {
	console.error("リプレイファイルの読み込みに失敗しました:", parsed.error);
	process.exit(1);
}

const replay = parsed.value;
const finalState = buildReplayGameState(replay);

console.log(`シード: ${replay.seed} (${replay.width}x${replay.height})`);
console.log(`記録されたアクション数: ${replay.actions.length}`);
console.log(`再構築後の到達フロア: ${finalState.floor}`);
console.log(`再構築後のHP: ${finalState.playerHp}`);
console.log(`再構築後のステータス: ${finalState.status}`);
