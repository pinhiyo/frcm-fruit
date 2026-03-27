import Matter from 'matter-js';

const FRUITS = [
  { name: 'Cherry', radius: 33 / 2, color: '#f00', emoji: '🍒', score: 1, imageName: 'Cherry.png' },
  { name: 'Strawberry', radius: 48 / 2, color: '#f00', emoji: '🍓', score: 3, imageName: 'Strawberry.png' },
  { name: 'Grape', radius: 61 / 2, color: '#800080', emoji: '🍇', score: 6, imageName: 'Grape.png' },
  { name: 'Dekopon', radius: 69 / 2, color: '#ffa500', emoji: '🍊', score: 10, imageName: 'Dekopon.png' },
  { name: 'Persimmon', radius: 89 / 2, color: '#ff8c00', emoji: '🍅', score: 15, imageName: 'Persimmon.png' },
  { name: 'Apple', radius: 114 / 2, color: '#f00', emoji: '🍎', score: 21, imageName: 'Apple.png' },
  { name: 'Pear', radius: 129 / 2, color: '#adff2f', emoji: '🍐', score: 28, imageName: 'Pear.png' },
  { name: 'Peach', radius: 156 / 2, color: '#ffb6c1', emoji: '🍑', score: 36, imageName: 'Peach.png' },
  { name: 'Pineapple', radius: 177 / 2, color: '#ffff00', emoji: '🍍', score: 45, imageName: 'Pineapple.png' },
  { name: 'Melon', radius: 220 / 2, color: '#7cfc00', emoji: '🍈', score: 55, imageName: 'Melon.png' },
  { name: 'Watermelon', radius: 259 / 2, color: '#008000', emoji: '🍉', score: 66, imageName: 'Watermelon.png' },
];

// Preload custom images
FRUITS.forEach(fruit => {
  if (fruit.imageName) {
    const img = new Image();
    img.src = `./${fruit.imageName}`;
    img.onload = () => { fruit.image = img; };
  }
});

const GAME_WIDTH = 400;
const GAME_HEIGHT = 550;
const WALL_WIDTH = 20;

// Default physics properties
let currentRestitution = 0.5;

let currentScore = 0;
let bestScore = parseInt(localStorage.getItem('suika_best_score')) || 0;
let currentFruitIndex = 0;
let nextFruitIndex = 0;
let isGameOver = false;

// --- DOM Elements ---
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const nextFruitDisplayEl = document.getElementById('next-fruit-display');
const titleScreen = document.getElementById('title-screen');
const uiLayer = document.getElementById('ui-layer');
const gameOverScreen = document.getElementById('game-over-screen');
const endTitleEl = document.getElementById('end-title');
const endReasonEl = document.getElementById('end-reason');
const finalScoreEl = document.getElementById('final-score');
const evolutionChartEl = document.getElementById('evolution-chart');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const toTitleBtn = document.getElementById('to-title-btn');
const soundToggleBtn = document.getElementById('sound-toggle');

// Initialize best score display
if (bestScoreEl) bestScoreEl.textContent = bestScore;

// --- Audio Setup ---
let audioCtx = null;
let isSoundEnabled = true;
let currentVolume = 0.5;

const BGM_LIST = [
  './music/Chick Parade In The Sun.mp3',
  './music/Everyday Pixel Smile.mp3',
  './music/Parade of the Little Chick.mp3',
  './music/Pixel Meadow.mp3',
  './music/ひだまりループ (1).mp3',
  './music/ひだまりループ.mp3',
  './music/ふわふわ空のピクニック.mp3',
  './music/やわらかな毎日.mp3',
  './music/ゆらゆらキャンディータイム.mp3',
  './music/suika-bgm.mp3'
];

let bgmPlaylist = [...BGM_LIST];
let activeBgm = new Audio();

const playRandomBgm = () => {
  if (bgmPlaylist.length === 0) bgmPlaylist = [...BGM_LIST];
  const randomIndex = Math.floor(Math.random() * bgmPlaylist.length);
  const track = bgmPlaylist.splice(randomIndex, 1)[0];
  
  activeBgm.src = track;
  activeBgm.volume = currentVolume;
  if (isSoundEnabled) {
    activeBgm.play().catch(e => console.log("BGM play failed:", e));
  }
};

