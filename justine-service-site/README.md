# Webbins: Website Developer Service

Glass-style website with the **Webbins** brand, customer and owner accounts (Firebase), a private chat,
a customer dashboard, an owner dashboard, ratings and feedback, and a Wise QR payment page.
Built with plain JavaScript + Vite + Firebase (Auth + Firestore).

## How it works

| Who | What they see |
| --- | --- |
| Visitor | Home page: Webbins brand, "Website Developer Service", **Get started**, **Log in / Sign up** (top right) |
| Customer | After sign up (nickname + searchable country list) they get a **Menu** button and pages: dashboard, who I am, skills, works, rates and ratings, satisfied customers and feedback, background and career, payment (Wise QR). A big chat is on their dashboard and a chat button follows them on every page. |
| Owner | **Owner dashboard**: all customers, **Local (Philippines)** vs **International**, and separate lists for **Inquiries**, **Ongoing work**, **Paid** and **Handled**. Open a customer to chat, change their status, and press **Allow feedback** so they can review you. |

Owner and customer accounts are told apart through Firebase: the owner is the account whose **verified email** equals the
owner email. Firestore rules enforce it, so customers cannot give themselves owner powers, change their status, or allow their own feedback.

## 1. Run it in GitHub Codespaces

1. Upload this folder to a GitHub repository, then **Code → Codespaces → Create codespace**.
2. It runs `npm install` and `npm run dev`. If not, run them in the terminal.
3. Open port **5173** from the **Ports** tab.

## 2. Firebase setup (project `my-website-6f396`)

1. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
2. **Firestore Database → Create database**.
3. **Firestore Database → Rules**: paste `firestore.rules`, then **Publish**.
   **This version has new rules. Publish them again even if you did before.**
4. **Authentication → Settings → Authorized domains**: add your Codespaces address without `https://`,
   for example `your-codespace-5173.app.github.dev`.

## 3. Make yourself the owner

1. Put your email (lowercase) in **two places**: `OWNER.email` in `src/config.js` and `ownerEmail()` in `firestore.rules`.
2. Sign up with that email, or use **Continue with Google**.
3. Email sign-up: click the verification link Firebase emails you, then press **I verified** on the banner.

Test accounts made with the older version of this site are asked for a nickname and country the next time they log in.

## 4. Where to put your images

Put files in `public/images/`. Until a file exists, the website shows a dashed box that says
**"Put your image here"** with the exact file path.

| File | Shown on |
| --- | --- |
| `profile.jpg` | Who I am page, chat avatar (square photo of you) |
| `background.jpg` | Background and career page (about your story, 16:9) |
| `career.jpg` | Background and career page (you working, 16:9) |
| `wise-qr.png` | Payment page (your Wise QR code, square) |
| `work-1.jpg` ... `work-6.jpg` | My works (project screenshots, about 1600x1000) |

To change a name or file, edit `IMAGES` and `WORKS` in `src/config.js`.

## 5. Make it yours

Everything on the pages is in **`src/config.js`**: your name, bio, skills, prices (`RATES`), background, career,
Wise details (`WISE`), project list and contact links. The prices, numbers and timeline are samples. Replace them.

## Data in Firestore

```
users/{uid}                  nickname, country, countryCode, email, status, feedbackAllowed, last message, unread counts
users/{uid}/messages/{id}    text, sender ("customer" | "owner"), createdAt
feedback/{uid}               nickname, country, rating (1-5), text, createdAt
```

`status` is one of `inquiry`, `ongoing`, `paid`, `completed` (shown as "Handled"). Only the owner can change it.

## Deploy later (optional)

```bash
npm run build
```
Upload `dist/` to Firebase Hosting, Netlify or Vercel, and add that domain to Firebase Authorized domains.
