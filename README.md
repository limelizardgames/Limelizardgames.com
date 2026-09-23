# Main-page login + Lime Coin display fix

Replace the existing `auth-nav.js` in the repository root with the file in this package.

Then copy the contents of `ADD_TO_account-ui.css` and paste them at the END of
your existing `account-ui.css`.

Why this fixes the issue:
- Re-checks the Supabase user when the main page loads.
- Handles Safari's back/forward cache via the `pageshow` event.
- Refreshes account/coin state when the browser tab becomes active again.
- Listens for Supabase auth state changes.
- Uses `getUser()` to verify the current session.
- Shows the Lime Coin balance directly in the main navigation.
