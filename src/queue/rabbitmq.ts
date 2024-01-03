import * as amqp from 'amqplib';
import * as process from "process";

export async function queueConnect(queueName: string): Promise<amqp.Channel> {
    const connection = await amqp.connect(`amqp://${process.env.QUEUE_USERNAME}:${process.env.QUEUE_PASSWORD}@rabbitmq:5672`);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, {durable: false});

    return channel;
}