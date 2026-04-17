import amqp from "amqplib";
import { declareAndBind, type SimpleQueueType } from "./publish.js";

export async function subscribeJSON<T>(
	conn: amqp.ChannelModel,
	exchange: string,
	queueName: string,
	key: string,
	queueType: SimpleQueueType,
	handler: (data: T) => void,
): Promise<void> {
	const [channel, queue] = await declareAndBind(
		conn,
		exchange,
		queueName,
		key,
		queueType,
	);

	await channel.consume(
		queue.queue,
		(message: amqp.ConsumeMessage | null) => {
			if (!message) return null;
			const msgContent = JSON.parse(message.content.toString());
			handler(msgContent);
			channel.ack(message);
		},
	);
}
