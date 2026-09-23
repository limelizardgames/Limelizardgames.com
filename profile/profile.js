import { supabase } from '/supabase.js';
const {data:{session}}=await supabase.auth.getSession();
if(!session){location.replace('/login/');}
else{
  const uid=session.user.id;
  const [{data:profile,error:pErr},{data:stats},{data:badges},{data:earned}]=await Promise.all([
    supabase.from('profiles').select('username,display_name,level,xp,lime_coins,created_at').eq('id',uid).single(),
    supabase.from('texas42_stats').select('*').eq('user_id',uid).maybeSingle(),
    supabase.from('badges').select('id,slug,name,description,rarity').order('created_at'),
    supabase.from('user_badges').select('badge_id').eq('user_id',uid)
  ]);
  if(pErr){document.getElementById('loading').textContent='Could not load profile.'; throw pErr;}
  fill(profile,stats,badges||[],earned||[]);
}
function fill(p,s,badges,earned){
  const earnedIds=new Set(earned.map(x=>x.badge_id));
  const name=p.display_name||p.username||'Player', level=Number(p.level||1), xp=Number(p.xp||0), coins=Number(p.lime_coins||0);
  set('displayName',name);set('username',p.username?`@${p.username}`:'Username not set');set('level',level);set('xp',xp.toLocaleString());set('coins',`● ${coins.toLocaleString()}`);set('avatar',name.charAt(0).toUpperCase());
  const next=level*250, levelBase=Math.max(0,(level-1)*250), into=Math.max(0,xp-levelBase), need=Math.max(1,next-levelBase), pct=Math.min(100,(into/need)*100);
  set('xpProgressLabel',`${into.toLocaleString()} / ${need.toLocaleString()} XP`);document.getElementById('xpFill').style.width=`${pct}%`;
  const gp=Number(s?.games_played||0), wins=Number(s?.wins||0);set('gamesPlayed',gp);set('wins',wins);set('losses',Number(s?.losses||0));set('winRate',gp?`${((wins/gp)*100).toFixed(1)}%`:'—');set('currentStreak',Number(s?.current_win_streak||0));set('bestStreak',Number(s?.best_win_streak||0));
  document.getElementById('badgeGrid').innerHTML=badges.map(b=>`<div class="badge ${earnedIds.has(b.id)?'':'locked'}"><div class="badge-icon">${icon(b.slug)}</div><strong>${esc(b.name)}</strong><span>${earnedIds.has(b.id)?esc(b.rarity):'Locked'}</span></div>`).join('')||'<div class="loading">No badges yet.</div>';
  document.getElementById('loading').classList.add('hidden');document.getElementById('profileContent').classList.remove('hidden');
}
function icon(slug){return slug==='founding-player'?'🦎':slug==='first-win'?'🏆':slug==='42-wins'?'4️⃣2️⃣':slug==='hot-streak'?'🔥':'🎖️'}
function set(id,v){document.getElementById(id).textContent=v}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
