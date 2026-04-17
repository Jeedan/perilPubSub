import amqp from "amqplib";
import {
	clientWelcome,
	commandStatus,
	getInput,
	printClientHelp,
	printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";

async function main() {
	const rabbitConnUrl = "amqp://guest:guest@localhost:5672/";
	const conn = await amqp.connect(rabbitConnUrl);
	console.log("Connection successful");
	console.log("Starting Peril client...");
	process.on("SIGINT", () => {
		console.log("Shutting down...");
		conn.close();
	});

	const userInput = await clientWelcome();

	await declareAndBind(
		conn,
		ExchangePerilDirect,
		`pause.${userInput}`,
		PauseKey,
		SimpleQueueType.Transient,
	);

	const gameState: GameState = new GameState(userInput);

	while (true) {
		const words = await getInput();
		if (words.length === 0) continue;
		const command = words[0];
		if (command === "spawn") {
			console.log("Sending a spawn command");
			commandSpawn(gameState, words);
		} else if (command === "move") {
			console.log("Sending a move command");
			const move = commandMove(gameState, words);
			if (move) console.log("move successful");
		} else if (command === "status") {
			console.log("Sending a status command");
			await commandStatus(gameState);
		} else if (command === "help") {
			console.log("Sending a help command");
			printClientHelp();
		} else if (command === "spam") {
			console.log("Sending a spam command");
			console.log("Spamming not allowed yet!");
		} else if (command === "quit") {
			console.log("Sending a quit command");
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
