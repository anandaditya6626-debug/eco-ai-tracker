// ── Particle System ──
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * canvas.width;
    this.y = init ? Math.random() * canvas.height : canvas.height + 10;
    this.size = Math.random() * 2.5 + 0.5;
    this.speedY = -(Math.random() * 0.8 + 0.2);
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.hue = Math.random() > 0.5 ? 150 : 195;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    if (this.y < -10) this.reset(false);
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.opacity})`;
    ctx.fill();
  }
}

for (let i = 0; i < 80; i++) particles.push(new Particle());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ── Navbar ──
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

document.getElementById('mobile-toggle').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('nav-links').classList.remove('open'));
});

// ── Scroll Animations ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Char Count ──
const promptInput = document.getElementById('prompt-input');
const charCount = document.getElementById('char-count');
promptInput.addEventListener('input', () => {
  const words = promptInput.value.trim().split(/\s+/).filter(Boolean).length;
  charCount.textContent = `${promptInput.value.length} chars · ${words} words`;
});

// ── Cumulative Stats ──
let totalWater = 0, totalEnergy = 0, totalCO2 = 0;

function updateGlobalStats() {
  animateCounter('stat-water', totalWater, 'ml');
  animateCounter('stat-energy', totalEnergy, 'Wh');
  animateCounter('stat-co2', totalCO2, 'g');
}

function animateCounter(id, target, suffix) {
  const el = document.getElementById(id);
  const start = parseFloat(el.textContent) || 0;
  const diff = target - start;
  const duration = 800;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = (start + diff * ease).toFixed(1) + ' ' + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Eco Tips ──
const tips = [
  "Shorter prompts reduce energy usage and improve efficiency.",
  "Combining multiple questions into one prompt saves resources.",
  "Clear, specific prompts reduce the need for follow-up queries.",
  "Using keywords instead of full sentences can cut energy use by 30%.",
  "Every optimized prompt helps conserve water used in data center cooling.",
  "Batch your AI queries instead of sending them one at a time.",
  "Well-structured prompts lead to faster, more energy-efficient responses."
];

// ── Prompt Optimization ──
function optimizePrompt(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const filler = new Set(['please','just','really','very','actually','basically','simply',
    'literally','maybe','perhaps','i think','i want','i need','you to','can you',
    'could you','would you','i would like','that is','the','a','an','it','so',
    'well','like','um','uh','kind of','sort of','in order to']);
  const kept = words.filter(w => !filler.has(w.toLowerCase().replace(/[.,!?]/g, '')));
  const targetLen = Math.max(Math.ceil(words.length * 0.6), 3);
  const result = kept.slice(0, targetLen);
  return result.join(' ') || words.slice(0, targetLen).join(' ');
}

// ── Analysis ──
document.getElementById('analyze-btn').addEventListener('click', () => {
  const text = promptInput.value.trim();
  if (!text) { promptInput.style.borderColor = '#ff4444'; setTimeout(() => promptInput.style.borderColor = '', 1500); return; }

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Estimates per word (realistic ballpark)
  const waterPerWord = 0.35;   // ml
  const energyPerWord = 0.012; // Wh
  const co2PerWord = 0.008;    // grams

  const water = (wordCount * waterPerWord).toFixed(2);
  const energy = (wordCount * energyPerWord).toFixed(3);
  const co2 = (wordCount * co2PerWord).toFixed(3);

  // Optimized
  const optimized = optimizePrompt(text);
  const optWords = optimized.split(/\s+/).filter(Boolean).length;
  const optWater = (optWords * waterPerWord).toFixed(2);
  const optEnergy = (optWords * energyPerWord).toFixed(3);
  const optCO2 = (optWords * co2PerWord).toFixed(3);

  const savedWater = (water - optWater).toFixed(2);
  const savedEnergy = (energy - optEnergy).toFixed(3);
  const savedCO2 = (co2 - optCO2).toFixed(3);

  // Eco Score: 100 for very short, lower for long
  const efficiency = optWords / wordCount;
  const ecoScore = Math.min(100, Math.round((1 - (wordCount - optWords) / Math.max(wordCount, 1)) * 80 + (wordCount <= 10 ? 20 : wordCount <= 25 ? 12 : 5)));

  // Update UI
  document.getElementById('results-placeholder').style.display = 'none';
  const results = document.getElementById('results');
  results.style.display = 'block';
  results.style.animation = 'fadeInUp 0.5s ease';

  document.getElementById('word-count').textContent = wordCount;
  document.getElementById('opt-word-count').textContent = optWords;

  document.getElementById('water-val').textContent = water + ' ml';
  document.getElementById('energy-val').textContent = energy + ' Wh';
  document.getElementById('co2-val').textContent = co2 + ' g';

  document.getElementById('saved-water').textContent = '-' + savedWater + ' ml';
  document.getElementById('saved-energy').textContent = '-' + savedEnergy + ' Wh';
  document.getElementById('saved-co2').textContent = '-' + savedCO2 + ' g';

  document.getElementById('optimized-text').textContent = optimized;

  // Eco Score ring
  const circle = document.getElementById('score-circle');
  const circumference = 2 * Math.PI * 33;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - (ecoScore / 100) * circumference;
  document.getElementById('score-value').textContent = ecoScore;

  // Tip
  document.getElementById('eco-tip-text').textContent = tips[Math.floor(Math.random() * tips.length)];

  // Accumulate global stats
  totalWater += parseFloat(savedWater);
  totalEnergy += parseFloat(savedEnergy);
  totalCO2 += parseFloat(savedCO2);
  updateGlobalStats();
});
