const { Worker } = require("bullmq");
const axios = require("axios");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      let codeChangesSummary = "";
      for (const file of fileResponse.data) {
        console.log(`-- File: ${file.filename} (${file.status}) ---`);
        if (file.patch) {
          codeChangesSummary += `\n### File: ${file.filename} (${file.status})\n \`\`\`diff\n${file.patch}\n\`\`\`\n`;
        }
      }
      if (!codeChangesSummary) {
        console.log("No code changes found in the PR.");
        return;
      }
      console.log(
        "Sending the following code changes summary to the AI model for review:",
      );
      const aiResponse = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `You are an expert senior software engineer. Review the following code changes provided by the user and provide a detailed review, including potential issues, bugs, improvements, and best practices. Give the response back STRICTLY as a valid JSON array of objects. Do not respond with an filler or introductory text, code explanations or any markdown code fences like \`\`\`json. Just give back the valid JSON response. Strictly use the following format given below for the JSON response.
            JSON response format:
            [
              {
                "file": "filename" (e.g., "path/to/file.js"),
                "line": line_number (e.g., 42), 
                "comment" : "Your review comment here"
              }
            ]            
            `,
          },
          {
            role: "user",
            content: codeChangesSummary,
          },
        ],
      });
      const rawAiFeedback = aiResponse.choices[0].message.content;
      const cleanedJson = rawAiFeedback
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const aiFeedbackArray = JSON.parse(cleanedJson);
      let formattedComment = "AI code review feedback:\n\n";
      for (const feedback of aiFeedbackArray) {
        formattedComment += `File: ${feedback.file}, Line: ${feedback.line}\nComment: ${feedback.comment}\n\n`;
      }
      console.log(
        `AI code review generated successfully. Sending feedback back to GitHub for PR #${prNumber}...`,
      );
      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        {
          body: formattedComment,
        },
        {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      console.log(`Feedback posted successfully to PR #${prNumber}.`);
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
