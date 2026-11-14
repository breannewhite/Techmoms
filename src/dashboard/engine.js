// Grant dashboard engine, ported from the approved prototype
// (hackathon/prototypes/grant-dashboard/prototype-v9.html). Rendered as vanilla DOM so the
// hi-fi build matches the prototype exactly; GrantDashboard.tsx mounts it and wires
// persistence through PATCH /api/grants/:id/workflow via onPatch.
export function mountDashboard(root, { grants, profile, onPatch, openId }) {
  const listeners = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); };

/* Demo records exported from github.com/breannewhite/Techmoms (server/demoData.ts). Schema: src/types/grant.ts */
const G = grants;
const IS_DEMO = G.length > 0 && G.every(g => g.is_demo_data);
const TODAY='2026-11-14';

/* ---------- Labels & helpers (mirrors src/utils/formatters.ts) ---------- */
const STAGES=[['research','Reviewing'],['qualified','Ready to Apply'],['drafted','Writing'],['submitted','Submitted'],['award_decided','Decision']];
const stageLabel=id=>(STAGES.find(s=>s[0]===id)||[,id])[1];
const nextStage=id=>{const i=STAGES.findIndex(s=>s[0]===id);return i>-1&&i<STAGES.length-1?STAGES[i+1]:null};
const PROGRAMS={foundational:'Foundational Program',advanced:'Tech-Moms 2.0',relaunch:'Career Relaunch',literacy:'Digital Literacy'};
const STATUS={open:'Open',upcoming:'Upcoming',recurring_not_yet_open:'Recurring, not open yet',closed:'Closed',needs_verification:'Needs verification'};
const ELIG={eligible:{t:'Eligible',c:'good',i:'✓'},needs_verification:{t:'Needs verification',c:'warn',i:'?'},ineligible:{t:'Ineligible',c:'bad',i:'✕'},unknown:{t:'Unknown',c:'neutral',i:'–'}};
const ELIG_ORDER={eligible:0,needs_verification:1,unknown:2,ineligible:3};
const COMP={high:['High',3],medium:['Medium',2],low:['Low',1],unknown:['Unknown',0]};
const DET={pass:{t:'Met',c:'good',i:'✓'},fail:{t:'Not met',c:'bad',i:'✕'},unknown:{t:'Needs verification',c:'warn',i:'?'}};
const DISMISS_REASONS=['Not eligible','Effort too high for the award','Award too small','Weak mission fit','Timing doesn’t work','Other'];

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clean=s=>String(s||'').replace(/\s*\((Demo|Synthetic Funder)\)\s*$/,'');
const days=d=>d?Math.round((new Date(d+'T00:00:00')-new Date(TODAY+'T00:00:00'))/864e5):null;
const usd=n=>n==null?'—':'$'+Math.round(n).toLocaleString('en-US');
const k$=n=>n==null?'—':n>=1e6?'$'+(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?'$'+Math.round(n/1e3)+'k':'$'+n;
const range=(a,b,f=k$)=>a!=null&&b!=null?(a===b?f(b):f(a)+'–'+f(b)):b!=null?'Up to '+f(b):a!=null?'From '+f(a):'Unspecified';
const dShort=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'TBD';
const dLong=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'TBD';
const left=n=>n===null?'':n<0?'Passed':n===0?'Today':n===1?'1 day left':n+' days left';
const urg=n=>n===null||n<0?'':n<=14?'bad':n<=30?'warn':'';
const fitCls=f=>f>=90?'good':f>=75?'mid':'low';
const initials=n=>n?n.split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase():'';
const sentence=s=>{s=String(s||'').replace(/_/g,' ').replace(/\bloi\b/gi,'LOI');return s.charAt(0).toUpperCase()+s.slice(1)};
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const titleCase=s=>String(s||'').replace(/\b(?!(?:and|or|of|to|the|in|for)\b)[a-z]/g,c=>c.toUpperCase()).replace(/^./,c=>c.toUpperCase());
const reqCounts=g=>{const r=g.requirements;return{pass:r.filter(x=>x.determination==='pass').length,fail:r.filter(x=>x.determination==='fail').length,unk:r.filter(x=>x.determination==='unknown').length,total:r.length,mand:r.filter(x=>x.mandatory).length,mandPass:r.filter(x=>x.mandatory&&x.determination==='pass').length}};
const loiUpcoming=g=>g.cycle.letter_of_intent_deadline&&days(g.cycle.letter_of_intent_deadline)>=0;
const isActive=g=>g.status!=='closed'&&g.workflow.pipeline_stage!=='award_decided';
const isDismissed=g=>g.dashboard.staff_status==='dismissed';
const OWNERS=[...new Set(G.map(g=>g.workflow.assigned_owner).filter(Boolean))].sort();
const TOPICS=[...new Set(G.flatMap(g=>g.scope.topics))].sort();

/* per-viewer prototype state: saved stars, checklists, notes (not written back to the repo) */
G.forEach(g=>{g._drafts={};g._ready=new Set();g._saved=g.dashboard.is_saved??g.dashboard.staff_status==='saved';g._qs=new Set();g._att=new Set();g._prevStatus=g.dashboard.staff_status});

const ANY_DUE=181,ANY_EFFORT=161;
const AMT_TOP=Math.ceil(Math.max(...G.map(g=>g.funding.maximum_award||0))/5000)*5000;
const PROGRAM_USES=['staff','participants','curriculum'];
const hasOther=g=>[...usesOf(g)].some(u=>!PROGRAM_USES.includes(u));
const PAYFOR={program:'Program costs only',plus:'Program plus other costs'};
const amtOut=v=>+v>=AMT_TOP?`Any amount (up to ${k$(AMT_TOP)})`:`Up to ${k$(+v)}`;
const st={tab:'active',q:'',elig:new Set(),avail:new Set(),topics:new Set(),uses:[],fitMin:0,amtMax:AMT_TOP,payfor:'',dueMax:ANY_DUE,effortMax:ANY_EFFORT,menu:false,sort:{k:'match',dir:-1},openId:null,bell:false,rsec:'org',ptab:'overview',dismissing:false};
const app=document.getElementById('app'),panel=document.getElementById('panel'),scrim=document.getElementById('scrim'),toastEl=document.getElementById('toast');
let toastT,lastFocus=null,noteT;

function toast(msg,undo){toastEl.innerHTML=`<span>${msg}</span>${undo?'<button type="button">Undo</button>':''}`;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('show'),4000);if(undo)toastEl.querySelector('button').onclick=()=>{undo();toastEl.classList.remove('show')}}
const byId=id=>G.find(g=>g.grant_id===id);

/* ---------- Filtering ---------- */
const USES=[
  ['staff','Staff & instruction','Salaries, instructors, coaching',/salar|instructor|instruction|facilitat|coach|mentor|delivery|workshop|cohort|training/i],
  ['overhead','Overhead (indirect costs)','Rent, admin, shared costs',null],
  ['participants','Participant support','Stipends, tuition, childcare',/stipend|tuition|childcare/i],
  ['tech','Technology & equipment','Laptops, software, hotspots',/laptop|software|licens|hotspot|broadband|equipment|hardware/i],
  ['curriculum','Curriculum & materials','Course content, learning materials',/curriculum|material/i],
  ['evaluation','Evaluation','Outcome tracking, evaluators',/evaluat|outcome/i],
  ['outreach','Outreach & partnerships','Recruiting, employer partners',/outreach|employer|networking|placement|partner/i],
];
const USE_LABEL=Object.fromEntries(USES.map(u=>[u[0],u[1]]));
function usesOf(g){const s=new Set();for(const c of g.funding.allowed_costs)for(const [id,,,re] of USES)if(re&&re.test(c))s.add(id);if(g.funding.overhead_allowed)s.add('overhead');return s}
const AVAIL={open:'Open Now',soon:'Opening Soon',closed:'Closed'};
const availOf=g=>g.status==='open'?'open':g.status==='closed'?'closed':'soon';
function inTab(g,tab){if(tab==='dismissed')return isDismissed(g);if(isDismissed(g))return false;if(tab==='active')return isActive(g);if(tab==='saved')return g._saved;return g.workflow.pipeline_stage===tab}
function matches(g){
  if(st.q){const hay=(g.name+' '+g.funder+' '+g.scope.topics.join(' ')+' '+(g.dashboard.category||'')).toLowerCase();if(!hay.includes(st.q.toLowerCase()))return false}
  if(st.elig.size&&!st.elig.has(g.analysis.eligibility_status))return false;
  if(st.avail.size&&!st.avail.has(availOf(g)))return false;
  if(st.topics.size&&!g.scope.topics.some(t=>st.topics.has(t)))return false;
  if(st.uses.length){const u=usesOf(g);if(!st.uses.every(x=>u.has(x)))return false}
  if((g.analysis.strategic_fit_percent??0)<+st.fitMin)return false;
  if(+st.amtMax<AMT_TOP&&(g.funding.maximum_award??0)>+st.amtMax)return false;
  if(st.payfor==='program'&&hasOther(g))return false;
  if(st.payfor==='plus'&&!hasOther(g))return false;
  if(+st.dueMax<ANY_DUE){const n=days(g.cycle.deadline);if(n===null||n<0||n>+st.dueMax)return false}
  if(+st.effortMax<ANY_EFFORT&&(g.application.estimated_hours??999)>+st.effortMax)return false;
  return true;
}
const SORTS={
  match:g=>g.analysis.strategic_fit_percent??-1,
  name:g=>clean(g.name).toLowerCase(),focus:g=>g.dashboard.category||'',award:g=>g.funding.maximum_award??0,elig:g=>ELIG_ORDER[g.analysis.eligibility_status],
  fit:g=>g.analysis.strategic_fit_percent??0,comp:g=>COMP[g.analysis.competitiveness_band][1],
  deadline:g=>g.cycle.deadline||'9999',effort:g=>g.application.estimated_hours??999,stage:g=>STAGES.findIndex(s=>s[0]===g.workflow.pipeline_stage),
};
function visibleRows(){
  const f=SORTS[st.sort.k];
  return G.filter(g=>inTab(g,st.tab)&&matches(g)).sort((a,b)=>{const x=f(a),y=f(b);return(x>y?1:x<y?-1:0)*st.sort.dir});
}

