'use strict';
const $ = id => document.getElementById(id);
const scenarios = {
  kepler: { name: 'Kepler Expanse', sector: '07', color: '#c4f46d', description: 'Trace a signal through a field of uncharted worlds.', coordinates: 'RA 19h 54m · DEC +43° 57′', planet: 'KEPLER-186F' },
  europa: { name: 'Europa Drift', sector: '02', color: '#80caff', description: 'Map the fractures beneath an ocean moon’s frozen surface.', coordinates: 'RA 04h 35m · DEC +22° 15′', planet: 'EUROPA' },
  orion: { name: 'Orion Veil', sector: '12', color: '#d4a5ff', description: 'Find order in the noise of a stellar nursery.', coordinates: 'RA 05h 35m · DEC −05° 23′', planet: 'ORION / M42' }
};
let current = null, timer = null, busy = false;
const history = [];
let seed = 42;
function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
for (let i = 0; i < 100; i++) {
  const star = document.createElement('i'); star.className = 'star';
  const size = random() > .9 ? 2 : 1;
  Object.assign(star.style, { left: `${random() * 100}%`, top: `${random() * 100}%`, width: `${size}px`, height: `${size}px`, opacity: String(.15 + random() * .55) });
  $('spaceMap').prepend(star);
}
for (let i = 0; i < 22; i++) { const bar = document.createElement('i'); bar.style.height = `${3 + random() * 12}px`; $('sparkline').append(bar); }
function formatTime(t) { return `00:${String(t).padStart(2, '0')}`; }
function selectScenario() {
  const s = scenarios[$('scenario').value];
  $('mapTitle').replaceChildren(document.createTextNode(s.name + ' '));
  const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = 'SECTOR ' + s.sector; $('mapTitle').append(tag);
  $('scenarioDescription').textContent = s.description;
  $('mapCoordinates').textContent = s.coordinates;
  document.querySelector('.label-one').textContent = s.planet;
  document.querySelector('.map-id').textContent = `${s.sector} / ${$('scenario').value.toUpperCase()}`;
  document.documentElement.style.setProperty('--accent', s.color);
}
$('scenario').addEventListener('change', selectScenario);
$('probes').addEventListener('input', () => { $('probeValue').innerHTML = `${String($('probes').value).padStart(2, '0')} <small>PROBES</small>`; });
function showPage(page) {
  for (const name of ['overview', 'archive', 'about']) { $(name).hidden = name !== page; $(name + 'Nav').classList.toggle('active', name === page); }
  $('pageLabel').textContent = { overview: 'Mission control', archive: 'Mission archive', about: 'About this project' }[page];
  if (page === 'archive') renderArchive();
}
for (const page of ['overview', 'archive', 'about']) $(page + 'Nav').addEventListener('click', () => showPage(page));
async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Request failed (${response.status}).`); }
  return response.json();
}
function lockControls(locked) { $('scenario').disabled = locked; $('probes').disabled = locked; $('launch').disabled = locked; }
function render(mission) {
  current = mission;
  const complete = mission.status === 'Complete';
  $('mapState').textContent = complete ? '● SURVEY COMPLETE' : '● LIVE SURVEY'; $('mapState').classList.add('active');
  $('coverage').innerHTML = `${mission.coverage.toFixed(1)}<small>%</small>`;
  $('samples').innerHTML = `${mission.samples.toLocaleString()}<small>pts</small>`;
  $('anomalies').innerHTML = `${mission.anomalies}<small>signals</small>`;
  $('coverageBar').style.width = `${mission.coverage}%`;
  $('coverageHint').textContent = complete ? 'Survey area successfully mapped' : 'Mapping the unknown, one signal at a time';
  $('anomalyHint').textContent = mission.anomalies ? 'Spectral signatures confirmed' : 'Listening for the unexpected';
  document.querySelector('.anomaly-icons').classList.toggle('found', mission.anomalies > 0);
  $('elapsed').textContent = `T+${formatTime(mission.tick)}`;
  $('progressValue').textContent = mission.progress + '%'; $('progressBar').style.width = mission.progress + '%';
  $('progressText').textContent = complete ? 'Expedition complete · report ready' : mission.tick < 3 ? 'Deploying fleet…' : 'Autonomous survey in progress';
  $('connection').innerHTML = complete ? 'Survey archived <b>✓</b>' : 'Uplink established <b>↗</b>';
  $('fleetCount').textContent = `${String(mission.probes).padStart(2, '0')} ${complete ? 'RETURNED' : 'ONLINE'}`;
  const desired = new Set(mission.fleet.map(p => 'probe-' + p.id));
  for (const node of [...$('fleet').children]) if (!desired.has(node.id)) node.remove();
  for (const probe of mission.fleet) {
    let node = $('probe-' + probe.id);
    if (!node) { node = document.createElement('div'); node.className = 'probe'; node.id = 'probe-' + probe.id; const label = document.createElement('span'); label.textContent = probe.name; node.append(label); $('fleet').append(node); }
    node.style.left = probe.x + '%'; node.style.top = probe.y + '%';
  }
  $('fleetRows').replaceChildren(...mission.fleet.map(probe => {
    const row = document.createElement('div'); row.className = 'fleet-row';
    for (const value of [probe.name, probe.signal + '% ▥', probe.status]) { const span = document.createElement('span'); span.textContent = value; row.append(span); }
    return row;
  }));
  const eventCount = $('events').querySelectorAll('.event').length;
  if (eventCount !== mission.events.length) {
    $('events').replaceChildren(...[...mission.events].reverse().map(event => {
      const node = document.createElement('div'); node.className = 'event';
      const time = document.createElement('time'); time.textContent = formatTime(event.tick);
      const category = document.createElement('b'); category.textContent = event.category;
      const message = document.createElement('span'); message.textContent = event.message;
      node.append(time, category, message); return node;
    }));
  }
  for (const [i, bar] of [...$('sparkline').children].entries()) bar.style.height = `${3 + ((mission.tick * 3 + i * 7) % 20)}px`;
  $('export').disabled = false;
  $('launch').innerHTML = complete ? 'Launch another expedition <span>↗</span>' : `Exploring · ${mission.progress}% <span>⌁</span>`;
  $('launchNote').textContent = complete ? 'Discovery is a habit. Where to next?' : 'Your probes are exploring. Sit back and watch.';
  lockControls(!complete);
  const existing = history.findIndex(x => x.id === mission.id);
  if (existing >= 0) history[existing] = mission; else history.unshift(mission);
  $('archiveCount').textContent = String(history.length).padStart(2, '0');
  if (!$('archive').hidden) renderArchive();
}
async function poll() {
  if (!current || busy) return;
  busy = true;
  try {
    const mission = await api('/api/missions/' + current.id); render(mission);
    if (mission.status === 'Complete') { clearInterval(timer); timer = null; }
  } catch (error) {
    clearInterval(timer); timer = null; lockControls(false);
    $('launch').innerHTML = 'Launch new expedition <span>↗</span>';
    $('launchNote').textContent = `${error.message} You can start a new expedition.`;
    $('mapState').textContent = '● CONNECTION LOST';
  } finally { busy = false; }
}
$('launch').addEventListener('click', async () => {
  lockControls(true); $('launchNote').textContent = 'Establishing uplink…';
  clearInterval(timer); timer = null;
  try {
    const mission = await api('/api/missions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: $('scenario').value, probes: Number($('probes').value) }) });
    $('fleet').replaceChildren(); $('events').replaceChildren(); render(mission);
    timer = setInterval(poll, 1000);
  } catch (error) { lockControls(false); $('launchNote').textContent = error.message; }
});
$('export').addEventListener('click', () => {
  if (!current) return;
  const blob = new Blob([JSON.stringify({ application: 'ATLAS', simulated: true, exportedAt: new Date().toISOString(), ...current }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `atlas-${current.scenario}-${current.id.slice(0, 8)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function renderArchive() {
  if (!history.length) { $('archiveList').innerHTML = '<div class="archive-empty">No expeditions yet. Launch your first mission from Mission control.</div>'; return; }
  $('archiveList').replaceChildren(...history.map(mission => {
    const button = document.createElement('button'); button.className = 'archive-card';
    const label = document.createElement('div'); const title = document.createElement('strong'); title.textContent = scenarios[mission.scenario].name;
    const detail = document.createElement('small'); detail.textContent = `${mission.id.slice(0, 8).toUpperCase()} · ${mission.probes} PROBES · ${mission.samples.toLocaleString()} SAMPLES`;
    const status = document.createElement('span'); status.textContent = `${mission.status.toUpperCase()} / ${mission.progress}% ↗`;
    label.append(title, detail); button.append(label, status);
    button.addEventListener('click', () => {
      if (current && current.status !== 'Complete' && current.id !== mission.id && timer) { $('launchNote').textContent = 'Finish the active expedition before inspecting an earlier mission.'; showPage('overview'); return; }
      $('scenario').value = mission.scenario; $('probes').value = mission.probes; $('probes').dispatchEvent(new Event('input')); selectScenario(); $('fleet').replaceChildren(); $('events').replaceChildren(); render(mission); showPage('overview');
    }); return button;
  }));
}
