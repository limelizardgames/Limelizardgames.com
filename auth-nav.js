import { supabase } from './supabase.js';

const holder = document.getElementById('authNav');

if (!holder) {
  console.warn('Lime Lizard auth nav: #authNav not found.');
} else {
  const loggedOutMarkup = holder.innerHTML;

  // Re-render whenever Supabase finishes an auth change.
  supabase.auth.onAuthStateChange(() => {
    refreshAuthNav();
  });

  // Safari/back-forward cache can restore an older copy of the header.
  window.addEventListener('pageshow', () => {
    refreshAuthNav();
  });

  // Refresh coins/account state when the player returns to this tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshAuthNav();
  });

  await refreshAuthNav();

  async function refreshAuthNav() {
    try {
      // getUser() verifies the current session with Supabase instead of relying
      // only on a possibly stale local copy.
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        holder.innerHTML = loggedOutMarkup;
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, display_name, lime_coins')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Lime Lizard profile lookup failed:', profileError);
      }

      const label =
        profile?.display_name ||
        profile?.username ||
        user.email?.split('@')[0] ||
        'Player';

      const username = profile?.username || '';
      const initial = label.trim().charAt(0).toUpperCase() || 'L';
      const coins = Number(profile?.lime_coins || 0).toLocaleString();

      holder.innerHTML = `
        <div class="logged-in-nav">
          <a class="lime-coin-pill" href="/profile/" aria-label="${coins} Lime Coins">
            <span class="lime-coin-dot"></span>
            <strong>${coins}</strong>
            <span class="lime-coin-label">Lime Coins</span>
          </a>

          <div class="player-chip" id="playerChip" role="button" tabindex="0"
               aria-expanded="false" aria-haspopup="menu">
            <span class="player-avatar">${escapeHtml(initial)}</span>
            <span class="player-name">${escapeHtml(label)}</span>
            <span class="player-chevron">▾</span>

            <div class="profile-menu" id="profileMenu" role="menu">
              <div class="profile-menu-head">
                <strong>${escapeHtml(label)}</strong>
                ${username ? `<span>@${escapeHtml(username)}</span>` : ''}
              </div>
              <a href="/profile/" role="menuitem">View Profile</a>
              <a href="/account/" role="menuitem">Account Settings</a>
              <div class="menu-sep"></div>
              <button class="signout" id="signOutButton" role="menuitem">Sign Out</button>
            </div>
          </div>
        </div>
      `;

      const chip = document.getElementById('playerChip');
      const menu = document.getElementById('profileMenu');

      const setOpen = open => {
        menu.classList.toggle('open', open);
        chip.setAttribute('aria-expanded', String(open));
      };

      chip.addEventListener('click', event => {
        if (event.target.closest('#profileMenu')) return;
        setOpen(!menu.classList.contains('open'));
      });

      chip.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(!menu.classList.contains('open'));
        }
        if (event.key === 'Escape') setOpen(false);
      });

      document.addEventListener(
        'click',
        event => {
          if (!chip.contains(event.target)) setOpen(false);
        },
        { once: true }
      );

      document.getElementById('signOutButton').addEventListener('click', async () => {
        await supabase.auth.signOut();
        holder.innerHTML = loggedOutMarkup;
        location.href = '/';
      });
    } catch (error) {
      console.error('Lime Lizard auth nav error:', error);
      holder.innerHTML = loggedOutMarkup;
    }
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}