/* ---------- Plain-language help, apply-by dates, reminders ---------- */
const GLOSSARY={
  loi:['Letter of intent (LOI)','A short letter or form some funders ask for first. If they like it, they invite you to send the full application.'],
  match:['Cash match','Money Tech-Moms must put in alongside the grant, usually a percentage of the amount you ask for.'],
  overhead:['Overhead (indirect costs)','Shared costs that keep the organization running, like rent, admin staff and accounting. Many grants cap how much can go here.'],
  fit:['Fit score','How closely this grant matches Tech-Moms’ mission, programs and the people you serve, from 0 to 100%.'],
  comp:['Competitiveness','How hard this grant is likely to be to win, based on how many awards there are and who else can apply.'],
  ask:['Recommended ask','The amount we suggest requesting, based on the funder’s typical award and what the program needs.'],
  pool:['Award pool','The total money the funder is giving out this round, split across a number of grants.'],
  deadline_type:['Deadline type','“Hard close” means late applications aren’t accepted. “Rolling” means the funder reviews applications as they arrive.'],
  prereq:['Prerequisites','Registrations or approvals you need before you can apply, such as SAM.gov or a state vendor account. Some take weeks, so start early.'],
  ein:['EIN','Tech-Moms’ federal tax ID number from the IRS. Nearly every application asks for it.'],
  c3:['501(c)(3)','The IRS status that makes Tech-Moms a tax-exempt nonprofit. Funders often ask for the IRS determination letter as proof.'],
  payfor:['Program vs. other costs','Program costs pay directly for running a program. Other costs include overhead, equipment and evaluation. Grants limited to program costs are called restricted grants.'],
  applyby:['Apply by','A target date one week before the real deadline, so there’s time to fix problems before it closes.'],
};
const tip=k=>`<button type="button" class="tip" data-tip="${k}" aria-label="What is ${GLOSSARY[k][0]}?">?</button>`;
const addD=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const applyBy=g=>g.cycle.deadline?addD(g.cycle.deadline,-7):null;
const reminderOn=g=>{const a=applyBy(g);if(!a)return null;const r=addD(a,-7);return r<TODAY?TODAY:r};
const isTracked=g=>!isDismissed(g)&&isActive(g)&&(g._saved||['qualified','drafted'].includes(g.workflow.pipeline_stage));
function alerts(){
  const out=[];
  G.filter(isTracked).forEach(g=>{
    const l=g.cycle.letter_of_intent_deadline;if(l&&days(l)>=0&&days(l)<=45)out.push([g,'Letter of intent due',l]);
    const d=g.cycle.deadline;if(d&&days(d)>=0&&days(d)<=45)out.push([g,'Application due',d]);
  });
  return out.sort((a,b)=>a[2]<b[2]?-1:1);
}
function renderBell(){
  const a=alerts(),w=document.getElementById('bellwrap');
  w.innerHTML=`<button type="button" class="iconbtn bell" id="bell" aria-label="Deadline reminders, ${a.length} upcoming" aria-expanded="${st.bell}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>${a.length?`<span class="bdot">${a.length}</span>`:''}</button>
  ${st.bell?`<div class="bellmenu" role="dialog" aria-label="Deadline reminders"><div class="bm-h">Coming up in the next 45 days</div>${a.length?a.map(([g,what,d])=>`<button type="button" class="bm-i" data-bellopen="${g.grant_id}"><span class="pill ${urg(days(d))||'ok'}">${left(days(d))}</span><span><b>${esc(clean(g.name))}</b><small>${what} ${dShort(d)}${what==='Application due'?` · apply by ${dShort(applyBy(g))}`:''}</small></span></button>`).join(''):'<p class="bm-empty">No deadlines in the next 45 days for grants you’ve saved or marked Ready to Apply.</p>'}<div class="bm-foot">Reminders cover grants you’ve saved, marked Ready to Apply or are writing.</div></div>`:''}`;
}
let tipEl;
function showTip(b){const [t,d]=GLOSSARY[b.dataset.tip];if(!tipEl){tipEl=document.createElement('div');tipEl.className='tipbox';tipEl.setAttribute('role','tooltip');document.body.append(tipEl)}
  tipEl.innerHTML=`<b>${t}</b>${d}`;tipEl.style.display='block';const r=b.getBoundingClientRect(),w=tipEl.offsetWidth,hh=tipEl.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),y=r.top-hh-8;if(y<8)y=r.bottom+8;tipEl.style.left=x+'px';tipEl.style.top=y+'px'}
const hideTip=()=>{if(tipEl)tipEl.style.display='none'};
on(document,'mouseover',e=>{const b=e.target.closest('.tip');if(b)showTip(b)});
on(document,'mouseout',e=>{if(e.target.closest('.tip'))hideTip()});
on(document,'focusin',e=>{const b=e.target.closest('.tip');b?showTip(b):hideTip()});
on(document,'click',e=>{const b=e.target.closest('.tip');if(b){e.stopPropagation();showTip(b)}},true);
on(document,'scroll',hideTip,true);

/* ---------- Page ---------- */
const SORT_OPTS=[['match','Best Match'],['deadline','Deadline'],['award','Award Size'],['fit','Fit Score'],['effort','Effort'],['name','Name']];
const SORT_DIR_LABEL={match:['Weakest First','Strongest First'],deadline:['Soonest First','Latest First'],award:['Smallest First','Largest First'],fit:['Lowest First','Highest First'],effort:['Quickest First','Longest First'],name:['A to Z','Z to A'],stage:['Earliest Stage First','Latest Stage First']};
const ASC_DEFAULT=['name','deadline','effort','stage'];
const fitOut=v=>+v?`${v}% or higher`:'Any';
const dueOut=v=>+v>=ANY_DUE?'Any time':`Within ${v} days`;
const effOut=v=>+v>=ANY_EFFORT?'Any':`${v} hrs or less`;
function viewList(){
  const active=G.filter(g=>isActive(g)&&!isDismissed(g));
  return [['active','All Active',active.length],['saved','★ Saved',G.filter(g=>g._saved).length],...STAGES.map(([id,l])=>[id,l,G.filter(g=>g.workflow.pipeline_stage===id&&!isDismissed(g)).length]),['dismissed','Archived',G.filter(isDismissed).length]];
}
function activeFilterChips(){
  const c=[];
  if(st.q)c.push(['q',`Search: “${esc(st.q)}”`]);
  if(st.tab!=='active')c.push(['tab',`Status: ${viewList().find(v=>v[0]===st.tab)[1]}`]);
  st.elig.forEach(v=>c.push(['elig:'+v,ELIG[v].t]));
  if(+st.fitMin)c.push(['fitMin','Fit '+fitOut(st.fitMin)]);
  if(+st.amtMax<AMT_TOP)c.push(['amtMax','Award up to '+k$(+st.amtMax)]);
  if(st.payfor)c.push(['payfor',PAYFOR[st.payfor]]);
  if(+st.dueMax<ANY_DUE)c.push(['dueMax','Due '+dueOut(st.dueMax).toLowerCase()]);
  st.avail.forEach(v=>c.push(['avail:'+v,AVAIL[v]]));
  if(+st.effortMax<ANY_EFFORT)c.push(['effortMax','Effort '+effOut(st.effortMax)]);
  st.topics.forEach(v=>c.push(['topic:'+v,cap(v)]));
  st.uses.forEach(v=>c.push(['use:'+v,'Pays for '+USE_LABEL[v].toLowerCase()]));
  return c;
}
const filterCount=()=>activeFilterChips().filter(c=>c[0]!=='q').length;
const togChip=(group,v,label,on,extra='')=>`<button type="button" class="tchip ${on?'on':''}" aria-pressed="${on}" data-tog="${group}" data-v="${esc(v)}">${label}${extra}</button>`;

