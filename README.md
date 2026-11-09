download and install npm
download and install ngrok
sign in to ngrok and copy the Authtoken
now in terminal- ngrok config add-authtoken YOUR_COPIED_AUTHTOKEN
this creates a tunnel between your localhost and ngrok
then type in terminal- ngrok http PORT_NUMBER(3000)
A live connection will start and You will get a temporary ngrok link

ngrok is essentially a service that allows you to accept external requests securely. Normally your router firewall only accepts an external response only if you have sent it a request prior. You can bypass this manually by changing this setting. This is called port tunneling. But it is not secure to keep your ports directly open to the external world. Something catastrophic could happen if you forget to turn the port forwarding off after you finish testing it out. Then it is essesntially exposed for the entire day. Ngrok helps us avoiding this by creating a tunnel between ngroks server link and our localhost. so basically it acts like a middleman where we the github webhook sends requests to the ngrok server then ngrok forwards it to us. Then we send a response to ngrok and it forwards it to github. The tunnel is terminated once you do ctrl+c. When the connections active you can access the website from anywhere.

now in terminal- npm i express dotenv

To use this we will specify in readme to the client the steps to follow to set up our ngrok link in github webhook. Github sends requests to this ngrok url when pull request happens in that particular project.
the secret on the webhook setting in github must match the one you set in vs code

Normally, when programmers want to compare two strings in JavaScript, they just use a standard operator like:

JavaScript
if (signature === digest) // Don't do this for security tokens!
To a computer, a standard === comparison checks strings from left to right and stops immediately at the very first character that doesn't match:

If the first letter is wrong, it bails out in 0.1 milliseconds.

If 50 characters match before failing, it takes 0.5 milliseconds because it had to check further.
Why is that dangerous?
Clever hackers can exploit those tiny fractions of a millisecond. By sending thousands of fake signatures and measuring how long your server takes to reply, they can figure out how many characters they got right. If a request takes slightly longer, they know character #1 was correct, so they lock it in and guess character #2. This is called a Timing Attack.

How crypto.timingSafeEqual stops it:
This function forces your CPU to compare every single byte, start to finish, taking the exact same amount of time regardless of whether the signature is completely wrong or almost right. It strips away any timing clues, making side-channel timing attacks impossible.

## Local Development Setup: Redis (via WSL2)

This project uses **Redis** and **BullMQ** for asynchronous background job processing. Follow these steps to set up a local Redis instance on Windows using WSL2.

### 1. Install WSL2 and Ubuntu (if not already installed)

Open **PowerShell as Administrator** and run:

```powershell
wsl --install -d Ubuntu
(Restart your computer if prompted, then complete the Ubuntu username/password setup when the terminal launches).

2. Install Redis Server
Open your Ubuntu terminal and run the following commands:

Bash
# Update package lists
sudo apt update

# Install Redis server
sudo apt install redis-server -y
3. Start the Redis Service
Bash
sudo service redis-server start

Redis is now running on port 6379

4. Verify the Installation
Test that Redis is running locally by using the Redis CLI:

Bash
redis-cli ping
If configured correctly, it will reply with:

Plaintext
PONG
```

npm install bullmq ioredis
bullmq: Manages your job states, retries, and queues.

ioredis: The robust Redis client that BullMQ uses under the hood to talk to your local Redis instance at 127.0.0.1:6379.

The Requirement: To fetch file diffs and later post review comments, your backend needs permission to talk to GitHub's API on your behalf.

Action:

Go to your GitHub account settings
→ Developer settings
→ Personal access tokens
→ Fine-grained tokens.

1. Basic Settings (First Image)
   Token name: Give it a clear, descriptive name (e.g., ai-pr-reviewer-local).

Description: Briefly note its purpose (e.g., "Used by background worker to fetch PR diffs for AI analysis").

Expiration: 30 days is fine for local testing, though you can extend it if you prefer.

2. Repository Access & Permissions (Second Image)
   Because your background worker needs to read the contents of the pull request and eventually post an AI comment back to the PR, choose these options:

Repository Access:

Choose "Only select repositories" (best practice for security rather than giving access to all your repos).

Select your specific test repository (e.g., pranav/my-test-repo) from the dropdown that appears.

Permissions: Click on "Repository permissions" (or look for the permissions section below) and grant these two minimal permissions:

Pull requests: Set to Read and write (Read so you can fetch the diff/files, Write so your AI reviewer can eventually post code review comments back to the PR).

Contents: Set to Read-only (Allows fetching repository files if your AI needs to inspect file trees).

Copy the token and add it to your .env file as GITHUB_TOKEN=your_token_here.

npm i axios (for sending request to github api to get the code diff once a job arrives)
