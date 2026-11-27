import { drawChart } from './chart.js';
import { jigsawGame } from './jigsaw.js';

const GAMES = [jigsawGame];

const PARAMETERS = [
  'populationSize',
  'eliteCount',
  'mutationRate',
  'tournamentSize',
  'maxGenerations',
  'stagnationLimit',
];

const STATUS_MESSAGES = {
  solved: 'Resolvido.',
  exhausted: 'Limite de gerações atingido sem solução completa.',
  cancelled: 'Execução interrompida.',
};

const HIGH_DIVERSITY = 0.6;

const LOW_DIVERSITY = 0.2;

const elements = {
  tabs: document.getElementById('tabs'),
  title: document.getElementById('title'),
  board: document.getElementById('board'),
  controls: document.getElementById('controls'),
  status: document.getElementById('status'),
  puzzle: document.getElementById('puzzle'),
  solve: document.getElementById('solve'),
  stop: document.getElementById('stop'),
  reset: document.getElementById('reset'),
  runIndicator: document.getElementById('runIndicator'),
  chart: document.getElementById('chart'),
  hotstartField: document.getElementById('hotstartField'),
  hotstartPercent: document.getElementById('hotstartPercent'),
  generation: document.getElementById('generation'),
  speed: document.getElementById('speed'),
  bestFitness: document.getElementById('bestFitness'),
  improvement: document.getElementById('improvement'),
  averageFitness: document.getElementById('averageFitness'),
  deviation: document.getElementById('deviation'),
  diversity: document.getElementById('diversity'),
  entropy: document.getElementById('entropy'),
  stagnation: document.getElementById('stagnation'),
  stagnationBar: document.getElementById('stagnationBar'),
  nextRestart: document.getElementById('nextRestart'),
  restarts: document.getElementById('restarts'),
  restartInterval: document.getElementById('restartInterval'),
};

const state = {
  game: null,
  history: [],
  source: null,
  params: null,
};

function formatNumber(value, decimals = 1) {
  return value.toFixed(decimals).replace('.', ',');
}

function hotstartRatio() {
  return state.game.supportsHotstart ? Number(elements.hotstartPercent.value) / 100 : 0;
}

function readParams() {
  const params = Object.fromEntries(PARAMETERS.map((name) => [name, Number(document.getElementById(name).value)]));

  return { ...params, hotstartRatio: hotstartRatio() };
}

function diversityLevel(ratio) {
  if (ratio >= HIGH_DIVERSITY) return 'alta';
  if (ratio >= LOW_DIVERSITY) return 'média';

  return 'baixa';
}

function renderIndicators() {
  const latest = state.history[state.history.length - 1];
  const params = state.params ?? readParams();

  if (!latest) {
    const empty = ['generation', 'bestFitness', 'averageFitness', 'diversity', 'stagnation', 'restarts'];
    const emptyDetails = ['speed', 'improvement', 'deviation', 'entropy', 'nextRestart', 'restartInterval'];

    empty.forEach((name) => { elements[name].textContent = name === 'generation' || name === 'restarts' ? '0' : '-'; });
    emptyDetails.forEach((name) => { elements[name].textContent = '-'; });
    elements.diversity.removeAttribute('data-level');
    elements.stagnationBar.style.width = '0%';
    return;
  }

  const first = state.history[0];
  const seconds = latest.elapsedMs / 1000;
  const limit = params.stagnationLimit;
  const stalled = Math.min(latest.stagnantGenerations, limit);
  const level = diversityLevel(latest.uniqueRatio);

  elements.generation.textContent = latest.generation;
  elements.speed.textContent = seconds > 0 ? `${formatNumber(latest.generation / seconds, 0)} gerações/s` : '-';

  elements.bestFitness.textContent = latest.bestFitness;
  elements.improvement.textContent = first.bestFitness > 0
    ? `${Math.round((1 - latest.bestFitness / first.bestFitness) * 100)}% menor que na geração 0`
    : '-';

  elements.averageFitness.textContent = formatNumber(latest.averageFitness);
  elements.deviation.textContent = `desvio padrão ${formatNumber(latest.fitnessStdDev)}`;

  elements.diversity.textContent = `${Math.round(latest.uniqueRatio * 100)}%`;
  elements.diversity.dataset.level = level;
  elements.entropy.textContent = `entropia ${formatNumber(latest.entropy, 2)}, ${level}`;

  elements.stagnation.textContent = `${stalled} de ${limit}`;
  elements.stagnationBar.style.width = `${Math.round((stalled / limit) * 100)}%`;
  elements.nextRestart.textContent = latest.bestFitness === 0
    ? 'resolvido'
    : stalled >= limit
      ? 'reinicia nesta geração'
      : `próximo reinício em ${limit - stalled} gerações`;

  elements.restarts.textContent = latest.restarts;
  elements.restartInterval.textContent = latest.restarts > 0
    ? `um a cada ${Math.round(latest.generation / latest.restarts)} gerações`
    : 'nenhum ainda';
}

