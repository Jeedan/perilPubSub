import amqp from "amqplib";

async function main() {
	const rabbitConnUrl = "amqp://guest:guest@localhost:5672/";
	const conn = await amqp.connect(rabbitConnUrl);
	console.log("Connection successful");
	console.log("Starting Peril server...");
	process.on("SIGINT", () => {
		console.log("Shutting down...");
		conn.close();
	});
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