activeBgm.addEventListener('ended', playRandomBgm);

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type, level = 0) => {
  if (!isSoundEnabled || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'drop') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.3 * currentVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'merge') {
    osc.type = 'triangle';
    const baseFreq = 400 + (level * 50);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    gainNode.gain.setValueAtTime(0.4 * currentVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'stageclear') {
    osc.type = 'square';

    // Play a happy arpeggio C4, E4, G4, C5 (261.63, 329.63, 392.00, 523.25)
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.setValueAtTime(329.63, now + 0.1);
    osc.frequency.setValueAtTime(392.00, now + 0.2);
    osc.frequency.setValueAtTime(523.25, now + 0.3);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1 * currentVolume, now + 0.05);
    // Sustain
    gainNode.gain.setValueAtTime(0.1 * currentVolume, now + 0.3);
    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.start(now);
    osc.stop(now + 0.8);
  } else if (type === 'gameover') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
    gainNode.gain.setValueAtTime(0.3 * currentVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.0);
  } else if (type === 'bounce') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);
    gainNode.gain.setValueAtTime(0.8 * currentVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  }
};

const updateSoundIcon = () => {
  const iconSrc = isSoundEnabled ? './sound_on.png' : './sound_off.png';
  soundToggleBtn.innerHTML = `<img src="${iconSrc}" style="width: 80%; height: 80%; object-fit: contain;">`;
  const titleBtn = document.getElementById('title-sound-toggle');
  if (titleBtn) {
    titleBtn.innerHTML = `サウンド: ${isSoundEnabled ? 'ON' : 'OFF'} <img src="${iconSrc}" style="width: 24px; height: 24px; vertical-align: middle; margin-left: 8px;">`;
    titleBtn.classList.toggle('off', !isSoundEnabled);
  }
};

soundToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  initAudio();
  isSoundEnabled = !isSoundEnabled;
  updateSoundIcon();

  if (isSoundEnabled) {
    if (!activeBgm.src || activeBgm.paused) {
      playRandomBgm();
    } else {
      activeBgm.play().catch(e => console.log("BGM play failed:", e));
    }
  } else {
    activeBgm.pause();
  }
});

// Title screen sound toggle
document.getElementById('title-sound-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  initAudio();
  isSoundEnabled = !isSoundEnabled;
  updateSoundIcon();
});

// Volume Slider Listener
const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    currentVolume = parseFloat(e.target.value);
    activeBgm.volume = currentVolume;
  });
}

// iOS Compatibility Check
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS) {
  const volumeControl = document.getElementById('volume-control');
  if (volumeControl) {
    volumeControl.style.display = 'none';
    const notice = document.createElement('div');
    notice.textContent = '音量は本体ボタンで調整してください';
    notice.style.fontSize = '8px';
    notice.style.color = '#ff7aa2';
    notice.style.marginTop = '2px';
    volumeControl.parentNode.appendChild(notice);
  }
}



// --- Matter.js Setup ---
const Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite,
  Events = Matter.Events,
  Body = Matter.Body;

const engine = Engine.create();
const render = Render.create({
  element: document.getElementById('canvas-container'),
  engine: engine,
  options: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    wireframes: false,
    background: 'transparent'
  }
});

// Create Walls and Floor
const createWalls = () => {
  const wallOptions = {
    isStatic: true,
    render: { fillStyle: 'rgba(255, 255, 255, 0.4)' },
    friction: 0.1,
  };

  const bottomWall = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_WIDTH / 2, GAME_WIDTH, WALL_WIDTH, wallOptions);
  const leftWall = Bodies.rectangle(-WALL_WIDTH / 2, GAME_HEIGHT / 2, WALL_WIDTH, GAME_HEIGHT * 2, wallOptions);
  const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_WIDTH / 2, GAME_HEIGHT / 2, WALL_WIDTH, GAME_HEIGHT * 2, wallOptions);

  // Top line sensor for game over
  const topSensor = Bodies.rectangle(GAME_WIDTH / 2, 50, GAME_WIDTH, 5, {
    isSensor: true,
    isStatic: true,
    render: { fillStyle: 'rgba(255, 0, 0, 0.5)' },
    label: 'topSensor'
  });

  return [bottomWall, leftWall, rightWall, topSensor];
};

let walls = createWalls();
Composite.add(engine.world, walls);

// --- Game Logic ---

