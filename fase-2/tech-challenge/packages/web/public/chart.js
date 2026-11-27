const COLOR_TOKENS = ['best', 'average', 'diversity', 'restart', 'grid', 'text'];

const COLORS = {};

const HEIGHT = 260;

const PADDING = { top: 14, right: 44, bottom: 28, left: 44 };

const GRID_LINES = 4;

/**
 * Desenha o fitness (eixo da esquerda) e a proporção de soluções únicas
 * (eixo da direita, de 0 a 100%) ao longo das gerações. Cada reinício
 * da população aparece como uma linha vertical tracejada.
 */
export function drawChart(canvas, history) {
  readColors(canvas);

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(HEIGHT * ratio);
  canvas.style.height = `${HEIGHT}px`;

  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, HEIGHT);
  context.font = `11px ${getComputedStyle(canvas).getPropertyValue('--font-mono')}`;

  const plot = {
    left: PADDING.left,
    top: PADDING.top,
    width: Math.max(10, width - PADDING.left - PADDING.right),
    height: HEIGHT - PADDING.top - PADDING.bottom,
  };

  if (history.length < 2) {
    context.fillStyle = COLORS.text;
    context.fillText('O gráfico aparece quando a evolução começa.', plot.left, plot.top + plot.height / 2);
    return;
  }

  const lastGeneration = Math.max(history[history.length - 1].generation, 1);
  const maxFitness = Math.max(1, ...history.map((point) => Math.max(point.averageFitness, point.currentBestFitness)));

  const toX = (generation) => plot.left + (generation / lastGeneration) * plot.width;
  const toFitnessY = (fitness) => plot.top + plot.height - (fitness / maxFitness) * plot.height;
  const toShareY = (share) => plot.top + plot.height - share * plot.height;

  drawGrid(context, plot, maxFitness);
  drawRestarts(context, plot, history, toX);
  drawLine(context, history, (point) => [toX(point.generation), toFitnessY(point.averageFitness)], COLORS.average, 1.5);
  drawLine(context, history, (point) => [toX(point.generation), toShareY(point.uniqueRatio)], COLORS.diversity, 1.5, [5, 4]);
  drawLine(context, history, (point) => [toX(point.generation), toFitnessY(point.currentBestFitness)], COLORS.best, 2.2);
  drawGenerationAxis(context, plot, lastGeneration, toX);
}

/**
 * As cores vêm das variáveis CSS, para o gráfico acompanhar o tema.
 */
function readColors(canvas) {
  const style = getComputedStyle(canvas);

  COLOR_TOKENS.forEach((token) => {
    COLORS[token] = style.getPropertyValue(`--chart-${token}`).trim();
  });
}

function drawGrid(context, plot, maxFitness) {
  context.strokeStyle = COLORS.grid;
  context.lineWidth = 1;
  context.fillStyle = COLORS.text;

  for (let step = 0; step <= GRID_LINES; step++) {
    const share = step / GRID_LINES;
    const y = plot.top + plot.height - share * plot.height;

    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.left + plot.width, y);
    context.stroke();

    context.textAlign = 'right';
    context.fillText(formatFitness(maxFitness * share), plot.left - 6, y + 4);

    context.textAlign = 'left';
    context.fillText(`${Math.round(share * 100)}%`, plot.left + plot.width + 6, y + 4);
  }

  context.textAlign = 'left';
}

function drawRestarts(context, plot, history, toX) {
  context.strokeStyle = COLORS.restart;
  context.lineWidth = 1;
  context.setLineDash([3, 3]);

  for (let index = 1; index < history.length; index++) {
    if (history[index].restarts > history[index - 1].restarts) {
      const x = toX(history[index].generation);

      context.beginPath();
      context.moveTo(x, plot.top);
      context.lineTo(x, plot.top + plot.height);
      context.stroke();
    }
  }

  context.setLineDash([]);
}

function drawLine(context, history, toPoint, color, lineWidth, dash = []) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.setLineDash(dash);
  context.beginPath();

  history.forEach((point, index) => {
    const [x, y] = toPoint(point);

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();
  context.setLineDash([]);
}

function drawGenerationAxis(context, plot, lastGeneration, toX) {
  const y = plot.top + plot.height + 18;
  const ticks = [0, Math.round(lastGeneration / 2), lastGeneration];

  context.fillStyle = COLORS.text;
  context.textAlign = 'center';
  ticks.forEach((generation) => context.fillText(String(generation), toX(generation), y));
  context.textAlign = 'left';
}

function formatFitness(value) {
  if (value === 0) return '0';

  return value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace('.', ',');
}
