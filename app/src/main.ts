import { PoseCamera } from './camera';
import { Coach, type CoachMessage } from './coach';
import { assessFraming } from './framing';
import { MusicPlayer, type MusicStyle } from './music';
import { Narrator } from './narrator';
import { buildSession, fillSide, sessionDuration } from './sequencer';
import { Session, type Phase, type SessionSummary, type Tick } from './session';
import { StillnessDetector } from './stillness';
import { addHistory, loadHistory, loadSettings, saveSettings, stats, type Settings } from './storage';
import type { Block, Concern, Level, Point, SessionStep } from './types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const BLOCK_NAMES: Record<Block, string> = {
  centering: 'Centrado',
  warmup: 'Calentamiento',
  standing: 'De pie',
  balance: 'Equilibrio',
  floor: 'Suelo',
  relax: 'Relajación',
};

const RING_LENGTH = 2 * Math.PI * 52;

const settings: Settings = loadSettings();
const narrator = new Narrator();
const music = new MusicPlayer();
const coach = new Coach();
const stillness = new StillnessDetector();
const camera = new PoseCamera($<HTMLVideoElement>('video'), $<HTMLCanvasElement>('overlay'));

let screen: 'setup' | 'framing' | 'practice' | 'done' = 'setup';
let session: Session | null = null;
let wakeLock: WakeLockSentinel | null = null;
let captionTimer: number | undefined;

// ── Utilidades de interfaz ─────────────────────────────────

function show(name: typeof screen): void {
  screen = name;
  for (const id of ['setup', 'framing', 'practice', 'done']) $(id).hidden = id !== name;
  window.scrollTo(0, 0);
}

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Conecta un grupo de "chips" a un valor. Con `multi`, cada chip se activa/desactiva por separado. */
function bindChips(id: string, isActive: (value: string) => boolean, onClick: (value: string) => void): () => void {
  const group = $(id);
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')];
  const refresh = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(isActive(b.dataset.value!))));
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      onClick(b.dataset.value!);
      refresh();
      saveSettings(settings);
      renderPreview();
    }),
  );
  refresh();
  return refresh;
}

function showCaption(text: string, kind: 'narration' | CoachMessage['kind']): void {
  const el = $('caption');
  el.textContent = text;
  el.className = kind === 'narration' ? 'caption' : `caption coach${kind === 'fix' ? '' : ' praise'}`;
  window.clearTimeout(captionTimer);
  if (kind !== 'narration') captionTimer = window.setTimeout(() => (el.className = 'caption'), 5000);
}

// ── Configuración ──────────────────────────────────────────

function renderStats(): void {
  const s = stats(loadHistory());
  $('stats').textContent =
    s.sessions === 0
      ? 'Tu primera clase te espera.'
      : `${s.sessions} ${s.sessions === 1 ? 'clase' : 'clases'} · ${s.minutes} min en total` +
        (s.streak > 1 ? ` · 🔥 ${s.streak} días seguidos` : '');
}

function renderPreview(): void {
  const steps = buildSession(settings);
  const unique = new Set(steps.map((s) => s.pose.id)).size;
  $('class-summary').textContent = `${unique} posturas · unos ${Math.round(sessionDuration(steps) / 60)} minutos`;
  const list = $('preview');
  list.replaceChildren();
  let block: Block | null = null;
  for (const step of steps) {
    if (step.pose.block !== block) {
      block = step.pose.block;
      const li = document.createElement('li');
      li.className = 'block';
      li.textContent = BLOCK_NAMES[block];
      list.append(li);
    }
    const li = document.createElement('li');
    const side = step.side ? ` (${step.side === 'right' ? 'derecha' : 'izquierda'})` : '';
    li.textContent = `${step.pose.name}${side} · ${step.hold} s`;
    list.append(li);
  }
}

