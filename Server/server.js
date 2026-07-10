require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startNotificationRetryJob } = require("./jobs/notificationRetry");
const { startReminderSweepJob } = require("./jobs/reminderSweep");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startNotificationRetryJob();
  startReminderSweepJob();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
