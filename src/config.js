module.exports = {
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  QUEUE_NAME: process.env.QUEUE_NAME || 'tasks',
  PORT: Number(process.env.PORT) || 3000,
};
