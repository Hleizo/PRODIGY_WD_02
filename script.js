// ---------- helpers ----------
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const store = {
  get: (k, d=null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const uid = () => (crypto?.randomUUID?.() ?? ('id_'+Date.now()+'_'+Math.random().toString(36).slice(2)));

// ---------- theme ----------
const chips = $$('.chip');
const toggleTheme = $('#toggleTheme');
function applyAccent(hex){ document.documentElement.style.setProperty('--accent', hex); }
function loadTheme(){
  const accent = store.get('accent', '#7c5cff');
  const isLight = !!store.get('theme-light', false);
  applyAccent(accent);
  document.documentElement.classList.toggle('light', isLight);
}
chips.forEach(ch => ch.addEventListener('click', () => {
  const hex = ch.dataset.accent;
  applyAccent(hex); store.set('accent', hex); pulse(ch);
}));
toggleTheme.addEventListener('click', () => {
  const now = !document.documentElement.classList.contains('light');
  document.documentElement.classList.toggle('light', now);
  store.set('theme-light', now);
  pulse(toggleTheme);
}));

// tiny ripple / pulse
const host = $('#ripples');
function pulse(el){
  const r = el.getBoundingClientRect();
  const x = r.left + r.width/2, y = r.top + r.height/2;
  const dot = document.createElement('span');
  dot.className = 'rip'; dot.style.left = x+'px'; dot.style.top = y+'px';
  host.appendChild(dot); setTimeout(()=>dot.remove(), 700);
}
window.addEventListener('click', e=>{
  if(e.target.closest('.btn,.tab,.chip,[data-action]')) pulse(e.target);
});

// ---------- tabs with moving underline ----------
const tabs = $$('.tab');
const underline = $('.tab-underline');
function positionUnderline(){
  const active = $('.tab.active');
  const r = active.getBoundingClientRect();
  const container = $('.tabs').getBoundingClientRect();
  underline.style.width = r.width + 'px';
  underline.style.transform = `translateX(${r.left - container.left}px)`;
  underline.style.background = getComputedStyle(document.documentElement).getPropertyValue('--accent');
}
tabs.forEach(b=>{
  b.addEventListener('click', ()=>{
    tabs.forEach(t=>t.classList.remove('active'));
    $$('.panel').forEach(p=>p.classList.remove('active'));
    b.classList.add('active'); $('#'+b.dataset.tab).classList.add('active');
    positionUnderline();
  });
});

// ---------- stopwatch ----------
let startTime=0, elapsed=0, running=false, raf=null, lastTotal=0;
const timeEl = $('#time');
const btnStartPause = $('#startPause');
const btnLap = $('#lap');
const btnReset = $('#reset');
const btnExport = $('#export');
const btnClear = $('#clearLaps');
const lapRows = $('#lapRows');
const laps = [];

const fmt = (ms)=>{
  const cs = Math.floor(ms/10)%100;
  const s  = Math.floor(ms/1000)%60;
  const m  = Math.floor(ms/60000)%60;
  const h  = Math.floor(ms/3600000);
  const pad = (n,z=2)=>String(n).padStart(z,'0');
  return (h>0?`${pad(h)}:`:'') + `${pad(m)}:${pad(s)}.${pad(cs)}`;
};
function tick(){ elapsed = performance.now() - startTime; timeEl.textContent = fmt(elapsed); raf = requestAnimationFrame(tick); }
function start(){ running=true; btnStartPause.textContent='Pause'; btnLap.disabled=btnReset.disabled=false; startTime=performance.now()-elapsed; raf=requestAnimationFrame(tick); }
function pause(){ running=false; btnStartPause.textContent='Start'; cancelAnimationFrame(raf); }
function reset(){ pause(); elapsed=0; lastTotal=0; timeEl.textContent='00:00.00'; laps.length=0; lapRows.innerHTML=''; btnLap.disabled=btnReset.disabled=true; btnExport.disabled=btnClear.disabled=true; }
function addLap(){
  const total = elapsed, lap = total - lastTotal; lastTotal = total;
  laps.push({lap,total});
  const row = document.createElement('div');
  row.className='r'; row.innerHTML = `<span>${laps.length}</span><span>${fmt(lap)}</span><span>${fmt(total)}</span>`;
  lapRows.appendChild(row);
  btnExport.disabled = btnClear.disabled = false;
}
function exportCSV(){
  if(!laps.length) return;
  const csv = 'Lap #,Lap,Total\n' + laps.map((l,i)=>`${i+1},${fmt(l.lap)},${fmt(l.total)}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href:url, download:'stopwatch_laps.csv'});
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function clearLaps(){ laps.length=0; lastTotal=0; lapRows.innerHTML=''; btnExport.disabled=btnClear.disabled=true; }

btnStartPause.addEventListener('click', ()=> running?pause():start());
btnLap.addEventListener('click', addLap);
btnReset.addEventListener('click', reset);
btnExport.addEventListener('click', exportCSV);
btnClear.addEventListener('click', clearLaps);
window.addEventListener('keydown', e=>{
  if(e.code==='Space'){ e.preventDefault(); running?pause():start(); }
  else if(e.key.toLowerCase()==='l' && !btnLap.disabled){ addLap(); }
  else if(e.key.toLowerCase()==='r' && !btnReset.disabled){ reset(); }
});

// ---------- tasks ----------
const taskForm = $('#taskForm');
const taskTitle = $('#taskTitle');
const taskDue = $('#taskDue');
const taskFilter = $('#taskFilter');
const taskList = $('#taskList');

let tasks = store.get('tasks', []); // [{id,title,due,done}]
const saveTasks = () => store.set('tasks', tasks);

function taskItem(t){
  const overdue = !t.done && t.due && (new Date(t.due) < new Date());
  const dueTxt = t.due ? new Date(t.due).toLocaleString() : 'No due';
  const el = document.createElement('div');
  el.className = 'glass task';
  el.dataset.id = t.id;
  el.innerHTML = `
    <label><input type="checkbox" ${t.done?'checked':''}></label>
    <div>
      <div class="title" contenteditable="true" spellcheck="false">${t.title}</div>
      <div class="meta">${dueTxt} ${t.done?'<span class="badge ok">Done</span>':''} ${overdue?'<span class="badge warn">Overdue</span>':''}</div>
    </div>
    <div>
      <button data-action="del" title="Delete">✕</button>
    </div>`;
  return el;
}
function renderTasks(){
  const mode = taskFilter.value;
  taskList.textContent = '';
  let view = tasks.slice();
  if(mode==='open') view = view.filter(t=>!t.done);
  if(mode==='done') view = view.filter(t=>t.done);
  if(mode==='overdue') view = view.filter(t=>!t.done && t.due && (new Date(t.due)<new Date()));
  view.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  if(!view.length){ const empty=document.createElement('div'); empty.className='glass card'; empty.textContent='No tasks.'; taskList.appendChild(empty); return; }
  view.forEach(t=>taskList.appendChild(taskItem(t)));
}
taskForm.addEventListener('submit', e=>{
  e.preventDefault();
  const title = taskTitle.value.trim(); if(!title) return;
  tasks.push({id:uid(), title, due:taskDue.value||null, done:false});
  saveTasks(); taskForm.reset(); taskTitle.focus(); renderTasks();
});
taskList.addEventListener('change', e=>{
  const wrap = e.target.closest('.task'); if(!wrap) return;
  const t = tasks.find(x=>x.id===wrap.dataset.id); if(!t) return;
  t.done = e.target.checked; saveTasks(); renderTasks();
});
taskList.addEventListener('click', e=>{
  if(e.target.dataset.action==='del'){
    const id = e.target.closest('.task').dataset.id;
    tasks = tasks.filter(x=>x.id!==id); saveTasks(); renderTasks();
  }
});
taskList.addEventListener('blur', e=>{
  const task = e.target.closest('.task');
  if(task && e.target.classList.contains('title')){
    const t = tasks.find(x=>x.id===task.dataset.id); if(!t) return;
    const txt = e.target.textContent.trim();
    if(txt){ t.title = txt; saveTasks(); }
    else { e.target.textContent = t.title; }
  }
}, true);
taskFilter.addEventListener('change', renderTasks);

// ---------- notes ----------
const noteForm = $('#noteForm');
const noteTitle = $('#noteTitle');
const noteBody = $('#noteBody');
const noteSearch = $('#noteSearch');
const noteList = $('#noteList');

let notes = store.get('notes', []); // [{id,title,body,ts}]
const saveNotes = () => store.set('notes', notes);

function noteCard(n){
  const c = document.createElement('article');
  c.className = 'glass note';
  c.dataset.id = n.id;
  c.innerHTML = `
    <div class="bar">
      <h3 contenteditable="true" spellcheck="false">${n.title}</h3>
      <div>
        <button data-action="edit">✎</button>
        <button data-action="rm">✕</button>
      </div>
    </div>
    <p contenteditable="true" spellcheck="false">${n.body}</p>
    <small class="meta">${new Date(n.ts).toLocaleString()}</small>`;
  return c;
}
function renderNotes(){
  const q = noteSearch.value.trim().toLowerCase();
  noteList.textContent = '';
  const view = notes
    .filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    .sort((a,b)=>b.ts - a.ts);
  if(!view.length){ const empty=document.createElement('div'); empty.className='glass card'; empty.textContent='No notes.'; noteList.appendChild(empty); return; }
  view.forEach(n=>noteList.appendChild(noteCard(n)));
}
noteForm.addEventListener('submit', e=>{
  e.preventDefault();
  const title = noteTitle.value.trim(); if(!title) return;
  notes.push({id:uid(), title, body:noteBody.value||'', ts:Date.now()});
  saveNotes(); noteForm.reset(); noteTitle.focus(); renderNotes();
});
noteList.addEventListener('click', e=>{
  const card = e.target.closest('.note'); if(!card) return;
  const id = card.dataset.id; const n = notes.find(x=>x.id===id); if(!n) return;
  if(e.target.dataset.action==='rm'){ notes = notes.filter(x=>x.id!==id); saveNotes(); renderNotes(); }
  else if(e.target.dataset.action==='edit'){ // bump timestamp
    n.ts = Date.now(); saveNotes(); renderNotes();
  }
});
noteList.addEventListener('blur', e=>{
  const card = e.target.closest('.note'); if(!card) return;
  const id = card.dataset.id; const n = notes.find(x=>x.id===id); if(!n) return;
  n.title = card.querySelector('h3').textContent.trim() || n.title;
  n.body  = card.querySelector('p').textContent;
  n.ts = Date.now(); saveNotes();
}, true);
noteSearch.addEventListener('input', renderNotes);

// ---------- footer + init ----------
$('#year').textContent = new Date().getFullYear();
loadTheme();
positionUnderline();
renderTasks();
renderNotes();
reset();   // put stopwatch in a clean state