async function setupVoices(): Promise<void> {
  const select = $<HTMLSelectElement>('voice');
  await narrator.selectVoice(settings.voiceUri);
  const voices = await narrator.voices();
  select.replaceChildren();
  if (voices.length === 0) {
    select.append(new Option(narrator.supported ? 'Voz del sistema' : 'Sin voz (solo subtítulos)', ''));
    select.disabled = true;
    return;
  }
  for (const v of voices) select.append(new Option(`${v.name} (${v.lang})`, v.voiceURI, false, v === narrator.voice));
  select.addEventListener('change', () => {
    settings.voiceUri = select.value;
    saveSettings(settings);
    void narrator.selectVoice(select.value);
  });
}

function setupForm(): void {
  bindChips('duration', (v) => Number(v) === settings.minutes, (v) => (settings.minutes = Number(v)));
  bindChips('level', (v) => Number(v) === settings.level, (v) => (settings.level = Number(v) as Level));
  bindChips(
    'avoid',
    (v) => settings.avoid.includes(v as Concern),
    (v) => {
      const c = v as Concern;
      settings.avoid = settings.avoid.includes(c) ? settings.avoid.filter((x) => x !== c) : [...settings.avoid, c];
    },
  );

  const fileInput = $<HTMLInputElement>('music-file');
  const refreshMusic = bindChips(
    'music',
    (v) => v === settings.music,
    (v) => {
      if (v === 'file') fileInput.click();
      else settings.music = v as MusicStyle;
    },
  );
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    music.setFile(file);
    settings.music = 'file';
    $('music-file-name').hidden = false;
    $('music-file-name').textContent = `🎵 ${file.name}`;
    refreshMusic();
  });

  const volume = $<HTMLInputElement>('music-volume');
  const practiceVolume = $<HTMLInputElement>('practice-volume');
  for (const input of [volume, practiceVolume]) {
    input.value = String(settings.musicVolume);
    input.addEventListener('input', () => {
      settings.musicVolume = Number(input.value);
      volume.value = practiceVolume.value = input.value;
      music.setVolume(settings.musicVolume);
      saveSettings(settings);
    });
  }
  music.setVolume(settings.musicVolume);

  const rate = $<HTMLInputElement>('rate');
  rate.value = String(settings.rate);
  narrator.rate = settings.rate;
  rate.addEventListener('input', () => {
    settings.rate = narrator.rate = Number(rate.value);
    saveSettings(settings);
  });

  const cameraToggle = $<HTMLInputElement>('camera');
  cameraToggle.checked = settings.camera && PoseCamera.supported;
  cameraToggle.disabled = !PoseCamera.supported;
  cameraToggle.addEventListener('change', () => {
    settings.camera = cameraToggle.checked;
    saveSettings(settings);
  });

  $('test-voice').addEventListener('click', () => {
    narrator.stop();
    void narrator.say('Hola. Inhala profundamente… y exhala despacio.');
  });
  $('start').addEventListener('click', () => void start());
  $('again').addEventListener('click', () => {
    renderStats();
    show('setup');
  });

  void setupVoices();
  renderPreview();
  renderStats();
}

// ── Inicio de la clase ─────────────────────────────────────

async function start(): Promise<void> {
  // Estas llamadas deben hacerse dentro del clic para que el navegador permita el audio.
  if (narrator.supported) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  const style: MusicStyle = settings.music === 'file' && !music.hasFile ? 'pad' : settings.music;
  void music.start(style).catch(() => undefined);
  void requestWakeLock();

  if (settings.camera && PoseCamera.supported) await startFraming();
  else startPractice(false);
}

async function requestWakeLock(): Promise<void> {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}

// Al volver a la pestaña, el bloqueo de pantalla se pierde: se vuelve a pedir.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (screen === 'practice' || screen === 'framing')) {
    void requestWakeLock();
  }
});

// ── Encuadre ───────────────────────────────────────────────

let framingOkSince: number | null = null;
let lastFramingMessage = '';
let lastFramingSpokenAt = 0;

