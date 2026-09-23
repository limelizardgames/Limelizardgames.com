import { supabase } from '/supabase.js';
const form=document.getElementById('signupForm'),msg=document.getElementById('message'),btn=document.getElementById('submitButton');
const current=await supabase.auth.getSession(); if(current.data.session) location.replace('/profile/');
form.addEventListener('submit',async e=>{
  e.preventDefault(); show('','');
  const username=form.username.value.trim();
  if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){show('Username must be 3–20 letters, numbers, or underscores.','error');return}
  btn.disabled=true; btn.textContent='Creating Account…';

  const {data:existing,error:lookupError}=await supabase.from('profiles').select('id').ilike('username',username).limit(1);
  if(lookupError){show('Could not check username. Please try again.','error');reset();return}
  if(existing?.length){show('That username is already taken.','error');reset();return}

  const {data,error}=await supabase.auth.signUp({
    email:form.email.value.trim(),
    password:form.password.value,
    options:{
      data:{username,display_name:form.displayName.value.trim()},
      emailRedirectTo:`${location.origin}/profile/`
    }
  });
  if(error){show(error.message,'error');reset();return}

  if(data.session){
    await syncProfile(data.user.id, username, form.displayName.value.trim());
    location.replace('/profile/');
  } else {
    show('Account created! Check your email and click the confirmation link to finish signing in.','success');
    form.reset(); btn.textContent='Check Your Email';
  }
});
async function syncProfile(id,username,display_name){
  await supabase.from('profiles').update({username,display_name}).eq('id',id);
}
function reset(){btn.disabled=false;btn.textContent='Create Account'}
function show(text,type){msg.textContent=text;msg.className='message'+(text?` show ${type}`:'')}
