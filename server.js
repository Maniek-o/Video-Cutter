
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeStatic = require('ffprobe-static');
const sharp = require('sharp');

const app = express();

// Endpoint do ustawiania aktywnego slotu podglądu
app.patch('/api/ml/person-profile/:personId/active-slot', (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  const slot = Number(req.body?.slot);
  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }
  if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
    return res.status(400).json({ error: 'slot must be between 1 and 5' });
  }
  const db = loadPersonProfiles();
  const profile = getOrCreatePersonProfile(db, personId);
  profile.activeSlot = slot;
  profile.updatedAt = new Date().toISOString();
  savePersonProfiles(db);
  res.json({ success: true, personId, activeSlot: slot });
});

console.log('FFmpeg path:', ffmpegInstaller.path);
console.log('FFprobe path:', ffprobeStatic.path);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeStatic.path);


const PORT = 5000;
const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://127.0.0.1:5003';
const defaultNsfwModelDataDir = path.join(__dirname, 'Pliki do modelu NFSW');
const nsfwModelDataDir = path.resolve(process.env.NSFW_MODEL_DATA_DIR || defaultNsfwModelDataDir);
const nsfwExternalLogDir = path.resolve(process.env.NSFW_EXTERNAL_LOG_DIR || path.join(nsfwModelDataDir, 'logs'));
const defaultExternalTrainingScript = process.platform === 'win32' ? 'c:\^ Claud\06_round_training.py' : '';
const defaultExternalTrainingPython = process.platform === 'win32' ? 'c:\^ Claud\.venv\Scripts\python.exe' : '';
const AUTO_MERGE_THRESHOLD = 45;
const NSFW_GROUP_ID = 999;
const DEFAULT_PERSON_THRESHOLD = 0.75;
const PERSON_PROFILE_MIN_POSITIVE = 40;
const PERSON_PROFILE_MIN_NEGATIVE = 80;
const PERSON_PROFILE_MAX_SAMPLES = 5000;
const PERSON_PROFILE_PREVIEW_FRAME_LIMIT = 12;
let PERSON_PROFILE_RETENTION_DAYS = 90;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Directories
const uploadsDir = path.join(__dirname, 'uploads');
const cacheDir = path.join(__dirname, 'cache');
const outputDir = path.join(__dirname, 'output');
const mlDataDir = path.join(__dirname, 'ml_data');
const personProfilePreviewClipsDir = path.join(mlDataDir, 'profile_preview_clips');
const personProfilesPath = path.join(mlDataDir, 'person_profiles.json');
const mlSettingsPath = path.join(mlDataDir, 'settings.json');
const pausedTrainingStatePath = path.join(mlDataDir, 'training_pause_state.json');
const externalTrainingScript = process.env.NSFW_TRAINING_SCRIPT || defaultExternalTrainingScript;
const externalTrainingPython = process.env.NSFW_TRAINING_PYTHON || defaultExternalTrainingPython;
const externalTrainingStatusPath = path.join(nsfwExternalLogDir, 'round_training_status.json');
const externalTrainingReportPath = path.join(nsfwExternalLogDir, 'round_training_report.json');
const externalTrainingLockPath = path.join(nsfwExternalLogDir, 'round_training.lock');
const externalTrainingResumeStatePath = path.join(nsfwExternalLogDir, 'round_training_resume_state.json');
const outputFileRegistry = new Map();
const sourceVideoPathRegistry = new Map();
const nsfwScanProgressRegistry = new Map();
const nsfwScanContextRegistry = new Map();
const trainingQueue = [];
let activeTrainingProcess = null;
let activeTrainingRun = null;
let trainingQueueNextId = 1;
let skipAutostartAfterStop = false;
let pausedTrainingRun = null;

fs.mkdirSync(mlDataDir, { recursive: true });
fs.mkdirSync(personProfilePreviewClipsDir, { recursive: true });
fs.mkdirSync(nsfwModelDataDir, { recursive: true });
fs.mkdirSync(nsfwExternalLogDir, { recursive: true });

app.use('/api/profile-preview-clips', express.static(personProfilePreviewClipsDir));

function readJsonSafe(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) {
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.error('[ML Local] Failed to read JSON:', filePath, err.message);
    return fallbackValue;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[ML Local] Failed to write JSON:', filePath, err.message);
    return false;
  }
}

function clearJsonFileSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('[ML Local] Failed to delete JSON:', filePath, err.message);
    return false;
  }
}

function loadPausedTrainingRunState() {
  const saved = readJsonSafe(pausedTrainingStatePath, null);
  if (!saved || typeof saved !== 'object') {
    return null;
  }

  const sourceFolders = Array.isArray(saved.sourceFolders)
    ? saved.sourceFolders.map((folder) => String(folder || '').trim()).filter(Boolean)
    : [];

  if (sourceFolders.length === 0) {
    return null;
  }

  return {
    sourceFolders,
    pausedAt: saved.pausedAt || null
  };
}

function savePausedTrainingRunState(runState) {
  if (!runState || !Array.isArray(runState.sourceFolders) || runState.sourceFolders.length === 0) {
    pausedTrainingRun = null;
    clearJsonFileSafe(pausedTrainingStatePath);
    return;
  }

  pausedTrainingRun = {
    sourceFolders: runState.sourceFolders,
    pausedAt: runState.pausedAt || new Date().toISOString()
  };

  writeJsonSafe(pausedTrainingStatePath, pausedTrainingRun);
}

pausedTrainingRun = loadPausedTrainingRunState();

function loadMlSettings() {
  return readJsonSafe(mlSettingsPath, {
    retentionDays: PERSON_PROFILE_RETENTION_DAYS,
    trainingFolders: []
  });
}

function getExternalTrainingConfigurationError() {
  if (!externalTrainingScript || !externalTrainingPython) {
    return 'Zewnętrzny trening nie jest skonfigurowany. Ustaw NSFW_TRAINING_SCRIPT i NSFW_TRAINING_PYTHON.';
  }

  if (!path.isAbsolute(externalTrainingScript) || !fs.existsSync(externalTrainingScript)) {
    return `Nie znaleziono skryptu treningowego: ${externalTrainingScript}`;
  }

  if (!path.isAbsolute(externalTrainingPython) || !fs.existsSync(externalTrainingPython)) {
    return `Nie znaleziono interpretera Python dla treningu: ${externalTrainingPython}`;
  }

  return null;
}

function saveMlSettings(settings) {
  const prev = loadMlSettings();
  const merged = {
    ...prev,
    ...settings
  };

  const trainingFolders = Array.isArray(merged.trainingFolders)
    ? merged.trainingFolders
      .map((folder) => String(folder || '').trim())
      .filter(Boolean)
    : [];

  return writeJsonSafe(mlSettingsPath, {
    retentionDays: Number(merged?.retentionDays) || PERSON_PROFILE_RETENTION_DAYS,
    trainingFolders
  });
}

function parseIsoDateMs(value) {
  if (!value) {
    return null;
  }
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

function isProcessAlive(pid) {
  const normalized = Number(pid);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return false;
  }

  try {
    process.kill(normalized, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function getExternalTrainingLockPid() {
  const lock = readJsonSafe(externalTrainingLockPath, null);
  const pid = Number(lock?.pid);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function isRoundTrainingProcessAlive(pid) {
  if (!isProcessAlive(pid)) {
    return false;
  }

  try {
    const cmd = `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${Number(pid)}').CommandLine"`;
    const commandLine = String(execSync(cmd, { encoding: 'utf-8' }) || '').toLowerCase();
    const marker = path.basename(externalTrainingScript).toLowerCase();
    return commandLine.includes(marker);
  } catch (_) {
    return false;
  }
}

function isExternalTrainingProcessLikelyRunning(pid, latestStatus = null, latestReport = null) {
  if (!isProcessAlive(pid)) {
    return false;
  }

  if (isRoundTrainingProcessAlive(pid)) {
    return true;
  }

  const stage = String(latestStatus?.stage || '').toLowerCase();
  const runningStages = new Set(['starting', 'round_started', 'round_training', 'round_testing']);
  const reportRunning = String(latestReport?.status || '').toLowerCase() === 'running';
  const statusRunning = runningStages.has(stage);
  const statusTimestampMs = parseIsoDateMs(latestStatus?.timestamp);
  const reportTimestampMs = parseIsoDateMs(latestReport?.updated_at || latestReport?.finished_at || latestReport?.started_at);
  const latestTimestampMs = Math.max(statusTimestampMs || 0, reportTimestampMs || 0);
  const statusIsFresh = latestTimestampMs > 0 && (Date.now() - latestTimestampMs) < 2 * 60 * 1000;

  return Boolean((reportRunning || statusRunning) && statusIsFresh);
}

function markTrainingStopped(reason = 'stopped_by_user') {
  const nowIso = new Date().toISOString();

  const latestStatus = readJsonSafe(externalTrainingStatusPath, null);
  writeJsonSafe(externalTrainingStatusPath, {
    ...(latestStatus && typeof latestStatus === 'object' ? latestStatus : {}),
    stage: 'stopped',
    timestamp: nowIso,
    stop_reason: reason
  });

  const latestReport = readJsonSafe(externalTrainingReportPath, null);
  writeJsonSafe(externalTrainingReportPath, {
    ...(latestReport && typeof latestReport === 'object' ? latestReport : {}),
    status: 'stopped',
    stopped_at: nowIso,
    finished_at: latestReport?.finished_at || nowIso,
    stop_reason: reason
  });
}

function getTrainingRuntimeStatus() {
  const latestStatus = readJsonSafe(externalTrainingStatusPath, null);
  const latestReport = readJsonSafe(externalTrainingReportPath, null);
  const latestResumeState = readJsonSafe(externalTrainingResumeStatePath, null);
  const stage = String(latestStatus?.stage || '').toLowerCase();
  const runningStages = new Set(['starting', 'round_started', 'round_training', 'round_testing']);
  const reportRunning = String(latestReport?.status || '').toLowerCase() === 'running';
  const statusRunning = runningStages.has(stage);
  const processRunning = !!(activeTrainingProcess && !activeTrainingProcess.killed);
  const externalPid = getExternalTrainingLockPid();
  const externalProcessRunning = isExternalTrainingProcessLikelyRunning(externalPid, latestStatus, latestReport);
  const statusTimestampMs = parseIsoDateMs(latestStatus?.timestamp);
  const reportTimestampMs = parseIsoDateMs(latestReport?.updated_at || latestReport?.finished_at || latestReport?.started_at);
  const latestTimestampMs = Math.max(statusTimestampMs || 0, reportTimestampMs || 0);
  const statusIsFresh = latestTimestampMs > 0 && (Date.now() - latestTimestampMs) < 2 * 60 * 1000;
  const statusSuggestsRunning = reportRunning || statusRunning;
  const hasRecentRunningHint = statusSuggestsRunning && statusIsFresh;
  const isRunning = processRunning || externalProcessRunning;

  const queue = trainingQueue.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    sourceFolders: item.sourceFolders
  }));

  const lastCompleted = (() => {
    const status = latestReport?.status;
    if (!status || status === 'running') {
      return null;
    }

    return {
      status,
      finishedAt: latestReport?.finished_at || latestStatus?.timestamp || null,
      startedAt: latestReport?.started_at || null,
      totalVideos: latestReport?.total_videos || null
    };
  })();

  const latestRounds = Array.isArray(latestReport?.rounds) ? latestReport.rounds : [];
  const currentRoundEntry = latestRounds.find((item) => String(item?.status || '').toLowerCase() === 'running') || null;

  const totalRounds = Number(latestStatus?.total_rounds)
    || Number(latestRounds.length)
    || null;
  const currentRoundNumber = Number(latestStatus?.current_round)
    || Number(currentRoundEntry?.round)
    || null;

  const skipTest = Boolean(latestReport?.skip_test);
  const currentTestLabel = (() => {
    if (!isRunning) {
      return null;
    }

    if (skipTest) {
      return 'Pominięty (tryb bez testu)';
    }

    if (stage === 'round_testing' && currentRoundNumber) {
      return `Test po rundzie ${currentRoundNumber}${totalRounds ? `/${totalRounds}` : ''}`;
    }

    if (stage === 'round_training' && currentRoundNumber) {
      return `W trakcie treningu rundy ${currentRoundNumber}${totalRounds ? `/${totalRounds}` : ''}`;
    }

    if (stage === 'round_started' && currentRoundNumber) {
      return `Przygotowanie rundy ${currentRoundNumber}${totalRounds ? `/${totalRounds}` : ''}`;
    }

    return 'Oczekiwanie na etap testu';
  })();

  const sourceFromReport = Array.isArray(latestReport?.source)
    ? latestReport.source
    : latestReport?.source
      ? [String(latestReport.source)]
      : [];
  const sourceFromResume = Array.isArray(latestResumeState?.source)
    ? latestResumeState.source.map((folder) => String(folder || '').trim()).filter(Boolean)
    : [];
  const sourceFolders = Array.isArray(activeTrainingRun?.sourceFolders) && activeTrainingRun.sourceFolders.length > 0
    ? activeTrainingRun.sourceFolders
    : (sourceFromResume.length > 0 ? sourceFromResume : sourceFromReport);
  const hasResumeCheckpoint = !isRunning && sourceFromResume.length > 0;
  const pausedAt = pausedTrainingRun?.pausedAt || latestResumeState?.updated_at || null;
  const currentRound = isRunning || hasRecentRunningHint
    ? currentRoundEntry
    : null;

  return {
    running: isRunning,
    paused: Boolean((pausedTrainingRun || hasResumeCheckpoint) && !isRunning),
    pausedAt,
    pausedSourceFolders: Array.isArray(pausedTrainingRun?.sourceFolders) && pausedTrainingRun.sourceFolders.length > 0
      ? pausedTrainingRun.sourceFolders
      : sourceFromResume,
    resumeState: latestResumeState && typeof latestResumeState === 'object' ? latestResumeState : null,
    pid: activeTrainingRun?.pid || externalPid || null,
    startedAt: activeTrainingRun?.startedAt || null,
    sourceFolders,
    queueLength: trainingQueue.length,
    queue,
    currentRound: currentRound ? {
      round: Number(currentRound.round) || null,
      videos: Number(currentRound.videos) || null,
      startedAt: currentRound.started_at || null,
      status: currentRound.status || null
    } : null,
    currentTest: currentTestLabel,
    skipTest,
    lastCompleted,
    latestStatus,
    latestReport,
    hasRecentRunningHint
  };
}

function moveFileToRecycleBinWindows(filePath) {
  return new Promise((resolve, reject) => {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$target = $env:VC_TARGET_PATH",
      "if (-not $target) { throw 'Missing target path' }",
      "if (-not (Test-Path -LiteralPath $target)) { throw \"Path not found: $target\" }",
      "Add-Type -AssemblyName Microsoft.VisualBasic",
      "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($target, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)"
    ].join('; ');

    const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      windowsHide: true,
      env: {
        ...process.env,
        VC_TARGET_PATH: String(filePath || '')
      }
    });

    let stderr = '';
    ps.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `Recycle-bin move failed with code ${code}`));
    });
  });
}

function validateTrainingFolders(folders, allowEmpty = false) {
  if (!Array.isArray(folders) || folders.length === 0) {
    if (allowEmpty) {
      return { ok: true, folders: [] };
    }
    return { ok: false, error: 'Wybierz przynajmniej jeden folder do nauki.' };
  }

  const normalized = folders
    .map((folder) => String(folder || '').trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    if (allowEmpty) {
      return { ok: true, folders: [] };
    }
    return { ok: false, error: 'Wybierz przynajmniej jeden folder do nauki.' };
  }

  for (const folder of normalized) {
    if (!path.isAbsolute(folder)) {
      return { ok: false, error: `Ścieżka nie jest absolutna: ${folder}` };
    }
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      return { ok: false, error: `Folder nie istnieje lub nie jest katalogiem: ${folder}` };
    }
  }

  return { ok: true, folders: [...new Set(normalized)] };
}

