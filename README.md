# FindIt — School Lost and Found Management System

A lost-and-found web app for students of Pamantasan ng Cabuyao.
CPP123 Emerging Technology individual final project by **Manaig, Rheynalyn M. (2CPE-B)**.

**Live site:** https://manaigrheynalyn91.github.io/findit/

## Features
- Student registration, login, and logout, with "Forgot password?" email reset
- Post lost or found reports (item name, category, description, location, date, type), with an optional photo that is resized and stripped of location data in the browser
- "Possible matches" on the dashboard: found reports in the same category posted around the time you lost something
- Search with category, location, status, and lost/found filters
- Edit, delete, resolve, and reopen your own reports
- Student dashboard and My Reports page
- Reports sync across devices for the same account
- Responsive layout for phones, tablets, and desktops
- Privacy Policy page

## Technology
- HTML, CSS, and JavaScript (no build step)
- [Supabase](https://supabase.com): Postgres database and authentication, with row-level security
- [supabase-js v2](https://github.com/supabase/supabase-js) loaded from jsDelivr
- Hosted on GitHub Pages
- Built with help from Claude (AI assistant)

## Security model
Every table uses row-level security (see `supabase/schema.sql`):
- Anyone can browse reports. They hold no personal data.
- Only signed-in students can create reports, and only as themselves.
- Only a report's owner can edit, resolve, reopen, or delete it. A database trigger also stops anyone from changing a report's owner.
- Reporter names and contact notes are visible only to signed-in students. Email addresses are never shown.

`supabase/rls-selftest.sql` runs 26 allowed and forbidden actions as two test students and as a logged-out visitor, then rolls everything back.
The latest results are in `supabase/rls-selftest-results.txt`.

The Supabase key in `js/config.js` is the **publishable** key. It is meant to be public, and it can only do what the security rules allow.

## Run locally
```
python -m http.server 5173
```
Then open http://127.0.0.1:5173/

## Set up a new Supabase project
1. Run `supabase/schema.sql`, then `supabase/migration-002-photos.sql`, in the Supabase SQL Editor.
2. Go to Authentication → Sign In / Providers → Email and turn off **Confirm email**, or set up your own SMTP.
3. Go to Authentication → URL Configuration. Set **Site URL** to the live site's address, and add `<live site>/**` under Redirect URLs (needed for password reset links).
4. Put your project URL and publishable key in `js/config.js`, and the project URL in each page's `Content-Security-Policy` meta tag.

## Known limitation
Supabase's built-in email service only sends to the project team's own addresses and only a few emails per hour. Password reset emails will reach other students only after a custom SMTP provider is added (Authentication → Emails → SMTP Settings).
