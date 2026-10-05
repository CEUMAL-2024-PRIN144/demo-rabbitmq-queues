const amqp = require('amqplib');
const { RABBITMQ_URL, QUEUE_NAME } = require('./config');

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Hand this worker only one unacknowledged message at a time, so work is
  // spread evenly when several consumers are running.
  channel.prefetch(1);

  console.log(`[consumer] waiting for messages on "${QUEUE_NAME}"`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (msg === null) return; // queue was deleted

    try {
      const message = JSON.parse(msg.content.toString());
      console.log(`[consumer] received ${message.id}:`, message.payload);

      // Simulate some work.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`[consumer] done ${message.id}`);
      channel.ack(msg);
    } catch (err) {
      console.error('[consumer] failed to process message:', err.message);
      // Malformed messages would fail forever, so drop them instead of requeueing.
      channel.nack(msg, false, false);
    }
  });

  const shutdown = async () => {
    await channel.close();
    await connection.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[consumer] failed to start:', err.message);
  process.exit(1);
});