function launchTrainingRun(sourceFolders, options = {}) {
  const args = [externalTrainingScript, '--skip-test'];
  if (options.resume) {
    args.push('--resume');
  }
  sourceFolders.forEach((folder) => {
    args.push('--source-dir', folder);
  });

  const child = spawn(externalTrainingPython, args, {
    cwd: path.dirname(externalTrainingScript),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  activeTrainingProcess = child;
  activeTrainingRun = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    sourceFolders,
    resume: Boolean(options.resume)
  };

  child.stdout.on('data', (chunk) => {
    const line = String(chunk || '').trim();
    if (line) {
      console.log(`[ML Train][${child.pid}] ${line}`);
    }
  });

  child.stderr.on('data', (chunk) => {
    const line = String(chunk || '').trim();
    if (line) {
      console.error(`[ML Train][${child.pid}][err] ${line}`);
    }
  });

  child.on('close', (code) => {
    console.log(`[ML Train] process exited (pid=${child.pid}, code=${code})`);
    activeTrainingProcess = null;
    activeTrainingRun = null;

    if (skipAutostartAfterStop) {
      skipAutostartAfterStop = false;
      return;
    }

    if (trainingQueue.length > 0) {
      const next = trainingQueue.shift();
      launchTrainingRun(next.sourceFolders, { resume: Boolean(next.resume) });
    }
  });

  return child.pid;
}

function enqueueOrStartTraining(sourceFolders, options = {}) {
  if (activeTrainingProcess && !activeTrainingProcess.killed) {
    trainingQueue.push({
      id: trainingQueueNextId++,
      sourceFolders,
      createdAt: new Date().toISOString(),
      resume: Boolean(options.resume)
    });
    return {
      queued: true,
      queueLength: trainingQueue.length,
      runningPid: activeTrainingRun?.pid || null
    };
  }

  const pid = launchTrainingRun(sourceFolders, options);
  return {
    queued: false,
    queueLength: trainingQueue.length,
    runningPid: pid
  };
}

function removeTrainingQueueItem(itemId) {
  const index = trainingQueue.findIndex((item) => Number(item.id) === Number(itemId));
  if (index < 0) {
    return false;
  }

  trainingQueue.splice(index, 1);
  return true;
}

function normalizeVideoName(videoName) {
  const base = path.parse(String(videoName || '')).name;
  return base
    .replace(/^video_\d+_/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPersonId(videoName) {
  const normalized = normalizeVideoName(videoName).toLowerCase();
  if (!normalized) {
    return 'unknown';
  }

  const tokens = normalized
    .replace(/[._-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const ignoredTokens = new Set([
    'x265', 'h265', 'hevc', 'x264', 'h264',
    'mkv', 'mp4', 'avi', 'mov', 'ts',
    'clip', 'part', 'test', 'preview', 'cut', 'export',
    'fps', 'hdr', 'uhd', 'sd', 'hd'
  ]);

  const personTokens = [];
  let numericStreak = 0;

  for (const token of tokens) {
    if (ignoredTokens.has(token)) {
      continue;
    }

    const isNumeric = /^\d+$/.test(token);
    const hasLetter = /[a-z]/.test(token);

    if (isNumeric) {
      numericStreak += 1;
      if (numericStreak >= 2 && personTokens.length > 0) {
        break;
      }
      continue;
    }

    numericStreak = 0;

    if (!hasLetter) {
      continue;
    }

    // Typical quality markers like 1080p/2160p are not a person ID token.
    if (/^\d+p$/.test(token)) {
      continue;
    }

    personTokens.push(token);
    if (personTokens.length >= 4) {
      break;
    }
  }

  const personId = personTokens.join('_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (personId) {
    return personId;
  }

  const fallback = normalized.match(/^([a-z0-9_]+)/);
  return fallback ? fallback[1] : 'unknown';
}

function loadPersonProfiles() {
  const db = readJsonSafe(personProfilesPath, {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    profiles: {}
  });

  const settings = loadMlSettings();
  const configuredRetention = Number(settings?.retentionDays);
  if (Number.isFinite(configuredRetention) && configuredRetention >= 7 && configuredRetention <= 365) {
    PERSON_PROFILE_RETENTION_DAYS = configuredRetention;
  }

  for (const personId of Object.keys(db.profiles || {})) {
    normalizePersonProfile(db.profiles[personId], personId);
  }

  applyLocalRetention(db);
  return db;
}

function savePersonProfiles(db) {
  db.updatedAt = new Date().toISOString();
  return writeJsonSafe(personProfilesPath, db);
}

function getOrCreatePersonProfile(db, personId) {
  if (!db.profiles[personId]) {
    db.profiles[personId] = {
      personId,
      createdAt: new Date().toISOString(),
      threshold: DEFAULT_PERSON_THRESHOLD,
      thresholdMode: 'auto',
      active: false,
      previewClip: null,
      minPositive: PERSON_PROFILE_MIN_POSITIVE,
      minNegative: PERSON_PROFILE_MIN_NEGATIVE,
      samples: [],
      previewFrames: [],
      metrics: {
        precision: 0,
        recall: 0,
        tp: 0,
        fp: 0,
        tn: 0,
        fn: 0,
        positives: 0,
        negatives: 0,
        support: 0
      },
      videos: []
    };
  }

  return db.profiles[personId];
}

function resolveCanonicalPersonId(db, personId) {
  const raw = String(personId || '').toLowerCase().trim();
  if (!raw || !db?.profiles || typeof db.profiles !== 'object') {
    return raw || 'unknown';
  }

  if (db.profiles[raw]) {
    return raw;
  }

  const profileIds = Object.keys(db.profiles);
  const strictPrefixMatches = profileIds.filter((id) => id.startsWith(`${raw}_`));
  if (strictPrefixMatches.length === 1) {
    return strictPrefixMatches[0];
  }

  const rawTokens = raw.split('_').filter(Boolean);
  if (rawTokens.length === 0) {
    return raw;
  }

  const tokenMatches = profileIds.filter((id) => {
    const idTokens = id.split('_').filter(Boolean);
    if (idTokens.length < rawTokens.length) {
      return false;
    }
    return rawTokens.every((token, idx) => idTokens[idx] === token);
  });

  if (tokenMatches.length === 1) {
    return tokenMatches[0];
  }

  return raw;
}

function normalizePersonProfile(profile, personId) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  profile.personId = String(profile.personId || personId || 'unknown').toLowerCase();
  profile.createdAt = profile.createdAt || new Date(0).toISOString();
  profile.updatedAt = profile.updatedAt || profile.createdAt;
  profile.threshold = Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD;
  profile.thresholdMode = profile.thresholdMode === 'manual' ? 'manual' : 'auto';
  profile.active = Boolean(profile.active);
  profile.minPositive = Number(profile.minPositive) || PERSON_PROFILE_MIN_POSITIVE;
  profile.minNegative = Number(profile.minNegative) || PERSON_PROFILE_MIN_NEGATIVE;
  profile.samples = Array.isArray(profile.samples) ? profile.samples : [];
  profile.videos = Array.isArray(profile.videos) ? profile.videos : [];
  profile.previewClip = profile.previewClip && typeof profile.previewClip === 'object'
    ? {
      filename: String(profile.previewClip.filename || '').trim(),
      sourceVideoId: String(profile.previewClip.sourceVideoId || '').trim(),
      start: Number(profile.previewClip.start),
      end: Number(profile.previewClip.end),
      updatedAt: profile.previewClip.updatedAt || profile.updatedAt || profile.createdAt
    }
    : null;
  profile.previewFrames = Array.isArray(profile.previewFrames)
    ? profile.previewFrames
      .map((frame) => ({
        cacheKey: normalizeCacheKey(frame?.cacheKey),
        time: Number(frame?.time)
      }))
      .filter((frame) => frame.cacheKey && Number.isFinite(frame.time))
      .slice(0, PERSON_PROFILE_PREVIEW_FRAME_LIMIT)
    : [];
  profile.previewSlots = Array.isArray(profile.previewSlots)
    ? profile.previewSlots
      .map((slotEntry) => ({
        slot: Number(slotEntry?.slot),
        filename: String(slotEntry?.filename || '').trim(),
        sourceVideoId: String(slotEntry?.sourceVideoId || '').trim(),
        start: Number(slotEntry?.start),
        end: Number(slotEntry?.end),
        updatedAt: slotEntry?.updatedAt || profile.updatedAt || profile.createdAt
      }))
      .filter((slotEntry) =>
        Number.isFinite(slotEntry.slot) &&
        slotEntry.slot >= 1 &&
        slotEntry.slot <= 5 &&
        slotEntry.filename &&
        Number.isFinite(slotEntry.start) &&
        Number.isFinite(slotEntry.end) &&
        slotEntry.end > slotEntry.start
      )
      .sort((a, b) => a.slot - b.slot)
    : [];

  if (
    !profile.previewClip ||
    !profile.previewClip.filename ||
    !Number.isFinite(profile.previewClip.start) ||
    !Number.isFinite(profile.previewClip.end) ||
    profile.previewClip.end <= profile.previewClip.start
  ) {
    profile.previewClip = null;
  }

  if (!profile.metrics || typeof profile.metrics !== 'object') {
    profile.metrics = scoreMetrics(profile.samples, profile.threshold);
  }

  return profile;
}

function recomputeProfileState(profile) {
  const positives = profile.samples.filter(s => s.label === 1).length;
  const negatives = profile.samples.filter(s => s.label === 0).length;
  const hasEnoughData = positives >= PERSON_PROFILE_MIN_POSITIVE && negatives >= PERSON_PROFILE_MIN_NEGATIVE;

  if (hasEnoughData) {
    if (profile.thresholdMode === 'manual') {
      profile.threshold = parseFloat((Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD).toFixed(2));
      profile.metrics = scoreMetrics(profile.samples, profile.threshold);
    } else {
      const optimized = optimizePersonThreshold(profile.samples);
      profile.threshold = optimized.threshold;
      profile.metrics = optimized.metrics;
    }
    profile.active = true;
  } else {
    if (profile.thresholdMode !== 'manual') {
      profile.threshold = DEFAULT_PERSON_THRESHOLD;
    }
    profile.metrics = scoreMetrics(profile.samples, profile.threshold || DEFAULT_PERSON_THRESHOLD);
    profile.active = false;
  }
}

function buildProfilePreviewFrames(profile) {
  return (profile.previewFrames || []).map((frame) => ({
    cacheKey: frame.cacheKey,
    time: frame.time,
    url: `/api/thumbnail/${frame.cacheKey}/thumb_${frame.time}.jpg`
  }));
}

function buildProfilePreviewClip(profile) {
  if (!profile?.previewClip?.filename) {
    return null;
  }

  const clipPath = path.join(personProfilePreviewClipsDir, profile.previewClip.filename);
  if (!fs.existsSync(clipPath)) {
    return null;
  }

  return {
    filename: profile.previewClip.filename,
    start: profile.previewClip.start,
    end: profile.previewClip.end,
    duration: parseFloat((profile.previewClip.end - profile.previewClip.start).toFixed(2)),
    url: `/api/profile-preview-clips/${encodeURIComponent(profile.previewClip.filename)}?v=${encodeURIComponent(profile.previewClip.updatedAt || profile.updatedAt || '')}`
  };
}

function buildProfilePreviewSlots(profile) {
  return (profile?.previewSlots || [])
    .map((slotEntry) => {
      const clipPath = path.join(personProfilePreviewClipsDir, slotEntry.filename);
      if (!fs.existsSync(clipPath)) {
        return null;
      }

      return {
        slot: Number(slotEntry.slot),
        filename: slotEntry.filename,
        start: Number(slotEntry.start),
        end: Number(slotEntry.end),
        duration: parseFloat((Number(slotEntry.end) - Number(slotEntry.start)).toFixed(2)),
        url: `/api/profile-preview-clips/${encodeURIComponent(slotEntry.filename)}?v=${encodeURIComponent(slotEntry.updatedAt || profile.updatedAt || '')}`,
        updatedAt: slotEntry.updatedAt || profile.updatedAt || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.slot - b.slot);
}

function createProfilePreviewClip(personId, sourceVideoId, start, end, customFilename = null) {
  return new Promise((resolve, reject) => {
    const safePersonId = String(personId || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    const filename = String(customFilename || `${safePersonId}.mp4`).trim();
    const sourcePath = path.join(uploadsDir, sourceVideoId);
    const outputPath = path.join(personProfilePreviewClipsDir, filename);
    const clipStart = Math.max(0, Number(start) || 0);
    const clipEnd = Math.max(clipStart + 0.1, Number(end) || clipStart + 25);
    const clipDuration = parseFloat((clipEnd - clipStart).toFixed(2));

    if (!fs.existsSync(sourcePath)) {
      reject(new Error(`Nie znaleziono źródłowego video: ${sourceVideoId}`));
      return;
    }

    ffmpeg(sourcePath)
      .setStartTime(clipStart)
      .duration(clipDuration)
      .noAudio()
      .videoCodec('libx264')
      .outputOptions(['-preset veryfast', '-crf 24', '-movflags +faststart', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve({
        filename,
        sourceVideoId,
        start: clipStart,
        end: clipEnd,
        updatedAt: new Date().toISOString()
      }))
      .on('error', (err) => reject(new Error(`Nie udało się wygenerować klipu podglądu: ${err.message}`)))
      .run();
  });
}

function buildProfilesSummary(db) {
  const profiles = Object.values(db?.profiles || {}).map((profile) => normalizePersonProfile(profile, profile?.personId)).filter(Boolean);
  const totalProfiles = profiles.length;
  const activeProfiles = profiles.filter((profile) => profile.active).length;
  const totalSamples = profiles.reduce((sum, profile) => sum + (Number(profile?.metrics?.support) || 0), 0);
  const totalTp = profiles.reduce((sum, profile) => sum + (Number(profile?.metrics?.tp) || 0), 0);
  const totalFp = profiles.reduce((sum, profile) => sum + (Number(profile?.metrics?.fp) || 0), 0);
  const totalFn = profiles.reduce((sum, profile) => sum + (Number(profile?.metrics?.fn) || 0), 0);
  const averageThreshold = totalProfiles > 0
    ? profiles.reduce((sum, profile) => sum + (Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD), 0) / totalProfiles
    : DEFAULT_PERSON_THRESHOLD;

  return {
    retentionDays: PERSON_PROFILE_RETENTION_DAYS,
    totalProfiles,
    activeProfiles,
    totalSamples,
    globalPrecision: totalTp / Math.max(1, totalTp + totalFp),
    globalRecall: totalTp / Math.max(1, totalTp + totalFn),
    averageThreshold: parseFloat(averageThreshold.toFixed(2)),
    lastUpdatedAt: profiles
      .map((profile) => profile.updatedAt)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || db?.updatedAt || null,
    profiles: profiles
      .sort((left, right) => String(left.personId).localeCompare(String(right.personId)))
      .map((profile) => ({
        personId: profile.personId,
        active: Boolean(profile.active),
        threshold: Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD,
        thresholdMode: profile.thresholdMode || 'auto',
        metrics: profile.metrics || scoreMetrics(profile.samples || [], profile.threshold || DEFAULT_PERSON_THRESHOLD),
        videosCount: Array.isArray(profile.videos) ? profile.videos.length : 0,
        updatedAt: profile.updatedAt || null,
        createdAt: profile.createdAt || null,
        previewFrames: buildProfilePreviewFrames(profile),
        previewClip: buildProfilePreviewClip(profile),
        previewSlots: buildProfilePreviewSlots(profile)
      }))
  };
}

function removeProfilePreviewMedia(profile) {
  const filesToDelete = new Set();

  if (profile?.previewClip?.filename) {
    filesToDelete.add(profile.previewClip.filename);
  }

  for (const slotEntry of (profile?.previewSlots || [])) {
    if (slotEntry?.filename) {
      filesToDelete.add(slotEntry.filename);
    }
  }

  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(personProfilePreviewClipsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('[ML Local] Failed to remove preview media:', filename, err.message);
    }
  }
}

function scoreMetrics(samples, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const sample of samples) {
    const predicted = sample.confidence >= threshold;
    const actual = sample.label === 1;

    if (predicted && actual) tp++;
    if (predicted && !actual) fp++;
    if (!predicted && !actual) tn++;
    if (!predicted && actual) fn++;
  }

  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);

  return {
    precision,
    recall,
    tp,
    fp,
    tn,
    fn,
    positives: samples.filter(s => s.label === 1).length,
    negatives: samples.filter(s => s.label === 0).length,
    support: samples.length
  };
}

function optimizePersonThreshold(samples) {
  const candidates = [];
  for (let i = 50; i <= 95; i++) {
    candidates.push(i / 100);
  }

  let bestThreshold = DEFAULT_PERSON_THRESHOLD;
  let bestMetrics = scoreMetrics(samples, bestThreshold);

  for (const threshold of candidates) {
    const metrics = scoreMetrics(samples, threshold);

    const isBetterPrecision = metrics.precision > bestMetrics.precision + 1e-6;
    const isTiePrecisionBetterRecall =
      Math.abs(metrics.precision - bestMetrics.precision) <= 1e-6 &&
      metrics.recall > bestMetrics.recall;

    if (isBetterPrecision || isTiePrecisionBetterRecall) {
      bestThreshold = threshold;
      bestMetrics = metrics;
    }
  }

  return {
    threshold: parseFloat(bestThreshold.toFixed(2)),
    metrics: bestMetrics
  };
}

function trimProfileSamples(profile) {
  if (!Array.isArray(profile.samples)) {
    profile.samples = [];
    return;
  }

  const retentionCutoff = Date.now() - (PERSON_PROFILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  profile.samples = profile.samples
    .filter(sample => Number.isFinite(sample.ts) && sample.ts >= retentionCutoff)
    .sort((a, b) => a.ts - b.ts);

  if (profile.samples.length > PERSON_PROFILE_MAX_SAMPLES) {
    profile.samples = profile.samples.slice(-PERSON_PROFILE_MAX_SAMPLES);
  }
}

function applyLocalRetention(db) {
  if (!db || !db.profiles || typeof db.profiles !== 'object') {
    return;
  }

  let changed = false;

  for (const personId of Object.keys(db.profiles)) {
    const profile = db.profiles[personId];
    const before = Array.isArray(profile.samples) ? profile.samples.length : 0;
    trimProfileSamples(profile);
    const after = Array.isArray(profile.samples) ? profile.samples.length : 0;

    if (after !== before) {
      changed = true;
      profile.updatedAt = new Date().toISOString();
      recomputeProfileState(profile);
    }
  }

  if (changed) {
    savePersonProfiles(db);
  }
}

function updateProfileTraining(personId, videoName, labeledSamples) {
  if (!Array.isArray(labeledSamples) || labeledSamples.length === 0) {
    return null;
  }

  const db = loadPersonProfiles();
  const canonicalPersonId = resolveCanonicalPersonId(db, personId);
  const profile = getOrCreatePersonProfile(db, canonicalPersonId);
  const dedupe = new Set(profile.samples.map(s => `${s.video}|${s.time}`));

  for (const sample of labeledSamples) {
    const key = `${sample.video}|${sample.time}`;
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    profile.samples.push(sample);
  }

  profile.updatedAt = new Date().toISOString();
  if (!profile.videos.includes(videoName)) {
    profile.videos.push(videoName);
    if (profile.videos.length > 100) {
      profile.videos = profile.videos.slice(-100);
    }
  }

  trimProfileSamples(profile);
  recomputeProfileState(profile);

  savePersonProfiles(db);
  return profile;
}

function getProfileForPerson(personId) {
  const db = loadPersonProfiles();
  const canonicalPersonId = resolveCanonicalPersonId(db, personId);
  return db.profiles[canonicalPersonId] || null;
}

function getEffectiveThreshold(personId) {
  const profile = getProfileForPerson(personId);
  if (!profile || !profile.active) {
    return DEFAULT_PERSON_THRESHOLD;
  }

  return Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD;
}

function segmentContainsTime(segments, timePoint) {
  return segments.some(seg => timePoint >= seg.start && timePoint < seg.end);
}

function recordCutLearning(uploadedVideoName, originalName, selectedSegments) {
  const context = nsfwScanContextRegistry.get(uploadedVideoName);
  if (!context || !Array.isArray(context.frames) || context.frames.length === 0) {
    console.log('[ML Local] No scan context available for cut learning:', uploadedVideoName);
    return;
  }

  const personId = extractPersonId(originalName || uploadedVideoName);
  const normalizedVideoName = normalizeVideoName(originalName || uploadedVideoName);
  const normalizedSegments = [...selectedSegments].sort((a, b) => a.start - b.start);

  const labeledSamples = context.frames.map(frame => ({
    video: normalizedVideoName,
    time: frame.time,
    confidence: frame.confidence,
    label: segmentContainsTime(normalizedSegments, frame.time) ? 1 : 0,
    ts: Date.now()
  }));

  const profile = updateProfileTraining(personId, normalizedVideoName, labeledSamples);
  if (profile) {
    console.log(
      `[ML Local] Updated profile ${personId}: active=${profile.active}, threshold=${profile.threshold}, ` +
      `samples=${profile.metrics.support}, precision=${(profile.metrics.precision * 100).toFixed(1)}%`
    );
  }
}

function setScanProgress(scanId, payload) {
  if (!scanId) {
    return;
  }

  const prev = nsfwScanProgressRegistry.get(scanId) || {};
  nsfwScanProgressRegistry.set(scanId, {
    ...prev,
    ...payload,
    updatedAt: Date.now()
  });
}

function scheduleScanProgressCleanup(scanId, delayMs = 5 * 60 * 1000) {
  if (!scanId) {
    return;
  }

  setTimeout(() => {
    nsfwScanProgressRegistry.delete(scanId);
  }, delayMs);
}

// Ensure directories exist
[uploadsDir, cacheDir, outputDir, mlDataDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function resolveOutputDirectory(customOutputDir) {
  if (customOutputDir && path.isAbsolute(customOutputDir)) {
    if (!fs.existsSync(customOutputDir)) {
      fs.mkdirSync(customOutputDir, { recursive: true });
    }
    return customOutputDir;
  }

  return outputDir;
}

function sanitizePathPart(value) {
  return value.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, ' ').trim() || 'export';
}

function createExportDirectory(baseOutputDir, originalName, sessionId) {
  const baseNameNoExt = path.parse(originalName).name;
  const safeBaseName = sanitizePathPart(baseNameNoExt);
  const exportDir = path.join(baseOutputDir, `${safeBaseName}_${sessionId}`);

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  return exportDir;
}

function registerOutputFile(filePath) {
  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  outputFileRegistry.set(token, filePath);
  return token;
}

function normalizeCacheKey(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 120);
}

function readChunk(fd, offset, length) {
  const buffer = Buffer.alloc(length);
  const bytesRead = fs.readSync(fd, buffer, 0, length, offset);
  return buffer.subarray(0, bytesRead);
}

function computeFileFingerprint(filePath) {
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('sha1');
  const sampleSize = 256 * 1024;

  hash.update(String(stat.size));

  const fd = fs.openSync(filePath, 'r');
  try {
    const headSize = Math.min(sampleSize, stat.size);
    const head = readChunk(fd, 0, headSize);
    hash.update(head);

    if (stat.size > sampleSize) {
      const tailOffset = Math.max(0, stat.size - sampleSize);
      const tail = readChunk(fd, tailOffset, Math.min(sampleSize, stat.size));
      hash.update(tail);
    }
  } finally {
    fs.closeSync(fd);
  }

  return `v1_${hash.digest('hex')}`;
}

function computeFallbackCacheKey(filePath, originalName = '') {
  try {
    const stat = fs.statSync(filePath);
    const fallbackHash = crypto.createHash('sha1');
    const normalizedName = String(originalName || path.basename(filePath) || '').toLowerCase();
    fallbackHash.update(normalizedName);
    fallbackHash.update('|');
    fallbackHash.update(String(stat.size || 0));
    fallbackHash.update('|');
    fallbackHash.update(String(Math.floor(Number(stat.mtimeMs || 0))));
    return `v1f_${fallbackHash.digest('hex')}`;
  } catch (_) {
    const nameOnly = String(originalName || path.basename(filePath) || 'video').toLowerCase();
    return `v1n_${nameOnly}`;
  }
}

function clearDirectoryContents(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath);
  entries.forEach(entry => {
    const entryPath = path.join(dirPath, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  });
}

function clearOutputBeforeCut() {
  clearDirectoryContents(outputDir);
  outputFileRegistry.clear();
}

function buildGroupedSegments(segments) {
  if (!segments || segments.length === 0) {
    return [];
  }

  const sortedSegments = [...segments]
    .map(segment => ({ ...segment }))
    .sort((left, right) => left.start - right.start);

  const groupedSegments = [];
  const byGroupId = new Map();
  const ungrouped = [];

  for (const segment of sortedSegments) {
    if (Number.isFinite(segment.groupId)) {
      if (!byGroupId.has(segment.groupId)) {
        byGroupId.set(segment.groupId, []);
      }
      byGroupId.get(segment.groupId).push(segment);
    } else {
      ungrouped.push(segment);
    }
  }

  // Prefer user selection grouping: one selection group should map to one output file.
  const orderedGroupIds = [...byGroupId.keys()].sort((a, b) => {
    const aStart = byGroupId.get(a)[0]?.start ?? Number.MAX_SAFE_INTEGER;
    const bStart = byGroupId.get(b)[0]?.start ?? Number.MAX_SAFE_INTEGER;
    return aStart - bStart;
  });

  for (const groupId of orderedGroupIds) {
    const groupSegments = byGroupId.get(groupId).sort((a, b) => a.start - b.start);
    if (groupId === NSFW_GROUP_ID) {
      const islands = [];
      const epsilon = 0.1;
      let current = [groupSegments[0]];

      for (let i = 1; i < groupSegments.length; i++) {
        const seg = groupSegments[i];
        const last = current[current.length - 1];
        if (seg.start <= last.end + epsilon) {
          current.push(seg);
        } else {
          islands.push(current);
          current = [seg];
        }
      }
      if (current.length > 0) {
        islands.push(current);
      }

      islands.forEach(island => {
        groupedSegments.push({
          groupIndex: groupedSegments.length + 1,
          segments: island
        });
      });
      continue;
    }

    groupedSegments.push({
      groupIndex: groupedSegments.length + 1,
      segments: groupSegments
    });
  }

  // Fallback for legacy payloads without groupId: keep adaptive time-based merge.
  if (ungrouped.length > 0) {
    let currentGroup = [];
    const durations = ungrouped
      .map(seg => Math.max(0, (seg.end || 0) - (seg.start || 0)))
      .filter(d => Number.isFinite(d) && d > 0)
      .sort((a, b) => a - b);

    const medianDuration = durations.length > 0
      ? durations[Math.floor(durations.length / 2)]
      : 0;

    const adaptiveMergeThreshold = Math.max(
      AUTO_MERGE_THRESHOLD,
      medianDuration > 0 ? medianDuration * 2.0 : AUTO_MERGE_THRESHOLD
    );

    console.log('[Merge] Fallback adaptive threshold:', adaptiveMergeThreshold, 's (median segment:', medianDuration, 's)');

    for (const segment of ungrouped) {
      if (currentGroup.length === 0) {
        currentGroup.push(segment);
        continue;
      }

      const lastSegment = currentGroup[currentGroup.length - 1];
      const gap = segment.start - lastSegment.end;

      if (gap >= -0.1 && gap <= adaptiveMergeThreshold) {
        currentGroup.push(segment);
      } else {
        groupedSegments.push({
          groupIndex: groupedSegments.length + 1,
          segments: currentGroup
        });
        currentGroup = [segment];
      }
    }

    if (currentGroup.length > 0) {
      groupedSegments.push({
        groupIndex: groupedSegments.length + 1,
        segments: currentGroup
      });
    }
  }

  // Backend safety pass: merge only truly overlapping ranges.
  // Do not merge groups that only touch at boundary.
  const epsilon = 0.1;
  const groupRanges = groupedSegments
    .map(group => {
      const start = group.segments[0].start;
      const end = group.segments.reduce((maxEnd, seg) => Math.max(maxEnd, seg.end), group.segments[0].end);
      return {
        start,
        end,
        groupId: group.segments[0]?.groupId ?? null
      };
    })
    .sort((a, b) => a.start - b.start);

  const normalizedRanges = [];
  for (const range of groupRanges) {
    const last = normalizedRanges[normalizedRanges.length - 1];
    if (!last) {
      normalizedRanges.push({ ...range });
      continue;
    }

    if (range.start < (last.end - epsilon)) {
      last.end = Math.max(last.end, range.end);
      if (!Number.isFinite(last.groupId) && Number.isFinite(range.groupId)) {
        last.groupId = range.groupId;
      }
    } else {
      normalizedRanges.push({ ...range });
    }
  }

  if (normalizedRanges.length !== groupedSegments.length) {
    console.log('[Merge] Normalized overlapping groups:', groupedSegments.length, '->', normalizedRanges.length);
  }

  return normalizedRanges.map((range, idx) => ({
    groupIndex: idx + 1,
    segments: [{
      start: range.start,
      end: range.end,
      groupId: range.groupId
    }]
  }));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024 // 100GB - praktycznie bez ograniczeń
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.mp4', '.mkv', '.ts', '.hevc', '.h265'];
    const ext = path.extname(file.originalname).toLowerCase();
    console.log('File filter - checking:', file.originalname, 'ext:', ext);
    
    if (allowedFormats.includes(ext)) {
      console.log('File extension OK:', ext);
      cb(null, true);
    } else {
      const error = 'Only MP4, MKV, TS, HEVC, and H265 formats are allowed. Got: ' + ext;
      console.error('File filter error:', error);
      cb(new Error(error));
    }
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// NSFW Model Server URL (Python Flask on port 5001)
const NSFW_MODEL_SERVER = 'http://127.0.0.1:5001';

// Try custom ResNet50 model first, fallback to pixel analysis
let nsfwModelAvailable = null; // null = unknown, true/false after first check
const modelSaturationSamples = [];
let modelDisabledUntil = 0;

function recordModelConfidenceSample(confidence) {
  if (!Number.isFinite(confidence)) {
    return;
  }

  modelSaturationSamples.push({
    ts: Date.now(),
    saturated: confidence >= 0.9999 || confidence <= 0.0001
  });

  // Keep only recent small window for stability checks.
  if (modelSaturationSamples.length > 120) {
    modelSaturationSamples.splice(0, modelSaturationSamples.length - 120);
  }
}

function shouldTemporarilyDisableModel() {
  if (Date.now() < modelDisabledUntil) {
    return true;
  }

  if (modelSaturationSamples.length < 24) {
    return false;
  }

  const saturatedCount = modelSaturationSamples.filter((sample) => sample.saturated).length;
  const ratio = saturatedCount / modelSaturationSamples.length;

  if (ratio >= 0.8) {
    modelDisabledUntil = Date.now() + (10 * 60 * 1000);
    console.warn(`[NSFW] Disabled custom model for 10 minutes due to saturated confidence ratio ${(ratio * 100).toFixed(1)}%.`);
    return true;
  }

  return false;
}

async function checkNsfwModelHealth() {
  try {
    const http = require('http');
    return await new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1', port: 5001, path: '/health', method: 'GET', timeout: 1500
      }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    });
  } catch (_) {
    return false;
  }
}

async function detectNSFWWithModel(imagePath, threshold = null) {
  try {
    const http = require('http');
    const bodyObj = { image_path: imagePath };
    if (threshold !== null && Number.isFinite(Number(threshold))) {
      bodyObj.threshold = Number(threshold);
    }
    const body = JSON.stringify(bodyObj);
    return await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path: '/predict',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 1500
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });
  } catch (e) {
    return null; // Model server not available
  }
}

// NSFW Detection Function - Aggressive mode for explicit content
// Detects:
// - Bare breasts (any size/gender)
// - Genitals (penis, vulva)
// - Explicit nudity (>30% skin exposure)
// Does NOT flag: shirtless athletes, partial skin exposure
async function detectNSFW(imagePath, threshold = null) {
  if (shouldTemporarilyDisableModel()) {
    nsfwModelAvailable = false;
  }

  // Check model availability once; cache result for 60s to avoid per-image health pings
  if (nsfwModelAvailable === null) {
    nsfwModelAvailable = await checkNsfwModelHealth();
    setTimeout(() => { nsfwModelAvailable = null; }, 60 * 1000);
  }

  // Try custom trained model first (only if available)
  if (nsfwModelAvailable !== false) {
    const modelResult = await detectNSFWWithModel(imagePath, threshold);
    if (modelResult && !modelResult.error) {
      const confidence = Number(modelResult?.confidence);
      recordModelConfidenceSample(confidence);
      const saturated = Number.isFinite(confidence)
        && (confidence >= 0.9999 || confidence <= 0.0001);

      if (!saturated) {
        return modelResult;
      }

      // Some broken checkpoints return constant 1.0/0.0 for nearly all frames.
      // In that case, prefer conservative local heuristic over unusable model output.
      console.warn('[NSFW] Model output appears saturated; using local heuristic fallback for this frame.');

      if (shouldTemporarilyDisableModel()) {
        nsfwModelAvailable = false;
      }
    } else {
      recordModelConfidenceSample(NaN);
    }
    // If call failed, mark as unavailable so remaining batch skips HTTP
    nsfwModelAvailable = false;
  }

  return new Promise(async (resolve) => {
    try {
      if (!fs.existsSync(imagePath)) {
        resolve({ nsfw_score: 0, is_nsfw: false, method: 'file_not_found' });
        return;
      }

      const metadata = await sharp(imagePath).metadata();
      if (!metadata) {
        resolve({ nsfw_score: 0, is_nsfw: false, method: 'no_metadata' });
        return;
      }

      const buffer = await sharp(imagePath)
        .resize(300, 300, { fit: 'cover' })
        .raw()
        .toBuffer();

      const width = 300;
      const height = 300;
      const channels = 3;
      const effectiveThreshold = threshold !== null && Number.isFinite(Number(threshold))
        ? Number(threshold)
        : null;

      // Divide image into regions for analysis
      // Top third: check for breasts
      // Bottom third: check for genitals
      // Overall: check total skin percentage
      
      let skinPixels = 0;
      let topSkinPixels = 0;    // Top 1/3 - breasts area
      let bottomSkinPixels = 0; // Bottom 1/3 - genitals area
      let midSkinPixels = 0;    // Middle area
      let totalPixels = width * height;
      
      // High saturation + high value = likely exposed flesh
      let explicitPixels = 0;

      // Analyze each pixel for skin tone and nudity
      for (let i = 0; i < buffer.length; i += channels) {
        const pixelIndex = i / channels;
        const y = Math.floor(pixelIndex / width);
        const x = pixelIndex % width;
        
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];

        // Convert RGB to HSV
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        let s = 0;
        let v = max / 255;

        if (max !== 0) {
          s = delta / max;
        }

        if (delta !== 0) {
          if (max === r) {
            h = ((g - b) / delta) % 6;
          } else if (max === g) {
            h = (b - r) / delta + 2;
          } else {
            h = (r - g) / delta + 4;
          }
          h = h * 60;
          if (h < 0) h += 360;
        }

        // Aggressive skin tone detection for explicit content
        // Broad hue range: 0-40° (includes shadows and lighter skin)
        // Lower saturation: 8-55% (captures more skin variations)
        // Lower value threshold: 40% (catches darker and lighter skin)
        const isSkinTone = 
          ((h >= 0 && h <= 40) || (h >= 340 && h <= 360)) &&
          s >= 0.08 && s <= 0.55 &&
          v >= 0.4;

        if (isSkinTone) {
          skinPixels++;
          
          // Region analysis
          const regionHeight = height / 3;
          if (y < regionHeight) {
            topSkinPixels++;
          } else if (y < regionHeight * 2) {
            midSkinPixels++;
          } else {
            bottomSkinPixels++;
          }
          
          // Explicit nudity: high saturation (skin texture) + high value (bright)
          if (s >= 0.2 && v >= 0.65) {
            explicitPixels++;
          }
        }
      }

      // Calculate percentages
      const skinPercentage = skinPixels / totalPixels;
      const topSkinPercentage = topSkinPixels / (width * (height / 3));
      const bottomSkinPercentage = bottomSkinPixels / (width * (height / 3));
      const midSkinPercentage = midSkinPixels / (width * (height / 3));
      const explicitPercentage = explicitPixels / totalPixels;

      // CONSERVATIVE nudity detection - only flag extreme cases
      // Thresholds are much stricter than before to reduce false positives:
      // 1. >70% total skin exposure (almost entire frame is exposed skin)
      // 2. >60% top region (almost entire head/chest area exposed) + extreme explicit pixels
      // 3. >60% bottom region (almost entire lower body exposed) + extreme explicit pixels
      // 4. >30% explicit bright pixels (very concentrated nudity)
      
      let nsfw_score = 0;
      let is_nsfw = false;
      let detection_reason = '';

      // Check for extreme breasts exposure (>60% of top third + very explicit pixels)
      if (topSkinPercentage > 0.60 && explicitPercentage > 0.25) {
        nsfw_score = Math.max(nsfw_score, 0.95);
        is_nsfw = true;
        detection_reason = 'Extreme breast exposure detected';
      }

      // Check for extreme genitals exposure (>60% of bottom third + extreme explicit pixels)
      if (bottomSkinPercentage > 0.60 && explicitPercentage > 0.30) {
        nsfw_score = Math.max(nsfw_score, 0.95);
        is_nsfw = true;
        detection_reason = 'Extreme intimate area exposure detected';
      }

      // Check for extreme overall nudity (>70% skin + extreme explicit pixels)
      if (skinPercentage > 0.70 && explicitPercentage > 0.30) {
        nsfw_score = Math.max(nsfw_score, 0.85);
        is_nsfw = true;
        detection_reason = 'Extreme full-body exposure detected';
      }

      // Extreme explicit pixel concentration (>30% of frame is explicit bright pixels)
      if (explicitPercentage > 0.30) {
        nsfw_score = Math.max(nsfw_score, 0.90);
        is_nsfw = true;
        detection_reason = 'Extreme explicit skin texture detected';
      }

      resolve({
        nsfw_score: parseFloat((nsfw_score * 100).toFixed(1)),
        is_nsfw,
        method: 'aggressive_nudity_detection',
        skinPercentage: parseFloat((skinPercentage * 100).toFixed(1)),
        explicitPercentage: parseFloat((explicitPercentage * 100).toFixed(1)),
        topSkinPercentage: parseFloat((topSkinPercentage * 100).toFixed(1)),
        bottomSkinPercentage: parseFloat((bottomSkinPercentage * 100).toFixed(1)),
        detection_reason
      });
    } catch (err) {
      console.warn('NSFW detection error:', err.message);
      resolve({ 
        nsfw_score: 0, 
        is_nsfw: false, 
        method: 'error', 
        error: err.message 
      });
    }
  });
}

// Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    ffmpegPath: ffmpegInstaller.path,
    ffmpegExists: fs.existsSync(ffmpegInstaller.path)
  });
});

// Upload video
app.post('/api/upload', upload.single('video'), (req, res) => {
  console.log('Upload request received');
  console.log('File:', req.file);
  console.log('Body:', req.body);

  if (!req.file) {
    console.error('No file in request');
    return res.status(400).json({ error: 'No file uploaded - brak pliku w żądaniu' });
  }

  const originalName = req.file.originalname;
  const videoPath = req.file.path;
  let cacheKey = normalizeCacheKey(computeFallbackCacheKey(videoPath, originalName)) || req.file.filename;

  try {
    cacheKey = normalizeCacheKey(computeFileFingerprint(videoPath)) || cacheKey;
  } catch (sigErr) {
    console.warn('[Upload] Failed to compute primary cache key, using deterministic fallback:', sigErr.message);
  }

  console.log('Processing file:', originalName, 'at:', videoPath);

  // Get video duration
  ffmpeg.ffprobe(videoPath, (err, metadata) => {
    if (err) {
      console.error('FFprobe error:', err.message);
      fs.unlink(videoPath, () => {});
      return res.status(400).json({ error: 'Invalid video file: ' + err.message });
    }

    const duration = metadata.format.duration;
    console.log('Video duration:', duration);

    sourceVideoPathRegistry.set(req.file.filename, videoPath);

    res.json({
      id: req.file.filename,
      cacheKey,
      originalName,
      videoPath: `/api/video/${req.file.filename}`,
      duration
    });
  });
});

