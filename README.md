# RezAI — AI Property Operations Copilot

Portfolio project for AI-assisted short-term rental operations.

Built with Next.js and designed for OwnerRez integration. Public demos use synthetic data; real credentials belong only in server-side environment variables.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `ynagonzalesss/rezai`.
2. Keep the defaults (Framework: Next.js, build command `next build`) and click **Deploy**.
3. With no environment variables set, the app runs in **demo mode** with synthetic data, which is safe to share publicly.

### Optional: live OwnerRez data

Add these under **Project → Settings → Environment Variables**, then redeploy:

| Variable | Value |
|---|---|
| `OWNERREZ_ACCESS_TOKEN` | Personal access token (`pt_…`) or OAuth token (`at_…`) |
| `OWNERREZ_EMAIL` | OwnerRez login email (required with a `pt_` token) |
| `OWNERREZ_CLIENT_ID` | OAuth client id (only with an `at_` token) |
| `REZAI_ACCESS_KEY` | A long random team key. Required for live data |

Live data (guest names, arrivals) is only returned when the viewer enters the team key in the page header. Without `REZAI_ACCESS_KEY`, everyone sees demo data even if a token is set.

Notes:
- OwnerRez personal access tokens use Basic auth (email + token) and are limited to two OwnerRez accounts per IP address per day. For a multi-account or production setup, use an OAuth app.
- Vercel's free Hobby plan is for personal, non-commercial projects. Use a Pro plan for business use with live client data.