function menuHTML(n){
  const dirLbl=SORT_DIR_LABEL[st.sort.k]||['Ascending','Descending'];
  return `<div class="fmenu" id="fmenu" role="dialog" aria-label="Sort and filter">
    <div class="fm-body">
      <section class="fm-sec"><div class="fm-h">Sort by</div>
        <div class="tchips" role="radiogroup" aria-label="Sort by">${SORT_OPTS.map(([k,l])=>`<button type="button" role="radio" class="tchip ${st.sort.k===k?'on':''}" aria-checked="${st.sort.k===k}" data-sortk="${k}">${l}</button>`).join('')}
          <button type="button" class="tchip dir" id="sortdir" data-sortdir>${st.sort.dir>0?'↑ '+dirLbl[0]:'↓ '+dirLbl[1]}</button></div>
        ${st.sort.k==='match'?'<p class="fm-hint" style="margin:8px 0 0">Best fit first.</p>':''}
      </section>
      <section class="fm-sec"><div class="fm-h">Grant status</div>
        <div class="tchips" role="radiogroup" aria-label="Grant status">${viewList().map(([id,l,c])=>`<button type="button" role="radio" class="tchip ${st.tab===id?'on':''}" aria-checked="${st.tab===id}" data-status="${id}">${l}<span class="n">${c}</span></button>`).join('')}</div>
      </section>
      <section class="fm-sec"><div class="fm-h">Fit ${tip('fit')}</div>
        <div class="slider"><div class="sl-top"><label for="r-fit">Minimum fit score</label><output id="o-fitMin" for="r-fit">${fitOut(st.fitMin)}</output></div>
          <input type="range" id="r-fit" min="0" max="100" step="5" value="${st.fitMin}" data-range="fitMin"><div class="sl-ends"><span>0%</span><span>100%</span></div></div>
      </section>
      <section class="fm-sec"><div class="fm-h">Award size</div>
        <div class="slider" style="margin-top:0"><div class="sl-top"><label for="r-amt">Maximum award</label><output id="o-amtMax" for="r-amt">${amtOut(st.amtMax)}</output></div>
          <input type="range" id="r-amt" min="10000" max="${AMT_TOP}" step="5000" value="${st.amtMax}" data-range="amtMax"><div class="sl-ends"><span>$10k</span><span>${k$(AMT_TOP)}</span></div></div>
      </section>
      <section class="fm-sec"><div class="fm-h">Timing and effort</div>
        <div class="tchips">${Object.entries(AVAIL).map(([v,l])=>togChip('avail',v,l,st.avail.has(v))).join('')}</div>
        <div class="two-sl">
          <div class="slider"><div class="sl-top"><label for="r-due">Application due</label><output id="o-dueMax" for="r-due">${dueOut(st.dueMax)}</output></div>
            <input type="range" id="r-due" min="7" max="${ANY_DUE}" step="1" value="${st.dueMax}" data-range="dueMax"><div class="sl-ends"><span>1 week</span><span>Any</span></div></div>
          <div class="slider"><div class="sl-top"><label for="r-eff">Time to apply</label><output id="o-effortMax" for="r-eff">${effOut(st.effortMax)}</output></div>
            <input type="range" id="r-eff" min="5" max="${ANY_EFFORT}" step="5" value="${st.effortMax}" data-range="effortMax"><div class="sl-ends"><span>5 hrs</span><span>Any</span></div></div>
        </div>
      </section>
      <section class="fm-sec"><div class="fm-h">Focus area</div>
        <div class="tchips">${TOPICS.map(t=>togChip('topic',t,esc(titleCase(t)),st.topics.has(t))).join('')}</div>
      </section>
      <section class="fm-sec"><div class="fm-h">Can pay for ${tip('payfor')}</div>
        <div class="tchips" role="radiogroup" aria-label="Can pay for">${[['','Any'],['program','Program Only'],['plus','Program Plus Other']].map(([v,l])=>`<button type="button" role="radio" class="tchip ${st.payfor===v?'on':''}" aria-checked="${st.payfor===v}" data-payfor="${v}">${l}</button>`).join('')}</div>
        <p class="fm-hint" style="margin:8px 0 0">${st.payfor==='program'?'Restricted to running the program: instruction, participant support and curriculum.':st.payfor==='plus'?'Also covers costs beyond the program. Narrow it down if you need something specific:':'Program costs are instruction, participant support and curriculum. Other costs include overhead, technology, evaluation and outreach.'}</p>
        ${st.payfor==='plus'?`<div class="usegrid" style="margin-top:10px">${USES.filter(u=>!PROGRAM_USES.includes(u[0])).map(([id,l,h])=>`<label class="usechk ${st.uses.includes(id)?'on':''}"><input type="checkbox" id="u-${id}" data-use="${id}" ${st.uses.includes(id)?'checked':''}><span><b>${l}</b><small>${h}</small></span></label>`).join('')}</div>`:''}
      </section>
    </div>
    <div class="fm-foot"><button type="button" class="linkbtn" id="fclear" data-clear>Reset All</button><button type="button" class="btn primary" id="fdone" data-fdone>Show ${n} Grant${n===1?'':'s'}</button></div>
  </div>`;
}

