import amqp from "amqplib";
import { ExchangeDeadLetterX } from "../routing/routing.js";

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
	handler: (data: T) => AckType,
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
			if (!message) return;
			const msgContent = JSON.parse(message.content.toString());
			const ackType = handler(msgContent);
			if (ackType === AckType.Ack) {
				channel.ack(message);
				console.log("ack type occured");
			} else if (ackType === AckType.NackRequeue) {
				console.log("nack requeue type occured");
				channel.nack(message, false, true);
			} else if (ackType === AckType.NackDiscard) {
				console.log("nack discard type occured");
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
