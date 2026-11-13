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

* **Runtime & Framework:** Node.js, Express
* **Queue & Message Broker:** BullMQ, Redis (`ioredis`)
* **AI Engine:** Groq SDK
* **HTTP Client & Tunneling:** Axios, ngrok

---

## 📋 Prerequisites

Before running the project locally, ensure you have the following installed:
* [Node.js & npm](https://nodejs.org/) (v18+ recommended)
* [ngrok](https://ngrok.com/) (for exposing your local server securely to GitHub webhooks)
* **Redis** (running locally on port `6379`)
* A **Groq API Key** and a **GitHub Fine-Grained Personal Access Token**

---

## ⚙️ Local Setup & Installation

### 1. Clone and Install Dependencies
```bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name
npm install express dotenv bullmq ioredis axios groq-sdk
