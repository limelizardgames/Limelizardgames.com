import { supabase } from '/supabase.js';

const FUNCTIONS_URL = 'https://htmqmjppljniwqwyjnwc.supabase.co/functions/v1';

let currentBalance = null;
let session = null;

await loadWallet();
showCheckoutResult();

async function loadWallet() {
  const result = await supabase.auth.getSession();
  session = result.data.session;
  const balanceEl = document.getElementById('coinBalance');

  if (!session?.user) {
    balanceEl.textContent = 'Sign in';
    document.getElementById('wallet').addEventListener('click', () => location.href = '/login/');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('lime_coins')
    .eq('id', session.user.id)
    .single();

  currentBalance = Number(profile?.lime_coins || 0);
  balanceEl.textContent = currentBalance.toLocaleString();
}

document.querySelectorAll('.game-tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.game-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('.buy-cash').forEach(button => {
  button.addEventListener('click', async () => {
    if (!session?.user) {
      location.href = `/login/?return=${encodeURIComponent('/store/')}`;
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening Checkout…';

    try {
      const response = await fetch(`${FUNCTIONS_URL}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productSlug: button.dataset.product }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Checkout failed');
      location.href = payload.url;
    } catch (error) {
      openModal('CHECKOUT ERROR', 'Could not start checkout.', error.message);
      button.disabled = false;
      button.textContent = original;
    }
  });
});

document.addEventListener('click', async event => {
  const button = event.target.closest('.coin-buy');
  if (!button) return;
    if (!session?.user) {
      location.href = `/login/?return=${encodeURIComponent('/store/')}`;
      return;
    }

    const itemSlug = button.dataset.itemSlug;
    const itemName = button.dataset.item;
    const cost = Number(button.dataset.cost);

    if (currentBalance < cost) {
      openModal(
        'NOT ENOUGH LIME COINS',
        `${itemName} costs ${cost.toLocaleString()} Lime Coins.`,
        `Your current balance is ${currentBalance.toLocaleString()}.`
      );
      return;
    }

    if (!confirm(`Purchase ${itemName} for ${cost.toLocaleString()} Lime Coins?`)) return;

    button.disabled = true;

    const { data, error } = await supabase.rpc('purchase_with_lime_coins', {
      p_item_slug: itemSlug,
    });

    button.disabled = false;

    if (error) {
      openModal('PURCHASE ERROR', 'Purchase could not be completed.', error.message);
      return;
    }

    if (data?.already_owned) {
      openModal('ALREADY OWNED', itemName, 'This item is already in your inventory.');
      return;
    }

    currentBalance = Number(data.new_balance);
    document.getElementById('coinBalance').textContent = currentBalance.toLocaleString();
    button.textContent = 'Owned ✓';
    button.disabled = true;

    await markOwnedItems();
    openModal('PURCHASE COMPLETE', itemName, `Added to your inventory. New balance: ${currentBalance.toLocaleString()} Lime Coins.`);
});

// The Duck can be purchased once its catalog migration is present in Supabase.
const duckButton = document.querySelector('.coin-buy[data-item-slug="texas42-lime-duck"]');
if (duckButton) {
  duckButton.disabled = true;
  duckButton.textContent = 'Checking availability…';
  const { data: duckItem, error: duckError } = await supabase.from('store_items')
    .select('slug,coin_cost').eq('slug', 'texas42-lime-duck').eq('active', true).maybeSingle();
  if (duckError || !duckItem) duckButton.textContent = 'Coming soon';
  else { duckButton.dataset.cost = String(duckItem.coin_cost); duckButton.textContent = `L ${duckItem.coin_cost}`; duckButton.disabled = false; }
}

const bundleMembers = {"texas42-pack-unique":["texas42-felt-nebula","texas42-felt-compass-gear","texas42-felt-kraken","texas42-felt-dragon","texas42-felt-western","texas42-felt-celtic-wolf","texas42-felt-tiki","texas42-felt-campfire-mountains","texas42-felt-retro-sunrise","texas42-felt-luxury"],"texas42-pack-seasonal":["texas42-felt-harvest-table","texas42-felt-st-patricks-day","texas42-felt-summer","texas42-felt-cherry-blossom","texas42-felt-winter-wonderland","texas42-felt-halloween","texas42-felt-valentines-day","texas42-felt-christmas-wreath","texas42-felt-thanksgiving-fall","texas42-felt-easter"],"texas42-pack-campus":["texas42-felt-texas-state","texas42-felt-ut-dallas","texas42-felt-ut-arlington","texas42-felt-university-of-houston","texas42-felt-texas-tech","texas42-felt-ut-rio-grande-valley","texas42-felt-texas-a-m","texas42-felt-north-texas","texas42-felt-ut-san-antonio","texas42-felt-ut-austin"]};
const assetRoot = 'https://play42.limelizardgames.com/';
await loadTexas42Collection();
await markOwnedItems();
await markFounderPackOwned();

async function loadTexas42Collection() {
  const { data: catalog, error } = await supabase.from('store_items')
    .select('slug,name,description,item_type,coin_cost').eq('game_slug','texas-42').eq('active',true);
  if (error || !catalog) return;
  const items = catalog.filter(item => item.slug.startsWith('texas42-felt-') ||
    item.slug.endsWith('-tiles') || Object.hasOwn(bundleMembers,item.slug));
  if (!items.length) return;
  const holder = document.getElementById('texas42CollectionsGrid');
  if (!holder) return;
  items.sort((a,b) => (a.item_type === 'table_bundle' ? -2 : a.item_type === 'domino_set' ? -1 : 0)
    - (b.item_type === 'table_bundle' ? -2 : b.item_type === 'domino_set' ? -1 : 0) || a.name.localeCompare(b.name));
  const previews = { 'texas42-pack-unique':'texas42-felt-nebula',
    'texas42-pack-seasonal':'texas42-felt-harvest-table',
    'texas42-pack-campus':'texas42-felt-texas-state' };
  for (const item of items) {
    const card = document.createElement('article'); card.className = 'store-item';
    const art = document.createElement('div'); art.className = 'item-art';
    const img = document.createElement('img');
    const path = item.item_type === 'domino_set'
      ? 'shop/tiles/' + (item.slug.includes('woodland') ? 'woodland' : 'regal-amethyst') + '/6-6.webp'
      : 'shop/felts/' + (previews[item.slug] || item.slug) + '.webp';
    img.src = assetRoot + path; img.alt = ''; img.loading = 'lazy';
    img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'; art.append(img);
    const body = document.createElement('div'); body.className = 'item-body';
    const type = document.createElement('span'); type.className = 'item-type';
    type.textContent = item.item_type === 'table_bundle' ? 'FELT COLLECTION' : item.item_type === 'domino_set' ? 'DOMINO SET' : 'TABLE FELT';
    const title = document.createElement('h4'); title.textContent = item.name;
    const desc = document.createElement('p'); desc.textContent = item.description || '';
    const buy = document.createElement('button'); buy.className = 'coin-buy';
    buy.dataset.itemSlug = item.slug; buy.dataset.item = item.name;
    buy.dataset.cost = String(item.coin_cost); buy.dataset.baseCost = String(item.coin_cost); buy.textContent = 'L ' + item.coin_cost.toLocaleString();
    body.append(type,title,desc,buy); card.append(art,body); holder.append(card);
  }
  document.getElementById('texas42Collection').hidden = false;
}

async function markOwnedItems() {
  if (!session?.user) return;

  const { data: inventory } = await supabase
    .from('user_inventory')
    .select('item_slug')
    .eq('user_id', session.user.id);

  const owned = new Set((inventory || []).map(x => x.item_slug));

  document.querySelectorAll('.coin-buy').forEach(button => {
    const members = bundleMembers[button.dataset.itemSlug];
    if (members) {
      const remaining = members.filter(slug => !owned.has(slug)).length;
      if (remaining === 0) { button.textContent = 'Owned ✓'; button.disabled = true; }
      else { const price = Math.ceil(Number(button.dataset.baseCost) * remaining / members.length); button.dataset.cost = String(price); button.textContent = 'L ' + price.toLocaleString(); }
    } else if (owned.has(button.dataset.itemSlug)) {
      button.textContent = 'Owned ✓'; button.disabled = true;
    }
  });
}


async function markFounderPackOwned() {
  if (!session?.user) return;

  const { data: entitlements } = await supabase
    .from('user_entitlements')
    .select('entitlement_slug')
    .eq('user_id', session.user.id)
    .eq('entitlement_slug', 'founding-player-pack')
    .limit(1);

  if (!entitlements?.length) return;

  const button = document.querySelector('.buy-cash[data-product="founder-pack"]');
  if (!button) return;

  button.textContent = 'Owned ✓';
  button.disabled = true;

  const card = button.closest('.founder-card');
  if (card) card.classList.add('owned-founder-pack');
}

function showCheckoutResult() {
  const params = new URLSearchParams(location.search);
  const result = params.get('checkout');

  if (result === 'success') {
    openModal(
      'PAYMENT RECEIVED',
      'Thank you for supporting Lime Lizard Games!',
      'Stripe is confirming the purchase. Your Lime Coins or Founder rewards should appear shortly. Refresh the page if the balance has not updated yet.'
    );
    history.replaceState({}, '', '/store/');
  } else if (result === 'cancelled') {
    openModal('CHECKOUT CANCELLED', 'No charge was made.', 'You can return to the store whenever you are ready.');
    history.replaceState({}, '', '/store/');
  }
}

const backdrop = document.getElementById('modalBackdrop');
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOk').addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

function openModal(kicker, title, text) {
  document.getElementById('modalKicker').textContent = kicker;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalText').textContent = text;
  backdrop.hidden = false;
}

function closeModal() { backdrop.hidden = true; }
