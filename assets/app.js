import { TOOLS, analyze } from '../lib/engines.js';
import { buildPrompt } from '../lib/prompt.js';
import { CONFIG } from './config.js';
import {
  randomHandle,
  normalizeHandle,
  validHandle,
  validPassphrase
} from '../lib/account.js';

const $ = (selector) => document.querySelector(selector);

const toolList = $('#toolList');
const toolMark = $('#toolMark');
const toolTag = $('#toolTag');
const toolTitle = $('#toolTitle');
const toolDesc = $('#toolDesc');
const form = $('#toolForm');
const runBtn = $('#runBtn');
const llmToggle = $('#llmToggle');
const timerBox = $('#timerBox');
const timerValue = $('#timerValue');
const sourceBadge = $('#sourceBadge');
const resultEmpty = $('#resultEmpty');
const resultBody = $('#resultBody');
const scoreLabel = $('#scoreLabel');
const scoreValue = $('#scoreValue');
const scoreMeter = $('#scoreMeter');
const resultTitle = $('#resultTitle');
const resultSummary = $('#resultSummary');
const metricsBox = $('#metrics');
const sectionsBox = $('#sections');
const modelLabel = $('#modelLabel');
const explanationText = $('#explanationText');
const notesList = $('#notesList');
const toast = $('#toast');
const accountHandle = $('#accountHandle');
const accountPass = $('#accountPass');
const accountLoggedOut = $('#accountLoggedOut');
const accountLoggedIn = $('#accountLoggedIn');
const accountHandleLabel = $('#accountHandleLabel');
const accountStatus = $('#accountStatus');

const NOTES_KEY = 'eduiq:saved-notes';
let accountState = { handle: null };
let currentTool = TOOLS[0];
let currentResult = null;
let currentPrompt = '';
let timerId = null;
let toastId = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  if (toastId) clearTimeout(toastId);
  toastId = setTimeout(() => toast.classList.remove('show'), 3200);
}

function setAccountStatus(message) {
  accountStatus.textContent = message || '';
}

function showAccountSignedIn(handle) {
  accountState.handle = handle;
  accountLoggedOut.hidden = true;
  accountLoggedIn.hidden = false;
  accountHandleLabel.textContent = handle;
}

function showAccountSignedOut() {
  accountState.handle = null;
  accountLoggedOut.hidden = false;
  accountLoggedIn.hidden = true;
  accountHandleLabel.textContent = '';
}

async function accountFetch(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  return fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin'
  });
}