// Custom EMOJI rendering over matter.js bodies
Events.on(render, 'afterRender', () => {
  const context = render.context;
  const bodies = Composite.allBodies(engine.world);

  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (let body of bodies) {
    if (body.plugin && body.plugin.fruitLevel !== undefined) {
      const fruit = FRUITS[body.plugin.fruitLevel];
      const { x, y } = body.position;
      const angle = body.angle;

      context.save();
      context.translate(x, y);
      context.rotate(angle);

      if (fruit.image) {
        // Draw the custom image
        context.drawImage(
          fruit.image,
          -fruit.radius,
          -fruit.radius,
          fruit.radius * 2,
          fruit.radius * 2
        );
      } else {
        // Fallback to emoji
        const fontSize = fruit.radius * 2 * 0.8;
        context.font = `${fontSize}px Arial`;
        context.globalAlpha = 1;
        context.fillStyle = '#000000';
        context.fillText(fruit.emoji, 0, 0);
      }

      context.restore();
    }
  }
});

const getNextFruit = () => {
  // Random fruit index: 0=Cherry, 1=Strawberry, 2=Grape, 3=Dekopon, 4=Persimmon
  return Math.floor(Math.random() * 5);
};

const updateNextFruitDisplay = () => {
  const fruit = FRUITS[nextFruitIndex];
  if (fruit.imageName) {
    nextFruitDisplayEl.innerHTML = `<img src="./${fruit.imageName}" style="width: 100%; height: 100%; object-fit: contain;">`;
  } else {
    nextFruitDisplayEl.textContent = fruit.emoji;
  }
};

const initEvolutionChart = () => {
  evolutionChartEl.innerHTML = '';
  FRUITS.forEach((fruit, index) => {
    const item = document.createElement('div');
    item.className = 'evolution-item';
    
    const img = document.createElement('img');
    img.src = `./${fruit.imageName}`;
    img.className = 'evolution-fruit';
    img.alt = fruit.name;
    
    const arrow = document.createElement('span');
    arrow.className = 'evolution-arrow';
    arrow.textContent = '▶';
    
    item.appendChild(img);
    item.appendChild(arrow);
    evolutionChartEl.appendChild(item);
  });
};

const updateScore = (points) => {
  currentScore += points;
  scoreEl.textContent = currentScore;
  
  if (currentScore > bestScore) {
    bestScore = currentScore;
    bestScoreEl.textContent = bestScore;
    localStorage.setItem('suika_best_score', bestScore);
  }
};

// Spawn a fruit
let currentFruitBody = null;
let canDrop = true;

const spawnCurrentFruit = (x) => {
  if (isGameOver) return;
  const fruit = FRUITS[currentFruitIndex];
  console.log(`Spawning fruit index: ${currentFruitIndex} (${fruit.name}). Next is: ${nextFruitIndex}`);

  // Boundary check
  const clampedX = Math.max(fruit.radius + 5, Math.min(x, GAME_WIDTH - fruit.radius - 5));

  currentFruitBody = Bodies.circle(clampedX, 50, fruit.radius, {
    isStatic: true,
    restitution: 0.2,
    friction: 0.1,
    render: {
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 0
    },
    plugin: { fruitLevel: currentFruitIndex, merged: false }
  });

  Composite.add(engine.world, currentFruitBody);
};

// Controls
const handlePointerMove = (e) => {
  if (!currentFruitBody || isGameOver || !canDrop) return;

  const canvasBounds = render.canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let x = clientX - canvasBounds.left;

  const fruit = FRUITS[currentFruitBody.plugin.fruitLevel];
  x = Math.max(fruit.radius + 5, Math.min(x, GAME_WIDTH - fruit.radius - 5));

  Body.setPosition(currentFruitBody, { x, y: 50 });
};

const dropFruit = () => {
  if (!currentFruitBody || isGameOver || !canDrop) return;
  console.log(`Dropping fruit index: ${currentFruitIndex}`);

  playSound('drop');
  Body.setStatic(currentFruitBody, false);
  currentFruitBody = null;
  canDrop = false;

  // Wait for cooldown before preparing the NEXT spawn
  setTimeout(() => {
    if (!isGameOver) {
      currentFruitIndex = nextFruitIndex;
      nextFruitIndex = getNextFruit();
      updateNextFruitDisplay();

      canDrop = true;
      spawnCurrentFruit(GAME_WIDTH / 2);
    }
  }, 1000);
};

const container = document.getElementById('canvas-container');
container.addEventListener('mousemove', handlePointerMove);
container.addEventListener('touchmove', handlePointerMove, { passive: true });
container.addEventListener('click', dropFruit);
container.addEventListener('touchend', dropFruit);

