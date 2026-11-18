# 🤖 AI-Powered GitHub PR Reviewer

An asynchronous, event-driven backend service that automatically reviews GitHub Pull Requests using AI and posts structured, line-by-line inline feedback directly onto the code changes.

## 🏗 Architecture Overview

1. **Webhook Ingestion & Security (Express):** Listens for GitHub `pull_request` events (`opened` and `synchronize`). Verifies payload authenticity using HMAC SHA-256 and constant-time comparison (`crypto.timingSafeEqual`) before accepting the request.
2. **Asynchronous Queueing (Redis & BullMQ):** Immediately acknowledges GitHub with a `200 OK` response (preventing webhook timeouts) and pushes the event payload onto a persistent Redis job queue.
3. **Background Worker & Diff Extraction (Node.js & Axios):** A dedicated worker process pulls jobs from the queue, queries the GitHub REST API for file-by-file patches, and aggregates the code diffs.
4. **AI Code Analysis (Groq SDK):** Sends the unified diffs to an LLM with strict system prompts enforcing structured JSON output (`file`, `line`, `comment`).
5. **Inline Review Posting & Resilience:** Iterates over the AI findings and anchors inline comments directly onto the specific lines of code in the GitHub PR interface using fault-isolated requests.

---

## 🛠 Tech Stack

- **Runtime & Framework:** Node.js, Express
- **Queue & Message Broker:** BullMQ, Redis (`ioredis`)
- **AI Engine:** Groq SDK
- **HTTP Client & Tunneling:** Axios, ngrok

---

## 📋 Prerequisites

