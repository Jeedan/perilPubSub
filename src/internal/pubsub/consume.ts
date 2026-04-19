import amqp from "amqplib";
import { ExchangeDeadLetterX } from "../routing/routing.js";
import { decode } from "@msgpack/msgpack";

export enum AckType {
	Ack,
	NackRequeue,
	NackDiscard,
}

export async function subscribeJSON<T>(
	conn: amqp.ChannelModel,
	exchange: string,
	queueName: string,
	key: string,
	queueType: SimpleQueueType,
	handler: (data: T) => Promise<AckType> | AckType,
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
		async (message: amqp.ConsumeMessage | null) => {
			if (!message) return;
			const msgContent = JSON.parse(message.content.toString());
			const ackType = await handler(msgContent);
			if (ackType === AckType.Ack) {
				channel.ack(message);
			} else if (ackType === AckType.NackRequeue) {
				channel.nack(message, false, true);
			} else if (ackType === AckType.NackDiscard) {
				channel.nack(message, false, false);
			}
		},
	);
}

export async function subscribeMsgPack<T>(
	conn: amqp.ChannelModel,
	exchange: string,
	queueName: string,
	key: string,
	queueType: SimpleQueueType,
	handler: (data: T) => Promise<AckType> | AckType,
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
		async (message: amqp.ConsumeMessage | null) => {
			if (!message) return;
			const msgContent = decode(message.content) as T;
			const ackType = await handler(msgContent);
			if (ackType === AckType.Ack) {
				channel.ack(message);
			} else if (ackType === AckType.NackRequeue) {
				channel.nack(message, false, true);
			} else if (ackType === AckType.NackDiscard) {
				channel.nack(message, false, false);
			}
		},
	);
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
		arguments: {
			"x-dead-letter-exchange": ExchangeDeadLetterX,
		},
	});
	await channel.bindQueue(queueName, exchange, routingKey);
	return [channel, queue];
}

export async function subscribe<T>(
	conn: amqp.ChannelModel,
	exchange: string,
	queueName: string,
	routingKey: string,
	simpleQueueType: SimpleQueueType,
	handler: (data: T) => Promise<AckType> | AckType,
	deserializer: (data: Buffer) => T,
): Promise<void> {}