// Merging Logic
Events.on(engine, 'collisionStart', (event) => {
  if (isGameOver) return;

  const pairs = event.pairs;

  for (let i = 0; i < pairs.length; i++) {
    const bodyA = pairs[i].bodyA;
    const bodyB = pairs[i].bodyB;

    // Check game over
    if (bodyA.label === 'topSensor' || bodyB.label === 'topSensor') {
      const fruitBody = bodyA.label === 'topSensor' ? bodyB : bodyA;
      // If it's not the current static fruit and it reaches the top, Game Over!
      if (!fruitBody.isStatic) {
        // Wait a little bit to see if it settles above
        setTimeout(() => {
          if (fruitBody.position.y < 50 + FRUITS[fruitBody.plugin.fruitLevel].radius && !isGameOver) {
            triggerGameOver();
          }
        }, 1000);
      }
    }

    if (bodyA.plugin?.fruitLevel !== undefined && bodyB.plugin?.fruitLevel !== undefined) {
      if (bodyA.plugin.fruitLevel === bodyB.plugin.fruitLevel) {
        // Same fruit type!

        // Prevent multiple merges in same frame
        if (bodyA.plugin.merged || bodyB.plugin.merged) continue;
        bodyA.plugin.merged = true;
        bodyB.plugin.merged = true;

        const level = bodyA.plugin.fruitLevel;

        // Suika is level 10, no next level
        if (level === 10) continue;

        // Remove old bodies
        Composite.remove(engine.world, [bodyA, bodyB]);

        // Score points
        const nextLevel = level + 1;
        updateScore(FRUITS[nextLevel].score);
        playSound('merge', nextLevel);

        // Spawn new body at midpoint
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        const newFruit = FRUITS[nextLevel];
        const newBody = Bodies.circle(midX, midY, newFruit.radius, {
          restitution: currentRestitution,
          friction: 0.1,
          render: {
            fillStyle: 'transparent',
            strokeStyle: 'transparent',
            lineWidth: 0
          },
          plugin: { fruitLevel: nextLevel, merged: false }
        });

        // Add small pop force
        Matter.Body.applyForce(newBody, newBody.position, { x: 0, y: -0.01 * newBody.mass });

        Composite.add(engine.world, newBody);
      } else {
        // Different fruits colliding -> Bounce sound
        const relativeVelocity = Matter.Vector.magnitude(Matter.Vector.sub(bodyA.velocity, bodyB.velocity));
        if (relativeVelocity > 0.5) {
          playSound('bounce');
        }
      }
    } else if (bodyA.plugin?.fruitLevel !== undefined || bodyB.plugin?.fruitLevel !== undefined) {
      // Fruit colliding with wall/floor
      const fruitBody = bodyA.plugin?.fruitLevel !== undefined ? bodyA : bodyB;
      const velocity = Matter.Vector.magnitude(fruitBody.velocity);
      if (velocity > 0.5) {
        playSound('bounce');
      }
    }
  }
});

const triggerGameOver = (reason = "Box Full!") => {
  isGameOver = true;
  playSound('gameover');
  activeBgm.pause();
  if (endTitleEl) endTitleEl.textContent = "GAME OVER";
  if (endReasonEl) endReasonEl.textContent = reason;
  if (gameOverScreen) gameOverScreen.classList.remove('hidden');
  if (finalScoreEl) finalScoreEl.textContent = currentScore;
};

const triggerStageClear = () => {
  // Removed for high score mode
};

startBtn.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  uiLayer.classList.remove('hidden');
  evolutionChartEl.classList.remove('hidden');
  initAudio();
  resetBoard();
});

toTitleBtn.addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  uiLayer.classList.add('hidden');
  evolutionChartEl.classList.add('hidden');
  titleScreen.classList.remove('hidden');
});

const resetBoard = () => {
  Composite.clear(engine.world, false);
  walls = createWalls();
  Composite.add(engine.world, walls);

  isGameOver = false;

  if (isSoundEnabled) {
    if (activeBgm.paused) {
      playRandomBgm();
    } else {
      activeBgm.currentTime = 0;
      activeBgm.play().catch(e => console.log("BGM play failed:", e));
    }
  }

  canDrop = true;
  currentFruitIndex = getNextFruit();
  nextFruitIndex = getNextFruit();
  updateNextFruitDisplay();
  spawnCurrentFruit(GAME_WIDTH / 2);
};

restartBtn.addEventListener('click', () => {
  currentScore = 0;
  scoreEl.textContent = '0';
  gameOverScreen.classList.add('hidden');
  resetBoard();
});

// Run Physics and Render
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Initialize first state (shows title screen by default)
currentFruitIndex = getNextFruit();
nextFruitIndex = getNextFruit();
updateNextFruitDisplay();
updateSoundIcon();
initEvolutionChart();
