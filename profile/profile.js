import { supabase } from '/supabase.js';

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  location.replace('/login/');
} else {
  await loadProfile(session.user.id);
}

let catalogMap = new Map();
let inventoryRows = [];
let entitlementRows = [];
let equippedMap = new Map();
let activeInventoryTab = 'all';

async function loadProfile(uid) {
  const [
    { data: profile, error: pErr },
    { data: stats },
    { data: badges },
    { data: earned },
    { data: inventory },
    { data: catalog },
    { data: entitlements },
    { data: equipped }
  ] = await Promise.all([
    supabase.from('profiles')
      .select('username,display_name,level,xp,lime_coins,created_at')
      .eq('id', uid).single(),

    supabase.from('texas42_stats')
      .select('*')
      .eq('user_id', uid).maybeSingle(),

    supabase.from('badges')
      .select('id,slug,name,description,rarity')
      .order('created_at'),

    supabase.from('user_badges')
      .select('badge_id')
      .eq('user_id', uid),

    supabase.from('user_inventory')
      .select('item_slug,source,acquired_at')
      .eq('user_id', uid)
      .order('acquired_at', { ascending: false }),

    supabase.from('store_items')
      .select('slug,game_slug,name,description,item_type,coin_cost')
      .eq('active', true),

    supabase.from('user_entitlements')
      .select('entitlement_slug,source,acquired_at')
      .eq('user_id', uid)
      .order('acquired_at', { ascending: false }),

    supabase.from('user_equipped_cosmetics')
      .select('slot,cosmetic_slug,source')
      .eq('user_id', uid)
  ]);

  if (pErr) {
    document.getElementById('loading').textContent = 'Could not load profile.';
    throw pErr;
  }

  catalogMap = new Map((catalog || []).map(item => [item.slug, item]));
  inventoryRows = inventory || [];
  entitlementRows = entitlements || [];
  equippedMap = new Map((equipped || []).map(row => [row.slot, row]));

  fillProfile(profile, stats, badges || [], earned || []);
  renderInventory();
  renderEntitlements();
  renderEquipped();
  applyProfileCosmetics();

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('profileContent').classList.remove('hidden');
}

function fillProfile(p, s, badges, earned) {
  const earnedIds = new Set(earned.map(x => x.badge_id));
  const name = p.display_name || p.username || 'Player';
  const level = Number(p.level || 1);
  const xp = Number(p.xp || 0);
  const coins = Number(p.lime_coins || 0);

  set('displayName', name);
  set('username', p.username ? `@${p.username}` : 'Username not set');
  set('level', level);
  set('xp', xp.toLocaleString());
  set('coins', `● ${coins.toLocaleString()}`);
  set('avatar', name.charAt(0).toUpperCase());

  const next = level * 250;
  const levelBase = Math.max(0, (level - 1) * 250);
  const into = Math.max(0, xp - levelBase);
  const need = Math.max(1, next - levelBase);
  const pct = Math.min(100, (into / need) * 100);

  set('xpProgressLabel', `${into.toLocaleString()} / ${need.toLocaleString()} XP`);
  document.getElementById('xpFill').style.width = `${pct}%`;

  const gp = Number(s?.games_played || 0);
  const wins = Number(s?.wins || 0);

  set('gamesPlayed', gp);
  set('wins', wins);
  set('losses', Number(s?.losses || 0));
  set('winRate', gp ? `${((wins / gp) * 100).toFixed(1)}%` : '—');
  set('currentStreak', Number(s?.current_win_streak || 0));
  set('bestStreak', Number(s?.best_win_streak || 0));

  document.getElementById('badgeGrid').innerHTML =
    badges.map(b => {
      const unlocked = earnedIds.has(b.id);
      return `
        <div class="badge ${unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon">${icon(b.slug)}</div>
          <strong>${esc(b.name)}</strong>
          <span>${unlocked ? `${esc(b.rarity)} · Unlocked` : 'Locked'}</span>
        </div>`;
    }).join('') || '<div class="loading">No badges yet.</div>';
}