// Upload from file path (Electron app - select file via dialog)
app.post('/api/upload-from-path', (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'No file path provided' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found: ' + filePath });
  }

  try {
    // Get file name
    const originalName = path.basename(filePath);
    const filename = `video_${Date.now()}_${originalName}`;
    const destPath = path.join(uploadsDir, filename);
    let cacheKey = normalizeCacheKey(computeFallbackCacheKey(filePath, originalName)) || filename;

    try {
      cacheKey = normalizeCacheKey(computeFileFingerprint(filePath)) || cacheKey;
    } catch (sigErr) {
      console.warn('[UploadFromPath] Failed to compute primary cache key, using deterministic fallback:', sigErr.message);
    }

    console.log(`Copying file from ${filePath} to ${destPath}`);

    // Copy file to uploads directory
    fs.copyFileSync(filePath, destPath);

    // Get video duration
    ffmpeg.ffprobe(destPath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err.message);
        fs.unlink(destPath, () => {});
        return res.status(400).json({ error: 'Invalid video file: ' + err.message });
      }

      const duration = metadata.format.duration;
      console.log('Video duration:', duration);

      res.json({
        id: filename,
        cacheKey,
        originalName,
        videoPath: `/api/video/${filename}`,
        duration
      });

      sourceVideoPathRegistry.set(filename, filePath);
    });
  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).json({ error: 'Error processing file: ' + err.message });
  }
});

// Get video file
app.get('/api/video/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  res.download(filePath);
});

