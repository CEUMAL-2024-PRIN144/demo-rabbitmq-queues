# RabbitMQ Queues Demo (Node.js + Express)

A small demo of the work-queue pattern with RabbitMQ:

- **Producer** (`src/producer.js`): an Express API. `POST /messages` takes a JSON body and publishes it to a RabbitMQ queue.
- **Consumer** (`src/consumer.js`): a worker that reads messages from the queue, "processes" them (waits 1 second), and acknowledges them.

```
curl ──POST /messages──▶ Express (producer) ──▶ [ tasks queue ] ──▶ consumer worker(s)
```

## Prerequisites

- Node.js 18+
- Docker (to run RabbitMQ), or an existing RabbitMQ server

## Getting started

1. Start RabbitMQ:

   ```bash
   docker compose up -d
   ```

   The management UI is at http://localhost:15672 (user `guest`, password `guest`).

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the producer API (terminal 1):

   ```bash
   npm run producer
   ```

4. Start a consumer (terminal 2):

   ```bash
   npm run consumer
   ```

5. Send a message:

   ```bash
   curl -X POST http://localhost:3000/messages \
     -H "Content-Type: application/json" \
     -d '{"task": "send-email", "to": "alice@example.com"}'
   ```

   Response (`202 Accepted`):

   ```json
   { "status": "queued", "queue": "tasks", "id": "7dbb520a-21d6-4e75-9155-f84515606b1c" }
   ```

   The consumer logs:

   ```
   [consumer] received 7dbb520a-...: { task: 'send-email', to: 'alice@example.com' }
   [consumer] done 7dbb520a-...
   ```

## API

| Method | Path        | Description                                                         |
| ------ | ----------- | ------------------------------------------------------------------- |
| POST   | `/messages` | Publishes the JSON body to the queue. Returns `202`, or `400` for an empty body. |
| GET    | `/health`   | Returns `{ "status": "ok" }`.                                        |

## Things to try

- **Queue buffering**: stop the consumer, POST a few messages, and watch them pile up under *Queues* in the management UI. Start the consumer again and it works through the backlog.
- **Load balancing**: run `npm run consumer` in two or more terminals. RabbitMQ hands messages out round-robin, and `prefetch(1)` makes sure a busy worker isn't given more than one message at a time.
- **Durability**: the queue is declared `durable` and messages are sent as `persistent`, so queued messages survive a RabbitMQ restart (`docker compose restart rabbitmq`).
- **Acknowledgements**: a message is removed from the queue only after the consumer calls `ack`. Kill a consumer mid-message and RabbitMQ redelivers it to another worker.

## Configuration

Set these environment variables to override the defaults:

| Variable       | Default                              |
| -------------- | ------------------------------------ |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672`  |
| `QUEUE_NAME`   | `tasks`                              |
| `PORT`         | `3000`                               |
