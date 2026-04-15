import amqp from "amqplib";
import { clientWelcome } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";

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
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
