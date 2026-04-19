import amqp from "amqplib";
import { publishJSONToQueue } from "../internal/pubsub/publish.js";
import {
	ExchangePerilDirect,
	ExchangePerilTopic,
	GameLogSlug,
	PauseKey,
} from "../internal/routing/routing.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import {
	SimpleQueueType,
	subscribeMsgPack,
} from "../internal/pubsub/consume.js";
import { handlerWriteLog } from "./handlers.js";

async function main() {
	const rabbitConnUrl = "amqp://guest:guest@localhost:5672/";
	const conn = await amqp.connect(rabbitConnUrl);
	console.log("Connection successful");
	console.log("Starting Peril server...");
	process.on("SIGINT", () => {
		console.log("Shutting down...");
		conn.close();
	});

	const channel = await conn.createConfirmChannel();

	// Durable queues survive a server restart
	await subscribeMsgPack(
		conn,
		ExchangePerilTopic,
		GameLogSlug,
		`${GameLogSlug}.*`,
		SimpleQueueType.Durable,
		handlerWriteLog(),
	);

	printServerHelp();
	while (true) {
		const input = await getInput();
		if (input.length === 0) continue;
		const command = input[0];
		if (command === "pause") {
			console.log("Sending a pause message");
			await publishJSONToQueue(channel, ExchangePerilDirect, PauseKey, {
				isPaused: true,
			});
		} else if (command === "resume") {
			console.log("Sending a resume message");
			await publishJSONToQueue(channel, ExchangePerilDirect, PauseKey, {
				isPaused: false,
			});
		} else if (command === "quit") {
			console.log("exiting");
			process.exit(0);
			//break;
		} else {
			console.log("Invalid command");
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
