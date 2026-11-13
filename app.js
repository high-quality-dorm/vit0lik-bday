// Всё, что можно менять без вёрстки: имя, код и срок.
const CONFIG = {
  durationDays: 30,
  acceptedCodes: ["CO5429162"],
  storageKey: "vitolik-club-start"
};

const MONTHS_LONG = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];
const CYRILLIC_LOOKALIKES = { "С": "C", "О": "O" };
const els = {
  body: document.body,
  form: document.querySelector("#activate-form"),
  input: document.querySelector("#promo"),
  status: document.querySelector("#promo-status"),
  activated: document.querySelector("#activated"),
  activatedTitle: document.querySelector("#activated-title"),
  activatedDate: document.querySelector("#activated-date"),
  club: document.querySelector("#club"),
  scrollCue: document.querySelector("#scroll-cue"),
  passSince: document.querySelector("#pass-since"),
  passEnd: document.querySelector("#pass-end"),
  stampDate: document.querySelector("#stamp-date"),
  clubStatus: document.querySelector("#club-status"),
  clubStart: document.querySelector("#club-start"),
  clubEnd: document.querySelector("#club-end"),
  progressDay: document.querySelector("#progress-day"),
  progressPercent: document.querySelector("#progress-percent"),
  progressFill: document.querySelector("#progress-fill"),
  progressNote: document.querySelector("#progress-note"),
  pass: document.querySelector("#pass"),
  confetti: document.querySelector("#confetti")
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayIndex(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function daysBetween(later, earlier) {
  return dayIndex(later) - dayIndex(earlier);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLong(date) {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCompact(date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(-2)}`;
}

function pluralDays(number) {
  const lastTwo = number % 100;
  const lastOne = number % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  if (lastOne === 1) return "день";
  if (lastOne >= 2 && lastOne <= 4) return "дня";
  return "дней";
}

function normalizeCode(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[СО]/g, (letter) => CYRILLIC_LOOKALIKES[letter]);
}

function isAcceptedCode(value) {
  const normalized = normalizeCode(value);
  return CONFIG.acceptedCodes.some((code) => normalizeCode(code) === normalized);
}

function readStart() {
  try {
    const stored = window.localStorage.getItem(CONFIG.storageKey);
    if (!stored) return null;
    const date = new Date(stored);
    if (Number.isNaN(date.getTime())) return null;
    return startOfDay(date);
  } catch {
    return null;
  }
}

function saveStart(date) {
  try {
    window.localStorage.setItem(CONFIG.storageKey, date.toISOString());
  } catch {
    // The subscription still works for this visit if storage is unavailable.
  }
}

function clearStart() {
  try {
    window.localStorage.removeItem(CONFIG.storageKey);
  } catch {
    // Nothing to clear.
  }
}

function handleReset() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("reset")) return;

  clearStart();
  url.searchParams.delete("reset");

  try {
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  } catch {
    // A file:// page may not allow history updates. The reset still happened.
  }
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "var(--seal)" : "";
}

function renderProgress(start) {
  const today = startOfDay(new Date());
  const elapsed = Math.max(0, daysBetween(today, start));
  const percent = Math.min(100, Math.max(0, (elapsed / CONFIG.durationDays) * 100));
  const expired = elapsed >= CONFIG.durationDays;
  const dayNumber = expired ? CONFIG.durationDays : elapsed + 1;

  els.progressDay.textContent = expired
    ? "Месяц позади"
    : `День ${dayNumber} из ${CONFIG.durationDays}`;
  els.progressPercent.textContent = `${Math.round(percent)}%`;

  els.progressFill.style.width = "0%";
  requestAnimationFrame(() => {
    els.progressFill.style.width = `${percent}%`;
  });

  if (expired) {
    els.progressNote.textContent = "Подписка продлена автоматически. Отмена по-прежнему невозможна.";
  } else if (elapsed === 0) {
    els.progressNote.textContent = "Всё только начинается.";
  } else if (elapsed < CONFIG.durationDays * 0.25) {
    els.progressNote.textContent = `Уже ${elapsed} ${pluralDays(elapsed)} вместе. Дальше — интереснее.`;
  } else if (elapsed < CONFIG.durationDays * 0.75) {
    els.progressNote.textContent = "Половина срока позади. Дальше — по плану.";
  } else {
    els.progressNote.textContent = "Месяц почти прошёл. Продление уже включено.";
  }

  return expired;
}

function renderActive(start, options = {}) {
  const { animate = false } = options;
  const end = addDays(start, CONFIG.durationDays);
  const expired = renderProgress(start);

  els.club.hidden = false;
  els.form.hidden = true;
  els.activated.hidden = false;
  els.scrollCue.hidden = false;
  els.body.classList.add("is-active");

  els.passSince.textContent = formatCompact(start);
  els.passEnd.textContent = expired ? "Бессрочно" : formatCompact(end);
  els.stampDate.textContent = formatCompact(start);

  els.activatedTitle.textContent = animate ? "Подписка активирована" : "Подписка активна";
  els.activatedDate.textContent = `С ${formatLong(start)}. Теперь всё официально.`;
  els.clubStart.textContent = formatLong(start);
  els.clubEnd.textContent = expired ? "Бессрочно" : formatLong(end);
  els.clubStatus.textContent = expired ? "Продлена" : "Активна";

  if (animate) {
    window.requestAnimationFrame(() => {
      burstConfetti(els.pass);
    });
    els.activatedTitle.focus({ preventScroll: true });
  }
}

function activate(start, animate = true) {
  saveStart(start);
  renderActive(start, { animate });
}

function shakeForm() {
  if (reduceMotion.matches) return;
  els.form.classList.remove("is-shaking");
  void els.form.offsetWidth;
  els.form.classList.add("is-shaking");
  window.setTimeout(() => els.form.classList.remove("is-shaking"), 420);
}

let failedAttempts = 0;

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = els.input.value;

  if (!value.trim()) {
    setStatus("Сначала введи серийный номер с купюры.", true);
    els.form.classList.add("has-error");
    els.input.setAttribute("aria-invalid", "true");
    els.input.focus();
    shakeForm();
    return;
  }

  if (!isAcceptedCode(value)) {
    failedAttempts += 1;
    const hint = failedAttempts >= 3
      ? " Подсказка: серийный номер напечатан на купюре справа внизу."
      : "";
    setStatus(`Не тот код. Попробуй ещё.${hint}`, true);
    els.form.classList.add("has-error");
    els.input.setAttribute("aria-invalid", "true");
    els.input.select();
    shakeForm();
    return;
  }

  els.form.classList.remove("has-error");
  els.input.removeAttribute("aria-invalid");
  setStatus("");
  const start = startOfDay(new Date());
  activate(start, true);
});

els.form.addEventListener("input", () => {
  els.form.classList.remove("has-error");
  els.input.removeAttribute("aria-invalid");
  if (els.status.textContent) setStatus("");
});

function initTilt() {
  if (reduceMotion.matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const wrap = els.pass.parentElement;
  if (!wrap) return;

  wrap.addEventListener("pointermove", (event) => {
    const rect = els.pass.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    els.pass.style.setProperty("--ry", `${x * 7}deg`);
    els.pass.style.setProperty("--rx", `${y * -5}deg`);
  });

  wrap.addEventListener("pointerleave", () => {
    els.pass.style.setProperty("--ry", "0deg");
    els.pass.style.setProperty("--rx", "0deg");
  });
}

function initReveals() {
  const reveals = [...document.querySelectorAll(".reveal")];
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -7% 0px"
  });

  reveals.forEach((element) => observer.observe(element));
}

function burstConfetti(source) {
  if (reduceMotion.matches) return;

  const canvas = els.confetti;
  const context = canvas.getContext("2d");
  if (!context) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rect = source.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ["#f2eadb", "#c9a666", "#b9412f", "#e7dcc7", "#9daa9f"];
  const particles = Array.from({ length: 58 }, () => {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.8;
    const speed = 260 + Math.random() * 520;
    const size = 3 + Math.random() * 6;
    return {
      x: originX + (Math.random() - 0.5) * rect.width * 0.55,
      y: originY + (Math.random() - 0.5) * rect.height * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: size,
      height: size * (0.34 + Math.random() * 0.7),
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 9,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  });

  let previous = performance.now();

  function draw(now) {
    const delta = Math.min((now - previous) / 1000, 0.033);
    previous = now;
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 760 * delta;
      particle.vx *= 0.992;
      particle.rotation += particle.spin * delta;

      context.save();
      context.globalAlpha = Math.max(0, 1 - (now - start) / 1900);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      context.restore();
    });

    if (now - start < 1950) {
      window.requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, width, height);
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  const start = performance.now();
  window.requestAnimationFrame(draw);
}

handleReset();
initTilt();
initReveals();

const savedStart = readStart();
if (savedStart) {
  renderActive(savedStart, { animate: false });
}