function generateThumbnailsBatch(videoPath, videoCachePath, thumbInterval, times) {
  return new Promise((resolve, reject) => {
    const batchPrefix = 'batch_thumb_';
    const batchPattern = path.join(videoCachePath, `${batchPrefix}%06d.jpg`);

    try {
      const staleBatch = fs.readdirSync(videoCachePath)
        .filter((name) => name.startsWith(batchPrefix) && name.endsWith('.jpg'));
      staleBatch.forEach((name) => {
        try {
          fs.unlinkSync(path.join(videoCachePath, name));
        } catch (_) {}
      });
    } catch (_) {}

    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=1/${thumbInterval},scale=640:-2`,
        '-q:v 8',
        '-start_number 0'
      ])
      .output(batchPattern)
      .on('end', () => {
        try {
          const generated = fs.readdirSync(videoCachePath)
            .filter((name) => name.startsWith(batchPrefix) && name.endsWith('.jpg'))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          for (let i = 0; i < generated.length; i++) {
            const src = path.join(videoCachePath, generated[i]);

            if (i >= times.length) {
              try {
                fs.unlinkSync(src);
              } catch (_) {}
              continue;
            }

            const targetName = `thumb_${times[i]}.jpg`;
            const targetPath = path.join(videoCachePath, targetName);
            try {
              fs.copyFileSync(src, targetPath);
              fs.unlinkSync(src);
            } catch (_) {}
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

// Generate thumbnails
app.post('/api/thumbnails', async (req, res) => {
  const { videoPath: urlPath, duration, interval, cacheKey, threshold } = req.body;
  const filename = urlPath.split('/').pop();
  const videoPath = path.join(uploadsDir, filename);

  const thumbnails = [];
  const thumbInterval = interval || Math.max(30, Math.ceil(duration / 10));
  const normalizedKey = normalizeCacheKey(cacheKey) || filename;
  const videoCachePath = path.join(cacheDir, normalizedKey);
  const analysisCachePath = path.join(videoCachePath, `analysis_${thumbInterval}.json`);
  const videoExists = fs.existsSync(videoPath);
  const effectiveThreshold = threshold !== undefined && threshold !== null && Number.isFinite(Number(threshold))
    ? Number(threshold)
    : null;
  
  if (!fs.existsSync(videoCachePath)) {
    fs.mkdirSync(videoCachePath, { recursive: true });
  }
  
  const times = [];
  // Use only full thumbnail intervals. FFmpeg fps=1/N does not reliably emit
  // an extra frame for the final short tail segment, which caused a permanent
  // cache miss for the last expected timestamp (for example 3475s on a 3484.8s video).
  for (let i = 0; (i + thumbInterval) <= (Number(duration) + 0.001); i += thumbInterval) {
    times.push(i);
  }
  const totalThumbnails = times.length;

  const allThumbsPresent = times.every((timePoint) => {
    const thumbName = `thumb_${timePoint}.jpg`;
    return fs.existsSync(path.join(videoCachePath, thumbName));
  });

  let cachedAnalysis = null;
  if (fs.existsSync(analysisCachePath)) {
    try {
      cachedAnalysis = JSON.parse(fs.readFileSync(analysisCachePath, 'utf-8'));
    } catch (cacheErr) {
      console.warn('[Thumbnails] Failed to read analysis cache:', cacheErr.message);
    }
  }

  const cachedTimes = Array.isArray(cachedAnalysis?.times)
    ? cachedAnalysis.times
      .map((t) => Number(t))
      .filter((t) => Number.isFinite(t) && t >= 0)
    : [];
  const cachedIntervalMatches = Number(cachedAnalysis?.interval) === Number(thumbInterval);
  const cachedThumbsPresent = cachedTimes.length > 0 && cachedTimes.every((timePoint) => {
    const thumbName = `thumb_${timePoint}.jpg`;
    return fs.existsSync(path.join(videoCachePath, thumbName));
  });

  const cachedNsfw = cachedAnalysis?.nsfw_analysis || null;
  const analysisComplete = Boolean(
    cachedNsfw &&
    times.length > 0 &&
    times.every((t) => Object.prototype.hasOwnProperty.call(cachedNsfw, String(t)))
  );

  const cachedAnalysisComplete = Boolean(
    cachedNsfw &&
    cachedTimes.length > 0 &&
    cachedTimes.every((t) => Object.prototype.hasOwnProperty.call(cachedNsfw, String(t)))
  );

  const syncLearningContextFromAnalysis = (analysisMap) => {
    if (!analysisMap || typeof analysisMap !== 'object') {
      return;
    }

    const personId = extractPersonId(filename);
    const personThreshold = getEffectiveThreshold(personId);

    const framesForTraining = times
      .map((t) => {
        const hit = analysisMap[String(t)] ?? analysisMap[t];
        if (!hit || typeof hit !== 'object') {
          return null;
        }

        const conf = Number.isFinite(Number(hit.confidence))
          ? Number(hit.confidence)
          : Number(hit.nsfw_score || 0) / 100;

        return {
          time: Number(t),
          confidence: conf,
          predicted: Boolean(hit.is_nsfw)
        };
      })
      .filter(Boolean);

    if (framesForTraining.length === 0) {
      return;
    }

    nsfwScanContextRegistry.set(filename, {
      personId,
      threshold: personThreshold,
      createdAt: Date.now(),
      frames: framesForTraining
    });
  };

  if (cachedIntervalMatches && cachedThumbsPresent && cachedAnalysisComplete) {
    console.log(`[THUMBS CACHE] HIT(cached-times) key=${normalizedKey} interval=${thumbInterval} count=${cachedTimes.length}`);
    const sortedThumbnails = cachedTimes.map((t) => ({
      time: t,
      thumbnail: `/api/thumbnail/${normalizedKey}/thumb_${t}.jpg`
    }));

    syncLearningContextFromAnalysis(cachedNsfw);

    return res.json({
      thumbnails: sortedThumbnails,
      nsfw_analysis: cachedNsfw,
      detection_method: cachedAnalysis?.detection_method || 'local_model_with_fallback',
      cache_key: normalizedKey,
      cache_hit: true,
      cache_reason: 'cached_times_complete',
      thumbnails_cached: true,
      analysis_cached: true,
      analysis_complete: true
    });
  }

  if (allThumbsPresent && analysisComplete) {
    console.log(`[THUMBS CACHE] HIT(requested-times) key=${normalizedKey} interval=${thumbInterval} count=${times.length}`);
    const sortedThumbnails = times.map(t => ({
      time: t,
      thumbnail: `/api/thumbnail/${normalizedKey}/thumb_${t}.jpg`
    }));

    syncLearningContextFromAnalysis(cachedNsfw);

    return res.json({
      thumbnails: sortedThumbnails,
      nsfw_analysis: cachedNsfw,
      detection_method: cachedAnalysis?.detection_method || 'local_model_with_fallback',
      cache_key: normalizedKey,
      cache_hit: true,
      cache_reason: 'requested_times_complete',
      thumbnails_cached: true,
      analysis_cached: true,
      analysis_complete: true
    });
  }

  if (!videoExists && !allThumbsPresent) {
    console.log(`[THUMBS CACHE] MISS(no-video-no-cache) key=${normalizedKey} interval=${thumbInterval}`);
    return res.status(404).json({
      error: 'Video not found and thumbnails are not fully cached for this file yet.'
    });
  }

  const missReasons = [];
  if (!allThumbsPresent) {
    missReasons.push('missing_thumbs');
  }
  if (!analysisComplete) {
    missReasons.push('analysis_incomplete');
  }
  if (!cachedIntervalMatches) {
    missReasons.push('interval_mismatch');
  }
  if (!cachedThumbsPresent) {
    missReasons.push('cached_times_missing_thumbs');
  }
  if (!cachedAnalysisComplete) {
    missReasons.push('cached_times_analysis_incomplete');
  }
  console.log(`[THUMBS CACHE] MISS key=${normalizedKey} interval=${thumbInterval} reasons=${missReasons.join(',') || 'unknown'}`);
  
  // Create thumbnail object first to maintain order
  const thumbResults = {};

  if (totalThumbnails === 0) {
    return sendResponse();
  }

  if (videoExists && !allThumbsPresent) {
    console.log(`[THUMBS GEN] Generating missing thumbnails key=${normalizedKey} interval=${thumbInterval} requested=${times.length}`);
    try {
      await generateThumbnailsBatch(videoPath, videoCachePath, thumbInterval, times);
    } catch (batchErr) {
      console.error('[Thumbnails] Batch extraction failed:', batchErr.message);
    }
  }

  for (const timePoint of times) {
    const thumbName = `thumb_${timePoint}.jpg`;
    const thumbPath = path.join(videoCachePath, thumbName);
    thumbResults[timePoint] = fs.existsSync(thumbPath)
      ? `/api/thumbnail/${normalizedKey}/${thumbName}`
      : null;
  }

  return sendResponse();
  
  async function sendResponse() {
    const sortedThumbnails = times
      .filter(t => thumbResults[t] !== null)
      .map(t => ({
        time: t,
        thumbnail: thumbResults[t]
      }));

    // If all thumbs exist and analysis cache is complete, avoid running NSFW detection again.
    if (sortedThumbnails.length > 0 && analysisComplete) {
      syncLearningContextFromAnalysis(cachedNsfw);

      return res.json({
        thumbnails: sortedThumbnails,
        nsfw_analysis: cachedNsfw,
        detection_method: cachedAnalysis?.detection_method || 'local_model_with_fallback',
        cache_key: normalizedKey,
        cache_hit: true,
        cache_reason: 'post_refresh_analysis_cache_complete',
        thumbnails_cached: true,
        analysis_cached: true,
        analysis_complete: true
      });
    }
    
    // Local-only NSFW detection: custom local model server + local fallback.
    // Run in parallel batches (concurrency = 6) to avoid sequential timeout stacking.
    console.log('Running local NSFW detection (parallel)...');
    const nsfwResults = {};
    const CONCURRENCY = 6;

    async function runDetectionBatch(thumbsBatch) {
      await Promise.all(thumbsBatch.map(async (thumb) => {
        const thumbPath = path.join(cacheDir, normalizedKey, `thumb_${thumb.time}.jpg`);
        let detection = { is_nsfw: false, nsfw_score: 0, method: 'fallback' };
        try {
          detection = await detectNSFW(thumbPath, effectiveThreshold);
        } catch (err) {
          console.log(`Local NSFW detection error at ${thumb.time}s: ${err.message}`);
          detection = { is_nsfw: false, nsfw_score: 0, method: 'error' };
        }
        nsfwResults[thumb.time] = {
          nsfw_score: detection.nsfw_score || 0,
          is_nsfw: detection.is_nsfw || false,
          confidence: detection.confidence,
          method: detection.method,
          scores: detection.scores
        };
      }));
    }

    for (let i = 0; i < sortedThumbnails.length; i += CONCURRENCY) {
      await runDetectionBatch(sortedThumbnails.slice(i, i + CONCURRENCY));
    }

    try {
      fs.writeFileSync(analysisCachePath, JSON.stringify({
        generated_at: new Date().toISOString(),
        duration,
        interval: thumbInterval,
        times,
        detection_method: 'local_model_with_fallback',
        nsfw_analysis: nsfwResults
      }, null, 2), 'utf-8');
    } catch (writeErr) {
      console.warn('[Thumbnails] Failed to write analysis cache:', writeErr.message);
    }

    syncLearningContextFromAnalysis(nsfwResults);

    res.json({
      thumbnails: sortedThumbnails,
      nsfw_analysis: nsfwResults,
      detection_method: 'local_model_with_fallback',
      cache_key: normalizedKey,
      cache_hit: false,
      cache_reason: 'generated_or_rescanned',
      thumbnails_cached: allThumbsPresent,
      analysis_cached: false,
      analysis_complete: false
    });
  }
});

// Get thumbnail
app.get('/api/thumbnail/:videoId/:thumbName', (req, res) => {
  const thumbPath = path.join(cacheDir, req.params.videoId, req.params.thumbName);
  
  if (!fs.existsSync(thumbPath)) {
    return res.status(404).json({ error: 'Thumbnail not found' });
  }
  
  res.sendFile(thumbPath);
});

// Cut video segments and concatenate them
app.post('/api/cut', (req, res) => {
  const { videoPath: urlPath, segments, originalName } = req.body;
  if (!urlPath) {
    console.error('No videoPath provided');
    return res.status(400).json({ error: 'No videoPath provided' });
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    console.error('No segments provided');
    return res.status(400).json({ error: 'No segments provided' });
  }

  if (!originalName) {
    console.error('No originalName provided');
    return res.status(400).json({ error: 'No originalName provided' });
  }

  const filename = urlPath.split('/').pop();
  const videoPath = path.join(uploadsDir, filename);
  const sessionId = Date.now();
  const exportOutputDir = createExportDirectory(outputDir, originalName, sessionId);

  console.log('\n=== /api/cut REQUEST ===');
  console.log('Original name:', originalName);
  console.log('Segments received:', segments.length);

  if (!fs.existsSync(videoPath)) {
    console.error('Video file not found:', videoPath);
    return res.status(404).json({ error: 'Video not found' });
  }

  outputFileRegistry.clear();

  // GENERATE UNIQUE SESSION ID FOR THIS CUT
  const baseNameNoExt = path.parse(originalName).name;
  const ext = path.extname(originalName);
  const normalizedExt = String(ext || '').toLowerCase();
  const tempContainerExt = ['.mp4', '.mkv', '.ts'].includes(normalizedExt) ? normalizedExt : '.mkv';
  const groupedSegments = buildGroupedSegments(segments);
  const mergedSegments = groupedSegments.map(group => {
    const start = group.segments[0].start;
    const end = group.segments.reduce((maxEnd, seg) => Math.max(maxEnd, seg.end), group.segments[0].end);
    return { start, end, groupIndex: group.groupIndex };
  });

  console.log('Session ID:', sessionId);
  console.log('Output base name:', baseNameNoExt);
  console.log('Export directory:', exportOutputDir);
  console.log('Merged groups:', groupedSegments.length);
  console.log('Segments to cut after merge:', mergedSegments.length);

  // Tymczasowy katalog dla fragmentów
  const tempDir = path.join(exportOutputDir, 'temp_' + sessionId);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  let segmentCompleted = 0;
  const tempFiles = [];
  
  // Najpierw tworzy wszystkie (już scalone) fragmenty
  mergedSegments.forEach((segment, index) => {
    const tempFileName = `segment_${segment.groupIndex}${tempContainerExt}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    const segmentDuration = segment.end - segment.start;
    console.log(`Cutting segment ${index}: ${segment.start}s to ${segment.end}s (duration: ${segmentDuration}s)`);
    
    ffmpeg(videoPath)
      .inputOptions([
        `-ss ${segment.start}`,
        '-accurate_seek'
      ])
      .outputOptions([
        `-t ${segmentDuration}`,
        '-c:v copy',
        '-c:a copy',
        '-fflags +discardcorrupt',
        '-max_muxing_queue_size 9999'
      ])
      .output(tempFilePath)
      .on('start', (cmdline) => {
        console.log('FFmpeg command:', cmdline);
      })
      .on('end', () => {
        console.log(`✓ Segment ${index} created: ${tempFileName}`);
        tempFiles[index] = tempFilePath; // Store by index, not in array
        segmentCompleted++;
        checkAllSegmentsComplete();
      })
      .on('error', (err) => {
        console.warn(`✗ Copy cut failed for segment ${index}:`, err.message);
        console.log(`↻ Retrying segment ${index} with safe transcode...`);

        ffmpeg(videoPath)
          .inputOptions([
            `-ss ${segment.start}`,
            '-accurate_seek'
          ])
          .outputOptions([
            `-t ${segmentDuration}`,
            '-c:v libx264',
            '-preset fast',
            '-crf 20',
            '-c:a aac',
            '-b:a 192k',
            '-fflags +discardcorrupt',
            '-max_muxing_queue_size 9999'
          ])
          .output(tempFilePath)
          .on('end', () => {
            console.log(`✓ Segment ${index} created with transcode fallback: ${tempFileName}`);
            tempFiles[index] = tempFilePath;
            segmentCompleted++;
            checkAllSegmentsComplete();
          })
          .on('error', (fallbackErr) => {
            console.error(`✗ Fallback transcode failed for segment ${index}:`, fallbackErr.message);
            tempFiles[index] = null; // Mark as failed
            segmentCompleted++;
            checkAllSegmentsComplete();
          })
          .run();
      })
      .run();
  });
  
  function checkAllSegmentsComplete() {
    if (segmentCompleted === mergedSegments.length) {
      // Usuń null entries i przefiltruj
      const validFiles = tempFiles.filter(f => f !== null);
      
      if (validFiles.length === 0) {
        return res.status(500).json({ error: 'Nie udało się wyciąć żadnych fragmentów' });
      }
      
      console.log(`Wszystkie segmenty gotowe: ${validFiles.length}/${mergedSegments.length}`);
      copySegmentFiles(validFiles, tempDir, res, baseNameNoExt, ext, exportOutputDir);
    }
  }
  
  // Funkcja do łączenia segmentów w grupy
  function concatenateGroups(tempFiles, groupedSegments, tempDir, res, baseNameNoExt, ext, segments, currentOutputDir) {
    console.log('=== Starting group concatenation ===');
    console.log(`Groups: ${groupedSegments.length}`);
    console.log(`Total temp files array length: ${tempFiles.length}`);
    console.log(`Total segments: ${segments.length}`);
    
    // Log what we have
    tempFiles.forEach((f, i) => {
      console.log(`  tempFiles[${i}]: ${f ? 'EXISTS' : 'NULL'}`);
    });
    
    let groupsProcessed = 0;
    const outputFilesList = [];
    
    if (groupedSegments.length === 0) {
      console.log('No grouped segments, returning error');
      return res.status(400).json({ error: 'No grouped segments provided' });
    }
    
    groupedSegments.forEach((group, groupIdx) => {
      console.log(`\n[Group ${group.groupIndex}] Processing ${group.segments.length} segments`);
      
      // Mapuj segmenty do ich temp plików
      const groupTempFiles = [];
      
      group.segments.forEach((seg, segIdx) => {
        console.log(`  Searching for segment ${segIdx}: start=${seg.start}, end=${seg.end}`);
        
        // Znajdź index tego segmentu w original segments array
        let foundIndex = -1;
        for (let i = 0; i < segments.length; i++) {
          const diff_start = Math.abs(segments[i].start - seg.start);
          const diff_end = Math.abs(segments[i].end - seg.end);
          
          if (diff_start < 0.1 && diff_end < 0.1) {
            foundIndex = i;
            break;
          }
        }
        
        if (foundIndex >= 0) {
          const tempFile = tempFiles[foundIndex];
          if (tempFile) {
            console.log(`    ✓ Found at index ${foundIndex} -> ${tempFile}`);
            groupTempFiles.push(tempFile);
          } else {
            console.warn(`    ✗ Index ${foundIndex} has no temp file (NULL)`);
          }
        } else {
          console.warn(`    ✗ Segment not found in original array`);
        }
      });
      
      console.log(`  Group ${group.groupIndex}: ${groupTempFiles.length} files ready`);
      
      if (groupTempFiles.length === 0) {
        console.warn(`Group ${group.groupIndex} has no valid files, skipping`);
        groupsProcessed++;
        if (groupsProcessed === groupedSegments.length) {
          finalizeConcatenation();
        }
        return;
      }
      
      // Jeśli tylko jeden plik - skopiuj go
      if (groupTempFiles.length === 1) {
        const outputFileName = `${baseNameNoExt}_${group.groupIndex}${ext}`;
        const outputPath = path.join(currentOutputDir, outputFileName);

        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        console.log(`  Copying single file: ${groupTempFiles[0]} -> ${outputPath}`);
        
        fs.copyFile(groupTempFiles[0], outputPath, (err) => {
          if (err) {
            console.error(`✗ Error copying group ${group.groupIndex}:`, err.message);
          } else {
            console.log(`✓ Group ${group.groupIndex} file copied: ${outputFileName}`);
            const token = registerOutputFile(outputPath);
            outputFilesList.push({
              filename: outputFileName,
              path: `/api/output/${token}`,
              index: group.groupIndex
            });
          }
          
          groupsProcessed++;
          if (groupsProcessed === groupedSegments.length) {
            finalizeConcatenation();
          }
        });
      } else {
        // Wiele plików - połącz je przy użyciu manifestu FFmpeg
        console.log(`  Concatenating ${groupTempFiles.length} files for group ${group.groupIndex}`);
        
        const outputFileName = `${baseNameNoExt}_${group.groupIndex}${ext}`;
        const outputPath = path.join(currentOutputDir, outputFileName);
        const concatManifestFile = path.join(tempDir, `concat_${group.groupIndex}.txt`);

        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        // Utwórz manifest pliku dla FFmpeg
        const concatContent = groupTempFiles
          .map(file => `file '${file.replace(/\\/g, '/')}'`)
          .join('\n');
        
        fs.writeFileSync(concatManifestFile, concatContent);
        console.log(`  Manifest file created: ${concatManifestFile}`);
        console.log(`  Content:\n${concatContent}`);
        
        // Użyj manifestu zamiast concat protocol
        ffmpeg()
          .input(concatManifestFile)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions([
            '-c:v copy',
            '-c:a copy',
            '-fflags +discardcorrupt',
            '-max_muxing_queue_size 9999'
          ])
          .output(outputPath)
          .on('start', (cmdline) => {
            console.log(`[Group ${group.groupIndex}] FFmpeg concatenation start:`);
            console.log(cmdline);
          })
          .on('end', () => {
            console.log(`✓ Group ${group.groupIndex} concatenated: ${outputFileName}`);
            console.log(`  Output file: ${outputPath}`);
            
            // Check file size
            try {
              const stats = fs.statSync(outputPath);
              console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            } catch (err) {
              console.error(`  Error checking file size: ${err.message}`);
            }

            const token = registerOutputFile(outputPath);
            
            outputFilesList.push({
              filename: outputFileName,
              path: `/api/output/${token}`,
              index: group.groupIndex
            });
            
            groupsProcessed++;
            if (groupsProcessed === groupedSegments.length) {
              finalizeConcatenation();
            }
          })
          .on('error', (err) => {
            console.error(`✗ Group ${group.groupIndex} concat error:`, err.message);
            groupsProcessed++;
            if (groupsProcessed === groupedSegments.length) {
              finalizeConcatenation();
            }
          })
          .run();
      }
    });
    
    function finalizeConcatenation() {
      // Wyczyść temp katalog
      setTimeout(() => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Error cleaning temp:', err.message);
        }
      }, 1000);

      res.json({
        cutFiles: outputFilesList.sort((a, b) => a.index - b.index),
        outputFolderPath: exportOutputDir
      });
    }
  }
  
  // Funkcja do kopiowania fragmentów jako oddzielne pliki (fallback)
  function copySegmentFiles(tempFiles, tempDir, res, baseNameNoExt, ext, currentOutputDir) {
    if (tempFiles.length === 0) {
      fs.rm(tempDir, { recursive: true, force: true }, () => {});
      return res.status(400).json({ error: 'No segments were created' });
    }
    
    console.log('Creating individual output files for', tempFiles.length, 'segments');
    
    // Filtruj null'e z sparsowej tablicy
    const validTempFiles = tempFiles.filter(f => f !== null);
    
    console.log('Valid files to copy:', validTempFiles.length, '/', tempFiles.length);
    
    let filesCopied = 0;
    const outputFilesList = [];
    
    // Kopiuj każdy plik tymczasowy do folderu output z numerem
    validTempFiles.forEach((tempFile, index) => {
      const outputFileName = `${baseNameNoExt}_${index + 1}${ext}`;
      const outputPath = path.join(currentOutputDir, outputFileName);

      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      console.log(`Copying ${index + 1}: ${tempFile} -> ${outputPath}`);
      
      fs.copyFile(tempFile, outputPath, (err) => {
        if (!err) {
          // SUCCESS - dodaj do listy TYLKO jeśli copy się udał
          console.log(`✓ File ${index + 1} copied: ${outputFileName}`);
          const stats = fs.statSync(outputPath);
          console.log(`  File size after copy: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          const token = registerOutputFile(outputPath);
          
          outputFilesList.push({
            filename: outputFileName, 
            path: `/api/output/${token}`, 
            index: index + 1
          });
        } else {
          // FAILURE
          console.error(`✗ Error copying file ${index + 1}:`, err);
        }
        
        filesCopied++;
        
        // Kiedy wszystkie pliki są skopiowane, wyczyść temp i odpowiedz
        if (filesCopied === validTempFiles.length) {
          fs.rm(tempDir, { recursive: true, force: true }, (err) => {
            if (err) console.error('Error cleaning temp files:', err);
            else console.log('Temporary files cleaned');
          });

          res.json({
            cutFiles: outputFilesList
              .sort((a, b) => a.index - b.index)
              .map(f => ({
              filename: f.filename,
              path: f.path,
              index: f.index
            })),
            outputFolderPath: exportOutputDir,
            message: `Successfully created ${outputFilesList.length} segment files`
          });

          try {
            recordCutLearning(filename, originalName, segments);
          } catch (learnErr) {
            console.error('[ML Local] Cut learning error:', learnErr.message);
          }
        }
      });
    });
  }
});

app.get('/api/ml/person-profile/:personId/stats', (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  const profile = getProfileForPerson(personId);
  if (!profile) {
    return res.json({
      personId,
      exists: false,
      active: false,
      threshold: DEFAULT_PERSON_THRESHOLD,
      minPositive: PERSON_PROFILE_MIN_POSITIVE,
      minNegative: PERSON_PROFILE_MIN_NEGATIVE,
      previewSlots: [],
      retentionDays: PERSON_PROFILE_RETENTION_DAYS,
      metrics: {
        precision: 0,
        recall: 0,
        tp: 0,
        fp: 0,
        tn: 0,
        fn: 0,
        positives: 0,
        negatives: 0,
        support: 0
      }
    });
  }

  res.json({
    personId,
    exists: true,
    active: Boolean(profile.active),
    threshold: Number(profile.threshold) || DEFAULT_PERSON_THRESHOLD,
    thresholdMode: profile.thresholdMode || 'auto',
    minPositive: profile.minPositive || PERSON_PROFILE_MIN_POSITIVE,
    minNegative: profile.minNegative || PERSON_PROFILE_MIN_NEGATIVE,
    retentionDays: PERSON_PROFILE_RETENTION_DAYS,
    metrics: profile.metrics || {},
    videos: profile.videos || [],
    previewFrames: buildProfilePreviewFrames(profile),
    previewSlots: buildProfilePreviewSlots(profile),
    updatedAt: profile.updatedAt || null
  });
});

app.get('/api/ml/profiles', (req, res) => {
  const db = loadPersonProfiles();
  res.json(buildProfilesSummary(db));
});

app.post('/api/ml/person-profile/:personId/threshold', (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  const rawThreshold = Number(req.body?.threshold);

  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  if (!Number.isFinite(rawThreshold) || rawThreshold < 0.1 || rawThreshold > 0.99) {
    return res.status(400).json({ error: 'threshold must be between 0.10 and 0.99' });
  }

  const db = loadPersonProfiles();
  const profile = getOrCreatePersonProfile(db, personId);
  profile.threshold = parseFloat(rawThreshold.toFixed(2));
  profile.thresholdMode = 'manual';
  profile.updatedAt = new Date().toISOString();
  recomputeProfileState(profile);
  savePersonProfiles(db);

  res.json({
    success: true,
    personId,
    threshold: profile.threshold,
    thresholdMode: profile.thresholdMode,
    active: profile.active,
    metrics: profile.metrics || {}
  });
});

app.post('/api/ml/person-profile/:personId/preview-frames', async (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  const frames = Array.isArray(req.body?.frames) ? req.body.frames : [];
  const rawPreviewClip = req.body?.previewClip;

  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  const normalizedFrames = frames
    .map((frame) => ({
      cacheKey: normalizeCacheKey(frame?.cacheKey),
      time: Number(frame?.time)
    }))
    .filter((frame) => frame.cacheKey && Number.isFinite(frame.time))
    .slice(0, PERSON_PROFILE_PREVIEW_FRAME_LIMIT);

  if (normalizedFrames.length === 0) {
    return res.status(400).json({ error: 'At least one valid preview frame is required' });
  }

  const db = loadPersonProfiles();
  const profile = getOrCreatePersonProfile(db, personId);
  profile.previewFrames = normalizedFrames;

  if (
    rawPreviewClip &&
    String(rawPreviewClip.videoId || '').trim() &&
    Number.isFinite(Number(rawPreviewClip.start)) &&
    Number.isFinite(Number(rawPreviewClip.end)) &&
    Number(rawPreviewClip.end) > Number(rawPreviewClip.start)
  ) {
    try {
      profile.previewClip = await createProfilePreviewClip(
        personId,
        String(rawPreviewClip.videoId || '').trim(),
        Number(rawPreviewClip.start),
        Number(rawPreviewClip.end)
      );
    } catch (clipErr) {
      return res.status(400).json({ error: clipErr.message });
    }
  } else {
    profile.previewClip = null;
  }

  profile.updatedAt = new Date().toISOString();
  savePersonProfiles(db);

  res.json({
    success: true,
    personId,
    previewFrames: buildProfilePreviewFrames(profile),
    previewClip: buildProfilePreviewClip(profile),
    previewSlots: buildProfilePreviewSlots(profile),
    updatedAt: profile.updatedAt
  });
});

app.post('/api/ml/person-profile/:personId/preview-slot/:slot', async (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  const slot = Number(req.params.slot);
  const rawPreviewClip = req.body?.previewClip;

  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
    return res.status(400).json({ error: 'slot must be between 1 and 5' });
  }

  if (
    !rawPreviewClip ||
    !String(rawPreviewClip.videoId || '').trim() ||
    !Number.isFinite(Number(rawPreviewClip.start)) ||
    !Number.isFinite(Number(rawPreviewClip.end)) ||
    Number(rawPreviewClip.end) <= Number(rawPreviewClip.start)
  ) {
    return res.status(400).json({ error: 'previewClip with valid videoId/start/end is required' });
  }

  const db = loadPersonProfiles();
  const profile = getOrCreatePersonProfile(db, personId);
  const safePersonId = String(personId).replace(/[^a-z0-9_-]+/g, '_');
  const slotFilename = `${safePersonId}_slot${slot}.mp4`;

  try {
    const slotClip = await createProfilePreviewClip(
      personId,
      String(rawPreviewClip.videoId || '').trim(),
      Number(rawPreviewClip.start),
      Number(rawPreviewClip.end),
      slotFilename
    );

    profile.previewSlots = Array.isArray(profile.previewSlots) ? profile.previewSlots.filter((entry) => Number(entry.slot) !== slot) : [];
    profile.previewSlots.push({
      slot,
      filename: slotClip.filename,
      sourceVideoId: slotClip.sourceVideoId,
      start: slotClip.start,
      end: slotClip.end,
      updatedAt: slotClip.updatedAt
    });
    profile.previewSlots.sort((a, b) => Number(a.slot) - Number(b.slot));
    profile.updatedAt = new Date().toISOString();
    savePersonProfiles(db);

    return res.json({
      success: true,
      personId,
      slot,
      previewSlots: buildProfilePreviewSlots(profile),
      updatedAt: profile.updatedAt
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Nie udało się zapisać slotu podglądu.' });
  }
});

app.delete('/api/ml/person-profile/:personId/preview-slot/:slot', (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  const slot = Number(req.params.slot);

  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  if (!Number.isFinite(slot) || slot < 1 || slot > 5) {
    return res.status(400).json({ error: 'slot must be between 1 and 5' });
  }

  const db = loadPersonProfiles();
  const canonicalPersonId = resolveCanonicalPersonId(db, personId);
  const profile = db?.profiles?.[canonicalPersonId];
  if (!profile) {
    return res.status(404).json({ error: 'Profil nie istnieje.' });
  }

  const existingEntry = (profile.previewSlots || []).find((entry) => Number(entry.slot) === slot);
  if (!existingEntry) {
    return res.status(404).json({ error: `Slot ${slot} nie istnieje.` });
  }

  if (existingEntry.filename) {
    try {
      const filePath = path.join(personProfilePreviewClipsDir, existingEntry.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('[ML Local] Failed to remove slot clip:', existingEntry.filename, err.message);
    }
  }

  profile.previewSlots = (profile.previewSlots || []).filter((entry) => Number(entry.slot) !== slot);
  profile.updatedAt = new Date().toISOString();
  savePersonProfiles(db);

  return res.json({
    success: true,
    personId: canonicalPersonId,
    slot,
    previewSlots: buildProfilePreviewSlots(profile),
    updatedAt: profile.updatedAt
  });
});

app.delete('/api/ml/person-profile/:personId', (req, res) => {
  const personId = String(req.params.personId || '').toLowerCase();
  if (!personId) {
    return res.status(400).json({ error: 'Missing personId' });
  }

  const db = loadPersonProfiles();
  const canonicalPersonId = resolveCanonicalPersonId(db, personId);
  const profile = db?.profiles?.[canonicalPersonId];
  if (!profile) {
    return res.status(404).json({ error: 'Profil nie istnieje.' });
  }

  removeProfilePreviewMedia(profile);
  delete db.profiles[canonicalPersonId];
  savePersonProfiles(db);

  return res.json({ success: true, personId: canonicalPersonId });
});

app.get('/api/ml/runtime-status', async (req, res) => {
  try {
    const http = require('http');

    const health = await new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path: '/health',
        method: 'GET',
        timeout: 2500
      }, (response) => {
        let raw = '';
        response.on('data', (chunk) => raw += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('timeout'));
      });
      request.end();
    });

    res.json({
      available: true,
      status: health.status || 'ok',
      model_loaded: Boolean(health.model_loaded),
      active_device: String(health.active_device || 'unknown')
    });
  } catch (err) {
    res.json({
      available: false,
      status: 'unreachable',
      model_loaded: false,
      active_device: 'unreachable',
      error: err.message
    });
  }
});

app.post('/api/ml/retention-settings', (req, res) => {
  const { retentionDays } = req.body;
  
  if (retentionDays === undefined || retentionDays === null) {
    return res.status(400).json({ error: 'Missing retentionDays parameter' });
  }

  const newDays = Number(retentionDays);
  if (isNaN(newDays) || newDays < 7 || newDays > 365) {
    return res.status(400).json({ error: 'retentionDays must be between 7 and 365' });
  }

  const oldDays = PERSON_PROFILE_RETENTION_DAYS;
  PERSON_PROFILE_RETENTION_DAYS = newDays;
  saveMlSettings({ retentionDays: newDays });

  console.log(`[ML Local] Retention policy updated: ${oldDays} days → ${newDays} days`);

  // Apply new retention to all profiles
  let appliedCount = 0;
  try {
    const db = loadPersonProfiles();
    applyLocalRetention(db);
    appliedCount = Object.keys(db?.profiles || {}).length;
    console.log(`[ML Local] Retention policy applied to all profiles`);
  } catch (err) {
    console.error('[ML Local] Error applying retention:', err.message);
  }

  res.json({
    success: true,
    message: `Retention policy updated to ${newDays} days`,
    oldDays,
    newDays,
    appliedProfiles: appliedCount
  });
});

app.get('/api/ml/training-settings', (req, res) => {
  const settings = loadMlSettings();
  const trainingFolders = Array.isArray(settings.trainingFolders) ? settings.trainingFolders : [];
  const trainingConfigurationError = getExternalTrainingConfigurationError();

  res.json({
    trainingFolders,
    modelDataDir: nsfwModelDataDir,
    trainingConfigured: !trainingConfigurationError,
    trainingConfigurationError,
    runtime: getTrainingRuntimeStatus()
  });
});

app.post('/api/ml/training-settings', (req, res) => {
  const validation = validateTrainingFolders(req.body?.trainingFolders || [], true);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const saved = saveMlSettings({ trainingFolders: validation.folders });
  if (!saved) {
    return res.status(500).json({ error: 'Nie udało się zapisać ustawień folderów nauki.' });
  }

  res.json({
    success: true,
    trainingFolders: validation.folders
  });
});

app.post('/api/ml/training/start', (req, res) => {
  const trainingConfigurationError = getExternalTrainingConfigurationError();
  if (trainingConfigurationError) {
    return res.status(400).json({ error: trainingConfigurationError });
  }

  const requestedFolders = Array.isArray(req.body?.trainingFolders) ? req.body.trainingFolders : null;
  const fromSettings = loadMlSettings();
  const effectiveFolders = requestedFolders && requestedFolders.length > 0
    ? requestedFolders
    : (Array.isArray(fromSettings.trainingFolders) ? fromSettings.trainingFolders : []);

  const validation = validateTrainingFolders(effectiveFolders);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  saveMlSettings({ trainingFolders: validation.folders });
  savePausedTrainingRunState(null);

  const run = enqueueOrStartTraining(validation.folders, { resume: false });
  const status = run.queued ? 'queued' : 'started';
  const message = run.queued
    ? `Dodano do kolejki nauki. Pozycja w kolejce: ${run.queueLength}.`
    : 'Uruchomiono naukę modelu NSFW na wybranych folderach.';

  res.json({
    success: true,
    status,
    message,
    trainingFolders: validation.folders,
    runningPid: run.runningPid,
    queueLength: run.queueLength,
    runtime: getTrainingRuntimeStatus()
  });
});

app.post('/api/ml/training/stop', (req, res) => {
  const internalProcess = activeTrainingProcess && !activeTrainingProcess.killed ? activeTrainingProcess : null;
  const externalPid = getExternalTrainingLockPid();
  const latestStatus = readJsonSafe(externalTrainingStatusPath, null);
  const latestReport = readJsonSafe(externalTrainingReportPath, null);
  const hasExternalProcess = isExternalTrainingProcessLikelyRunning(externalPid, latestStatus, latestReport);

  if (!internalProcess && !hasExternalProcess) {
    return res.status(400).json({ error: 'Brak aktywnego treningu do zatrzymania.' });
  }

  savePausedTrainingRunState(null);
  skipAutostartAfterStop = true;

  try {
    if (internalProcess) {
      const pid = activeTrainingRun?.pid || internalProcess.pid;
      internalProcess.kill();
      markTrainingStopped('stopped_by_user');
      return res.json({
        success: true,
        message: `Wysłano sygnał zatrzymania do procesu ${pid}.`,
        runtime: getTrainingRuntimeStatus()
      });
    }

    process.kill(externalPid);
    skipAutostartAfterStop = false;
    markTrainingStopped('stopped_by_user');
    return res.json({
      success: true,
      message: `Wysłano sygnał zatrzymania do procesu ${externalPid}.`,
      runtime: getTrainingRuntimeStatus()
    });
  } catch (err) {
    skipAutostartAfterStop = false;
    return res.status(500).json({ error: 'Nie udało się zatrzymać aktywnego treningu: ' + err.message });
  }
});

app.post('/api/ml/training/pause', (req, res) => {
  const internalProcess = activeTrainingProcess && !activeTrainingProcess.killed ? activeTrainingProcess : null;
  const externalPid = getExternalTrainingLockPid();
  const latestStatus = readJsonSafe(externalTrainingStatusPath, null);
  const latestReport = readJsonSafe(externalTrainingReportPath, null);
  const hasExternalProcess = isExternalTrainingProcessLikelyRunning(externalPid, latestStatus, latestReport);

  if (!internalProcess && !hasExternalProcess) {
    if (pausedTrainingRun) {
      return res.json({
        success: true,
        message: 'Trening jest już wstrzymany.',
        runtime: getTrainingRuntimeStatus()
      });
    }

    return res.status(400).json({ error: 'Brak aktywnego treningu do wstrzymania.' });
  }

  const sourceFolders = Array.isArray(activeTrainingRun?.sourceFolders) && activeTrainingRun.sourceFolders.length > 0
    ? activeTrainingRun.sourceFolders
    : (Array.isArray(loadMlSettings()?.trainingFolders) ? loadMlSettings().trainingFolders : []);

  savePausedTrainingRunState({
    sourceFolders,
    pausedAt: new Date().toISOString()
  });

  skipAutostartAfterStop = true;

  try {
    if (internalProcess) {
      const pid = activeTrainingRun?.pid || internalProcess.pid;
      internalProcess.kill();
      markTrainingStopped('paused_by_user');
      return res.json({
        success: true,
        message: `Wstrzymano trening (proces ${pid}).`,
        runtime: getTrainingRuntimeStatus()
      });
    }

    process.kill(externalPid);
    skipAutostartAfterStop = false;
    markTrainingStopped('paused_by_user');
    return res.json({
      success: true,
      message: `Wstrzymano trening (proces ${externalPid}).`,
      runtime: getTrainingRuntimeStatus()
    });
  } catch (err) {
    skipAutostartAfterStop = false;
    return res.status(500).json({ error: 'Nie udało się wstrzymać treningu: ' + err.message });
  }
});

app.post('/api/ml/training/resume', (req, res) => {
  const trainingConfigurationError = getExternalTrainingConfigurationError();
  if (trainingConfigurationError) {
    return res.status(400).json({ error: trainingConfigurationError });
  }

  const internalProcess = activeTrainingProcess && !activeTrainingProcess.killed ? activeTrainingProcess : null;
  const externalPid = getExternalTrainingLockPid();
  const latestStatus = readJsonSafe(externalTrainingStatusPath, null);
  const latestReport = readJsonSafe(externalTrainingReportPath, null);
  const hasExternalProcess = isExternalTrainingProcessLikelyRunning(externalPid, latestStatus, latestReport);
  const latestResumeState = readJsonSafe(externalTrainingResumeStatePath, null);

  if (internalProcess || hasExternalProcess) {
    return res.status(400).json({ error: 'Trening już trwa. Nie można wznowić równolegle.' });
  }

  const resumeSourceFolders = Array.isArray(pausedTrainingRun?.sourceFolders) && pausedTrainingRun.sourceFolders.length > 0
    ? pausedTrainingRun.sourceFolders
    : (Array.isArray(latestResumeState?.source) ? latestResumeState.source.map((folder) => String(folder || '').trim()).filter(Boolean) : []);

  if (resumeSourceFolders.length === 0) {
    return res.status(400).json({ error: 'Brak wstrzymanego treningu do wznowienia.' });
  }

  const validation = validateTrainingFolders(resumeSourceFolders);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  saveMlSettings({ trainingFolders: validation.folders });

  const run = enqueueOrStartTraining(validation.folders, { resume: true });
  savePausedTrainingRunState(null);

  return res.json({
    success: true,
    status: run.queued ? 'queued' : 'resumed',
    message: run.queued
      ? `Dodano wznowienie do kolejki. Pozycja: ${run.queueLength}.`
      : 'Wznowiono trening modelu NSFW.',
    trainingFolders: validation.folders,
    runningPid: run.runningPid,
    queueLength: run.queueLength,
    runtime: getTrainingRuntimeStatus()
  });
});

app.post('/api/ml/training/queue/remove', (req, res) => {
  const itemId = Number(req.body?.id);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'Nieprawidłowe id pozycji kolejki.' });
  }

  const removed = removeTrainingQueueItem(itemId);
  if (!removed) {
    return res.status(404).json({ error: 'Nie znaleziono pozycji kolejki.' });
  }

  res.json({
    success: true,
    message: 'Usunięto pozycję z kolejki.',
    runtime: getTrainingRuntimeStatus()
  });
});

// Get output file
app.get('/api/output/:token', (req, res) => {
  const filePath = outputFileRegistry.get(req.params.token);
  
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

app.post('/api/save-all', (req, res) => {
  const { files, destinationFolderPath, overwrite, conflictStrategy } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Brak plików do zapisania' });
  }

  let resolvedDestinationFolderPath;
  try {
    if (destinationFolderPath && typeof destinationFolderPath !== 'string') {
      return res.status(400).json({ error: 'Nieprawidłowy folder docelowy' });
    }

    const requestedPath = String(destinationFolderPath || '').trim();
    if (!requestedPath) {
      resolvedDestinationFolderPath = outputDir;
    } else if (path.isAbsolute(requestedPath)) {
      resolvedDestinationFolderPath = requestedPath;
    } else {
      resolvedDestinationFolderPath = path.resolve(__dirname, requestedPath);
    }

    if (!fs.existsSync(resolvedDestinationFolderPath)) {
      fs.mkdirSync(resolvedDestinationFolderPath, { recursive: true });
    }
  } catch (pathErr) {
    return res.status(400).json({ error: 'Nieprawidłowy folder docelowy: ' + pathErr.message });
  }

  try {
    const savedFiles = [];
    const conflictingFiles = [];
    const strategy = String(conflictStrategy || '').toLowerCase();
    const shouldOverwrite = Boolean(overwrite) || strategy === 'overwrite';
    const shouldSkipExisting = strategy === 'skip';

    files.forEach(file => {
      const rawPath = String(file.path || '');
      const fileToken = rawPath.split('/').pop();
      const sourcePath = outputFileRegistry.get(fileToken);

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error(`Plik źródłowy nie istnieje: ${rawPath}`);
      }

      const safeFileName = path.basename(file.filename || path.basename(sourcePath));
      const destinationPath = path.join(resolvedDestinationFolderPath, safeFileName);

      if (fs.existsSync(destinationPath)) {
        conflictingFiles.push({ filename: safeFileName, path: destinationPath });
      }
    });

    if (conflictingFiles.length > 0 && !shouldOverwrite && !shouldSkipExisting) {
      return res.status(409).json({
        error: 'Pliki już istnieją w folderze docelowym.',
        code: 'DEST_FILES_EXIST',
        destinationFolderPath: resolvedDestinationFolderPath,
        conflicts: conflictingFiles
      });
    }

    files.forEach(file => {
      const rawPath = String(file.path || '');
      const fileToken = rawPath.split('/').pop();
      const sourcePath = outputFileRegistry.get(fileToken);

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error(`Plik źródłowy nie istnieje: ${rawPath}`);
      }

      const safeFileName = path.basename(file.filename || path.basename(sourcePath));
      const destinationPath = path.join(resolvedDestinationFolderPath, safeFileName);

      if (fs.existsSync(destinationPath) && shouldSkipExisting) {
        return;
      }

      fs.copyFileSync(sourcePath, destinationPath);
      savedFiles.push({ filename: safeFileName, path: destinationPath });
    });

    res.json({
      success: true,
      destinationFolderPath: resolvedDestinationFolderPath,
      savedFiles,
      count: savedFiles.length
    });
  } catch (err) {
    console.error('Error saving files to destination:', err.message);
    res.status(500).json({ error: 'Nie udało się zapisać plików: ' + err.message });
  }
});

// Delete source video file
app.post('/api/delete-source', (req, res) => {
  const { videoId } = req.body;
  
  if (!videoId) {
    return res.status(400).json({ error: 'No videoId provided' });
  }
  
  const uploadCopyPath = path.join(uploadsDir, videoId);
  const mappedSourcePath = sourceVideoPathRegistry.get(videoId);
  const sourcePath = mappedSourcePath && fs.existsSync(mappedSourcePath)
    ? mappedSourcePath
    : uploadCopyPath;

  console.log('Attempting to recycle source file:', sourcePath);

  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  moveFileToRecycleBinWindows(sourcePath)
    .then(async () => {
      // Move working upload copy to Recycle Bin as well if it differs.
      if (uploadCopyPath !== sourcePath && fs.existsSync(uploadCopyPath)) {
        try {
          await moveFileToRecycleBinWindows(uploadCopyPath);
        } catch (cleanupErr) {
          console.warn('Could not move upload copy to Recycle Bin:', cleanupErr.message);
        }
      }

      sourceVideoPathRegistry.delete(videoId);
      console.log('Source file(s) moved to Recycle Bin successfully:', videoId);
      res.json({ success: true, message: 'Source file moved to Recycle Bin' });
    })
    .catch((err) => {
      console.error('Error moving source file to Recycle Bin:', err);
      res.status(500).json({ error: 'Error moving file to Recycle Bin: ' + err.message });
    });
});

// Get file size
app.post('/api/file-size', (req, res) => {
  const { filePath: urlPath } = req.body;
  
  console.log('\n===== /api/file-size REQUEST =====');
  console.log('Received URL path:', urlPath);
  
  if (!urlPath) {
    console.error('❌ No filePath provided');
    return res.status(400).json({ error: 'No filePath provided' });
  }
  
  const fileToken = urlPath.split('/').pop();
  const filePath = outputFileRegistry.get(fileToken);
  const filename = filePath ? path.basename(filePath) : fileToken;
  
  console.log('Extracted filename:', filename);
  console.log('Full file path:', filePath);
  
  // Check if file exists
  const fileExists = !!filePath && fs.existsSync(filePath);
  console.log('File exists:', fileExists);
  
  if (!fileExists) {
    console.error('❌ File NOT found at:', filePath);
    return res.status(404).json({ error: 'File not found at: ' + filePath, requestedPath: urlPath });
  }
  
  try {
    const stats = fs.statSync(filePath);
    console.log('✓ File size:', stats.size, 'bytes', `(${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    res.json({ 
      size: stats.size,
      filename: filename,
      sizeFormatted: formatFileSize(stats.size)
    });
  } catch (err) {
    console.error('❌ Error getting file size:', err);
    res.status(500).json({ error: 'Error getting file size: ' + err.message });
  }
});

// Helper function for backend to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Get list of files in output
app.get('/api/output', (req, res) => {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading output directory' });
    }
    res.json({ files });
  });
});

// ==================== ML FEEDBACK ROUTES ====================

// Submit feedback for NSFW detection
app.post('/api/ml/feedback', async (req, res) => {
  try {
    const {
      frame_time,
      model_predicted,
      user_corrected,
      confidence,
      is_nsfw_correct,
      model_confidence,
      video_name
    } = req.body;

    const normalizedUserCorrected = is_nsfw_correct ?? user_corrected;
    const normalizedConfidence = model_confidence ?? confidence ?? 0.5;

    if (frame_time === undefined || normalizedUserCorrected === undefined) {
      return res.status(400).json({ error: 'Missing required fields: frame_time and user feedback label' });
    }

    // Save feedback metadata locally to ml_data for learning
    try {
      const timestamp = new Date().toISOString();
      const feedbackData = {
        timestamp,
        frame_time,
        model_predicted: model_predicted ?? null,
        user_corrected: normalizedUserCorrected,
        confidence: normalizedConfidence,
        video_name: video_name || 'unknown',
        is_correct: model_predicted === undefined ? null : model_predicted === normalizedUserCorrected
      };

      // Create feedback log file
      const logFile = path.join(mlDataDir, 'feedback_log.jsonl');
      fs.appendFileSync(logFile, JSON.stringify(feedbackData) + '\n', 'utf-8');
      console.log(`[ML Data] Feedback saved to ${logFile}`);

      // Also save to daily file for organization
      const dateStr = new Date().toISOString().split('T')[0];
      const dailyFile = path.join(mlDataDir, `feedback_${dateStr}.json`);
      let dailyData = [];
      if (fs.existsSync(dailyFile)) {
        dailyData = JSON.parse(fs.readFileSync(dailyFile, 'utf-8'));
      }
      dailyData.push(feedbackData);
      fs.writeFileSync(dailyFile, JSON.stringify(dailyData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ML Data] Error saving feedback locally:', err.message);
    }

    res.json({
      success: true,
      local_only: true,
      message: 'Feedback saved locally'
    });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get ML statistics (local-only)
app.get('/api/ml/stats', async (req, res) => {
  try {
    const db = loadPersonProfiles();
    const profiles = Object.values(db.profiles || {});
    const activeProfiles = profiles.filter((p) => p && p.active).length;
    const totalSamples = profiles.reduce((acc, p) => acc + Number(p?.metrics?.support || 0), 0);

    res.json({
      local_only: true,
      active_profiles: activeProfiles,
      total_profiles: profiles.length,
      total_samples: totalSamples
    });
  } catch (err) {
    console.error('Error getting local ML stats:', err);
    res.status(500).json({ error: 'Local stats error: ' + err.message });
  }
});

// Get ML model evaluation (local-only placeholder)
app.get('/api/ml/evaluation', async (req, res) => {
  res.json({
    local_only: true,
    message: 'Evaluation endpoint is disabled in local-only mode'
  });
});

// Trigger manual retraining (disabled in local-only runtime)
app.post('/api/ml/retrain', async (req, res) => {
  res.json({
    success: true,
    local_only: true,
    message: 'Runtime retrain is disabled. Use offline training scripts.'
  });
});

// ==================== NSFW AUTO-SCAN ENDPOINT ====================
// POST /api/scan-nsfw - Scan already-generated thumbnails for NSFW content.
// Does NOT extract new frames — uses only thumb_*.jpg files from cache.
// Request body: { videoPath, duration, thumbnailTimes: [0, 25, 50, ...] }
// Returns array of segments: [{ start, end, confidence, method }, ...]
app.get('/api/scan-nsfw-progress/:scanId', (req, res) => {
  const progress = nsfwScanProgressRegistry.get(req.params.scanId);

  if (!progress) {
    return res.status(404).json({ error: 'Scan progress not found' });
  }

  res.json(progress);
});

app.post('/api/scan-nsfw', async (req, res) => {
  const { scanId } = req.body;

  try {
    const { videoPath: urlPath, duration, thumbnailTimes } = req.body;

    setScanProgress(scanId, {
      status: 'running',
      stage: 'init',
      stageLabel: 'Inicjalizacja',
      progress: 0,
      analyzed: 0,
      total: Array.isArray(thumbnailTimes) ? thumbnailTimes.length : 0
    });

    if (!urlPath || !duration) {
      setScanProgress(scanId, {
        status: 'error',
        stage: 'validation',
        stageLabel: 'Walidacja',
        progress: 0,
        error: 'Missing required fields: videoPath, duration'
      });
      scheduleScanProgressCleanup(scanId);
      return res.status(400).json({ error: 'Missing required fields: videoPath, duration' });
    }

    if (!Array.isArray(thumbnailTimes) || thumbnailTimes.length === 0) {
      setScanProgress(scanId, {
        status: 'error',
        stage: 'validation',
        stageLabel: 'Walidacja',
        progress: 0,
        error: 'Missing required field: thumbnailTimes (array of thumbnail timestamps)'
      });
      scheduleScanProgressCleanup(scanId);
      return res.status(400).json({ error: 'Missing required field: thumbnailTimes (array of thumbnail timestamps)' });
    }

    const { cacheKey } = req.body;
    const filename = urlPath.split('/').pop();
    const normalizedKey = cacheKey || filename;
    const videoCachePath = path.join(cacheDir, normalizedKey);
    const personId = extractPersonId(filename);
    
    // Use threshold from request if provided, otherwise fall back to person profile threshold
    const videoThreshold = req.body.threshold !== undefined && req.body.threshold !== null
      ? Number(req.body.threshold)
      : null;
    const personThreshold = getEffectiveThreshold(personId);
    const effectiveThreshold = videoThreshold !== null ? videoThreshold : personThreshold;

    console.log('\n[NSFW SCAN] Starting NSFW scan on existing thumbnails');
    console.log('[NSFW SCAN] Video:', filename);
    console.log('[NSFW SCAN] Cache key:', normalizedKey);
    console.log('[NSFW SCAN] Cache path:', videoCachePath);
    console.log('[NSFW SCAN] Person profile:', personId, '| profile threshold:', personThreshold, '| effective threshold:', effectiveThreshold);
    console.log('[NSFW SCAN] Duration:', duration, 'seconds');
    console.log(`[NSFW SCAN] Thumbnails to scan: ${thumbnailTimes.length}`);

    // --- Phase 1: Resolve existing thumb_*.jpg files from cache ---
    console.log('[NSFW SCAN] Phase 1: Locating existing thumbnails...');
    const thumbFiles = {};
    let foundCount = 0;

    for (const t of thumbnailTimes) {
      const thumbPath = path.join(videoCachePath, `thumb_${t}.jpg`);
      if (fs.existsSync(thumbPath)) {
        thumbFiles[t] = thumbPath;
        foundCount++;
      } else {
        console.warn(`[NSFW SCAN] ⚠️ Thumbnail not found for ${t}s — skipped`);
      }
    }

    console.log(`[NSFW SCAN] Found ${foundCount}/${thumbnailTimes.length} thumbnails`);

    setScanProgress(scanId, {
      status: 'running',
      stage: 'locate-thumbnails',
      stageLabel: 'Lokalizowanie screenow',
      progress: 10,
      analyzed: 0,
      total: thumbnailTimes.length,
      found: foundCount
    });

    if (foundCount === 0) {
      setScanProgress(scanId, {
        status: 'error',
        stage: 'locate-thumbnails',
        stageLabel: 'Lokalizowanie screenow',
        progress: 10,
        analyzed: 0,
        total: thumbnailTimes.length,
        error: 'No thumbnails found in cache. Generate thumbnails first.'
      });
      scheduleScanProgressCleanup(scanId);
      return res.status(404).json({ error: 'No thumbnails found in cache. Generate thumbnails first.' });
    }

    // --- Phase 2: Run NSFW detection on each thumbnail ---
    console.log('[NSFW SCAN] Phase 2: Running NSFW detection on thumbnails...');
    const detectionResults = {};
    let detectedCount = 0;

    for (const t of thumbnailTimes) {
      const thumbPath = thumbFiles[t];
      if (!thumbPath) {
        detectionResults[t] = { is_nsfw: false, confidence: 0, method: 'skipped' };
        detectedCount++;
        continue;
      }

      try {
        const trad = await detectNSFW(thumbPath, effectiveThreshold);
        const confidence = trad.nsfw_score / 100;
        detectionResults[t] = {
          is_nsfw: confidence >= effectiveThreshold,
          confidence,
          person_detected: trad.person_detected !== false,
          person_confidence: trad.person_confidence || 0,
          method: trad.method || 'local_model_with_fallback'
        };
      } catch (err) {
        console.error(`[NSFW SCAN] Detection error at ${t}s:`, err.message);
        detectionResults[t] = { is_nsfw: false, confidence: 0, person_detected: true, person_confidence: 0, method: 'error' };
      }

      detectedCount++;
      const detectionProgress = Math.round((detectedCount / thumbnailTimes.length) * 85);
      const overallProgress = Math.min(95, 10 + detectionProgress);

      setScanProgress(scanId, {
        status: 'running',
        stage: 'detect',
        stageLabel: 'Analiza NSFW',
        progress: overallProgress,
        analyzed: detectedCount,
        total: thumbnailTimes.length
      });

      if (detectedCount % 5 === 0 || detectedCount === thumbnailTimes.length) {
        console.log(`[NSFW SCAN] Progress: ${detectedCount}/${thumbnailTimes.length}`);
      }
    }

    // --- Phase 3: Identify sequences of 3+ consecutive frames with no person detected ---
    console.log('[NSFW SCAN] Phase 3: Identifying empty frames (no person detected)...');

    const emptyFrameSequences = [];
    let emptySequenceStart = null;
    let emptySequenceCount = 0;
    let emptySequenceTimes = [];

    for (const t of thumbnailTimes) {
      const detection = detectionResults[t];
      const hasPersonDetection = detection.person_detected !== false; // Default to true if not present

      if (!hasPersonDetection) {
        if (emptySequenceStart === null) {
          emptySequenceStart = t;
          emptySequenceCount = 1;
          emptySequenceTimes = [t];
        } else {
          emptySequenceCount++;
          emptySequenceTimes.push(t);
        }
      } else {
        if (emptySequenceCount >= 3) {
          emptyFrameSequences.push({
            start: parseFloat(emptySequenceStart.toFixed(2)),
            end: parseFloat(t.toFixed(2)),
            count: emptySequenceCount,
            times: emptySequenceTimes
          });
          console.log(`[NSFW SCAN] Empty sequence (no person): ${emptySequenceStart}s – ${t}s (${emptySequenceCount} frames)`);
        }
        emptySequenceStart = null;
        emptySequenceCount = 0;
        emptySequenceTimes = [];
      }
    }

    // Handle last open empty sequence
    if (emptySequenceCount >= 3) {
      emptyFrameSequences.push({
        start: parseFloat(emptySequenceStart.toFixed(2)),
        end: parseFloat(duration.toFixed(2)),
        count: emptySequenceCount,
        times: emptySequenceTimes
      });
      console.log(`[NSFW SCAN] Empty sequence (end): ${emptySequenceStart}s – ${duration}s (${emptySequenceCount} frames)`);
    }

    console.log(`[NSFW SCAN] Found ${emptyFrameSequences.length} sequences of 3+ consecutive frames without person`);

    // --- Phase 4: Group consecutive NSFW thumbnails into time segments ---
    console.log('[NSFW SCAN] Phase 4: Grouping NSFW thumbnails into segments...');

    setScanProgress(scanId, {
      status: 'running',
      stage: 'group',
      stageLabel: 'Grupowanie segmentow',
      progress: 96,
      analyzed: thumbnailTimes.length,
      total: thumbnailTimes.length
    });

    const nsfwSegments = [];
    let currentSegmentStart = null;
    let currentSegmentConfidences = [];
    // Respect the current slider/request threshold for segment selection.
    // Using personThreshold here ignored UI threshold changes.
    const confidenceThreshold = effectiveThreshold;

    for (const t of thumbnailTimes) {
      const detection = detectionResults[t];

      if (detection.is_nsfw && detection.confidence >= confidenceThreshold) {
        if (currentSegmentStart === null) {
          currentSegmentStart = t;
          currentSegmentConfidences = [detection.confidence];
        } else {
          currentSegmentConfidences.push(detection.confidence);
        }
      } else {
        if (currentSegmentStart !== null) {
          const avgConfidence = currentSegmentConfidences.reduce((a, b) => a + b, 0) / currentSegmentConfidences.length;
          nsfwSegments.push({
            start: parseFloat(currentSegmentStart.toFixed(2)),
            end: parseFloat(t.toFixed(2)),
            confidence: parseFloat(avgConfidence.toFixed(3)),
            frameCount: currentSegmentConfidences.length
          });
          console.log(`[NSFW SCAN] Segment: ${currentSegmentStart}s – ${t}s (confidence: ${(avgConfidence * 100).toFixed(1)}%)`);
          currentSegmentStart = null;
          currentSegmentConfidences = [];
        }
      }
    }

    // Handle last open segment
    if (currentSegmentStart !== null) {
      const avgConfidence = currentSegmentConfidences.reduce((a, b) => a + b, 0) / currentSegmentConfidences.length;
      nsfwSegments.push({
        start: parseFloat(currentSegmentStart.toFixed(2)),
        end: parseFloat(duration.toFixed(2)),
        confidence: parseFloat(avgConfidence.toFixed(3)),
        frameCount: currentSegmentConfidences.length
      });
      console.log(`[NSFW SCAN] Segment (end): ${currentSegmentStart}s – ${duration}s (confidence: ${(avgConfidence * 100).toFixed(1)}%)`);
    }

    // --- Phase 5: Filter out NSFW segments that overlap with "no person" sequences ---
    // CHANGED: Be more lenient - only filter if we have HIGH confidence that person is missing
    console.log('[NSFW SCAN] Phase 5: Flagging NSFW segments that overlap with empty frames (NOT removing, only flagging)...');

    const flaggedNsfwSegments = nsfwSegments.map(segment => {
      let hasEmptyOverlap = false;
      for (const emptySeq of emptyFrameSequences) {
        // Check if segment overlaps with empty sequence
        const overlaps = segment.start < emptySeq.end && segment.end > emptySeq.start;
        if (overlaps) {
          hasEmptyOverlap = true;
          console.log(`[NSFW SCAN] Flagged (empty overlap): ${segment.start}s-${segment.end}s (overlaps with ${emptySeq.start}s-${emptySeq.end}s)`);
          break;
        }
      }
      return {
        ...segment,
        flagged_empty_overlap: hasEmptyOverlap
      };
    });

    // Keep all NSFW segments (don't filter out, just flag)
    const filteredNsfwSegments = flaggedNsfwSegments;

    console.log(`\n[NSFW SCAN] ✅ Scan complete: ${filteredNsfwSegments.length} NSFW segments detected (${filteredNsfwSegments.filter(s => s.flagged_empty_overlap).length} flagged as empty-overlap) in ${thumbnailTimes.length} thumbnails`);

    const framesForTraining = thumbnailTimes
      .filter(t => detectionResults[t])
      .map(t => ({
        time: Number(t),
        confidence: Number(detectionResults[t].confidence || 0),
        predicted: Boolean(detectionResults[t].is_nsfw)
      }));

    nsfwScanContextRegistry.set(filename, {
      personId,
      threshold: effectiveThreshold,
      createdAt: Date.now(),
      frames: framesForTraining
    });

    setScanProgress(scanId, {
      status: 'completed',
      stage: 'done',
      stageLabel: 'Zakonczono',
      progress: 100,
      analyzed: thumbnailTimes.length,
      total: thumbnailTimes.length,
      segmentCount: filteredNsfwSegments.length
    });
    scheduleScanProgressCleanup(scanId);

    res.json({
      success: true,
      nsfwSegments: filteredNsfwSegments,
      nsfw_analysis: detectionResults,
      segmentCount: filteredNsfwSegments.length,
      framesAnalyzed: thumbnailTimes.length,
      threshold_used: effectiveThreshold,
      emptySequencesFiltered: emptyFrameSequences.length,
      detectionMethod: 'person_detection+local_model_with_fallback',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[NSFW SCAN] Error:', err.message);
    setScanProgress(scanId, {
      status: 'error',
      stage: 'error',
      stageLabel: 'Blad',
      progress: 100,
      error: err.message
    });
    scheduleScanProgressCleanup(scanId);
    res.status(500).json({
      error: 'NSFW scan failed: ' + err.message,
      timestamp: new Date().toISOString()
    });
  }
});

function clearDirectoryAllContents(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let deleted = 0;
  const entries = fs.readdirSync(dirPath);
  entries.forEach((entry) => {
    const entryPath = path.join(dirPath, entry);
    try {
      fs.rmSync(entryPath, { recursive: true, force: true });
      deleted += 1;
    } catch (err) {
      console.error(`[Cleanup] Error deleting ${label}/${entry}:`, err.message);
    }
  });

  return deleted;
}

function performAppCleanup(options = {}) {
  const clearCache = options.clearCache === true;

  console.log('[Cleanup] Starting cleanup process');

  const uploadsDeleted = clearDirectoryAllContents(uploadsDir, 'uploads');
  const outputDeleted = clearDirectoryAllContents(outputDir, 'output');
  const cacheDeleted = clearCache ? clearDirectoryAllContents(cacheDir, 'cache') : 0;

  outputFileRegistry.clear();
  nsfwScanProgressRegistry.clear();
  nsfwScanContextRegistry.clear();

  const summary = {
    uploadsDeleted,
    outputDeleted,
    cacheDeleted
  };

  console.log('[Cleanup] Cleanup complete:', summary);
  return summary;
}

// Cleanup endpoint - called when app closes
app.post('/api/cleanup', (req, res) => {
  try {
    // Keep thumbnail cache by default to allow cross-session reuse.
    const clearCache = req.body?.clearCache === true;
    const summary = performAppCleanup({ clearCache });
    res.json({ status: 'cleanup_complete', ...summary });
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
    res.status(500).json({ error: 'Cleanup error: ' + err.message });
  }
});

// Quick NSFW test for a single local image file
app.post('/api/nsfw/quick-test', async (req, res) => {
  const { imagePath } = req.body;

  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    return res.status(400).json({ error: 'Podaj ścieżkę do pliku (imagePath).' });
  }

  const normalizedPath = imagePath.trim();

  if (!path.isAbsolute(normalizedPath)) {
    return res.status(400).json({ error: 'Ścieżka musi być absolutna (np. C:\\obrazki\\foto.jpg).' });
  }

  if (!fs.existsSync(normalizedPath)) {
    return res.status(404).json({ error: `Plik nie istnieje: ${normalizedPath}` });
  }

  const stat = fs.statSync(normalizedPath);
  if (!stat.isFile()) {
    return res.status(400).json({ error: 'Podana ścieżka nie jest plikiem.' });
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);
  if (!allowed.has(ext)) {
    return res.status(400).json({ error: `Nieobsługiwany format: ${ext}. Dozwolone: jpg, jpeg, png, webp, bmp, gif.` });
  }

  try {
    const result = await detectNSFW(normalizedPath, null);
    res.json({
      success: true,
      imagePath: normalizedPath,
      filename: path.basename(normalizedPath),
      is_nsfw: result.is_nsfw,
      nsfw_score: result.nsfw_score,
      confidence: result.confidence,
      person_detected: result.person_detected,
      person_confidence: result.person_confidence,
      threshold_used: result.threshold_used,
      method: result.method
    });
  } catch (err) {
    console.error('[Quick NSFW Test] Error:', err.message);
    res.status(500).json({ error: 'Błąd analizy: ' + err.message });
  }
});

// Helper function to recursively delete directories
function deleteRecursive(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const path_to_delete = path.join(dir, file);
      if (fs.lstatSync(path_to_delete).isDirectory()) {
        deleteRecursive(path_to_delete);
      } else {
        fs.unlinkSync(path_to_delete);
      }
    });
    fs.rmdirSync(dir);
  }
}

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error handler triggered:', err.message);
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code, err.message);
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  } else if (err.message && err.message.includes('Only MP4, MKV, and TS')) {
    console.error('File type error:', err.message);
    return res.status(415).json({ error: err.message });
  } else if (err) {
    console.error('Other error:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Start server
// Auto-start NSFW model server (Python Flask on port 5001)
(function startNsfwModelServer() {
  const pythonExe = 'c:/^ Claud/.venv/Scripts/python.exe';
  const scriptPath = 'C:/^ Claud/model_server.py';

  const child = spawn(pythonExe, [scriptPath], {
    detached: false,
    stdio: 'pipe',
    windowsHide: true
  });

  child.stdout.on('data', d => console.log('[NSFW-Model]', d.toString().trim()));
  child.stderr.on('data', d => console.error('[NSFW-Model]', d.toString().trim()));
  child.on('exit', code => console.warn(`[NSFW-Model] process exited with code ${code}`));

  console.log(`[NSFW-Model] Starting model server (PID will follow)...`);

  // Graceful shutdown: kill model server and cleanup app files on exit.
  process.on('exit', () => {
    try { performAppCleanup(); } catch (_) {}
    try { child.kill(); } catch (_) {}
  });
  process.on('SIGINT', () => {
    try { performAppCleanup(); } catch (_) {}
    try { child.kill(); } catch (_) {}
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    try { performAppCleanup(); } catch (_) {}
    try { child.kill(); } catch (_) {}
    process.exit(0);
  });
})();

app.listen(PORT, () => {
  console.log(`Video Cutter app running at http://localhost:${PORT}`);
});
