import type { ConfirmChannel } from "amqplib";
import { encode } from "@msgpack/msgpack";

async function publishJSON<T>(
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

export async function publishMsgPack<T>(
	ch: ConfirmChannel,
	exchange: string,
	routingKey: string,
	value: T,
): Promise<void> {
	const encodedMsgPack = encode(value);

	const contentBuffer: Buffer = Buffer.from(
		encodedMsgPack.buffer,
		encodedMsgPack.byteOffset,
		encodedMsgPack.byteLength,
	);
	ch.publish(exchange, routingKey, contentBuffer, {
		contentType: "application/x-msgpack",
	});
}
