const SVG_NS = 'http://www.w3.org/2000/svg';

const CELL = 100;

const PADDING = 30;

const SIDES = ['top', 'right', 'bottom', 'left'];

/**
 * Ponto inicial, ponto final, direção para fora da peça e sentido do percurso.
 * As bordas de baixo e da esquerda são percorridas ao contrário, então o
 * centro do pino é espelhado para que ele coincida com o encaixe da vizinha.
 */
const EDGE_GEOMETRY = {
  top: { from: [0, 0], to: [CELL, 0], normal: [0, -1], reversed: false },
  right: { from: [CELL, 0], to: [CELL, CELL], normal: [1, 0], reversed: false },
  bottom: { from: [CELL, CELL], to: [0, CELL], normal: [0, 1], reversed: true },
  left: { from: [0, CELL], to: [0, 0], normal: [-1, 0], reversed: true },
};

const SHAPE_CENTERS = [0.34, 0.5, 0.66, 0.5];

const SHAPE_SCALES = [1, 1.15, 0.88, 0.78];

const SHUFFLE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="stroke" d="M2 4.5h2.5c3 0 4 7 7 7H14M2 11.5h2.5c1.2 0 2-1 2.6-2.2M9 6.7c.6-1.2 1.4-2.2 2.5-2.2H14M12 2.5l2 2-2 2M12 9.5l2 2-2 2"/></svg>';

const SCENE = `
  <rect width="100" height="100" fill="url(#sky)"/>
  <circle cx="78" cy="20" r="14" fill="#ffe9a0" opacity="0.5"/>
  <circle cx="78" cy="20" r="9" fill="#ffd54a"/>
  <ellipse cx="22" cy="16" rx="9" ry="3.5" fill="#fff" opacity="0.9"/>
  <ellipse cx="30" cy="13" rx="7" ry="3.5" fill="#fff" opacity="0.9"/>
  <ellipse cx="58" cy="30" rx="8" ry="3" fill="#fff" opacity="0.8"/>
  <path d="M0 54 L16 30 L30 46 L44 24 L62 50 L76 38 L100 56 L100 100 L0 100Z" fill="#7d93b8"/>
  <path d="M16 30 L21 37 L11 37Z" fill="#fff"/>
  <path d="M44 24 L50 33 L38 33Z" fill="#fff"/>
  <path d="M0 64 Q25 52 50 62 T100 60 L100 100 L0 100Z" fill="#5fae6b"/>
  <ellipse cx="64" cy="77" rx="26" ry="8" fill="#4aa3df"/>
  <ellipse cx="60" cy="75" rx="12" ry="2" fill="#a8d8f5" opacity="0.8"/>
  <path d="M0 88 Q30 80 60 90 T100 86 L100 100 L0 100Z" fill="#2f7a46"/>
  <path d="M12 56 L19 74 L5 74Z" fill="#2d6a3e"/>
  <rect x="11" y="74" width="2.5" height="5" fill="#6b4a2b"/>
  <path d="M24 62 L30 76 L18 76Z" fill="#37804a"/>
  <rect x="23" y="76" width="2.5" height="4" fill="#6b4a2b"/>
  <rect x="34" y="78" width="16" height="11" fill="#f1d9a0"/>
  <path d="M32 78 L42 69 L52 78Z" fill="#c0392b"/>
  <rect x="40" y="82" width="4" height="7" fill="#7a4b2a"/>
  <rect x="46" y="80" width="3" height="3" fill="#8ec5ff"/>
  <circle cx="70" cy="93" r="1.6" fill="#e74c3c"/>
  <circle cx="78" cy="95" r="1.6" fill="#f1c40f"/>
  <circle cx="86" cy="92" r="1.6" fill="#e74c3c"/>
  <circle cx="94" cy="95" r="1.6" fill="#f1c40f"/>
  <path d="M58 12 q3 -3 6 0 q3 -3 6 0" stroke="#333" stroke-width="0.8" fill="none"/>
  <path d="M82 40 q2 -2 4 0 q2 -2 4 0" stroke="#333" stroke-width="0.8" fill="none"/>
`;

