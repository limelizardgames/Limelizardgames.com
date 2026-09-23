import { supabase } from '/supabase.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('message');
const btn = document.getElementById('submitButton');
const googleBtn = document.getElementById('googleLogin');
const facebookBtn = document.getElementById('facebookLogin');

const current = await supabase.auth.getSession();
if (current.data.session) location.replace('/profile/');

googleBtn.addEventListener('click', () => socialLogin('google'));
facebookBtn.addEventListener('click', () => socialLogin('facebook'));

async function socialLogin(provider) {
  clearMessage();

  const buttons = [googleBtn, facebookBtn, btn];
  buttons.forEach(b => b.disabled = true);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/profile/`
    }
  });

  if (error) {
    show(error.message, 'error');
    buttons.forEach(b => b.disabled = false);
  }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  clearMessage();
  btn.disabled = true;
  btn.textContent = 'Signing In…';

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value
  });

  if (error) {
    show(error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }

  location.replace('/profile/');
});

function show(text, type) {
  msg.textContent = text;
  msg.className = `message show ${type}`;
}

function clearMessage() {
  msg.textContent = '';
  msg.className = 'message';
}
