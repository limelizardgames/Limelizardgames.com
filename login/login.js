import { supabase } from '/supabase.js';
const form=document.getElementById('loginForm'),msg=document.getElementById('message'),btn=document.getElementById('submitButton');
const current=await supabase.auth.getSession(); if(current.data.session) location.replace('/profile/');
form.addEventListener('submit',async e=>{e.preventDefault(); show('', ''); btn.disabled=true; btn.textContent='Signing In…';
const {error}=await supabase.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});
if(error){show(error.message,'error');btn.disabled=false;btn.textContent='Sign In';return} location.replace('/profile/');});
function show(text,type){msg.textContent=text;msg.className='message'+(text?` show ${type}`:'');}
