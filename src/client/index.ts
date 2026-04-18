import amqp from "amqplib";
import {
	clientWelcome,
	commandStatus,
	getInput,
	printClientHelp,
	printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { publishJSONToQueue } from "../internal/pubsub/publish.js";
import {
	ArmyMovesPrefix,
	ExchangePerilDirect,
	ExchangePerilTopic,
	PauseKey,
} from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { handlerMove, handlerPause } from "./handlers.js";
import { SimpleQueueType, subscribeJSON } from "../internal/pubsub/consume.js";

async function main() {
	const rabbitConnUrl = "amqp://guest:guest@localhost:5672/";
	const conn = await amqp.connect(rabbitConnUrl);
	console.log("Connection successful");
	console.log("Starting Peril client...");
	process.on("SIGINT", () => {
		console.log("Shutting down...");
		conn.close();
	});

	const userName = await clientWelcome();

	const gameState: GameState = new GameState(userName);

	await subscribeJSON(
		conn,
		ExchangePerilDirect,
		`pause.${userName}`,
		PauseKey,
		SimpleQueueType.Transient,
		handlerPause(gameState),
	);

	await subscribeJSON(
		conn,
		ExchangePerilTopic,
		`${ArmyMovesPrefix}.${userName}`,
		`${ArmyMovesPrefix}.*`,
		SimpleQueueType.Transient,
		handlerMove(gameState),
	);

	const publishCH = await conn.createConfirmChannel();

	while (true) {
		const words = await getInput();
		if (words.length === 0) continue;
		const command = words[0];
		if (command === "spawn") {
			try {
				commandSpawn(gameState, words);
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error(err.message);
				} else {
					console.error("Something went wrong:", err);
				}
			}
		} else if (command === "move") {
			try {
				const move = commandMove(gameState, words);
				if (move) console.log("move successful");

				await publishJSONToQueue(
					publishCH,
					ExchangePerilTopic,
					`${ArmyMovesPrefix}.${userName}`,
					move,
				);
				console.log("Successfully published a move command");
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error(err.message);
				} else {
					console.error("Something went wrong:", err);
				}
			}
		} else if (command === "status") {
			await commandStatus(gameState);
		} else if (command === "help") {
			printClientHelp();
		} else if (command === "spam") {
			console.log("Spamming not allowed yet!");
		} else if (command === "quit") {
			printQuit();
			process.exit(0);
		} else {
			console.log("Invalid command");
			continue;
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
