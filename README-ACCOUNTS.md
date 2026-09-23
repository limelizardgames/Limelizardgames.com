# Lime Lizard Games — Account System Update

This package is built against the current `limelizardgames/Limelizardgames.com` repository structure.

## New pages
- `/login/`
- `/signup/`
- `/profile/`
- `/account/`

## New shared files
- `supabase.js`
- `auth-nav.js`
- `account-ui.css`
- `portal.css`

## Existing files changed
- `index.html` adds Sign In / Create Account and logged-in player UI.
- Existing `styles.css` and `script.js` remain compatible.

## Before deploying
1. In Supabase SQL Editor, run `SUPABASE_FINAL_PATCH.sql`.
2. In Supabase Authentication → URL Configuration:
   - Site URL: `https://limelizardgames.com`
   - Redirect allow list: `https://limelizardgames.com/**`
3. Ensure Email authentication is enabled.
4. Upload/commit these files to the repository root, preserving folders.
5. Test signup with a new email address.
6. Confirm the email if confirmation is enabled.
7. Verify `/profile/` loads Level 1 and 100 Lime Coins.

## Notes
The Supabase publishable key is intentionally present in browser JavaScript. It is not a secret. RLS and database grants are what protect player data.

Texas 42 is not wired yet. The profile page is ready to read `texas42_stats` when the game begins writing trusted match results.
