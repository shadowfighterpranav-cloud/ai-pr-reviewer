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