async function syncNotes(silent = false) {
  if (!accountState.handle) {
    if (!silent) setAccountStatus('Sign in or create a workspace first.');
    return;
  }

  try {
    const response = await accountFetch('/api/account/notes', {
      method: 'POST',
      body: JSON.stringify({ notes: loadNotes() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sync failed.');
    if (!silent) setAccountStatus('Notes synced to your workspace.');
  } catch (error) {
    if (!silent) setAccountStatus(error.message || 'Sync failed.');
  }
}

async function loadCloudNotes(pushIfEmpty = true) {
  try {
    const response = await accountFetch('/api/account/notes');
    if (!response.ok) return;
    const data = await response.json();
    const notes = Array.isArray(data.notes) ? data.notes : [];

    if (notes.length) {
      saveNotes(notes);
      renderNotes();
    } else if (pushIfEmpty && loadNotes().length) {
      await syncNotes(true);
    }
  } catch {
    // Local notes remain available even if cloud sync is unavailable.
  }
}

async function checkAccount() {
  try {
    const response = await accountFetch('/api/account/me');
    const data = await response.json();
    if (!response.ok || !data.signedIn) {
      showAccountSignedOut();
      return;
    }
    showAccountSignedIn(data.handle);
    await loadCloudNotes(true);
  } catch {
    showAccountSignedOut();
  }
}

async function accountAction(endpoint) {
  const handle = normalizeHandle(accountHandle.value);
  const passphrase = accountPass.value;
  accountHandle.value = handle;

  if (!validHandle(handle)) {
    setAccountStatus('Use 4 to 24 letters, numbers, or hyphens.');
    return;
  }
  if (!validPassphrase(passphrase)) {
    setAccountStatus('Passphrase needs at least 10 characters.');
    return;
  }

  setAccountStatus('Working…');
  try {
    const response = await accountFetch('/api/account/' + endpoint, {
      method: 'POST',
      body: JSON.stringify({ handle, passphrase })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');

    accountPass.value = '';
    await checkAccount();
    setAccountStatus(endpoint === 'register' ? 'Workspace created.' : 'Signed in.');
  } catch (error) {
    setAccountStatus(error.message || 'Request failed.');
  }
}

function renderToolList() {
  toolList.replaceChildren();

  for (const tool of TOOLS) {
    const button = make('button', 'tool-button');
    button.type = 'button';
    button.dataset.tool = tool.id;
    button.setAttribute('aria-label', tool.name + ' — ' + tool.tag);

    const mark = make('span', 'mini-mark', tool.mark);
    const copy = make('span', 'tool-name');
    copy.append(make('strong', '', tool.name), make('small', '', tool.tag));
    const arrow = make('span', 'tool-arrow', '›');

    button.append(mark, copy, arrow);
    button.addEventListener('click', () => selectTool(tool));
    toolList.append(button);
  }
}

function fieldElement(field) {
  let node;

  if (field.type === 'textarea') {
    node = document.createElement('textarea');
    node.rows = field.name === 'code' || field.name === 'resume' ? 7 : 4;
  } else if (field.type === 'select') {
    node = document.createElement('select');
    for (const option of field.options || []) {
      const choice = document.createElement('option');
      choice.value = option;
      choice.textContent = option;
      node.append(choice);
    }
  } else {
    node = document.createElement('input');
    node.type = field.type;
    if (field.min) node.min = field.min;
    if (field.max) node.max = field.max;
    if (field.step) node.step = field.step;
  }

  node.id = 'field-' + field.name;
  node.name = field.name;
  if (field.placeholder) node.placeholder = field.placeholder;
  if (field.limit && field.type !== 'select' && field.type !== 'date') {
    node.maxLength = field.limit;
  }

  let defaultValue = field.defaultValue || '';
  if (field.name === 'examDate' && !defaultValue) {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 21);
    defaultValue = future.toISOString().slice(0, 10);
  }

  if (field.type === 'select' && defaultValue) node.value = defaultValue;
  else node.value = defaultValue;

  return node;
}

function renderForm(tool) {
  form.replaceChildren();

  for (const field of tool.fields) {
    const wrapper = make('div', 'field');
    const label = make('label', '', field.label);
    label.htmlFor = 'field-' + field.name;
    const node = fieldElement(field);

    wrapper.append(label, node);
    if (field.type === 'textarea') {
      wrapper.append(make('span', 'field-hint', 'Processed in your browser only.'));
    }
    form.append(wrapper);
  }
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  timerBox.hidden = true;
}

function startTimer(minutes) {
  stopTimer();
  const duration = Math.min(60, Math.max(1, Math.round(minutes || 10)));
  const end = Date.now() + duration * 60 * 1000;
  timerBox.hidden = false;

  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const totalSeconds = Math.ceil(left / 1000);
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    timerValue.textContent = mins + ':' + secs;

    if (left <= 0) {
      stopTimer();
      timerValue.textContent = '00:00';
      showToast('Mock time is up. Review your answer now.');
    }
  };

  tick();
  timerId = setInterval(tick, 1000);
}

function selectTool(tool) {
  currentTool = tool;
  currentResult = null;
  currentPrompt = '';
  stopTimer();

  for (const button of toolList.querySelectorAll('.tool-button')) {
    button.classList.toggle('active', button.dataset.tool === tool.id);
  }

  toolMark.textContent = tool.mark;
  toolTag.textContent = tool.tag;
  toolTitle.textContent = tool.name;
  toolDesc.textContent = tool.description;
  renderForm(tool);

  resultEmpty.hidden = false;
  resultBody.hidden = true;
  sourceBadge.textContent = 'Rule engine (offline)';
}

function collectInput() {
  const input = {};
  for (const field of currentTool.fields) {
    const node = document.getElementById('field-' + field.name);
    input[field.name] = node ? node.value : '';
  }
  return input;
}

function renderResult(result) {
  scoreLabel.textContent = result.scoreLabel;
  scoreValue.textContent = result.score === null ? '—' : String(result.score);
  scoreMeter.value = result.score === null ? 0 : result.score;
  resultTitle.textContent = result.title;
  resultSummary.textContent = result.summary;
  explanationText.textContent = result.explanation;
  modelLabel.textContent = 'Rule fallback ready';
  sourceBadge.textContent = 'Rule engine (offline)';

  metricsBox.replaceChildren();
  for (const metric of result.metrics) {
    const card = make('div', 'metric');
    card.append(
      make('span', '', metric.label),
      make('strong', '', metric.value),
      make('small', '', metric.hint)
    );
    metricsBox.append(card);
  }

  sectionsBox.replaceChildren();
  for (const section of result.sections) {
    const block = make('section', 'section');
    block.append(make('h3', '', section.title));
    const list = document.createElement('ul');
    for (const item of section.items) list.append(make('li', '', item));
    block.append(list);
    sectionsBox.append(block);
  }

  resultEmpty.hidden = true;
  resultBody.hidden = false;
}

async function explainWithLlm(result) {
  sourceBadge.textContent = 'Connecting to local LLM…';
  modelLabel.textContent = 'Local bridge';

  try {
    const response = await fetch(CONFIG.bridgeUrl + '/api/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: currentPrompt })
    });

    if (!response.ok) throw new Error('Bridge unavailable');
    const data = await response.json();
    if (!data.text) throw new Error('Empty LLM response');

    explanationText.textContent = data.text;
    sourceBadge.textContent = 'Local ' + (data.model || 'open LLM');
    modelLabel.textContent = 'Local open LLM';
  } catch {
    explanationText.textContent = result.explanation;
    sourceBadge.textContent = 'Rule engine (offline)';
    modelLabel.textContent = 'Rule fallback';
  }
}

async function runAnalysis() {
  const input = collectInput();
  runBtn.disabled = true;
  runBtn.textContent = 'Working…';

  try {
    const result = analyze(currentTool.id, input);
    currentResult = result;
    currentPrompt = buildPrompt(currentTool, input, result);
    renderResult(result);

    if (currentTool.id === 'placement') {
      startTimer(Number(input.minutes) || 10);
    }

    if (llmToggle.checked) {
      await explainWithLlm(result);
    }
  } catch (error) {
    showToast(error.message || 'Could not run this analysis.');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'Run analysis';
  }
}

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 8)));
  } catch {
    showToast('Browser storage is unavailable.');
  }
}

