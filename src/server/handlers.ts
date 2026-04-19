import { writeLog, type GameLog } from "../internal/gamelogic/logs.js";
import { AckType } from "../internal/pubsub/consume.js";

export function handlerWriteLog(): (gamelog: GameLog) => Promise<AckType> {
	return async (gameLog) => {
		try {
			await writeLog(gameLog);
			return AckType.Ack;
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
