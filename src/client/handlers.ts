import type { ConfirmChannel } from "amqplib";
import type {
	ArmyMove,
	RecognitionOfWar,
} from "../internal/gamelogic/gamedata.js";
import {
	GameState,
	type PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/consume.js";
import { publishJSONToQueue } from "../internal/pubsub/publish.js";
import {
	ExchangePerilTopic,
	WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import { publishGameLog } from "./index.js";

export function handlerPause(gs: GameState): (pause: PlayingState) => AckType {
	return (ps) => {
		handlePause(gs, ps);
		process.stdout.write("> ");
		return AckType.Ack;
	};
}

export function handlerMove(
	gs: GameState,
	channel: ConfirmChannel,
): (move: ArmyMove) => Promise<AckType> {
	return async (move) => {
		const moveOutcome = handleMove(gs, move);
		try {
			if (
				moveOutcome === MoveOutcome.Safe ||
				moveOutcome === MoveOutcome.SamePlayer
			) {
				return AckType.Ack;
			} else if (moveOutcome === MoveOutcome.MakeWar) {
				const rw: RecognitionOfWar = {
					attacker: move.player,
					defender: gs.getPlayerSnap(),
				};
				await publishJSONToQueue(
					channel,
					ExchangePerilTopic,
					`${WarRecognitionsPrefix}.${gs.getUsername()}`,
					rw,
				);
				return AckType.Ack;
			} else {
				return AckType.NackDiscard;
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				console.error(
					"Something went wrong, Requeing message.",
					err.message,
				);
			} else {
				console.error("Something went wrong, Requeing message.", err);
			}
			return AckType.NackRequeue;
		} finally {
			process.stdout.write("> ");
		}
	};
}

export function handlerWar(
	gs: GameState,
	channel: ConfirmChannel,
): (war: RecognitionOfWar) => Promise<AckType> {
	return async (war) => {
		const warResolution = handleWar(gs, war);
		const warOutcome = warResolution.result;
		try {
			switch (warOutcome) {
				case WarOutcome.NotInvolved:
					return AckType.NackRequeue;

				case WarOutcome.NoUnits:
					return AckType.NackDiscard;

				case WarOutcome.OpponentWon:

				case WarOutcome.YouWon:
					await publishGameLog(
						channel,
						gs.getUsername(),
						`${warResolution.winner} won a war against ${warResolution.loser}`,
					);
					return AckType.Ack;
				case WarOutcome.Draw:
					await publishGameLog(
						channel,
						gs.getUsername(),
						`A war between ${warResolution.attacker} and ${warResolution.defender} resulted in a draw`,
					);
					return AckType.Ack;

				default:
					console.log("Something went wrong, invalid war outcome");
					return AckType.NackDiscard;
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				console.error(
					"Something went wrong, Requeing message.",
					err.message,
				);
			} else {
				console.error("Something went wrong, Requeing message.", err);
			}
			return AckType.NackRequeue;
		} finally {
			process.stdout.write("> ");
		}
	};
}
