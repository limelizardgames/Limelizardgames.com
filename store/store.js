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

document.querySelectorAll('.coin-buy').forEach(button => {
  button.addEventListener('click', async () => {
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

    openModal('PURCHASE COMPLETE', itemName, `Added to your inventory. New balance: ${currentBalance.toLocaleString()} Lime Coins.`);
  });
});

await markOwnedItems();
await markFounderPackOwned();

async function markOwnedItems() {
  if (!session?.user) return;

  const { data: inventory } = await supabase
    .from('user_inventory')
    .select('item_slug')
    .eq('user_id', session.user.id);

  const owned = new Set((inventory || []).map(x => x.item_slug));

  document.querySelectorAll('.coin-buy').forEach(button => {
    if (owned.has(button.dataset.itemSlug)) {
      button.textContent = 'Owned ✓';
      button.disabled = true;
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
