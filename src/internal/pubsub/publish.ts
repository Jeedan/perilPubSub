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