function renderNotes() {
  const notes = loadNotes();
  notesList.replaceChildren();

  if (!notes.length) {
    notesList.append(make('p', 'notes-empty', 'No saved notes yet.'));
    return;
  }

  notes.forEach((note, index) => {
    const item = make('div', 'note-item');
    const copy = make('div');
    copy.append(make('strong', '', note.tool + ' — ' + note.title), make('span', '', note.summary));
    const remove = make('button', 'note-remove', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      const next = loadNotes();
      next.splice(index, 1);
      saveNotes(next);
      renderNotes();
    });
    item.append(copy, remove);
    notesList.append(item);
  });
}

function saveCurrentNote() {
  if (!currentResult) {
    showToast('Run an analysis first.');
    return;
  }

  const notes = loadNotes();
  notes.unshift({
    tool: currentResult.toolName,
    title: currentResult.title,
    summary: currentResult.summary,
    created: new Date().toISOString().slice(0, 10)
  });
  saveNotes(notes);
  renderNotes();
  showToast('Note saved in this browser.');
  if (accountState.handle) syncNotes(true);
}

function copyCurrentResult() {
  if (!currentResult) {
    showToast('Run an analysis first.');
    return;
  }

  const lines = [
    currentResult.toolName + ' — ' + currentResult.title,
    currentResult.summary,
    currentResult.score === null ? '' : currentResult.scoreLabel + ': ' + currentResult.score + '/100',
    '',
    'Explanation: ' + explanationText.textContent,
    ''
  ];

  for (const section of currentResult.sections) {
    lines.push(section.title + ':');
    for (const item of section.items) lines.push('- ' + item);
    lines.push('');
  }

  const text = lines.join('\n').trim();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Result copied.'))
      .catch(() => showToast('Copy is not allowed in this browser.'));
  } else {
    showToast('Copy is not supported in this browser.');
  }
}

runBtn.addEventListener('click', runAnalysis);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  runAnalysis();
});
$('#copyBtn').addEventListener('click', copyCurrentResult);
$('#saveBtn').addEventListener('click', saveCurrentNote);
$('#clearNotesBtn').addEventListener('click', () => {
  saveNotes([]);
  renderNotes();
  showToast('Saved notes cleared.');
  if (accountState.handle) syncNotes(true);
});

$('#suggestHandleBtn').addEventListener('click', () => {
  accountHandle.value = randomHandle();
  setAccountStatus('Handle suggested. You can change it.');
});
$('#registerBtn').addEventListener('click', () => accountAction('register'));
$('#loginBtn').addEventListener('click', () => accountAction('login'));
$('#syncBtn').addEventListener('click', () => syncNotes(false));
$('#signoutBtn').addEventListener('click', async () => {
  try {
    await accountFetch('/api/account/logout', { method: 'POST' });
  } catch {
    // Clear the local view even if the network call fails.
  }
  showAccountSignedOut();
  setAccountStatus('Signed out. Local notes are still here.');
});

renderToolList();
selectTool(TOOLS[0]);
renderNotes();
checkAccount();
