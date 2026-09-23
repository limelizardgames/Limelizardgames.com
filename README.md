# Lime Lizard Games — Google + Facebook login UI

Upload/replace:
- `login/index.html`
- `login/login.js`
- `signup/index.html`
- `signup/signup.js`

Then paste the contents of `ADD_TO_portal.css` at the very bottom of your existing `portal.css`.

## Required Supabase setup
The buttons will only work after the providers are enabled in Supabase:
- Authentication → Providers → Google
- Authentication → Providers → Facebook

Both OAuth apps should use this Supabase callback URL:
https://htmqmjppljniwqwyjnwc.supabase.co/auth/v1/callback

Your production redirect allow list should include:
https://limelizardgames.com/**

## What happens
- Existing users can use Google/Facebook from the Sign In page.
- New users can use Google/Facebook from the Create Account page.
- After successful OAuth, users are sent to `/profile/`.
- First-time social users get the normal database trigger: Level 1, 100 Lime Coins, profile row, and Texas 42 stats row.
- Social users can set/change their Lime Lizard username in `/account/`.

Facebook will fail until the Meta app/provider is configured, which is expected.
