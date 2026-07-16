import { Box, Text } from "ink";
import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_MAX_FOOD,
} from "./game/balance.js";
import type { GameState } from "./game/state.js";

const LOW_HP_THRESHOLD = 3;

/** Warns in yellow once food drops to the hunger threshold. */
const resolveFoodTextStyle = (
	playerFood: number,
): { readonly color?: string } =>
	playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD ? { color: "yellow" } : {};

/**
 * The one-line chrome row under the map: floor, level, HP, food, attack and
 * defense, gold, and a chip per active temporary status. Plain text only —
 * emoji chrome would trip Ink's wide-character width measuring (the 💰 is
 * the deliberate, verified exception).
 */
export const StatusBar = ({ state }: { readonly state: GameState }) => (
	<Box>
		<Text>{state.floor}F </Text>
		<Text color="blueBright">Lv.{state.playerLevel} </Text>
		<Text color={state.playerHp <= LOW_HP_THRESHOLD ? "red" : "green"}>
			HP {state.playerHp}/{state.playerMaxHp}
		</Text>
		<Text> </Text>
		<Text {...resolveFoodTextStyle(state.playerFood)}>
			満腹度 {state.playerFood}/{PLAYER_MAX_FOOD}
		</Text>
		<Text> </Text>
		<Text>
			攻 {state.playerAttackDamage} 防 {state.playerDefense}
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
		{state.blindTurnsRemaining > 0 && (
			<>
				<Text> </Text>
				<Text color="gray">盲目({state.blindTurnsRemaining})</Text>
			</>
		)}
		{state.paralyzedTurnsRemaining > 0 && (
			<>
				<Text> </Text>
				<Text color="red">麻痺({state.paralyzedTurnsRemaining})</Text>
			</>
		)}
		{state.detectMonstersTurnsRemaining > 0 && (
			<>
				<Text> </Text>
				<Text color="green">索敵中({state.detectMonstersTurnsRemaining})</Text>
			</>
		)}
	</Box>
);
