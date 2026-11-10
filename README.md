# Curo Events: create your own life impact form

A one-page sign-up. People leave their name and email, and each sign-up becomes **a new row in a Google Sheet**. The same sheet can send the person a "how to get started" email and tell you about the sign-up, from your Google account. Free: no server, no database, no email service.

Separate from the Pastor Dami form; it lives on its own domain.

## Edit the words

- Page text: [src/config.ts](src/config.ts)
- The welcome email and email settings: the top of [google-sheet/Code.gs](google-sheet/Code.gs). After changing it in Apps Script, use Deploy → Manage deployments → edit → Version: New version.

## Connect the Google Sheet (once, about 5 minutes)

1. Create a new Google Sheet, for example "Curo sign-ups".
2. **Extensions → Apps Script.** Delete what's there, paste the whole of `google-sheet/Code.gs`, and save.
   - To be emailed about each sign-up, set `NOTIFY_TO` to your address.
   - To turn off the welcome email, set `SEND_WELCOME` to `false`.
3. In the function menu at the top, choose **setup** and press **Run**. Google asks for permission: choose your account → Advanced → "Go to … (unsafe)" → Allow. (It says "unsafe" only because you wrote the script yourself.) A "Sign-ups" tab with headings appears in the sheet.
4. **Deploy → New deployment.** Click the cog → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**

   Deploy, and copy the **Web app URL** (it ends in `/exec`). Open it in a browser: it should say "Curo sign-ups are connected."
5. Put that link in `.env.local` as `VITE_SHEET_URL=…` to test on your computer, and in Vercel (below).

## Try it on your computer

```bash
npm install
npm run dev
```

Without `VITE_SHEET_URL` it runs in **test mode**: nothing is sent, the sign-up is kept in your browser, and the thank-you message says so.

## Put it live (GitHub + Vercel)

1. Push this folder to a new GitHub repository.
2. In Vercel, "Add New Project" and import it. Vercel detects Vite; keep the defaults.
3. Vercel → Project → Settings → **Environment Variables**: add `VITE_SHEET_URL` with the web app link.
4. Redeploy (the link is built into the page), then add your domain under Settings → Domains.

## How it behaves

- Name and email are checked on the page, and again by the script.
- Each sign-up adds a row: time, name, email, the page they came from, and a note if that email signed up before (they don't get a second welcome email).
- Emails never block the row: if sending fails, the sign-up is still saved.
- A hidden field catches bots: they see "thank you" and nothing is saved.
- If the network drops, the page retries twice and keeps what was typed.
- Gmail allows about 100 emails a day from a personal account (more on Google Workspace).
