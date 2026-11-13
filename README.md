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
3. Under **Repository access**, select **Only select repositories** and choose your target repository.
4. Under **Repository permissions**, configure:
   * **Pull requests:** `Read and write` (required to fetch diffs and post inline review comments)
   * **Contents:** `Read-only` (required to read file structures)
5. Generate and copy the token.

### 4. Configure Environment Variables
Create a `.env` file in the root of your project and add the following:

```env
PORT=3000
GITHUB_WEBHOOK_SECRET=your_custom_webhook_secret
GITHUB_TOKEN=github_pat_your_generated_token_here
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## 🌐 Exposing Localhost with ngrok & Configuring GitHub Webhooks

### Why ngrok?
By default, router firewalls block unsolicited incoming traffic. Manually opening router ports (port forwarding) leaves your machine exposed if forgotten. **ngrok** creates a secure, temporary encrypted tunnel between a public HTTPS URL and your `localhost`—acting as a safe middleman that terminates the moment you stop the process (`Ctrl + C`).

### Step 1: Start ngrok
1. Sign in to your ngrok dashboard, copy your **Authtoken**, and link your CLI:
   ```bash
   ngrok config add-authtoken YOUR_COPIED_AUTHTOKEN
   ```
2. Start an HTTP tunnel pointing to your Express port (e.g., `3000`):
   ```bash
   ngrok http 3000
   ```
3. Copy the temporary `https://...ngrok-free.app` forwarding URL generated in your terminal.

### Step 2: Connect GitHub Webhook
1. Open your target GitHub repository and go to **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL:** Paste your ngrok URL followed by your webhook route (e.g., `https://your-id.ngrok-free.app/webhook`).
3. **Content type:** Select `application/json`.
4. **Secret:** Enter the exact same string you set for `GITHUB_WEBHOOK_SECRET` in your `.env` file.
5. **Events:** Choose **Let me select individual events**, uncheck *Pushes*, and check **Pull requests**.
6. Click **Add webhook**.

---

## 🚀 Running the Application

You need two terminal processes running alongside Redis:

**Terminal 1 — Start the Express Webhook Server:**
```bash
node src/server.js
```

**Terminal 2 — Start the BullMQ Background Worker:**
```bash
node src/workers/worker.js
```

Open a Pull Request (or push a new commit to an existing PR) in your connected repository to watch the worker process the diff and post inline review comments.

---

## 🔒 Security & Resilience Design Notes

* **Timing Attack Prevention (`crypto.timingSafeEqual`):** Standard string comparisons (`===`) exit early on the first mismatched character, leaking microsecond timing clues that attackers can exploit to brute-force HMAC signatures byte-by-byte. Using `crypto.timingSafeEqual` enforces constant-time comparison across the entire buffer regardless of where a mismatch occurs.
* **Fault-Isolated Inline Posting:** Each inline review comment is posted inside its own `try/catch` block. If the AI references a line number outside the active diff hunk (causing GitHub to return a `422 Unprocessable Entity`), the worker logs a warning and continues posting the remaining valid comments rather than crashing the job.