Before running the project locally, ensure you have the following installed:
- [Node.js & npm](https://nodejs.org/) (v18+ recommended)
- [ngrok](https://ngrok.com/) (for exposing your local server securely to GitHub webhooks)
- **Redis** (running locally on port `6379`)
- A **Groq API Key** and a **GitHub Fine-Grained Personal Access Token**

---

## ⚙️ Local Setup & Installation

### 1. Clone and Install Dependencies
```bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name
npm install express dotenv bullmq ioredis axios groq-sdk
npm install -D nodemon
```

### 2. Local Redis Setup (Windows via WSL2)
This project uses Redis and BullMQ for background job processing. If you are on Windows, set up Redis inside WSL2:

1. **Install WSL2 and Ubuntu** (run PowerShell as Administrator):
   ```powershell
   wsl --install -d Ubuntu
   ```
2. **Install and start Redis** inside your Ubuntu terminal:
   ```bash
   sudo apt update
   sudo apt install redis-server -y
   sudo service redis-server start
   ```
3. **Verify Redis is running:**
   ```bash
   redis-cli ping
   # Expected output: PONG
   ```

### 3. Generate a GitHub Personal Access Token
To fetch file diffs and post inline review comments, the worker needs scoped API access:
1. Go to GitHub **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Click **Generate new token**, name it (e.g., `ai-pr-reviewer-local`), and set an expiration.
3. Under **Repository access**, select **Only select repositories** and choose your target sandbox repository.
4. Under **Repository permissions**, configure:
   - **Pull requests:** `Read and write` *(Required—`Read-only` will allow fetching diffs, but posting inline review comments will fail)*
   - **Contents:** `Read-only` *(Required to read file structures)*
5. Generate and copy the token (starts with `github_pat_...`).

### 4. Configure Environment Variables
Create a `config.env` file in the root of your project and add the following:

```env
PORT=3000
GITHUB_WEBHOOK_SECRET=your_custom_webhook_secret
GITHUB_TOKEN=github_pat_your_generated_token_here
GROQ_API_KEY=gsk_your_groq_api_key_here
```

> **Important Note on `dotenv` Paths:** Because the worker runs from a nested folder (`src/workers/worker.js`), make sure your `dotenv` configuration at the very top of both `src/server.js` and `src/workers/worker.js` explicitly points to `config.env` in the root directory:
> ```javascript
> require('dotenv').config({ path: './config.env' });
> ```

---

## 🌐 Exposing Localhost with ngrok & Configuring GitHub Webhooks

### Why ngrok?
By default, router firewalls block unsolicited incoming traffic. Manually opening router ports (port forwarding) leaves your machine exposed if forgotten. **ngrok** creates a secure, temporary encrypted tunnel between a public HTTPS URL and your `localhost`—acting as a safe middleman that terminates the moment you stop the process (`Ctrl + C`).

### Step 1: Start ngrok
1. Sign in to your ngrok dashboard, copy your **Authtoken**, and link your CLI:
   ```bash
   ngrok config add-authtoken YOUR_COPIED_AUTHTOKEN
   ```
2. Start an HTTP tunnel pointing to your Express port (`3000`):
   ```bash
   ngrok http 3000
   ```
3. Copy the temporary `https://...ngrok-free.app` forwarding URL generated in your terminal.

### Step 2: Connect GitHub Webhook
1. Open your target GitHub repository and go to **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL:** Paste your ngrok URL followed by your webhook route (e.g., `https://your-id.ngrok-free.app/webhook`).
3. **Content type:** Select `application/json`.
4. **Secret:** Enter the exact same string you set for `GITHUB_WEBHOOK_SECRET` in your `config.env` file.
5. **Events:** Choose **Let me select individual events**, uncheck *Pushes*, and check **Pull requests**.
6. Click **Add webhook**.

---

## 🚀 Running the Application (4-Terminal Workflow)

To run the complete pipeline locally, keep these four terminals running side-by-side:

**Terminal 1 — WSL2 Ubuntu (Redis Server):**
```bash
sudo service redis-server start
redis-cli ping # Should return PONG
```

**Terminal 2 — Express Webhook Server:**
```bash
nodemon src/server.js
```

**Terminal 3 — BullMQ Background Worker:**
```bash
nodemon src/workers/worker.js
```

**Terminal 4 — ngrok Tunnel:**
```bash
ngrok http 3000
```

---

## 🧪 Testing End-to-End with a Sandbox Repository

To test your pipeline safely without cluttering a real codebase, create an empty test repository on GitHub (e.g., `webhook-sandbox`) and connect your webhook to it.

### 1. Initialize the Sandbox Repo (Windows PowerShell)
Create a local folder for your test repo and push an initial empty commit to `main` so your branches share a common commit history:
```powershell
mkdir webhook-sandbox
cd webhook-sandbox
git init
git branch -M main
git remote add origin [https://github.com/your-username/webhook-sandbox.git](https://github.com/your-username/webhook-sandbox.git)
git commit --allow-empty -m "Initial commit"
git push -u origin main
```

### 2. Create a Feature Branch with Intentional Bugs
Create a new branch from `main` and add a file containing intentional issues (such as a hardcoded secret and a division-by-zero bug):
```powershell
git checkout -b test-ai-review

Set-Content -Path "review-test.js" -Value @"
const apiKey = "gsk_fake_hardcoded_secret_token_9999"; // Intentional security flaw

function divideNumbers(a, b) {
  // Intentional missing check for division by zero
  return a / b;
}

module.exports = { divideNumbers };
"@

git add review-test.js
git commit -m "Add test file with intentional bugs for AI review"
git push -u origin test-ai-review
```

### 3. Open the Pull Request
1. Go to your `webhook-sandbox` repository on GitHub and click **Compare & pull request** → **Create pull request**.
2. Watch **Terminal 2** catch the webhook, **Terminal 3** process the diff via Groq, and refresh the **Files changed** tab on your Pull Request to see the inline AI review comments appear on your code.

---

## 🩺 Common Troubleshooting

- **`401 Bad credentials` in the Worker Terminal:**
  - Ensure your `config.env` file has no trailing spaces around `GITHUB_TOKEN`.
  - Verify that `require('dotenv').config({ path: './config.env' });` is on **Line 1** of `src/workers/worker.js` before any other `require` statements.
  - Note that `nodemon` watches `.js` files by default, not `.env` files—if you update `config.env`, manually restart the worker (`Ctrl + C`, then run `nodemon src/workers/worker.js` again).
- **GitHub shows *"There isn't anything to compare"* when creating a PR:**
  - This occurs if `main` and your feature branch were created without a shared ancestor commit (e.g., after deleting `.git`). Fix it by fetching `origin/main` first (`git fetch origin main && git checkout -b main origin/main`) and creating your feature branch from there.
- **PowerShell `rm -rf` parameter error:**
  - Windows PowerShell aliases `rm` to `Remove-Item`, which does not accept `-rf`. Use `Remove-Item -Recurse -Force <folder>` instead.

---

## 🔒 Security & Resilience Design Notes

- **Timing Attack Prevention (`crypto.timingSafeEqual`):** Standard string comparisons (`===`) exit early on the first mismatched character, leaking microsecond timing clues that attackers can exploit to brute-force HMAC signatures byte-by-byte. Using `crypto.timingSafeEqual` enforces constant-time comparison across the entire buffer regardless of where a mismatch occurs.
- **Fault-Isolated Inline Posting:** Each inline review comment is posted inside its own `try/catch` block. If the AI references a line number outside the active diff hunk (causing GitHub to return a `422 Unprocessable Entity`), the worker logs a warning and continues posting the remaining valid comments rather than crashing the job.
