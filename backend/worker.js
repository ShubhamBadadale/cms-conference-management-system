require('dotenv').config();

const cron = require('node-cron');
const { runBootstrap } = require('./config/bootstrap');
const { processEmailQueue } = require('./services/emailQueueService');

const schedule = process.env.EMAIL_CRON_SCHEDULE || '*/2 * * * *';
let running = false;

const runJob = async () => {
  if (running) {
    return;
  }

  running = true;

  try {
    const summary = await processEmailQueue();
    if (summary.claimed > 0) {
      console.log(
        `Email worker processed ${summary.claimed} queue item(s): ${summary.sent} sent, ${summary.failed} failed`
      );
    }
  } catch (error) {
    console.error('Email worker failed:', error.message);
  } finally {
    running = false;
  }
};

const startWorker = async () => {
  await runBootstrap();
  console.log(`Email worker started with schedule "${schedule}"`);
  cron.schedule(schedule, runJob);
  await runJob();
};

startWorker();