function refreshAnalysis() {
  renderIndicators();
  drawChart(elements.chart, state.history);
}

function resetStats() {
  state.history = [];
  state.params = null;
  refreshAnalysis();
  setStatus('Escolha um tabuleiro e clique em resolver.');
}

function setStatus(message, solved = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle('solved', solved);
}

function setRunning(running) {
  elements.solve.disabled = running;
  elements.stop.disabled = !running;
  elements.reset.disabled = running;
  elements.runIndicator.classList.toggle('running', running);
  elements.runIndicator.title = running ? 'Executando' : 'Parado';
  elements.puzzle.disabled = running;
  PARAMETERS.forEach((name) => { document.getElementById(name).disabled = running; });
  elements.hotstartPercent.disabled = running;
  state.game.lock(running);
}

function buildQuery() {
  const query = new URLSearchParams({ puzzle: state.game.puzzle() });

  for (const name of PARAMETERS) {
    query.set(name, document.getElementById(name).value);
  }

  if (state.game.supportsHotstart) {
    query.set('hotstartRatio', String(hotstartRatio()));
  }

  for (const [name, value] of Object.entries(state.game.extraQuery())) {
    query.set(name, value);
  }

  return query;
}

function solve() {
  state.history = [];
  state.params = readParams();

  setRunning(true);
  setStatus('Evoluindo população...');
  refreshAnalysis();

  const source = new EventSource(`/api/games/${state.game.id}/solve?${buildQuery()}`);
  state.source = source;

  source.addEventListener('progress', (event) => {
    const progress = JSON.parse(event.data);

    state.history.push(progress);
    state.game.render(progress.view);
    refreshAnalysis();
  });

  source.addEventListener('done', (event) => {
    const result = JSON.parse(event.data);
    const seconds = (result.elapsedMs / 1000).toFixed(1).replace('.', ',');
    const detail = state.game.describe(result);
    const last = state.history[state.history.length - 1];

    state.history.push(result);

    state.game.render(result.view);
    finish(
      `${STATUS_MESSAGES[result.status]} Geração ${result.generation}, ${seconds}s. ${detail}`.trim(),
      result.status === 'solved',
    );
    refreshAnalysis();
    state.game.onFinish(result);
  });

  source.addEventListener('failure', (event) => {
    finish(JSON.parse(event.data).message);
  });

  source.onerror = () => {
    if (state.source) finish('Conexão com o servidor perdida.');
  };
}

function stop() {
  finish(STATUS_MESSAGES.cancelled);
  refreshAnalysis();
}

function finish(message, solved = false) {
  if (state.source) {
    state.source.close();
    state.source = null;
  }

  setRunning(false);
  setStatus(message, solved);
}

function applyDefaults(game) {
  for (const name of PARAMETERS) {
    document.getElementById(name).value = game.defaults[name];
  }

  elements.hotstartPercent.value = '0';
  elements.hotstartField.hidden = !game.supportsHotstart;
}

function selectCustomPreset() {
  if (state.game.customPreset) elements.puzzle.value = state.game.customPreset.id;
}

async function loadPresets(game) {
  const response = await fetch(`/api/games/${game.id}/puzzles`);
  const presets = [...(await response.json())];

  if (game.customPreset) presets.push(game.customPreset);

  elements.puzzle.replaceChildren(
    ...presets.map((preset) => {
      const option = document.createElement('option');

      option.value = preset.id;
      option.textContent = preset.label;
      option.dataset.value = preset.value;

      return option;
    }),
  );

  game.loadPuzzle(presets[0].value);
}

async function selectGame(game) {
  if (state.source) finish(STATUS_MESSAGES.cancelled);

  state.game = game;
  elements.title.textContent = game.label;
  elements.board.replaceChildren();
  elements.board.removeAttribute('style');
  elements.controls.replaceChildren();

  [...elements.tabs.children].forEach((tab) => tab.classList.toggle('active', tab.dataset.game === game.id));

  game.mount({
    board: elements.board,
    controls: elements.controls,
    markCustom: selectCustomPreset,
    afterChange: resetStats,
    notify: setStatus,
  });
  applyDefaults(game);
  resetStats();
  await loadPresets(game);
}

function buildTabs() {
  if (GAMES.length < 2) return;

  for (const game of GAMES) {
    const tab = document.createElement('button');

    tab.type = 'button';
    tab.dataset.game = game.id;
    tab.textContent = game.label;
    tab.addEventListener('click', () => selectGame(game));
    elements.tabs.appendChild(tab);
  }
}

elements.puzzle.addEventListener('change', () => {
  const option = elements.puzzle.selectedOptions[0];

  state.game.loadPuzzle(option.dataset.value);
  resetStats();
});
elements.solve.addEventListener('click', solve);
elements.stop.addEventListener('click', stop);
elements.reset.addEventListener('click', () => {
  state.game.reset();
  resetStats();
});

new ResizeObserver(() => drawChart(elements.chart, state.history)).observe(elements.chart.parentElement);

buildTabs();
selectGame(GAMES[0]);
