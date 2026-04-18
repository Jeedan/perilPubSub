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

export function handlerWar(gs: GameState): (war: RecognitionOfWar) => AckType {
	return (war) => {
		const warResolution = handleWar(gs, war);
		process.stdout.write("> ");
		const warOutcome = warResolution.result;
		switch (warOutcome) {
			case WarOutcome.NotInvolved:
				return AckType.NackRequeue;

			case WarOutcome.NoUnits:
				return AckType.NackDiscard;

			case WarOutcome.OpponentWon:
				return AckType.Ack;

			case WarOutcome.YouWon:
				return AckType.Ack;

			case WarOutcome.Draw:
				return AckType.Ack;

			default:
				console.log("Something went wrong, invalid war outcome");
				return AckType.NackDiscard;
		}
	};
}
