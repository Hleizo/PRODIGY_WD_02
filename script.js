// ========= tiny helpers =========
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const storage = {
  get: (k, d=null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
    catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const uid = () => (crypto?.randomUUID?.() ?? (`id_${Date.now()}_${Math.random().toString(36).slice(2)}`));

// ========= theme & color =========
const accentPicker = $('#accentPicker');
const themeToggle  = $('#themeToggle');
function applyAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
  const sw = document.querySelector('.color-swatch .swatch');
  if (sw) sw.style.background = hex;
}
(function initTheme(){
  const savedAccent = storage.get('accent', null);
  const light = storage.get('theme-light', false);
  if (savedAccent){ accentPicker.value = savedAccent; applyAccent(savedAccent); }
  document.documentElement.classList.toggle('light', !!light);
})();
accentPicker.addEventListener('input', e => {
  applyAccent(e.target.value);
  storage.set('accent', e.target.value);
});
themeToggle.addEventListener('click', () => {
  const next = !document.documentElement.classList.contains('light');
  document.documentElement.classList.toggle('light', next);
  storage.set('theme-light', next);
});

// ========= tabs =========
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(b=>b.classList.remove('active'));
    $$('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    $('#'+btn.dataset.tab).classList.add('active');
  });
});

// ========= stopwatch =========
let startTime = 0, elapsed = 0, running = false, raf = null;
const timeEl = $('#time');
const btnStartPause = $('#startPause');
const btnLap = $('#lap');
const btnReset = $('#reset');
const btnExport = $('#export');
const btnClear = $('#clearLaps');
const lapRows = $('#lapRows');
const laps = [];
let lastTotal = 0;

const fmt = (ms)=>{
  const cs = Math.floor(ms/10)%100;
  const s  = Math.floor(ms/1000)%60;
  const m  = Math.floor(ms/60000)%60;
  const h  = Math.floor(ms/3600000);
  const pad = (n,z=2)=>String(n).padStart(z,'0');
  return (h>0?`${pad(h)}:`:'') + `${pad(m)}:${pad(s)}.${pad(cs)}`;
};

