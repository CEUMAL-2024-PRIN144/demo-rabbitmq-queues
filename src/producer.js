const express = require('express');
const amqp = require('amqplib');
const { RABBITMQ_URL, QUEUE_NAME, PORT } = require('./config');

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Durable queue survives a broker restart.
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Accepts any JSON body and publishes it to the queue.
  app.post('/messages', (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty JSON object' });
    }

    const message = {
      id: crypto.randomUUID(),
      payload: req.body,
      createdAt: new Date().toISOString(),
    };

    // persistent: true writes the message to disk so it survives a broker restart.
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
    });

    console.log(`[producer] queued message ${message.id}`);
    res.status(202).json({ status: 'queued', queue: QUEUE_NAME, id: message.id });
  });

  const server = app.listen(PORT, () => {
    console.log(`[producer] listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await channel.close();
    await connection.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[producer] failed to start:', err.message);
  process.exit(1);
});