async function startFraming(): Promise<void> {
  show('framing');
  $('framing-slot').append($('stage'));
  const msg = $('framing-msg');
  const continueBtn = $<HTMLButtonElement>('framing-continue');
  msg.textContent = 'Preparando la cámara…';
  msg.className = 'status';
  continueBtn.disabled = true;
  framingOkSince = null;
  lastFramingMessage = '';

  $('framing-skip').onclick = () => {
    camera.stop();
    startPractice(false);
  };
  continueBtn.onclick = () => startPractice(true);

  try {
    await camera.start();
    msg.textContent = 'Buscándote…';
    void narrator.say('Colócate de pie frente a la cámara, de forma que se vea todo tu cuerpo.');
  } catch (err) {
    console.error(err);
    msg.textContent = 'No se ha podido usar la cámara. Puedes seguir la clase sin ella.';
    $('framing-skip').textContent = 'Continuar sin cámara';
  }
}

function onFramingFrame(points: Point[] | null, now: number): void {
  const result = assessFraming(points);
  const msg = $('framing-msg');
  msg.textContent = result.message;
  msg.className = result.ok ? 'status ok' : 'status';
  $<HTMLButtonElement>('framing-continue').disabled = !result.ok;
  camera.state = result.ok ? 'ok' : 'unknown';

  // Indicaciones por voz: la persona está lejos de la pantalla.
  if (result.message !== lastFramingMessage && now - lastFramingSpokenAt > 3500 && !narrator.speaking) {
    lastFramingMessage = result.message;
    lastFramingSpokenAt = now;
    void narrator.say(result.message);
  }

  if (!result.ok) {
    framingOkSince = null;
    return;
  }
  framingOkSince ??= now;
  if (now - framingOkSince > 2500) startPractice(true);
}

// ── Práctica ───────────────────────────────────────────────

function startPractice(withCamera: boolean): void {
  if (screen === 'practice') return;
  const steps = buildSession(settings);
  const minutes = settings.minutes;
  const intro = [
    `Te doy la bienvenida a esta clase de yoga de ${minutes} minutos.`,
    ...(withCamera
      ? ['La cámara está activa. Cuando mantengas una postura sin moverte, te daré indicaciones para mejorarla.']
      : []),
    'Escucha a tu cuerpo y no fuerces nunca. Empezamos.',
  ];

  show('practice');
  const layout = document.querySelector('.practice')!;
  layout.classList.toggle('with-camera', withCamera && camera.active);
  $('practice-slot').hidden = !(withCamera && camera.active);
  if (withCamera && camera.active) $('practice-slot').append($('stage'));
  $('pause').textContent = '⏸ Pausa';
  $('caption').textContent = '';
  coach.corrections = 0;

  narrator.stop();
  narrator.onText = (text) => showCaption(text, 'narration');
  narrator.onSpeakingChange = (speaking) => music.duck(speaking);

  session = new Session(steps, narrator, { onStep, onTick, onEnd }, intro);
  void session.run();
}

function onStep(index: number, step: SessionStep, phase: Phase): void {
  const { pose, side } = step;
  $('block-label').textContent = BLOCK_NAMES[pose.block];
  $('pose-name').textContent = pose.name;
  $('pose-sanskrit').textContent = pose.sanskrit;
  const sideBadge = $('pose-side');
  sideBadge.hidden = !side;
  sideBadge.textContent = side === 'right' ? 'Lado derecho' : 'Lado izquierdo';
  $('breath').hidden = !(pose.breathing && phase === 'hold');

  const next = session?.steps[index + 1];
  $('next').textContent = next
    ? `Siguiente: ${next.pose.name}${next.side ? ` (${next.side === 'right' ? 'derecha' : 'izquierda'})` : ''}`
    : 'Última postura';

  if (phase === 'hold') {
    coach.reset(pose.id, side, pose.sided, performance.now());
    stillness.reset();
  }
}