function tick(){
  elapsed = performance.now() - startTime;
  timeEl.textContent = fmt(elapsed);
  raf = requestAnimationFrame(tick);
}
function start(){
  running = true;
  btnStartPause.textContent = 'Pause';
  btnStartPause.setAttribute('aria-pressed', 'true');
  btnLap.disabled = btnReset.disabled = false;
  startTime = performance.now() - elapsed;
  raf = requestAnimationFrame(tick);
}
function pause(){
  running = false;
  btnStartPause.textContent = 'Start';
  btnStartPause.setAttribute('aria-pressed', 'false');
  cancelAnimationFrame(raf);
}
function reset(){
  pause();
  elapsed = 0; lastTotal = 0;
  timeEl.textContent = '00:00.00';
  laps.length = 0; lapRows.innerHTML = '';
  btnLap.disabled = btnReset.disabled = true;
  btnExport.disabled = btnClear.disabled = true;
}
function addLap(){
  const total = elapsed;
  const lap = total - lastTotal;
  lastTotal = total;
  laps.push({ lap, total });
  renderLaps();
  btnExport.disabled = btnClear.disabled = false;
}
function renderLaps(){
  lapRows.innerHTML = laps.map((l,i)=>`
    <div class="row">
      <span>${i+1}</span>
      <span>${fmt(l.lap)}</span>
      <span>${fmt(l.total)}</span>
    </div>
  `).join('');
}
function exportCSV(){
  if(!laps.length) return;
  const csv = 'Lap #,Lap,Total\n' + laps.map((l,i)=>`${i+1},${fmt(l.lap)},${fmt(l.total)}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href:url, download:'stopwatch_laps.csv'});
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function clearLaps(){
  laps.length = 0; lastTotal = 0; lapRows.innerHTML = '';
  btnExport.disabled = btnClear.disabled = true;
}

btnStartPause.addEventListener('click', ()=> running ? pause() : start());
btnLap.addEventListener('click', addLap);
btnReset.addEventListener('click', reset);
btnExport.addEventListener('click', exportCSV);
btnClear.addEventListener('click', clearLaps);
window.addEventListener('keydown', (e)=>{
  if(e.code==='Space'){ e.preventDefault(); running?pause():start(); }
  else if(e.key.toLowerCase()==='l' && !btnLap.disabled){ addLap(); }
  else if(e.key.toLowerCase()==='r' && !btnReset.disabled){ reset(); }
});

// ========= tasks =========
const taskForm  = $('#taskForm');
const taskTitle = $('#taskTitle');
const taskDue   = $('#taskDue');
const taskList  = $('#taskList');
const taskFilter= $('#taskFilter');

let tasks = storage.get('tasks', []); // [{id,title,due,done}]
const saveTasks = ()=> storage.set('tasks', tasks);

function taskRow(t){
  const overdue = !t.done && t.due && (new Date(t.due) < new Date());
  const dueText = t.due ? new Date(t.due).toLocaleString() : 'No due';
  return `
  <div class="task ${t.done?'done':''}" data-id="${t.id}">
    <label><input type="checkbox" ${t.done?'checked':''}></label>
    <div>
      <div class="title">${t.title}</div>
      <div class="meta">${dueText} ${overdue?'<span class="badge warn">Overdue</span>':''} ${t.done?'<span class="badge ok">Done</span>':''}</div>
    </div>
    <div><button class="del" title="Delete">✕</button></div>
  </div>`;
}
function renderTasks(){
  const mode = taskFilter.value;
  let view = tasks.slice();
  if(mode==='open') view = view.filter(t=>!t.done);
  if(mode==='done') view = view.filter(t=>t.done);
  if(mode==='overdue') view = view.filter(t=>!t.done && t.due && (new Date(t.due) < new Date()));
  view.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  taskList.innerHTML = view.length ? view.map(taskRow).join('') : `<div class="card">No tasks yet.</div>`;
}
taskForm.addEventListener('submit', e=>{
  e.preventDefault();
  const title = taskTitle.value.trim(); if(!title) return;
  tasks.push({id:uid(), title, due:taskDue.value||null, done:false});
  saveTasks(); renderTasks(); taskForm.reset(); taskTitle.focus();
});
taskList.addEventListener('change', e=>{
  const wrap = e.target.closest('.task'); if(!wrap) return;
  const t = tasks.find(x=>x.id===wrap.dataset.id); if(!t) return;
  t.done = e.target.checked; saveTasks(); renderTasks();
});
taskList.addEventListener('click', e=>{
  if(e.target.classList.contains('del')){
    const id = e.target.closest('.task').dataset.id;
    tasks = tasks.filter(x=>x.id!==id); saveTasks(); renderTasks();
  }
});
taskFilter.addEventListener('change', renderTasks);

// ========= notes =========
const noteForm  = $('#noteForm');
const noteTitle = $('#noteTitle');
const noteBody  = $('#noteBody');
const noteSearch= $('#noteSearch');
const noteList  = $('#noteList');

let notes = storage.get('notes', []); // [{id,title,body,ts}]
const saveNotes = ()=> storage.set('notes', notes);

function noteCard(n){
  const date = new Date(n.ts).toLocaleString();
  const snippet = (n.body || '').slice(0, 120);
  return `
  <article class="note" data-id="${n.id}">
    <div class="bar">
      <h3>${n.title}</h3>
      <div>
        <button class="edit" title="Edit">✎</button>
        <button class="rm" title="Delete">✕</button>
      </div>
    </div>
    <p>${snippet}</p>
    <small class="meta">${date}</small>
  </article>`;
}
function renderNotes(){
  const q = noteSearch.value.trim().toLowerCase();
  const view = notes
    .filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    .sort((a,b)=>b.ts - a.ts);
  noteList.innerHTML = view.length ? view.map(noteCard).join('') : `<div class="card">No notes yet.</div>`;
}
noteForm.addEventListener('submit', e=>{
  e.preventDefault();
  const title = noteTitle.value.trim(); if(!title) return;
  notes.push({id:uid(), title, body:noteBody.value||'', ts:Date.now()});
  saveNotes(); renderNotes(); noteForm.reset(); noteTitle.focus();
});
noteList.addEventListener('click', e=>{
  const card = e.target.closest('.note'); if(!card) return;
  const id = card.dataset.id;
  const n = notes.find(x=>x.id===id); if(!n) return;
  if(e.target.classList.contains('rm')){
    notes = notes.filter(x=>x.id!==id); saveNotes(); renderNotes();
  }else if(e.target.classList.contains('edit')){
    const title = prompt('Edit title:', n.title); if(title===null) return;
    const body  = prompt('Edit body:', n.body);  if(body===null) return;
    n.title = title.trim() || n.title;
    n.body  = body; n.ts = Date.now();
    saveNotes(); renderNotes();
  }
});
noteSearch.addEventListener('input', renderNotes);

// ========= footer & init =========
$('#year').textContent = new Date().getFullYear();
renderTasks();
renderNotes();
reset(); // stopwatch into clean state
