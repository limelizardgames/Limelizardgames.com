import { supabase } from '/supabase.js';
const form=document.getElementById('accountForm'),msg=document.getElementById('message'),save=document.getElementById('saveButton');
const {data:{session}}=await supabase.auth.getSession();
if(!session){location.replace('/login/');}
else{
  document.getElementById('email').value=session.user.email||'';
  const {data:p}=await supabase.from('profiles').select('username,display_name').eq('id',session.user.id).single();
  if(p){form.username.value=p.username||'';form.displayName.value=p.display_name||'';}
}
form.addEventListener('submit',async e=>{
  e.preventDefault();const username=form.username.value.trim();const display_name=form.displayName.value.trim();
  if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){show('Username must be 3–20 letters, numbers, or underscores.','error');return}
  save.disabled=true;save.textContent='Saving…';
  const {data:match,error:checkError}=await supabase.from('profiles').select('id').ilike('username',username).neq('id',session.user.id).limit(1);
  if(checkError||match?.length){show(checkError?'Could not check username.':'That username is already taken.','error');reset();return}
  const {error}=await supabase.from('profiles').update({username,display_name}).eq('id',session.user.id);
  if(error)show(error.message,'error');else show('Profile updated.','success');reset();
});
document.getElementById('signOut').addEventListener('click',async()=>{await supabase.auth.signOut();location.href='/'});
function show(t,type){msg.textContent=t;msg.className=`message show ${type}`}
function reset(){save.disabled=false;save.textContent='Save Changes'}