function onTick(t: Tick): void {
  const inHold = t.phase === 'hold';
  $('timer-text').textContent = inHold ? fmt(t.holdRemaining) : t.phase === 'outro' ? '🙏' : '—';
  const label = $('timer-label');
  if (session?.paused) label.textContent = 'En pausa';
  else if (!inHold) label.textContent = t.phase === 'enter' ? 'Entrando…' : '';
  else if (!$('breath').hidden) label.textContent = performance.now() % 10000 < 4000 ? 'Inhala' : 'Exhala';
  else label.textContent = 'Mantén';

  const fraction = inHold && t.holdTotal > 0 ? t.holdRemaining / t.holdTotal : 1;
  $('timer-ring').style.strokeDashoffset = String(RING_LENGTH * (1 - fraction));
  $('progress-bar').style.width = `${Math.min(100, (t.elapsed / t.total) * 100)}%`;
  $('elapsed').textContent = `${fmt(t.elapsed)} / ${fmt(t.total)}`;
}

function onPracticeFrame(points: Point[] | null, aspect: number, now: number): void {
  const badge = $('stage-badge');
  const s = session;
  if (!s || s.phase !== 'hold' || s.paused) {
    camera.state = 'unknown';
    badge.hidden = true;
    return;
  }
  const pose = s.current.pose;
  badge.hidden = false;
  if (!coach.supports(pose.id)) {
    camera.state = 'unknown';
    badge.className = 'stage-badge';
    badge.textContent = 'Disfruta de la postura';
    return;
  }
  if (!points) {
    camera.state = 'unknown';
    badge.className = 'stage-badge';
    badge.textContent = 'No te veo';
    return;
  }

  const still = stillness.update(points, aspect, now);
  const message = coach.update(points, aspect, still, now, !narrator.speaking);
  camera.state = coach.state;

  if (!still) {
    badge.className = 'stage-badge';
    badge.textContent = 'Colócate y quédate quieto';
  } else {
    badge.className = `stage-badge ${coach.state === 'unknown' ? '' : coach.state}`;
    badge.textContent =
      coach.state === 'ok' ? '✓ Buena alineación' : coach.state === 'adjust' ? 'Ajustando postura…' : 'Analizando…';
  }

  if (message) {
    const text = fillSide(message.text, message.side);
    if (narrator.sayIfIdle(text)) showCaption(text, message.kind);
  }
}

function onEnd(summary: SessionSummary): void {
  camera.stop();
  void music.fadeOut();
  void wakeLock?.release().catch(() => undefined);
  wakeLock = null;
  narrator.onSpeakingChange = () => {};

  if (summary.seconds >= 60) {
    addHistory({
      date: new Date().toISOString(),
      seconds: summary.seconds,
      poses: summary.posesDone,
      corrections: coach.corrections,
      completed: summary.completed,
    });
  }
  const s = stats(loadHistory());
  $('done-title').textContent = summary.completed ? '¡Clase completada!' : 'Clase terminada';
  $('done-minutes').textContent = String(Math.round(summary.seconds / 60));
  $('done-poses').textContent = String(summary.posesDone);
  $('done-corrections').textContent = String(coach.corrections);
  $('done-streak').textContent = s.streak > 1 ? `🔥 Llevas ${s.streak} días seguidos practicando.` : '';
  session = null;
  show('done');
}

camera.onFrame = (points, aspect, now) => {
  if (screen === 'framing') onFramingFrame(points, now);
  else if (screen === 'practice') onPracticeFrame(points, aspect, now);
};

// ── Controles ──────────────────────────────────────────────

function togglePause(): void {
  if (!session) return;
  if (session.paused) {
    session.resume();
    music.resume();
    $('pause').textContent = '⏸ Pausa';
  } else {
    session.pause();
    music.pause();
    $('pause').textContent = '▶ Continuar';
  }
}

$('pause').addEventListener('click', togglePause);
$('skip').addEventListener('click', () => {
  if (session?.paused) music.resume();
  $('pause').textContent = '⏸ Pausa';
  session?.skip();
});
$('stop').addEventListener('click', () => {
  if (!session || !confirm('¿Terminar la clase?')) return;
  if (session.paused) music.resume();
  session.stop();
});

document.addEventListener('keydown', (e) => {
  if (screen !== 'practice' || !session) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'ArrowRight') {
    $('skip').click();
  }
});

setupForm();
