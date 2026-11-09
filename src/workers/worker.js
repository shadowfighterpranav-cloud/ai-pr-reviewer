const { Worker } = require("bullmq");
const axios = require("axios");

const webhookWorker = new Worker(
  "github-webhooks",
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    const { action, repository, pull_request } = job.data;
    // We only care if PR req was opened or synchronized with new commits
    if (action !== "opened" && action !== "synchronize") {
      console.log(`Ignoring action: ${action}`);
      return;
    }
    try {
      const owner = repository.owner.login; // e.g. 'shadowfighterpranav-cloud'
      const repo = repository.name; // e.g. 'Webhook-sandbox'
      const prNumber = pull_request.number; // e.g. 42
      console.log(`Fetching PR diff for ${owner}/${repo}#${prNumber}`);
      const fileResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      for (const file of fileResponse.data) {
        console.log(`-- File: ${file.filename} (${file.status}) ---`);
        if (file.patch) {
          console.log(file.patch);
        } else {
          console.log(
            "(No patch available for this file, possibly a binary file or too large)",
          );
        }
      }
      // TODO: Send this 'prDiff' to your AI model for review and get the response
    } catch (error) {
      console.error(
        `Error fetching PR diff from GitHub:`,
        error.response ? error.response.data : error.message,
      );
      throw error; // Rethrow the error to let BullMQ handle retries if needed
    }
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  },
);

webhookWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has been completed`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} has failed with error: ${err.message}`);
});

console.log("Webhook worker is running and listening for jobs...");
