import type { ConfirmChannel } from "amqplib";

export async function publishJSON<T>(
	ch: ConfirmChannel,
	exchange: string,
	routingKey: string,
	value: T,
): Promise<void> {
	const JSONbytes = Buffer.from(JSON.stringify(value));
	ch.publish(exchange, routingKey, JSONbytes, {
		contentType: "application/json",
	});
}

export async function publishJSONToQueue<T>(
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