const elements = {};

const state = {
  size: 0,
  pieces: [],
  puzzle: '',
  initial: [],
  groups: [],
  looseLayer: null,
};

function parsePuzzle(value) {
  const [sizeText, edgesText] = value.split(':');
  const edges = edgesText.split(',').map(Number);
  const pieces = [];

  for (let index = 0; index < edges.length; index += 4) {
    pieces.push(edges.slice(index, index + 4));
  }

  return { size: Number(sizeText), pieces };
}

function point(origin, direction, normal, along, outward) {
  return [
    origin[0] + direction[0] * along + normal[0] * outward * CELL,
    origin[1] + direction[1] * along + normal[1] * outward * CELL,
  ];
}

/**
 * Comandos SVG de uma borda, começando no ponto inicial dela.
 * O valor da borda define o sentido (pino para fora, encaixe para dentro)
 * e o formato, que muda a posição e o tamanho do pino.
 */
function edgeCommands(side, edge) {
  const { from, to, normal, reversed } = EDGE_GEOMETRY[side];
  const direction = [to[0] - from[0], to[1] - from[1]];

  if (edge === 0) {
    return `L ${to[0]} ${to[1]}`;
  }

  const sign = edge > 0 ? 1 : -1;
  const shape = (Math.abs(edge) - 1) % SHAPE_CENTERS.length;
  const scale = SHAPE_SCALES[shape];
  const center = reversed ? 1 - SHAPE_CENTERS[shape] : SHAPE_CENTERS[shape];

  const at = (offset, height) => {
    const [x, y] = point(from, direction, normal, center + offset * scale, sign * height * scale);

    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };

  return [
    `L ${at(-0.07, 0)}`,
    `C ${at(-0.07, 0.05)} ${at(-0.1, 0.06)} ${at(-0.11, 0.11)}`,
    `C ${at(-0.12, 0.17)} ${at(-0.06, 0.22)} ${at(0, 0.22)}`,
    `C ${at(0.06, 0.22)} ${at(0.12, 0.17)} ${at(0.11, 0.11)}`,
    `C ${at(0.1, 0.06)} ${at(0.07, 0.05)} ${at(0.07, 0)}`,
    `L ${to[0]} ${to[1]}`,
  ].join(' ');
}

function outlinePath(edges) {
  const body = SIDES.map((side, index) => edgeCommands(side, edges[index])).join(' ');

  return `M 0 0 ${body} Z`;
}

function sidePath(side, edge) {
  const [x, y] = EDGE_GEOMETRY[side].from;

  return `M ${x} ${y} ${edgeCommands(side, edge)}`;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));

  return element;
}

