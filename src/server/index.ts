import amqp, { type ConfirmChannel } from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";

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

	printServerHelp();
	while (true) {
		const input = await getInput();
		if (input.length === 0) continue;
		const command = input[0];
		if (command === "pause") {
			console.log("Sending a pause message");
			await sendMessageToQueue(channel, ExchangePerilDirect, PauseKey, {
				isPaused: true,
			});
		} else if (command === "resume") {
			console.log("Sending a resume message");
			await sendMessageToQueue(channel, ExchangePerilDirect, PauseKey, {
				isPaused: false,
			});
		} else if (command === "quit") {
			console.log("exiting");
			break;
		} else {
			console.log("Invalid command");
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});

async function sendMessageToQueue<T>(
	ch: ConfirmChannel,
	exchange: string,
	routingKey: string,
	value: T,
) {
	try {
		await publishJSON(ch, exchange, routingKey, value);
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(err.message);
		} else {
			console.error("Something went wrong", err);
		}
	}
}
