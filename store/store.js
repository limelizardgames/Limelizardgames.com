import { supabase } from '/supabase.js';

let currentBalance = null;
await loadWallet();

async function loadWallet() {
  const { data: { session } } = await supabase.auth.getSession();
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
  button.addEventListener('click', () => {
    openModal(
      'SECURE CHECKOUT',
      'Stripe checkout is the next step.',
      'The storefront is ready. Next we will connect this button to secure Stripe Checkout so payment confirmation can award Lime Coins or the Founding Player Pack through Supabase.'
    );
  });
});

document.querySelectorAll('.coin-buy').forEach(button => {
  button.addEventListener('click', () => {
    const cost = Number(button.dataset.cost);
    const item = button.dataset.item;

    if (currentBalance === null) {
      openModal('SIGN IN REQUIRED', 'Sign in to use Lime Coins.', 'Your Lime Coin wallet is tied to your Lime Lizard account.');
      return;
    }

    if (currentBalance < cost) {
      openModal('NOT ENOUGH LIME COINS', `${item} costs ${cost.toLocaleString()} Lime Coins.`, `Your current balance is ${currentBalance.toLocaleString()}.`);
      return;
    }

    openModal('PURCHASE FLOW READY', item, `You have enough Lime Coins. Next we will add a secure Supabase purchase function that deducts ${cost.toLocaleString()} coins and adds the item to your inventory.`);
  });
});

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