function buildDefs(svg) {
  const defs = svgElement('defs');
  const gradient = svgElement('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 });

  gradient.append(
    svgElement('stop', { offset: '0', 'stop-color': '#8ec5ff' }),
    svgElement('stop', { offset: '1', 'stop-color': '#fde7b8' }),
  );

  const scene = svgElement('g', { id: 'scene' });
  const scale = (state.size * CELL) / 100;

  scene.setAttribute('transform', `scale(${scale})`);
  scene.innerHTML = SCENE;

  defs.append(gradient, scene);

  state.pieces.forEach((edges, id) => {
    const clip = svgElement('clipPath', { id: `clip-${id}` });

    clip.appendChild(svgElement('path', { d: outlinePath(edges) }));
    defs.appendChild(clip);
  });

  svg.appendChild(defs);
}

function buildPieces(svg) {
  const layer = svgElement('g', { class: 'pieces' });

  state.groups = state.pieces.map((edges, id) => {
    const group = svgElement('g', { class: 'piece' });
    const picture = svgElement('g', { 'clip-path': `url(#clip-${id})` });
    const column = id % state.size;
    const row = Math.floor(id / state.size);

    picture.appendChild(
      svgElement('use', { href: '#scene', transform: `translate(${-column * CELL} ${-row * CELL})` }),
    );
    group.append(picture, svgElement('path', { d: outlinePath(edges), class: 'outline' }));
    layer.appendChild(group);

    return group;
  });

  svg.appendChild(layer);
}

function buildBoard() {
  const total = state.size * CELL;
  const span = total + PADDING * 2;
  const svg = svgElement('svg', { viewBox: `${-PADDING} ${-PADDING} ${span} ${span}` });

  buildDefs(svg);
  svg.appendChild(svgElement('rect', { width: total, height: total, class: 'slot' }));
  buildPieces(svg);

  state.looseLayer = svgElement('g', { class: 'loose' });
  svg.appendChild(state.looseLayer);

  elements.board.replaceChildren(svg);
}

function positionOf(index) {
  return [(index % state.size) * CELL, Math.floor(index / state.size) * CELL];
}

function drawLooseEdges(placement, mismatches) {
  const paths = [];

  const mark = (position, side) => {
    const [x, y] = positionOf(position);
    const edge = state.pieces[placement[position]][SIDES.indexOf(side)];

    paths.push(svgElement('path', { d: sidePath(side, edge), transform: `translate(${x} ${y})` }));
  };

  mismatches.forEach(({ position, side }) => {
    mark(position, side);

    const isInnerRight = side === 'right' && position % state.size < state.size - 1;
    const isInnerBottom = side === 'bottom' && Math.floor(position / state.size) < state.size - 1;

    if (isInnerRight) mark(position + 1, 'left');
    if (isInnerBottom) mark(position + state.size, 'top');
  });

  state.looseLayer.replaceChildren(...paths);
}

function render(view) {
  view.placement.forEach((piece, position) => {
    const [x, y] = positionOf(position);

    state.groups[piece].style.transform = `translate(${x}px, ${y}px)`;
  });

  drawLooseEdges(view.placement, view.mismatches);
}

function shuffledPlacement(count) {
  const placement = Array.from({ length: count }, (_, index) => index);

  for (let index = count - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));

    [placement[index], placement[target]] = [placement[target], placement[index]];
  }

  return placement;
}

function showInitial() {
  render({ placement: state.initial, mismatches: [] });
}

function loadPuzzle(value) {
  if (!value) return;

  const { size, pieces } = parsePuzzle(value);

  state.puzzle = value;
  state.size = size;
  state.pieces = pieces;
  state.initial = shuffledPlacement(pieces.length);

  buildBoard();
  showInitial();
}

function shuffle() {
  state.initial = shuffledPlacement(state.pieces.length);
  showInitial();
}

function mount({ board, controls }) {
  elements.board = board;
  board.className = 'jigsaw-board';

  elements.shuffle = document.createElement('button');
  elements.shuffle.type = 'button';
  elements.shuffle.title = 'Embaralhar';
  elements.shuffle.innerHTML = `${SHUFFLE_ICON} Embaralhar`;
  elements.shuffle.addEventListener('click', shuffle);

  controls.replaceChildren(elements.shuffle);
}

export const jigsawGame = {
  id: 'jigsaw',
  label: 'Encaixe',
  supportsHotstart: true,
  defaults: {
    populationSize: 300,
    eliteCount: 15,
    mutationRate: 0.3,
    tournamentSize: 3,
    maxGenerations: 5000,
    stagnationLimit: 300,
  },
  mount,
  loadPuzzle,
  reset: showInitial,
  puzzle: () => state.puzzle,
  extraQuery: () => ({}),
  render,
  lock: (locked) => { elements.shuffle.disabled = locked; },
  describe: (result) => (result.bestFitness > 0 ? `${result.bestFitness} bordas soltas.` : ''),
  onFinish: () => {},
};
