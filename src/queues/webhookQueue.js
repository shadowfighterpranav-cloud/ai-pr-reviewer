const { Queue } = require("bullmq");
module.exports = new Queue("github-webhooks", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});
