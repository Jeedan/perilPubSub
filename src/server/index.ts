import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";

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
	try {
		await publishJSON(channel, ExchangePerilDirect, PauseKey, {
			isPaused: true,
		});
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(err.message);
		} else {
			console.error("Something went wrong", err);
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