function renderInventory() {
  const grid = document.getElementById('inventoryGrid');

  const items = inventoryRows
    .map(row => ({ ...row, item: catalogMap.get(row.item_slug) }))
    .filter(row => row.item)
    .filter(row => activeInventoryTab === 'all' || row.item.game_slug === activeInventoryTab || (activeInventoryTab === 'profile' && row.item.game_slug === 'platform'));

  if (!items.length) {
    grid.innerHTML = `
      <div class="inventory-empty">
        <strong>No items here yet.</strong>
        <span>Pick up cosmetics in the Lime Lizard Store.</span>
        <a href="/store/">Open Store</a>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(row => {
    const item = row.item;
    const slot = slotFor(item);
    const equipped = slot && equippedMap.get(slot)?.cosmetic_slug === item.slug;

    return `
      <article class="inventory-card">
        <div class="inventory-art ${artClass(item)}">${artIcon(item)}</div>
        <div class="inventory-card-body">
          <span class="inventory-type">${labelForType(item.item_type)}</span>
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.description || '')}</p>
          ${slot ? `
            <button
              class="inventory-equip ${equipped ? 'equipped' : ''}"
              data-slug="${esc(item.slug)}"
              data-source="inventory"
              ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Equipped ✓' : 'Equip'}
            </button>` : ''}
        </div>
      </article>`;
  }).join('');

  wireEquipButtons();
}

function renderEntitlements() {
  const grid = document.getElementById('entitlementGrid');

  if (!entitlementRows.length) {
    grid.innerHTML = '<div class="inventory-empty"><strong>No special rewards yet.</strong><span>Founder and promotional rewards will appear here.</span></div>';
    return;
  }

  grid.innerHTML = entitlementRows.map(row => {
    const info = entitlementInfo(row.entitlement_slug);
    const canEquip = row.entitlement_slug === 'founder-profile-frame';
    const equipped = equippedMap.get('profile-frame')?.cosmetic_slug === row.entitlement_slug;

    return `
      <article class="inventory-card entitlement-card">
        <div class="inventory-art entitlement-art">${info.icon}</div>
        <div class="inventory-card-body">
          <span class="inventory-type">ACCOUNT REWARD</span>
          <h3>${info.name}</h3>
          <p>${info.description}</p>
          ${canEquip ? `
            <button
              class="inventory-equip ${equipped ? 'equipped' : ''}"
              data-slug="${esc(row.entitlement_slug)}"
              data-source="entitlement"
              ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Equipped ✓' : 'Equip'}
            </button>` : `
            <span class="reward-owned">Owned ✓</span>`}
        </div>
      </article>`;
  }).join('');

  wireEquipButtons();
}

function renderEquipped() {
  const holder = document.getElementById('texas42Equipped');

  const slots = [
    ['texas42-table-theme', 'Table Theme'],
    ['texas42-domino-set', 'Domino Set'],
    ['texas42-victory-effect', 'Victory Effect']
  ];

  holder.innerHTML = slots.map(([slot, label]) => {
    const row = equippedMap.get(slot);
    const item = row ? catalogMap.get(row.cosmetic_slug) : null;

    return `
      <div class="equipped-item">
        <span>${label}</span>
        <strong>${item ? esc(item.name) : 'Default'}</strong>
      </div>`;
  }).join('');
}

function applyProfileCosmetics() {
  const avatar = document.getElementById('avatar');
  const frameLabel = document.getElementById('frameLabel');
  const title = document.getElementById('profileTitle');

  avatar.classList.remove('founder-frame', 'lime-circuit-frame');
  frameLabel.classList.add('hidden');
  title.classList.add('hidden');

  const frame = equippedMap.get('profile-frame');
  if (frame?.cosmetic_slug === 'founder-profile-frame') {
    avatar.classList.add('founder-frame');
    frameLabel.textContent = 'FOUNDER';
    frameLabel.classList.remove('hidden');
  } else if (frame?.cosmetic_slug === 'profile-lime-circuit') {
    avatar.classList.add('lime-circuit-frame');
    frameLabel.textContent = 'LIME CIRCUIT';
    frameLabel.classList.remove('hidden');
  }

  const profileTitle = equippedMap.get('profile-title');
  if (profileTitle?.cosmetic_slug === 'profile-lizard-elite') {
    title.textContent = 'LIZARD ELITE';
    title.classList.remove('hidden');
  }
}

function wireEquipButtons() {
  document.querySelectorAll('.inventory-equip:not([data-wired])').forEach(button => {
    button.dataset.wired = '1';

    button.addEventListener('click', async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Equipping…';

      const { data, error } = await supabase.rpc('equip_cosmetic', {
        p_cosmetic_slug: button.dataset.slug,
        p_source: button.dataset.source
      });

      if (error) {
        button.disabled = false;
        button.textContent = original;
        showToast(error.message, true);
        return;
      }

      equippedMap.set(data.slot, {
        slot: data.slot,
        cosmetic_slug: data.cosmetic_slug,
        source: data.source
      });

      renderInventory();
      renderEntitlements();
      renderEquipped();
      applyProfileCosmetics();
      showToast('Cosmetic equipped.');
    });
  });
}

document.querySelectorAll('.inventory-tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.inventory-tab').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    activeInventoryTab = button.dataset.inventoryTab;
    renderInventory();
  });
});

function slotFor(item) {
  if (item.item_type === 'profile_frame') return 'profile-frame';
  if (item.item_type === 'profile_title') return 'profile-title';
  if (item.item_type === 'table_theme' && item.game_slug === 'texas-42') return 'texas42-table-theme';
  if (item.item_type === 'domino_set' && item.game_slug === 'texas-42') return 'texas42-domino-set';
  if (item.item_type === 'victory_effect' && item.game_slug === 'texas-42') return 'texas42-victory-effect';
  return null;
}

function entitlementInfo(slug) {
  const map = {
    'founding-player-pack': {
      name: 'Founding Player Pack',
      description: 'Permanent proof that you supported Lime Lizard Games from the beginning.',
      icon: '🦎'
    },
    'founder-profile-frame': {
      name: 'Founder Profile Frame',
      description: 'Exclusive profile frame available to Founding Players.',
      icon: '◈'
    },
    'founder-early-access': {
      name: 'Founder Early Access',
      description: 'Eligibility for selected early-access Lime Lizard features.',
      icon: '⚡'
    }
  };
  return map[slug] || {
    name: slug.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: 'Special Lime Lizard account reward.',
    icon: '★'
  };
}

function labelForType(type) {
  return ({
    table_theme: 'TABLE THEME',
    domino_set: 'DOMINO SET',
    victory_effect: 'VICTORY EFFECT',
    profile_frame: 'PROFILE FRAME',
    profile_title: 'PROFILE TITLE'
  })[type] || 'COSMETIC';
}

function artClass(item) {
  if (item.slug === 'profile-lime-circuit') return 'profile-circuit-art';
  if (item.slug === 'profile-lizard-elite') return 'profile-title-art';
  if (item.item_type === 'table_theme') return 'table-art';
  if (item.item_type === 'domino_set') return 'domino-art';
  if (item.item_type === 'victory_effect') return 'victory-art';
  return '';
}

function artIcon(item) {
  if (item.item_type === 'table_theme') return '▦';
  if (item.item_type === 'domino_set') return '⚄';
  if (item.item_type === 'victory_effect') return '✦';
  if (item.item_type === 'profile_frame') return '◉';
  if (item.item_type === 'profile_title') return '★';
  return '◆';
}

function icon(slug) {
  return slug === 'founding-player' ? '🦎'
    : slug === 'first-win' ? '🏆'
    : slug === '42-wins' ? '4️⃣2️⃣'
    : slug === 'hot-streak' ? '🔥'
    : '🎖️';
}

function showToast(message, isError = false) {
  const toast = document.getElementById('profileToast');
  toast.textContent = message;
  toast.className = `profile-toast ${isError ? 'error' : ''}`;
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

function set(id, value) {
  document.getElementById(id).textContent = value;
}

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[c]);
}
