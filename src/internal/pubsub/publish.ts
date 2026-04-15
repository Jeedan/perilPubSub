import amqp from "amqplib";
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

export enum SimpleQueueType {
	Durable,
	Transient,
}

export async function declareAndBind(
	conn: amqp.ChannelModel,
	exchange: string,
	queueName: string,
	routingKey: string,
	queueType: SimpleQueueType,
): Promise<[amqp.Channel, amqp.Replies.AssertQueue]> {
	const channel = await conn.createChannel();
	const isDurable = queueType === SimpleQueueType.Durable;
	const isTransient = queueType === SimpleQueueType.Transient;

	const queue = await channel.assertQueue(queueName, {
		durable: isDurable,
		autoDelete: isTransient,
		exclusive: isTransient,
	});
	await channel.bindQueue(queueName, exchange, routingKey);
	return [channel, queue];
}
