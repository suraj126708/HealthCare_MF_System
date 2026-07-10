const cron = require('node-cron');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

function startNotificationRetryJob() {
  // every 5 min
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const toRetry = await Notification.find({
      status: 'failed',
      attempts: { $lt: 5 },
      nextRetryAt: { $lte: now },
    }).limit(25);

    for (const n of toRetry) {
      await notificationService.retryOne(n);
    }
  });
}

module.exports = { startNotificationRetryJob };

