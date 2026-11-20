# SnagSnap

New-build snagging for one building contractor, their team and their home owners.

- **Home owners** photograph defects; AI writes each one up; they send the list, accept quotes item by item, pay, track fixes and confirm them.
- **The contractor** gets reports, sends quotes, assigns work by trade, takes deposits and balances and sends reminders.
- **Team members** see their jobs, post progress with photos and mark jobs fixed.

Built with Next.js 16, React 19, Tailwind CSS 4 and zustand. Live data is stored in Postgres.

## Two modes

| | Demo (`NEXT_PUBLIC_APP_MODE=demo`) | Live (`NEXT_PUBLIC_APP_MODE=live`) |
|---|---|---|
| Data | Sample data in each visitor's browser | Postgres (`DATABASE_URL`) |
| Sign-in | Pick any account from a dropdown | Emailed sign-in link, 30-day session |
| Emails | Shown in the demo inbox | Saved in the inbox, and sent through Resend when `RESEND_API_KEY` is set |
| Photo AI | Claude if a key is set, otherwise the demo AI | Same |

## Run on your computer

```bash
npm install
cp .env.example .env.local   # then edit
npm run dev
```

## Deploy live on Vercel

1. Import this GitHub repository in Vercel.
2. In the project, open **Storage** and connect a **Postgres (Neon)** database. This adds `DATABASE_URL`.
3. Under **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_APP_MODE` = `live`
   - `AUTH_SECRET` = a long random string (`openssl rand -base64 48`)
   - `SETUP_KEY` = any secret phrase
   - optional: `RESEND_API_KEY` and `EMAIL_FROM` for real emails, `ANTHROPIC_API_KEY` for real Claude photo analysis
4. Redeploy, then open **`/setup`** on your site. Enter your company, name and email and the `SETUP_KEY` to create the admin account.
5. Invite home owners from the dashboard, or share **`/phone`** so new owners can add their own home.

The database tables are created automatically on first use.

## How live mode works

- `src/lib/data/core.ts` holds every action (send quote, confirm fix…). The browser runs an action first so the screen updates instantly. The server then runs the same action on the database (`/api/action`).
- The server checks the signed-in role may run that action, and that it only changed records that person is allowed to change (`src/lib/server/scope.ts`).
- Each person only receives their own slice of the data: an owner sees their own home only, a team member their own jobs.
- Photos are stored in the `photos` table and served to people allowed to see that home.
