import assert from 'assert';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

let _connection: Redis;
let myQueue: Queue;

function getRedisConnection() {
  if (_connection) return _connection;

  assert(process.env.REDIS_USERNAME);
  assert(process.env.REDIS_PASSWORD);
  assert(process.env.REDIS_HOST);
  assert(process.env.REDIS_PORT);

  _connection = new Redis({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });

  return _connection;
}

async function initQueue() {
  const connection = getRedisConnection();

  const worker = new Worker(
    'foo',
    async job => {
      // Will print { foo: 'bar'} for the first job
      // and { qux: 'baz' } for the second.
      console.log(job.data);
    },
    { connection },
  );

  worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
  });

  const queueEvents = new QueueEvents("my-queue-name", { connection });

  queueEvents.on('waiting', ({ jobId }) => {
    console.log(`A job with ID ${jobId} is waiting`);
  });

  queueEvents.on('active', ({ jobId, prev }) => {
    console.log(`Job ${jobId} is now active; previous status was ${prev}`);
  });

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`${jobId} has completed and returned ${returnvalue}`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`${jobId} has failed with reason ${failedReason}`);
  });

  queueEvents.on('progress', ({ jobId, data }, timestamp) => {
    console.log(`${jobId} reported progress ${data} at ${timestamp}`);
  });

  myQueue = new Queue('foo', { connection });
  await myQueue.obliterate();
}

export async function addJobs() {
  if (!myQueue) {
    await initQueue();
  }
  await myQueue.add('myJobName', { foo: 'bar' });
  await myQueue.add('myJobName', { qux: 'baz' });
}
