// ----- Stopwatch logic -----
let startTime = 0;     // timestamp from performance.now()
let elapsed = 0;       // ms accumulated while paused/running
let running = false;
let rafId = null;

const timeEl = document.getElementById('time');
const btnStartPause = document.getElementById('startPause');
const btnLap = document.getElementById('lap');
const btnReset = document.getElementById('reset');
const btnExport = document.getElementById('export');
const btnClear = document.getElementById('clearLaps');
const lapRows = document.getElementById('lapRows');

const laps = [];           // {lap:ms, total:ms}
let lastLapTotal = 0;

function format(ms){
  // returns "MM:SS.CC" (minutes, seconds, centiseconds) or adds hours if needed
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return (h > 0 ? `${pad(h)}:` : '') + `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function update(){
  const now = performance.now();
  elapsed = now - startTime;
  timeEl.textContent = format(elapsed);
  rafId = requestAnimationFrame(update);
}

function start(){
  running = true;
  btnStartPause.textContent = 'Pause';
  btnStartPause.setAttribute('aria-pressed', 'true');
  btnLap.disabled = false;
  btnReset.disabled = false;
  btnExport.disabled = laps.length === 0;
  btnClear.disabled = laps.length === 0;

  startTime = performance.now() - elapsed;
  rafId = requestAnimationFrame(update);
}

function pause(){
  running = false;
  btnStartPause.textContent = 'Start';
  btnStartPause.setAttribute('aria-pressed', 'false');
  cancelAnimationFrame(rafId);
}

function reset(){
  pause();
  elapsed = 0;
  lastLapTotal = 0;
  timeEl.textContent = '00:00.00';
  laps.length = 0;
  lapRows.innerHTML = '';
  btnLap.disabled = true;
  btnReset.disabled = true;
  btnExport.disabled = true;
  btnClear.disabled = true;
}

function addLap(){
  const total = elapsed;
  const lapTime = total - lastLapTotal;
  lastLapTotal = total;

  laps.push({ lap: lapTime, total });
  renderLaps();
  btnExport.disabled = false;
  btnClear.disabled = false;
}

function renderLaps(){
  lapRows.innerHTML = laps.map((l, i) => `
    <div class="row">
      <span>${i + 1}</span>
      <span>${format(l.lap)}</span>
      <span>${format(l.total)}</span>
    </div>
  `).join('');
}

function exportCSV(){
  if (!laps.length) return;
  const header = 'Lap #,Lap,Total\n';
  const lines = laps.map((l, i) => `${i + 1},${format(l.lap)},${format(l.total)}`).join('\n');
  const csv = header + lines;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stopwatch_laps.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearLaps(){
  laps.length = 0;
  lastLapTotal = 0;
  lapRows.innerHTML = '';
  btnExport.disabled = true;
  btnClear.disabled = true;
}

// ----- Events -----
btnStartPause.addEventListener('click', () => running ? pause() : start());
btnLap.addEventListener('click', addLap);
btnReset.addEventListener('click', reset);
btnExport.addEventListener('click', exportCSV);
btnClear.addEventListener('click', clearLaps);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space'){ e.preventDefault(); running ? pause() : start(); }
  else if (e.key.toLowerCase() === 'l' && !btnLap.disabled){ addLap(); }
  else if (e.key.toLowerCase() === 'r' && !btnReset.disabled){ reset(); }
});

// Start in a clean state
reset();