function fbtnInner(){const fc=filterCount();return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 4h7M12 4h2M2 12h2M7 12h7"/><circle cx="10.5" cy="4" r="1.6"/><circle cx="5.5" cy="12" r="1.6"/></svg><span class="fbl">Sort & Filter</span>${fc?`<span class="badge">${fc}</span>`:''}`}

function resultsHTML(rows){
  const chips=activeFilterChips();
  const cols=[['star','',1],['name','Grant'],['award','Amount'],['match','Fit'],['deadline','Deadline'],['effort','Hrs to apply']];
  return `${chips.length?`<div class="chips">${chips.map(([k,l])=>`<span class="chip">${l}<button type="button" data-unchip="${esc(k)}" aria-label="Remove ${l}">×</button></span>`).join('')}<button class="linkbtn" type="button" data-clear>Clear All</button></div>`:''}
  ${rows.length?`<div class="tablewrap"><table><thead><tr>${cols.map(([k,l])=>k==='star'?`<th class="plain" style="width:44px"><span aria-label="Saved">★</span></th>`:`<th class="${st.sort.k===k?'sorted':''}" aria-sort="${st.sort.k===k?(st.sort.dir>0?'ascending':'descending'):'none'}"><div class="thw"><button type="button" data-sort="${k}">${l}<span class="arr">${st.sort.k===k&&st.sort.dir>0?'▲':'▼'}</span></button>${k==='match'?tip('fit'):''}</div></th>`).join('')}</tr></thead><tbody>${rows.map(rowHTML).join('')}</tbody></table></div>
  <p class="kbdhint">Shortcuts: <kbd>↑</kbd> <kbd>↓</kbd> move between grants · <kbd>Enter</kbd> open · <kbd>S</kbd> save · in the detail panel <kbd>J</kbd> <kbd>K</kbd> next and previous</p>`
  :`<div class="tablewrap"><div class="empty">${st.tab==='saved'&&!G.some(g=>g._saved)?'<b>No saved grants yet</b>Click the ☆ next to any grant to save it and come back later.':'<b>No grants match</b>Try loosening a filter.'}<br><br>${chips.length?'<button class="btn" type="button" data-clear>Clear Filters</button>':''}</div></div>`}`;
}

function render(){
  const active=G.filter(g=>isActive(g)&&!isDismissed(g));
  const rows=visibleRows();
  const asks=active.filter(g=>g.analysis.eligibility_status!=='ineligible');
  const top=active.filter(g=>(g.analysis.priority_score??0)>=80);
  const saved=G.filter(g=>g._saved);
  app.innerHTML=`
  <div class="head"><div><h1>Grant opportunities</h1><p class="sub">${IS_DEMO?`Last discovery run Nov 12, 2026 · ${active.filter(g=>g.dashboard.is_new).length} new this week`:`Found with Gemini web search · ${active.filter(g=>g.dashboard.is_new).length} not reviewed yet`}</p></div>
</div>
  <div class="demo">ⓘ <span>${IS_DEMO?'<b>Demo data.</b> These are the synthetic records from the Techmoms repo. Funders, amounts and links are simulated.':'<b>Real grants found with Gemini web search.</b> Details come from each funder’s own page and are suggestions. Staff must confirm everything before anyone applies.'}</span></div>
  <div class="kpis">
    <div class="kpi"><div class="k"># of opportunities</div><div class="v">${active.length}</div><div class="h"><b>+${active.filter(g=>g.dashboard.is_new).length} new</b></div></div>
    <div class="kpi"><div class="k">Recommended asks</div><div class="v">${k$(asks.reduce((s,g)=>s+(g.funding.recommended_request_usd||0),0))}</div><div class="h">Expected value needs win rates, which aren’t tracked yet</div></div>
    <div class="kpi"><div class="k">Top priority</div><div class="v">${top.length}</div><div class="h">Priority score 80 or higher</div></div>
    <button class="kpi" type="button" data-tab="saved"><div class="k">★ Saved for Later</div><div class="v">${saved.length}</div><div class="h">${saved.length?'Grants to come back to':'Star a grant to save it'}</div></button>
  </div>
  <div class="fbar">
    <div class="sbox"><input id="q" class="search" type="search" placeholder="Search grants, funders or topics" aria-label="Search grants" value="${esc(st.q)}"></div>
    <div class="fwrap"><button type="button" id="fbtn" class="btn ${filterCount()?'has':''}" aria-expanded="${st.menu}" aria-controls="fmenu" aria-label="Sort and filter">${fbtnInner()}</button>${st.menu?menuHTML(rows.length):''}</div>
    <span class="count" id="count">${rows.length} grant${rows.length===1?'':'s'}</span>
  </div>
  <div id="results">${resultsHTML(rows)}</div>`;
  renderBell();
  if(st.openId)renderPanel();
}

/* Update results without rebuilding the open menu, so sliders and inputs keep working mid-drag */
function refresh(){
  const rows=visibleRows();
  document.getElementById('results').innerHTML=resultsHTML(rows);
  document.getElementById('count').textContent=`${rows.length} grant${rows.length===1?'':'s'}`;
  const fb=document.getElementById('fbtn');fb.innerHTML=fbtnInner();fb.classList.toggle('has',filterCount()>0);
  const fd=document.getElementById('fdone');if(fd)fd.textContent=`Show ${rows.length} Grant${rows.length===1?'':'s'}`;
  if(st.openId)renderPanel();
}

function rowHTML(g){
  const a=g.analysis,e=ELIG[a.eligibility_status],n=days(g.cycle.deadline);
  const status=g.status==='upcoming'?`<div class="l2">Opens ${dShort(g.cycle.opens_on)}</div>`:g.status==='recurring_not_yet_open'?`<div class="l2">Opens ${dShort(g.cycle.next_expected_open_on||g.cycle.opens_on)}</div>`:'';
  return `<tr data-id="${g.grant_id}" tabindex="0" class="${st.openId===g.grant_id?'sel':''} ${isDismissed(g)?'dim':''}" aria-label="${esc(clean(g.name))}">
  <td><button type="button" class="star" data-star="${g.grant_id}" aria-pressed="${g._saved}" aria-label="${g._saved?'Remove from saved':'Save for later'}: ${esc(clean(g.name))}" title="${g._saved?'Saved':'Save for later'}">${g._saved?'★':'☆'}</button></td>
  <td><div class="nm">${esc(clean(g.name))}${g.dashboard.is_new?'<span class="new">NEW</span>':''}</div><div class="l2">${esc(clean(g.funder))} · <span style="color:var(--acc)">${isDismissed(g)?'Archived':stageLabel(g.workflow.pipeline_stage)}</span></div></td>
  <td><div class="num">${range(g.funding.minimum_award,g.funding.maximum_award)}</div><div class="l2">Ask ${k$(g.funding.recommended_request_usd)}</div></td>
  <td><div class="match"><div class="fitbar" title="Strategic fit score"><span class="fitlbl">Fit</span><span class="bar"><i class="${fitCls(a.strategic_fit_percent)}" style="width:${a.strategic_fit_percent??0}%"></i></span><span class="num">${a.strategic_fit_percent??'—'}%</span></div></div></td>
  <td>${g.status==='closed'?`<div>${dShort(g.cycle.deadline)}</div><span class="pill" style="margin-top:3px">Closed</span>`:`<div>${dShort(g.cycle.deadline)}</div>${n!==null&&n>=0?`<span class="pill ${urg(n)||'ok'}" style="margin-top:3px">${left(n)}</span>`:''}`}
    ${loiUpcoming(g)?`<div class="l2" style="color:var(--acc);font-weight:600">LOI ${dShort(g.cycle.letter_of_intent_deadline)}</div>`:''}${status}</td>
  <td>${g.application.estimated_hours??'—'} hrs</td>
</tr>`;
}

/* ---------- Saved responses: a pre-filled answer sheet built from the repo's Tech-Moms profile ---------- */
const PROFILE = profile;
const PV=o=>o&&typeof o==='object'&&'value' in o?o.value:o;
const ORG=PROFILE.organization,POP=PROFILE.populations,OUT=PROFILE.outcomes,AREA=PROFILE.service_area;
const needsConfirm=o=>o&&typeof o==='object'&&(o.provenance==='synthetic_demo'||o.provenance==='unverified');
const lst=a=>a.length<=1?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const poss=n=>n.endsWith('s')?n+'’':n+'’s';
const fmtUsd=n=>'$'+Math.round(n).toLocaleString('en-US');
const yearsRunning=()=>{const [y,m]=String(PV(ORG.first_cohorts)).split('-').map(Number);return Math.floor((2026*12+10-(y*12+m))/12)};
const progsFor=g=>(g.analysis.matched_program_ids.length?g.analysis.matched_program_ids:['foundational']).map(id=>PROFILE.programs.find(p=>p.id===id)).filter(Boolean);
const delivery=()=>lst(PV(AREA.delivery).map(d=>d.replace('_','-')));

/* Short fields most application forms ask for */
const ORG_FIELDS=[
  ['name','Organization name',()=>PV(ORG.name),ORG.name],
  ['website','Website',()=>PV(ORG.website),ORG.website],
  ['tax','Tax status',()=>PV(ORG.tax_exempt_501c3)?'501(c)(3) nonprofit':'',ORG.tax_exempt_501c3],
  ['ein','EIN',()=>PV(ORG.ein)||'',ORG.ein],
  ['founded','Year programs began',()=>String(PV(ORG.first_cohorts)).slice(0,4),ORG.first_cohorts],
  ['hq','Headquarters state',()=>PV(ORG.headquarters_state),ORG.headquarters_state],
  ['budget','Annual operating budget',()=>fmtUsd(PV(ORG.annual_operating_budget_usd)),ORG.annual_operating_budget_usd],
  ['revenue','Annual revenue',()=>fmtUsd(PV(ORG.annual_revenue_usd)),ORG.annual_revenue_usd],
  ['staff','Staff (full-time equivalent)',()=>String(PV(ORG.full_time_equivalent_staff)),ORG.full_time_equivalent_staff],
  ['alumni','People served to date',()=>`${PV(OUT.alumni_total)} program alumni`,OUT.alumni_total],
  ['delivery','How programs are delivered',()=>delivery().charAt(0).toUpperCase()+delivery().slice(1),AREA.delivery],
  ['area','Service area',()=>lst(PV(AREA.locations)),AREA.locations,true],
  ['served','Who you serve',()=>{const s=lst(PV(POP.primary));return s.charAt(0).toUpperCase()+s.slice(1)},POP.primary,true],
  ['programs','Programs',()=>PROFILE.programs.map(p=>p.name).join(', '),null,true],
  ['mission','Mission statement',()=>PV(ORG.mission),ORG.mission,true],
];
const ORG_EDITS={};
const orgVal=f=>ORG_EDITS[f[0]]??f[2]();

/* Longer answers to the questions most funders ask */
const SECTIONS=[
  {id:'org',t:'Organization background',ask:'Describe your organization’s mission, history and the communities you serve.',
   uses:[ORG.mission,ORG.first_cohorts,OUT.alumni_total],
   text:g=>`${poss(PV(ORG.name))} mission is to ${PV(ORG.mission).replace(/^Help/,'help').replace(/\.$/,'')}. Based in ${PV(ORG.headquarters_state)}, we launched our first cohorts in September 2020 and have since supported ${PV(OUT.alumni_total)} alumni through programs offered ${delivery()}. We serve participants in ${lst(PV(AREA.locations))}.`},
  {id:'need',t:'Statement of need',ask:'What community need will this grant address? Include data.',
   uses:[POP.percent_low_income,POP.percent_unemployed_or_underemployed,POP.percent_rural],
   text:g=>`Many ${lst(PV(POP.primary))} want to build careers in technology but face real barriers: the cost of training, childcare, and programs that don’t fit family schedules. Among the people we serve, ${PV(POP.percent_low_income)}% are low-income, ${PV(POP.percent_unemployed_or_underemployed)}% are unemployed or underemployed, and ${PV(POP.percent_rural)}% live in rural areas.${g.scope.target_populations.length?` This opportunity’s focus on ${lst(g.scope.target_populations)} matches the participants who most need this support.`:''}`},
  {id:'program',t:'Program description',ask:'Describe the program or project this grant would fund.',
   uses:[],
   text:g=>progsFor(g).map(p=>`${p.name}: ${PV(p.description)} It serves about ${PV(p.annual_participants)} participants each year.`).join('\n\n')+`\n\nFunding from ${clean(g.funder)} would expand access to ${progsFor(g).map(p=>p.name).join(' and ')}${g.scope.eligible_cities.length?` for participants in ${lst(g.scope.eligible_cities)}`:''}.`},
  {id:'outcomes',t:'Goals and outcomes',ask:'What results do you expect, and how will participants benefit?',
   uses:[OUT.accepted_new_position_percent,OUT.received_pay_increase_percent],
   text:g=>`Our goal is lasting career change. Based on our ${PV(OUT.report_period)}, ${PV(OUT.accepted_new_position_percent)}% of alumni accepted a new position, ${PV(OUT.received_pay_increase_percent)}% received a pay increase, and ${PV(OUT.pursued_additional_education_percent)}% pursued additional education. With this grant we aim to reach more participants while maintaining these outcomes.`},
  {id:'eval',t:'Evaluation plan',ask:'How will you measure success and report results?',
   uses:[POP.demographic_data_collection],
   text:g=>`We track enrollment, completion, and career outcomes (new positions, pay increases and further education) for every cohort. Demographic data is collected on an ${PV(POP.demographic_data_collection).replace(', ',' and ')} basis. We publish results in an annual report and will share progress reports with ${clean(g.funder)} on its required schedule.`},
  {id:'capacity',t:'Organizational capacity',ask:'Why is your organization able to deliver this work?',
   uses:[ORG.full_time_equivalent_staff,ORG.annual_operating_budget_usd],
   text:g=>`${PV(ORG.name)} has delivered adult technology training for ${yearsRunning()} years with a team of ${PV(ORG.full_time_equivalent_staff)} full-time-equivalent staff and an annual operating budget of ${fmtUsd(PV(ORG.annual_operating_budget_usd))}. Our ${PV(OUT.alumni_total)} alumni and established curriculum give us a proven model to grow.`},
  {id:'budget',t:'Budget narrative',ask:'Explain how the requested funds will be used.',
   uses:g=>[ORG.available_cash_match_usd,...progsFor(g).map(p=>p.annual_budget_usd)],
   text:g=>`We request ${fmtUsd(g.funding.recommended_request_usd||0)} to support ${progsFor(g).map(p=>`${p.name} (annual budget ${fmtUsd(PV(p.annual_budget_usd))})`).join(' and ')}. Funds will cover ${lst(g.funding.allowed_costs.slice(0,3).map(c=>c.toLowerCase()))}.${g.funding.matching_funds_required?` We will provide the required ${g.funding.matching_percentage}% cash match from our ${fmtUsd(PV(ORG.available_cash_match_usd))} available match.`:''}${g.funding.indirect_cost_rate_cap_percent!=null?` Indirect costs will stay within the ${g.funding.indirect_cost_rate_cap_percent}% cap.`:''}`},
  {id:'sustain',t:'Sustainability plan',ask:'How will the program continue after the grant ends?',
   uses:[ORG.annual_revenue_usd],
   text:g=>`${PV(ORG.name)} sustains its programs through a mix of foundation, corporate and government grants, employer partnerships and individual giving, with annual revenue of ${fmtUsd(PV(ORG.annual_revenue_usd))}. This grant would help us grow capacity that we will maintain through these diversified sources.`},
];
const LIB={};
const respText=(g,s)=>g._drafts[s.id]??LIB[s.id]??s.text(g);
const wordCount=t=>(t.trim().match(/\S+/g)||[]).length;
const confirmNote=(g,s)=>{const u=typeof s.uses==='function'?s.uses(g):s.uses;return u.some(needsConfirm)};
const COPY_ICON='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

function responses(g){
  return `
  <div class="card resp-intro">
    <div><h3 style="margin:0 0 4px">Your application answers</h3><p class="prose" style="margin:0;font-size:13px">Already filled in from what we know about Tech-Moms and this grant. Copy each answer into the funder’s application form. Edit anything before you copy.</p></div>
    <button type="button" class="btn" id="rcopyall" data-rcopyall>${COPY_ICON} Copy Everything</button>
  </div>
  <div class="card">
    <h3>Organization details<span class="aside">Edits here apply to every application</span></h3>
    <div class="ofields">${ORG_FIELDS.map(f=>{const [id,label,,src,wide]=f,v=orgVal(f),c=needsConfirm(src);return `<div class="of ${wide?'wide':''}">
      <label for="of-${id}">${label}${id==='ein'?tip('ein'):id==='tax'?tip('c3'):''}${c?'<span class="confirm" title="This value is a demo figure or unverified in the profile. Check it before you submit.">Confirm</span>':''}</label>
      <div class="ofrow">${id==='mission'?`<textarea id="of-${id}" data-orgf="${id}" rows="2">${esc(v)}</textarea>`:`<input id="of-${id}" data-orgf="${id}" value="${esc(v)}" placeholder="${id==='ein'?'Not on file yet. Add your EIN':''}">`}
      <button type="button" class="copybtn" id="cp-${id}" data-copyf="${id}" aria-label="Copy ${label}" title="Copy">${COPY_ICON}</button></div>
    </div>`}).join('')}</div>
  </div>
  ${SECTIONS.map(s=>{const t=respText(g,s),edited=g._drafts[s.id]!==undefined;return `<div class="card answer">
    <div class="an-top"><div><h3 style="margin:0">${s.t}</h3><p class="re-ask">Often asked as: “${s.ask}”</p></div>
      <button type="button" class="btn sm" id="rc-${s.id}" data-rcopy="${s.id}">${COPY_ICON} Copy</button></div>
    <textarea id="resp-${s.id}" class="notes resp-ta" data-resp="${s.id}" aria-label="${s.t}">${esc(t)}</textarea>
    <div class="re-meta"><span id="wc-${s.id}">${wordCount(t)} words</span>
      ${confirmNote(g,s)?'<span class="confirm-note">Includes demo figures from the profile. Check the numbers before you submit.</span>':''}
      <span class="re-links">${edited?`<button type="button" class="linkbtn" id="rs-${s.id}" data-rsaveall="${s.id}">Use This Version for All Applications</button><button type="button" class="linkbtn" id="rr-${s.id}" data-rreset="${s.id}">Undo Edits</button>`:''}</span></div>
  </div>`}).join('')}`;
}
function copyText(t,msg){(navigator.clipboard?.writeText(t)||Promise.reject()).then(()=>toast(msg)).catch(()=>toast('Copy isn’t available here. Select the text and copy it manually.'))}

/* ---------- Detail panel ---------- */
const ICON={"building": "<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><path d=\"M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01\"/>", "tag": "<path d=\"M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1\"/>", "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>", "pin": "<path d=\"M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8\"/>", "layers": "<path d=\"m12 2 10 5-10 5L2 7z\"/><path d=\"m2 17 10 5 10-5M2 12l10 5 10-5\"/>", "dollar": "<path d=\"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/>", "scale": "<path d=\"M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"/><path d=\"m16 16 3-8 3 8a4.8 4.8 0 0 1-6 0zM2 16l3-8 3 8a4.8 4.8 0 0 1-6 0z\"/>"};
const ico=n=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const link=(href,label)=>href?`<a class="extlink" href="${esc(href)}" target="_blank" rel="noopener">${label} ↗</a>`:'';
function renderPanel(){
  const g=byId(st.openId);if(!g)return;
  const body=panel.querySelector('.p-body');const scroll=body?body.scrollTop:0;
  const focusId=document.activeElement&&panel.contains(document.activeElement)?document.activeElement.id:null;
  const rows=visibleRows(),idx=rows.findIndex(r=>r.grant_id===g.grant_id);
  panel.innerHTML=`
  <div class="p-head">
    <div class="p-row1">
      <div class="eyebrow"><span>${esc(g.dashboard.category||'Grant')}</span><span>·</span><span>${STATUS[g.status]}</span>${g.dashboard.is_new?'<span class="new" style="margin:0">NEW</span>':''}${g._saved?'<span class="pill star">★ Saved</span>':''}</div>
      <div class="p-nav">
        <label class="statuslbl" for="pstage">Status</label>
        <select id="pstage" class="sel status-sel" data-pstage>${STAGES.map(([id,l])=>`<option value="${id}" ${g.workflow.pipeline_stage===id?'selected':''}>${l}</option>`).join('')}</select>
        <span class="navsep" aria-hidden="true"></span>
        ${idx>-1?`<span class="navcount">${idx+1} of ${rows.length}</span>`:''}
        <button type="button" class="iconbtn" id="pprev" data-nav="-1" aria-label="Previous grant" ${idx<=0?'disabled':''}>‹</button>
        <button type="button" class="iconbtn" id="pnext" data-nav="1" aria-label="Next grant" ${idx<0||idx>=rows.length-1?'disabled':''}>›</button>
        <button type="button" class="iconbtn" id="pclose" data-close aria-label="Close details">✕</button>
      </div>
    </div>
    <h2 id="ptitle" tabindex="-1">${esc(clean(g.name))}</h2>
    <div class="p-funder">${esc(clean(g.funder))} · ${esc(g.dashboard.geographic_scope||'')}</div>
    ${g.cycle.cycle_notes?`<p class="cyclenote"><span aria-hidden="true">ⓘ</span>${esc(g.cycle.cycle_notes)}</p>`:''}
    ${g.workflow.pipeline_stage==='qualified'&&reminderOn(g)&&!isDismissed(g)?`<p class="remind" role="status"><span aria-hidden="true">🔔</span>Reminder set for <b>${dShort(reminderOn(g))}</b>. Aim to apply by ${dShort(applyBy(g))}, a week before the ${dShort(g.cycle.deadline)} deadline.</p>`:''}
    <div class="ptabs" role="tablist" aria-label="Grant detail sections">
      ${[['overview','Overview',''],['app','Application',`<span class="cnt">${g.application.estimated_hours??'?'} hrs</span>`],['notes','Notes & Activity',g.workflow.internal_notes?'<span class="cnt">1</span>':''],['responses','Core Data','']].map(([id,l,b])=>`<button type="button" role="tab" id="pt-${id}" aria-selected="${st.ptab===id}" class="${st.ptab===id?'on':''}" data-ptab="${id}">${l}${b}</button>`).join('')}
    </div>
  </div>
  <div class="p-body" role="tabpanel" aria-labelledby="pt-${st.ptab}">${({overview,app:application,notes,responses})[st.ptab](g)}</div>
  <div class="p-foot"><div class="pf-row">
    ${isDismissed(g)?`<button type="button" id="restore" class="btn" data-restore>Restore to Opportunities</button>`:`<button type="button" id="notint" class="btn ghost" data-notint>Not Interested</button>`}
    <div class="pf-actions"><span class="pf-hint">${isDismissed(g)?'Archived. It won’t show in your opportunity list.':g._saved?'Find it any time under Grant status → Saved.':'Save this grant to come back to it later.'}</span>
    <button type="button" id="psave" class="btn ${g._saved?'starred':'primary'}" data-psave aria-pressed="${g._saved}">${g._saved?'★ Saved':'☆ Save'}</button></div>
  </div></div>`;
  panel.querySelector('.p-body').scrollTop=scroll;
  if(focusId){const el=document.getElementById(focusId);if(el)el.focus()}
}

function statsHTML(g){
  const a=g.analysis,n=days(g.cycle.deadline),comp=COMP[a.competitiveness_band];
  return `<div class="card stats">
    <div class="stat"><div class="k">Recommended ask ${tip('ask')}</div><div class="v">${usd(g.funding.recommended_request_usd)}</div><div class="h">Range ${range(g.funding.minimum_award,g.funding.maximum_award)}</div></div>
    <div class="stat"><div class="k">Application due</div><div class="v">${dShort(g.cycle.deadline)}</div><div class="h">${g.status==='closed'?'Closed':n!==null&&n>=0?`<span class="pill ${urg(n)||'ok'}">${left(n)}</span>`:''}${loiUpcoming(g)?` · LOI ${dShort(g.cycle.letter_of_intent_deadline)}`:''}${applyBy(g)&&days(g.cycle.deadline)>=0?`<div class="applyby">Apply by ${dShort(applyBy(g))} ${tip('applyby')}</div>`:''}</div></div>
    <div class="stat"><div class="k">Strategic fit ${tip('fit')}</div><div class="v">${a.strategic_fit_percent??'—'}%</div><div class="h">Priority score ${a.priority_score??'—'} / 100</div></div>
    <div class="stat"><div class="k">Competitiveness ${tip('comp')}</div><div class="v"><span class="dots" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=comp[1]?'on':''}"></i>`).join('')}</span>${comp[0]}</div><div class="h">Win chance ${a.win_probability_percent!=null?a.win_probability_percent+'%':'not estimated yet'}</div></div>
  </div>`;
}

function overview(g){
  const a=g.analysis,f=g.funding,ap=g.application,rc=reqCounts(g),uses=usesOf(g),sc=g.scope;
  const ev=[['Opens',g.cycle.opens_on],['LOI due',g.cycle.letter_of_intent_deadline],['Application due',g.cycle.deadline],['Decision',g.cycle.decision_date],['Award',g.cycle.award_date]].filter(x=>x[1]);
  ev.push(['Today',TODAY,true]);ev.sort((x,y)=>x[1]<y[1]?-1:x[1]>y[1]?1:x[2]?-1:1);
  const nextI=ev.findIndex(x=>!x[2]&&x[1]>=TODAY);
  const order=r=>({fail:0,unknown:1,pass:2})[r.determination];
  const reqs=[...g.requirements].sort((x,y)=>order(x)-order(y));
  const match=f.matching_funds_required&&f.recommended_request_usd&&f.matching_percentage?Math.round(f.recommended_request_usd*f.matching_percentage/100):null;
  return `
  ${statsHTML(g)}
  ${g.official_url||g.application_url?`<div class="quicklinks">${g.official_url?`<a class="ql" href="${esc(g.official_url)}" target="_blank" rel="noopener">${ico('building')}<span><b>Funder Page</b><small>Learn about ${esc(clean(g.funder))}</small></span><i aria-hidden="true">↗</i></a>`:''}${g.application_url?`<a class="ql primary" href="${esc(g.application_url)}" target="_blank" rel="noopener">${ico('layers')}<span><b>Application Portal</b><small>Where you submit the application</small></span><i aria-hidden="true">↗</i></a>`:''}</div>`:''}
  <div class="card"><h3>Key dates</h3>
    <div class="timeline">${ev.map((x,i)=>`<div class="tstep ${x[2]?'today':i===nextI?'next':x[1]<TODAY?'past':''}"><div class="dot"></div><div class="tl">${x[0]}</div><div class="td">${x[2]?dShort(x[1]):dLong(x[1])}</div></div>`).join('')}</div>
  </div>
  <div class="card"><h3>About this grant</h3>
    <div class="about">
      <div class="ai"><span class="aic">${ico('building')}</span><div><div class="ak">Funder</div><div class="av">${g.official_url?`<a href="${esc(g.official_url)}" target="_blank" rel="noopener">${esc(clean(g.funder))} ↗</a>`:esc(clean(g.funder))}</div></div></div>
      <div class="ai"><span class="aic">${ico('tag')}</span><div><div class="ak">Grant type</div><div class="av">${esc(g.dashboard.category||'—')}</div></div></div>
      <div class="ai"><span class="aic">${ico('pin')}</span><div><div class="ak">Where</div><div class="av">${esc(g.dashboard.geographic_scope||'')}</div>${sc.eligible_cities.length?`<div class="l2">${esc(sc.eligible_cities.join(', '))}</div>`:''}</div></div>
      <div class="ai"><span class="aic">${ico('users')}</span><div><div class="ak">Who it serves</div><div class="av">${sc.target_populations.map(cap).map(esc).join(', ')||'—'}</div></div></div>
      <div class="ai"><span class="aic">${ico('dollar')}</span><div><div class="ak">Award pool ${tip('pool')}</div><div class="av">${f.number_of_awards??'?'} awards from ${usd(f.total_program_funding)}</div><div class="l2">Each ${range(f.minimum_award,f.maximum_award)}${f.typical_award?`, typically ${k$(f.typical_award)}`:''}</div></div></div>
      <div class="ai"><span class="aic">${ico('scale')}</span><div><div class="ak">Cash match ${tip('match')}</div><div class="av">${f.matching_funds_required?`${f.matching_percentage??'?'}% required`:'Not required'}</div>${match?`<div class="l2">${usd(match)} on our ask</div>`:''}</div></div>
      <div class="ai"><span class="aic">${ico('layers')}</span><div><div class="ak">Funds program types</div><div class="av">${esc(sc.eligible_program_types.join(', ')||'—')}</div></div></div>
      <div class="ai"><span class="aic">${ico('target')}</span><div><div class="ak">Focus areas</div><div class="tags" style="margin-top:4px">${sc.topics.map(t=>`<span class="tagx">${esc(cap(t))}</span>`).join('')}</div></div></div>
    </div>
    <div class="linkrow">${link(g.official_url,'Funder Page')}${link(g.source_urls[0],'Guidelines')}${link(g.application_url,'Application Portal')}</div>
  </div>
  <div class="card"><h3>To apply<button type="button" class="linkbtn aside" data-ptab="app">Application Details →</button></h3>
    <div class="applysum">
      <div><b>~${ap.estimated_hours??'?'} hrs</b><span>${cap(ap.application_complexity)} effort</span></div>
      <div><b>${ap.letter_of_intent_required?'LOI required':'No LOI'} ${tip('loi')}</b><span>${g.cycle.letter_of_intent_deadline?'Due '+dShort(g.cycle.letter_of_intent_deadline):'Go straight to proposal'}</span></div>
      <div><b>${ap.required_attachments.length} documents</b><span>${ap.required_attachments.length?'To attach':'None listed'}</span></div>
      <div><b>${ap.prerequisites.length} prerequisite${ap.prerequisites.length===1?'':'s'} ${tip('prereq')}</b><span>${esc(ap.prerequisites[0]||'None')}</span></div>
    </div>
  </div>
  <div class="card"><h3>Eligibility<span class="aside">${rc.mandPass} of ${rc.mand} required met${rc.unk?` · <span style="color:var(--warn)">${rc.unk} to verify</span>`:''}${rc.fail?` · <span style="color:var(--bad)">${rc.fail} not met</span>`:''}</span></h3>
    ${reqs.map(r=>{const d=DET[r.determination];return `<details class="req" ${r.determination!=='pass'?'open':''}>
      <summary><span class="ic ${d.c}" style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;flex:none">${d.i}</span><div style="min-width:0;flex:1"><div class="rt">${esc(r.requirement)}</div><div class="rr">${esc(r.reason)}</div></div>
        <span class="rmeta"><span class="pill ${d.c}">${d.t}</span>${r.mandatory?'':'<span class="pill">Preferred</span>'}<span class="chev" aria-hidden="true">›</span></span></summary>
      <div class="evid"><div><div class="eh">Funder says</div>${r.source_quote_or_excerpt?`<q>${esc(r.source_quote_or_excerpt)}</q>`:'No excerpt captured.'}${r.source_url?`<div style="margin-top:6px">${link(r.source_url,'Source')}</div>`:''}</div>
        <div><div class="eh">Tech-Moms evidence</div>${esc(r.techmoms_evidence||'No evidence on file yet.')}</div></div>
    </details>`}).join('')}
  </div>
  <div class="card"><h3>What the money can pay for ${tip('payfor')}<span class="pill ${hasOther(g)?'acc':''}">${hasOther(g)?'Program + other costs':'Program costs only'}</span><span class="aside">Overhead ${f.overhead_allowed===false?'not allowed':f.indirect_cost_rate_cap_percent!=null?`capped at ${f.indirect_cost_rate_cap_percent}%`:'unspecified'}</span></h3>
    <div class="usetags">${USES.map(([id,l])=>`<span class="usetag ${uses.has(id)?'on':''}">${uses.has(id)?'✓':'–'} ${l}</span>`).join('')}</div>
    <div class="two" style="margin-top:14px">
      <div><div class="lbl">Allowed</div><ul class="list">${f.allowed_costs.map(c=>`<li><span class="ic good">✓</span><span>${esc(c)}</span></li>`).join('')||'<li>Unspecified</li>'}</ul></div>
      <div><div class="lbl">Not allowed</div><ul class="list">${f.excluded_costs.map(c=>`<li><span class="ic bad">✕</span><span>${esc(c)}</span></li>`).join('')||'<li>None listed</li>'}</ul></div>
    </div>
    ${f.overhead_restrictions?`<p class="l2" style="margin:12px 0 0">${esc(f.overhead_restrictions)}</p>`:''}
    ${f.recommendation_basis?`<div class="lbl">Why we’d ask for ${usd(f.recommended_request_usd)}</div><p class="prose" style="margin:0">${esc(f.recommendation_basis)}</p>`:''}
  </div>
  <div class="card"><h3>Why Tech-Moms fits</h3>
    ${a.strategic_fit_rationale?`<p class="prose">${esc(a.strategic_fit_rationale)}</p>`:''}
    ${a.matched_program_ids.length?`<div class="tags" style="margin-bottom:4px">${a.matched_program_ids.map(p=>`<span class="tagx prog">${PROGRAMS[p]||p}</span>`).join('')}</div>`:''}
    ${a.strengths.length?`<div class="lbl">Strengths</div><ul class="list">${a.strengths.map(s=>`<li><span class="ic good">✓</span><span>${esc(s)}</span></li>`).join('')}</ul>`:''}
    ${a.risks.length?`<div class="lbl">Risks to watch</div><ul class="list">${a.risks.map(r=>`<li><span class="ic warn">!</span><span>${esc(r)}</span></li>`).join('')}</ul>`:''}
  </div>`;
}

function application(g){
  const ap=g.application,qs=g.analysis.missing_information_questions,att=ap.required_attachments;
  const steps=[];
  ap.prerequisites.forEach(p=>steps.push([esc(p),'Prerequisite to complete first']));
  if(qs.length)steps.push([`Answer ${qs.length} open question${qs.length===1?'':'s'} with staff`,'Listed below']);
  if(ap.letter_of_intent_required)steps.push([`Submit a letter of intent${g.cycle.letter_of_intent_deadline?' by '+dLong(g.cycle.letter_of_intent_deadline):''}`,'The funder invites full proposals after reviewing it']);
  if(att.length)steps.push([`Prepare ${att.length} required document${att.length===1?'':'s'}`,'Checklist below']);
  steps.push([`Submit through ${esc(ap.submission_method||'the funder’s portal')}`,g.cycle.deadline?`Due ${dLong(g.cycle.deadline)} · ${esc(sentence(g.cycle.deadline_type))}`:'']);
  return `
  <div class="card stats">
    <div class="stat"><div class="k">Time to apply</div><div class="v">~${ap.estimated_hours??'—'} hrs</div><div class="h">${cap(ap.application_complexity)} complexity</div></div>
    <div class="stat"><div class="k">Letter of intent ${tip('loi')}</div><div class="v">${ap.letter_of_intent_required?'Required':'Not required'}</div><div class="h">${g.cycle.letter_of_intent_deadline?'Due '+dLong(g.cycle.letter_of_intent_deadline):'&nbsp;'}</div></div>
    <div class="stat"><div class="k">Submit via</div><div class="v sm">${esc(ap.submission_method||'Unspecified')}</div></div>
    <div class="stat"><div class="k">Deadline ${tip('deadline_type')}</div><div class="v">${dShort(g.cycle.deadline)}</div><div class="h">${esc(sentence(g.cycle.deadline_type))}</div></div>
  </div>
  <div class="card"><h3>Steps to apply</h3>
    <ol class="steps">${steps.map(([t,s])=>`<li><div><b>${t}</b>${s?`<span>${s}</span>`:''}</div></li>`).join('')}</ol>
  </div>
  <div class="two">
    <div class="card"><h3>Documents to submit<span class="aside">${[...g._att].length} of ${att.length} ready</span></h3>${att.length?att.map((x,i)=>`<label class="check ${g._att.has(i)?'done':''}"><input type="checkbox" id="a-${i}" data-att="${i}" ${g._att.has(i)?'checked':''}><span>${esc(x)}</span></label>`).join(''):'<p class="prose" style="margin:0">None listed</p>'}</div>
    <div class="card"><h3>Questions to answer first<span class="aside">${[...g._qs].length} of ${qs.length} answered</span></h3>${qs.length?qs.map((q,i)=>`<label class="check ${g._qs.has(i)?'done':''}"><input type="checkbox" id="q-${i}" data-q="${i}" ${g._qs.has(i)?'checked':''}><span>${esc(q)}</span></label>`).join(''):'<p class="prose" style="margin:0">No open questions</p>'}</div>
  </div>
  <div class="card"><h3>What the application asks for</h3>
    ${ap.hours_estimate_basis?`<p class="prose">${esc(ap.hours_estimate_basis)}</p>`:''}
    <div class="linkrow">${link(ap.application_instructions_url,'Application Instructions')}${link(g.application_url,'Application Portal')}</div>
  </div>`;
}

function notes(g){
  const w=g.workflow,dq=g.data_quality;
  return `
  <div class="card"><h3>Internal notes</h3>
    <textarea id="pnotes" class="notes" data-notes placeholder="Eligibility follow-ups, match funding, review dates…">${esc(w.internal_notes||'')}</textarea>
    <div class="savestate" id="savestate" aria-live="polite"></div>
    ${g.dashboard.staff_feedback?`<div class="lbl">Staff feedback</div><p class="quote">${esc(g.dashboard.staff_feedback)}</p>`:''}
  </div>
  ${w.pipeline_stage==='award_decided'?`<div class="card"><h3>Award outcome</h3><dl class="dl"><dt>Outcome</dt><dd>${cap(w.award_outcome)}</dd><dt>Amount awarded</dt><dd>${usd(w.amount_awarded_usd)}</dd><dt>Decided</dt><dd>${dLong(w.award_decision_at)}</dd></dl></div>`:''}
  <div class="card"><h3>Activity</h3><dl class="dl">
    <dt>Discovered</dt><dd>${dLong(g.discovered_at)}</dd><dt>Qualified</dt><dd>${dLong(w.date_qualified)}</dd><dt>Drafted</dt><dd>${dLong(w.date_drafted)}</dd><dt>Submitted</dt><dd>${dLong(w.submitted_at)}</dd><dt>Last change detected</dt><dd>${dLong(g.dashboard.last_change_detected_at)}</dd>
  </dl></div>
  <div class="card"><h3>Sources & data quality<span class="aside">Last verified ${dLong(g.last_verified_at)}</span></h3>
    ${g.official_url?`<div class="src"><span class="sk">Funder page</span><a href="${esc(g.official_url)}" target="_blank" rel="noopener">${esc(g.official_url)}</a></div>`:''}
    ${g.application_url?`<div class="src"><span class="sk">Application portal</span><a href="${esc(g.application_url)}" target="_blank" rel="noopener">${esc(g.application_url)}</a></div>`:''}
    ${g.source_urls.map(u=>`<div class="src"><span class="sk">Guidelines</span><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></div>`).join('')}
    <dl class="dl" style="margin-top:12px">
      <dt>Verified from funder</dt><dd>${dq.verified_from_primary_source?'Yes':'No'}</dd>
      <dt>Confidence</dt><dd>${esc(sentence(dq.confidence))}</dd>
      <dt>Missing fields</dt><dd>${dq.missing_fields.length?`<div class="tags">${dq.missing_fields.map(m=>`<span class="tagx">${esc(m)}</span>`).join('')}</div>`:'None'}</dd>
    </dl>
  </div>`;
}

/* ---------- Actions ---------- */
function openPanel(id){if(!st.openId)lastFocus=document.activeElement;st.openId=id;st.ptab='overview';st.dismissing=false;st.menu=false;render();panel.classList.add('open');scrim.classList.add('open');panel.querySelector('#ptitle').focus()}
function closePanel(){const id=st.openId;st.openId=null;st.dismissing=false;panel.classList.remove('open');scrim.classList.remove('open');render();const row=app.querySelector(`tr[data-id="${id}"]`);(row||lastFocus)?.focus()}
function step(d){const rows=visibleRows(),i=rows.findIndex(r=>r.grant_id===st.openId),n=rows[i+d];if(n){st.openId=n.grant_id;st.dismissing=false;render();panel.querySelector('.p-body').scrollTop=0;panel.querySelector('#ptitle').focus()}}
function toggleSave(g){g._saved=!g._saved;onPatch(g.grant_id,{is_saved:g._saved});render();toast(g._saved?`★ Saved “${esc(clean(g.name))}”`:`Removed from Saved`,()=>{g._saved=!g._saved;onPatch(g.grant_id,{is_saved:g._saved});render()})}
function setStage(g,stage){const p=g.workflow.pipeline_stage;g.workflow.pipeline_stage=stage;onPatch(g.grant_id,{pipeline_stage:stage});render();const r=stage==='qualified'&&reminderOn(g);toast(r?`Marked Ready to Apply. We’ll send you a reminder on ${dShort(r)}.`:`Status changed to ${stageLabel(stage)}`,()=>{g.workflow.pipeline_stage=p;onPatch(g.grant_id,{pipeline_stage:p});render()})}
function resetFilters(){st.q='';st.tab='active';st.elig=new Set();st.avail=new Set();st.topics=new Set();st.uses=[];st.fitMin=0;st.amtMax=AMT_TOP;st.payfor='';st.dueMax=ANY_DUE;st.effortMax=ANY_EFFORT}
function setSort(k,dir){st.sort={k,dir:dir??(ASC_DEFAULT.includes(k)?1:-1)}}
const SETS={elig:'elig',avail:'avail',topic:'topics'};

app.addEventListener('click',e=>{
  const star=e.target.closest('[data-star]');if(star){e.stopPropagation();const g=byId(star.dataset.star);toggleSave(g);app.querySelector(`[data-star="${g.grant_id}"]`)?.focus();return}
  if(e.target.closest('#fbtn')){st.menu=!st.menu;render();(st.menu?document.querySelector('#fmenu .tchip.on, #fmenu button'):document.getElementById('fbtn'))?.focus();return}
  if(e.target.closest('[data-fdone]')){st.menu=false;render();document.getElementById('fbtn').focus();return}
  if(e.target.closest('[data-clear]')){const inMenu=!!e.target.closest('#fmenu');resetFilters();render();if(inMenu)document.getElementById('fclear')?.focus();return}
  /* inside the menu: update state, restyle the control, refresh results only */
  const sk=e.target.closest('[data-sortk]');if(sk){setSort(sk.dataset.sortk);render();document.querySelector(`[data-sortk="${sk.dataset.sortk}"]`)?.focus();return}
  if(e.target.closest('[data-sortdir]')){st.sort.dir=-st.sort.dir;render();document.getElementById('sortdir')?.focus();return}
  const pf=e.target.closest('[data-payfor]');if(pf){st.payfor=pf.dataset.payfor;if(st.payfor!=='plus')st.uses=[];render();document.querySelector(`[data-payfor="${st.payfor}"]`)?.focus();return}
  const ss=e.target.closest('[data-status]');if(ss){st.tab=ss.dataset.status;ss.parentElement.querySelectorAll('.tchip').forEach(b=>{const on=b===ss;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});refresh();return}
  const tg=e.target.closest('[data-tog]');if(tg){const set=st[SETS[tg.dataset.tog]],v=tg.dataset.v;set.has(v)?set.delete(v):set.add(v);const on=set.has(v);tg.classList.toggle('on',on);tg.setAttribute('aria-pressed',on);refresh();return}
  if(e.target.closest('#fmenu'))return;
  const t=e.target.closest('[data-tab]');if(t){st.tab=t.dataset.tab;render();return}
  const s=e.target.closest('[data-sort]');if(s){const k=s.dataset.sort;st.sort.k===k?st.sort.dir=-st.sort.dir:setSort(k);render();app.querySelector(`[data-sort="${k}"]`)?.focus();return}
  const u=e.target.closest('[data-unchip]');if(u){const k=u.dataset.unchip,[grp,v]=k.split(/:(.*)/s);
    if(k==='q')st.q='';else if(k==='tab')st.tab='active';else if(grp==='use')st.uses=st.uses.filter(x=>x!==v);else if(SETS[grp]&&v!==undefined)st[SETS[grp]].delete(v);
    else if(k==='fitMin')st.fitMin=0;else if(k==='dueMax')st.dueMax=ANY_DUE;else if(k==='effortMax')st.effortMax=ANY_EFFORT;else if(k==='amtMax')st.amtMax=AMT_TOP;else if(k==='payfor'){st.payfor='';st.uses=[]}else st[k]='';render();return}
  const tr=e.target.closest('tr[data-id]');if(tr)openPanel(tr.dataset.id);
});
on(document,'click',e=>{if(st.menu&&document.body.contains(e.target)&&!e.target.closest('.fwrap')){st.menu=false;render()}});
app.addEventListener('change',e=>{
  if(e.target.dataset.use){const id=e.target.dataset.use;st.uses=e.target.checked?[...st.uses,id]:st.uses.filter(x=>x!==id);e.target.closest('.usechk').classList.toggle('on',e.target.checked);refresh()}
});
app.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='q'){st.q=t.value;refresh();return}
  if(t.dataset.range){const k=t.dataset.range;st[k]=+t.value;const o=document.getElementById('o-'+k);o.textContent=k==='fitMin'?fitOut(t.value):k==='dueMax'?dueOut(t.value):k==='amtMax'?amtOut(t.value):effOut(t.value);refresh();return}
  if(t.dataset.amt){st[t.dataset.amt]=t.value===''?'':String(Math.max(0,+t.value));refresh()}
});
app.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&st.menu){st.menu=false;render();document.getElementById('fbtn').focus();return}
  const tr=e.target.closest('tr[data-id]');if(!tr||e.target!==tr)return;
  if(e.key==='Enter'){openPanel(tr.dataset.id);e.preventDefault()}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){const sib=e.key==='ArrowDown'?tr.nextElementSibling:tr.previousElementSibling;if(sib){sib.focus();e.preventDefault()}}
  else if(e.key.toLowerCase()==='s'){const id=tr.dataset.id;toggleSave(byId(id));app.querySelector(`tr[data-id="${id}"]`)?.focus()}
});

panel.addEventListener('click',e=>{
  const g=byId(st.openId);if(!g)return;
  if(e.target.closest('[data-close]'))return closePanel();
  const nv=e.target.closest('[data-nav]');if(nv&&!nv.disabled)return step(+nv.dataset.nav);
  const pt=e.target.closest('[data-ptab]');if(pt){st.ptab=pt.dataset.ptab;renderPanel();panel.querySelector('.p-body').scrollTop=0;document.getElementById('pt-'+st.ptab)?.focus();return}
  if(e.target.closest('[data-psave]'))return toggleSave(g);
  const cf=e.target.closest('[data-copyf]');if(cf){const f=ORG_FIELDS.find(x=>x[0]===cf.dataset.copyf),v=orgVal(f);return v?copyText(v,`Copied ${f[1].toLowerCase()}`):toast(`${f[1]} is empty. Add it first.`)}
  const rc=e.target.closest('[data-rcopy]');if(rc){const s=SECTIONS.find(x=>x.id===rc.dataset.rcopy);return copyText(respText(g,s),`Copied “${s.t}”`)}
  if(e.target.closest('[data-rcopyall]'))return copyText(ORG_FIELDS.map(f=>f[1]+': '+orgVal(f)).join('\n')+'\n\n'+SECTIONS.map(s=>s.t+'\n\n'+respText(g,s)).join('\n\n'),'Copied all answers');
  const ra=e.target.closest('[data-rsaveall]');if(ra){const id=ra.dataset.rsaveall,s=SECTIONS.find(x=>x.id===id);LIB[id]=respText(g,s);G.forEach(x=>delete x._drafts[id]);renderPanel();toast('Saved. Every application now starts from this version.');return}
  const rr=e.target.closest('[data-rreset]');if(rr){delete g._drafts[rr.dataset.rreset];renderPanel();document.getElementById('resp-'+rr.dataset.rreset)?.focus();return}
  if(e.target.closest('[data-advance]')){const ns=nextStage(g.workflow.pipeline_stage);if(ns)setStage(g,ns[0]);return}
  if(e.target.closest('[data-dismiss]')){st.dismissing=true;renderPanel();document.getElementById('dreason')?.focus();return}
  if(e.target.closest('[data-dcancel]')){st.dismissing=false;renderPanel();document.getElementById('dismiss')?.focus();return}
  if(e.target.closest('[data-dconfirm]')){const reason=document.getElementById('dreason').value,prev=[g.dashboard.staff_status,g.dashboard.dismissed_reason];g.dashboard.staff_status='dismissed';g.dashboard.dismissed_reason=reason;st.dismissing=false;render();toast(`Dismissed “${esc(clean(g.name))}”`,()=>{[g.dashboard.staff_status,g.dashboard.dismissed_reason]=prev;render()});return}
  if(e.target.closest('[data-restore]')){g.dashboard.staff_status=g._prevStatus==='dismissed'?'reviewing':g._prevStatus;g.dashboard.dismissed_reason=null;onPatch(g.grant_id,{staff_status:g.dashboard.staff_status,dismissed_reason:null});render();toast('Restored to your opportunity list');return}
});
panel.addEventListener('change',e=>{
  const g=byId(st.openId);if(!g)return;
  if(e.target.matches('[data-pstage]'))return setStage(g,e.target.value);
  if(e.target.matches('[data-powner]')){g.workflow.assigned_owner=e.target.value||null;render();toast(`Owner set to ${e.target.value||'Unassigned'}`);return}
  if(e.target.matches('[data-q]')){const i=+e.target.dataset.q;g._qs.has(i)?g._qs.delete(i):g._qs.add(i);renderPanel();return}
  if(e.target.matches('[data-att]')){const i=+e.target.dataset.att;g._att.has(i)?g._att.delete(i):g._att.add(i);renderPanel();return}
});
panel.addEventListener('input',e=>{if(e.target.matches('[data-orgf]')){ORG_EDITS[e.target.dataset.orgf]=e.target.value;return}if(e.target.matches('[data-resp]')){const g=byId(st.openId),id=e.target.dataset.resp;g._drafts[id]=e.target.value;document.getElementById('wc-'+id).textContent=wordCount(e.target.value)+' words';return}if(e.target.matches('[data-notes]')){const g=byId(st.openId);g.workflow.internal_notes=e.target.value;const s=document.getElementById('savestate');s.textContent='Saving…';clearTimeout(noteT);noteT=setTimeout(()=>{Promise.resolve(onPatch(g.grant_id,{internal_notes:g.workflow.internal_notes})).then(()=>{s.textContent='Saved'}).catch(()=>{s.textContent='Couldn’t save. Check your connection and try again.'})},600)}});

/* ---------- Archive confirmation, reminders, bell ---------- */
const modal=document.createElement('div');modal.className='modalwrap';modal.hidden=true;document.body.append(modal);
let modalReturn=null;
function askArchive(g){
  modalReturn=document.activeElement;
  modal.innerHTML=`<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mtitle" aria-describedby="mdesc">
    <h2 id="mtitle">Not interested in this grant?</h2>
    <p id="mdesc">“${esc(clean(g.name))}” will move to your archive and won’t show in your opportunity list. You can bring it back any time from Grant status → Archived.</p>
    <div class="m-actions"><button type="button" class="btn" id="mcancel" data-mcancel>Keep It</button><button type="button" class="btn primary" id="mconfirm" data-mconfirm="${g.grant_id}">Move to Archive</button></div></div>`;
  modal.hidden=false;document.getElementById('mcancel').focus();
}
function closeModal(){modal.hidden=true;modal.innerHTML='';modalReturn?.focus()}
modal.addEventListener('click',e=>{
  if(e.target===modal||e.target.closest('[data-mcancel]'))return closeModal();
  const c=e.target.closest('[data-mconfirm]');if(c){const g=byId(c.dataset.mconfirm),prev=[g.dashboard.staff_status,g.dashboard.dismissed_reason];g.dashboard.staff_status='dismissed';g.dashboard.dismissed_reason='Not interested';onPatch(g.grant_id,{staff_status:'dismissed',dismissed_reason:'Not interested'});modal.hidden=true;modal.innerHTML='';
    closePanel();toast(`Moved “${esc(clean(g.name))}” to Archive`,()=>{[g.dashboard.staff_status,g.dashboard.dismissed_reason]=prev;onPatch(g.grant_id,{staff_status:prev[0],dismissed_reason:prev[1]});render()})}
});
modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeModal()}if(e.key==='Tab'){const f=[...modal.querySelectorAll('button')],i=f.indexOf(document.activeElement);if(e.shiftKey&&i===0){f[f.length-1].focus();e.preventDefault()}else if(!e.shiftKey&&i===f.length-1){f[0].focus();e.preventDefault()}}});
panel.addEventListener('click',e=>{const g=byId(st.openId);if(g&&e.target.closest('[data-notint]'))askArchive(g)});
document.getElementById('bellwrap').addEventListener('click',e=>{
  if(e.target.closest('#bell')){st.bell=!st.bell;renderBell();(st.bell?document.querySelector('.bm-i'):document.getElementById('bell'))?.focus();return}
  const o=e.target.closest('[data-bellopen]');if(o){st.bell=false;renderBell();openPanel(o.dataset.bellopen)}
});
on(document,'click',e=>{if(st.bell&&document.body.contains(e.target)&&!e.target.closest('#bellwrap')){st.bell=false;renderBell()}});
on(document,'keydown',e=>{if(e.key==='Escape'&&st.bell){st.bell=false;renderBell();document.getElementById('bell').focus()}});
scrim.onclick=closePanel;
on(document,'keydown',e=>{
  if(!st.openId||!modal.hidden)return;
  if(e.key==='Escape'){if(st.dismissing){st.dismissing=false;renderPanel();return}closePanel();return}
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='j')step(1);else if(e.key==='k')step(-1);
});
render();

  if (openId && byId(openId)) openPanel(openId);
  return () => {
    listeners.forEach(([t, type, fn, opts]) => t.removeEventListener(type, fn, opts));
    modal.remove();
    if (tipEl) tipEl.remove();
  };
}
