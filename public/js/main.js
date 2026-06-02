// --- Długie kliknięcie na slot miniatury profilu ---
window.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('mousedown', function (e) {
    const btn = e.target.closest('.profile-slot-btn');
    if (!btn) return;
    let holdTimer = setTimeout(() => {
      const confirmSave = window.confirm('Czy zapisać aktualną miniaturę profilu w tym slocie?');
      if (confirmSave) {
        // Zaznacz slot jako wybrany
        btn.classList.add('selected');
        // Wywołaj istniejącą logikę zapisu
        const slotSaveBtn = document.getElementById('profileSlotSaveBtn');
        if (slotSaveBtn) slotSaveBtn.click();
      }
    }, 3000); // 3 sekundy
    const clearHold = () => {
      clearTimeout(holdTimer);
      document.removeEventListener('mouseup', clearHold);
      document.removeEventListener('mouseleave', clearHold);
    };
    document.addEventListener('mouseup', clearHold);
    document.addEventListener('mouseleave', clearHold);
  });
});

// Obsługa przycisku 'Edytuj podgląd' – pokazuje sekcję wyboru slotu i przycisk 'Zapisz'
window.addEventListener('DOMContentLoaded', () => {
  const editBtn = document.getElementById('editProfilePreviewBtn');
  const selectorSection = document.getElementById('profilePreviewSelector');
  if (editBtn && selectorSection) {
    editBtn.addEventListener('click', () => {
      selectorSection.style.display = '';
      // Przewiń do sekcji wyboru slotu
      selectorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});
// Obsługa przycisku zapisu slotu miniatury profilu
window.addEventListener('DOMContentLoaded', () => {
  const slotSaveBtn = document.getElementById('profileSlotSaveBtn');
  if (slotSaveBtn) {
    slotSaveBtn.addEventListener('click', async () => {
      const personId = appState.currentPersonId;
      // Znajdź wybrany slot (wybrana miniatura)
      const selectedFrame = document.querySelector('.profile-preview-frame.selected');
      if (!personId || !selectedFrame) {
        showError('Wybierz profil oraz slot miniatury do zapisu!');
        return;
      }
      const idx = Number(selectedFrame.dataset.index);
      const thumb = appState.thumbnails[idx];
      if (!thumb) {
        showError('Nie znaleziono danych miniatury!');
        return;
      }
      try {
        const response = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_index: idx, thumbnail_base64: thumb.thumbnail })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          showError('Błąd zapisu miniatury: ' + (err.error || response.status));
          return;
        }
        showSuccess('Miniatura profilu została zapisana!');
        updatePersonModelStatsPanel && updatePersonModelStatsPanel();
      } catch (err) {
        showError('Błąd zapisu miniatury: ' + err.message);
      }
    });
  }
});
// Obsługa zapisu aktualnej miniatury profilu (tylko zaawansowane)
window.addEventListener('DOMContentLoaded', () => {
  const advancedToggle = document.getElementById('profilesAdvancedToggle');
  const saveCurrentBtn = document.getElementById('profilePreviewSaveCurrentBtn');
  if (advancedToggle && saveCurrentBtn) {
    advancedToggle.addEventListener('change', (e) => {
      saveCurrentBtn.style.display = e.target.checked ? '' : 'none';
    });
    // Domyślnie ukryj
    saveCurrentBtn.style.display = advancedToggle.checked ? '' : 'none';
    saveCurrentBtn.addEventListener('click', async () => {
      const personId = appState.currentPersonId;
      // Znajdź wybraną miniaturę (pierwsza z .profile-preview-frame.selected)
      const selectedFrame = document.querySelector('.profile-preview-frame.selected');
      if (!personId || !selectedFrame) {
        showError('Wybierz profil oraz miniaturę do zapisu!');
        return;
      }
      const idx = Number(selectedFrame.dataset.index);
      const thumb = appState.thumbnails[idx];
      if (!thumb) {
        showError('Nie znaleziono danych miniatury!');
        return;
      }
      try {
        const response = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_index: idx, thumbnail_base64: thumb.thumbnail })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          showError('Błąd zapisu miniatury: ' + (err.error || response.status));
          return;
        }
        showSuccess('Aktualna miniatura profilu została zapisana!');
        updatePersonModelStatsPanel && updatePersonModelStatsPanel();
      } catch (err) {
        showError('Błąd zapisu miniatury: ' + err.message);
      }
    });
  }
});

// Obsługa zapisu miniatury profilu (profile preview)
window.addEventListener('DOMContentLoaded', () => {
  if (profilePreviewSaveBtn) {
    profilePreviewSaveBtn.addEventListener('click', async () => {
      const personId = appState.currentPersonId;
      const selectedFrames = Array.from(document.querySelectorAll('.profile-preview-frame.selected'));
      if (!personId || selectedFrames.length === 0) {
        showError('Wybierz profil oraz co najmniej jedną miniaturę do zapisu!');
        return;
      }
      // Pobierz indeksy wybranych klatek
      const selectedIndexes = selectedFrames.map(frame => Number(frame.dataset.index));
      // Pobierz dane miniatur
      const selectedThumbs = selectedIndexes.map(idx => appState.thumbnails[idx]);
      // Wyślij do backendu
      try {
        const response = await fetch(API.ML_PERSON_PREVIEW_FRAMES(personId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames: selectedThumbs.map(t => ({ time: t.time, thumbnail: t.thumbnail }))
          })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          showError('Błąd zapisu miniatury: ' + (err.error || response.status));
          return;
        }
        showSuccess('Miniatura profilu została zapisana!');
        // Odśwież podgląd profilu
        updatePersonModelStatsPanel && updatePersonModelStatsPanel();
      } catch (err) {
        showError('Błąd zapisu miniatury: ' + err.message);
      }
    });
  }
});
// API Endpoints
const API = {
  UPLOAD: '/api/upload',
  CLEANUP: '/api/cleanup',
  CUT: '/api/cut',
  SAVE_ALL: '/api/save-all',
  THUMBNAILS: '/api/thumbnails',
  FILE_SIZE: '/api/file-size',
  DELETE_SOURCE: '/api/delete-source',
  ML_FEEDBACK: '/api/ml/feedback',
  ML_PROFILES: '/api/ml/profiles',
  ML_TRAINING_SETTINGS: '/api/ml/training-settings',
  ML_TRAINING_START: '/api/ml/training/start',
  ML_TRAINING_STOP: '/api/ml/training/stop',
  ML_TRAINING_PAUSE: '/api/ml/training/pause',
  ML_TRAINING_RESUME: '/api/ml/training/resume',
  ML_TRAINING_QUEUE_REMOVE: '/api/ml/training/queue/remove',
  ML_PERSON_PROFILE: (personId) => `/api/ml/person-profile/${encodeURIComponent(personId)}/stats`,
  ML_PERSON_THRESHOLD: (personId) => `/api/ml/person-profile/${encodeURIComponent(personId)}/threshold`,
  ML_PERSON_PREVIEW_FRAMES: (personId) => `/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frames`,
  ML_PERSON_PREVIEW_SLOT: (personId, slot) => `/api/ml/person-profile/${encodeURIComponent(personId)}/preview-slot/${Number(slot)}`,
  ML_PERSON_DELETE: (personId) => `/api/ml/person-profile/${encodeURIComponent(personId)}`,
  ML_RUNTIME_STATUS: '/api/ml/runtime-status',
  TEST: '/api/test',
  VIDEO: (id) => `/api/video/${id}`
};

// CSS Classes
const CSS = {
  SELECTED: 'selected',
  THUMBNAIL: 'thumbnail',
  TIMELINE_ITEM: 'timeline-item',
  DRAGOVER: 'dragover',
  NSFW_DETECTED: 'nsfw-detected'
};

// Constants
const SUPPORTED_FORMATS = {
  mimeTypes: ['video/mp4', 'video/x-matroska', 'video/mp2t', 'video/hevc', 'video/h265'],
  extensions: ['.mp4', '.mkv', '.ts', '.hevc', '.h265']
};
const AUTO_MERGE_THRESHOLD = 45;
const NSFW_GROUP_ID = 999;
const AUTO_SELECT_NSFW_SEGMENTS = true;
const FEEDBACK_COUNT_FOR_RETRAIN = 5;
const DEFAULT_OUTPUT_PATH = './output';
const MODEL_SETTINGS_REFRESH_MS = 5000;
const PROFILE_PREVIEW_FRAME_LIMIT = 12;
const MAX_SOURCE_FOLDERS = 3;

function safeJsonParse(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue;
  }
  try {
    return JSON.parse(rawValue);
  } catch (err) {
    return fallbackValue;
  }
}

function normalizeSourceFolders(folders) {
  if (!Array.isArray(folders)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  folders.forEach((folder) => {
    const cleaned = String(folder || '').trim();
    if (!cleaned || seen.has(cleaned)) {
      return;
    }
    seen.add(cleaned);
    normalized.push(cleaned);
  });

  return normalized.slice(0, MAX_SOURCE_FOLDERS);
}

function clampSourceFolderIndex(index, folders) {
  const parsed = Number(index);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  if (!Array.isArray(folders) || folders.length === 0) {
    return 0;
  }

  return Math.min(Math.trunc(parsed), folders.length - 1);
}

function loadInitialSourceFolders() {
  const storedFolders = safeJsonParse(localStorage.getItem('sourceFolders'), []);
  const normalized = normalizeSourceFolders(storedFolders);

  if (normalized.length > 0) {
    return normalized;
  }

  const legacyFolder = String(localStorage.getItem('sourceFolderPath') || '').trim();
  return legacyFolder ? [legacyFolder] : [];
}

const initialSourceFolders = loadInitialSourceFolders();
const initialActiveSourceFolderIndex = clampSourceFolderIndex(
  localStorage.getItem('activeSourceFolderIndex'),
  initialSourceFolders
);
const initialSourceFolderPath = initialSourceFolders[initialActiveSourceFolderIndex] || '';

// State Management
let appState = {
  videoFile: null,
  videoId: null,
  videoCacheKey: null,
  videoDuration: 0,
  thumbnails: [],
  selectedSegments: [],
  groupedSegments: [],
  thumbInterval: 25,
  isSelecting: false,
  isDeselecting: false,
  selectStartIndex: null,
  activeSelectionGroupId: null,
  dragMoved: false,
  nextGroupId: 1,
  nsfwAnalysis: {},
  isCutting: false,
  filesDownloaded: false,
  sourceFolders: initialSourceFolders,
  activeSourceFolderIndex: initialActiveSourceFolderIndex,
  sourceFolderPath: initialSourceFolderPath,
  destinationFolderPath: localStorage.getItem('destinationFolderPath') || DEFAULT_OUTPUT_PATH,
  lastExportFolderPath: '',
  currentPersonId: null,
  settingsActiveTab: 'folders',
  modelTrainingFolders: [],
  profilesSummary: null,
  selectedPreviewFrameTimes: [],
  profilePreviewAnimationTimer: null,
  recentFolders: JSON.parse(localStorage.getItem('recentFolders')) || [],
  mouseupListenerAttached: false
};
let modelSettingsPoller = null;
let modelSettingsRefreshToken = 0;
let modelSettingsLastRefreshedAt = null;

// ─── Queue State ──────────────────────────────────────────────────────────────
const fileQueue = [];
let queueIdCounter = 0;
let queueProcessing = false;
let queuePaused = false;
let queueCurrentId = null;
let activeQueueItemId = null;
let turboModeEnabled = false;
let queueCollapsed = true;
let personPanelExpanded = false;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const previewSection = document.getElementById('previewSection');
const videoName = document.getElementById('videoName');
const personName = document.getElementById('personName');
const videoDuration = document.getElementById('videoDuration');
const intervalSlider = document.getElementById('intervalSlider');
const intervalValue = document.getElementById('intervalValue');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValue = document.getElementById('thresholdValue');
const generateThumbsBtn = document.getElementById('generateThumbsBtn');
const prevVideoBtn = document.getElementById('prevVideoBtn');
const nextVideoBtn = document.getElementById('nextVideoBtn');
const queueFilePosition = document.getElementById('queueFilePosition');
const thumbContainer = document.getElementById('thumbContainer');

const timelineSection = document.getElementById('timelineSection');
const timeline = document.getElementById('timeline');
const selectionLayer = document.getElementById('selectionLayer');
const selectAllCheck = document.getElementById('selectAllCheck');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const segmentsList = document.getElementById('segmentsList');

const cutSection = document.getElementById('cutSection');
const cutBtn = document.getElementById('cutBtn');
const cutProgress = document.getElementById('cutProgress');
const cutProgressFill = document.getElementById('cutProgressFill');
const cutProgressText = document.getElementById('cutProgressText');
const resultsList = document.getElementById('resultsList');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const deleteSourceBtn = document.getElementById('deleteSourceBtn');
const downloadProgress = document.getElementById('downloadProgress');
const downloadProgressFill = document.getElementById('downloadProgressFill');
const downloadProgressText = document.getElementById('downloadProgressText');

const openOutputBtn = document.getElementById('openOutputBtn');
const personModelStatsPanelId = 'personModelStatsPanel';

// Modal
const segmentsModal = document.getElementById('segmentsModal');
const viewSegmentsBtn = document.getElementById('viewSegmentsBtn');
const closeSegmentsBtn = document.getElementById('closeSegmentsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const closeSettingsConfirmBtn = document.getElementById('closeSettingsConfirmBtn');
const sourceFolderBtn = document.getElementById('sourceFolderBtn');
const sourceFolderPath = document.getElementById('sourceFolderPath');
const sourceFolderClear = document.getElementById('sourceFolderClear');
const sourceFolderPanels = document.getElementById('sourceFolderPanels');
const sourceFolderPanelsMode = document.getElementById('sourceFolderPanelsMode');
const destinationFolderBtn = document.getElementById('destinationFolderBtn');
const destinationFolderPath = document.getElementById('destinationFolderPath');
const destinationFolderClear = document.getElementById('destinationFolderClear');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const retentionDaysInput = document.getElementById('retentionDaysInput');
const retentionDaysValue = document.getElementById('retentionDaysValue');
const retentionDaysSave = document.getElementById('retentionDaysSave');
const settingsTabButtons = document.querySelectorAll('.settings-tab-btn');
const settingsTabPanels = document.querySelectorAll('.settings-tab-panel');
const modelTrainingFolderBtn = document.getElementById('modelTrainingFolderBtn');
const modelTrainingFoldersList = document.getElementById('modelTrainingFoldersList');
const modelTrainingSaveFoldersBtn = document.getElementById('modelTrainingSaveFoldersBtn');
const modelTrainingStartBtn = document.getElementById('modelTrainingStartBtn');
const modelTrainingStopBtn = document.getElementById('modelTrainingStopBtn');
const modelTrainingPauseResumeBtn = document.getElementById('modelTrainingPauseResumeBtn');
const modelTrainingResumeBtn = document.getElementById('modelTrainingResumeBtn');
const modelTrainingRefreshBtn = document.getElementById('modelTrainingRefreshBtn');
const modelRuntimeSummary = document.getElementById('modelRuntimeSummary');
const modelTrainingRuntime = document.getElementById('modelTrainingRuntime');
const modelTrainingQueue = document.getElementById('modelTrainingQueue');
const modelProfilesSummary = document.getElementById('modelProfilesSummary');
const profilesGrid = document.getElementById('profilesGrid');
const profilePreviewSelector = document.getElementById('profilePreviewSelector');
const profilePreviewTarget = document.getElementById('profilePreviewTarget');
const profilePreviewFrames = document.getElementById('profilePreviewFrames');
const profilePreviewSaveBtn = document.getElementById('profilePreviewSaveBtn');
const profilesAdvancedToggle = document.getElementById('profilesAdvancedToggle');

// Event Listeners
console.log('Attaching event listeners...');
console.log('uploadArea element:', uploadArea);
console.log('fileInput element:', fileInput);

if (!uploadArea) {
  console.error('FATAL: uploadArea element not found!');
} else {
  uploadArea.addEventListener('click', async () => {
    console.log('Upload area clicked!');
    // Simple: always use fileInput in browser, IPC in Electron
    if (!window.electron?.ipcRenderer) {
      console.log('No electron.ipcRenderer - using file input');
      // Browser: use native file input
      fileInput.click();
      return;
    }

    console.log('Using Electron IPC...');
    // Electron: use IPC
    try {
      const filePaths = await window.electron.ipcRenderer.invoke('open-file-dialog', {
        defaultPath: appState.sourceFolderPath || undefined
      });
      console.log('Dialog returned:', filePaths);
      if (filePaths && filePaths.length > 0) {
        addPathsToQueue(filePaths);
      }
    } catch (err) {
      console.error('IPC Error:', err);
      fileInput.click();
    }
  });
}

function persistSourceFolderState() {
  const folders = normalizeSourceFolders(appState.sourceFolders);
  appState.sourceFolders = folders;
  appState.activeSourceFolderIndex = clampSourceFolderIndex(appState.activeSourceFolderIndex, folders);
  appState.sourceFolderPath = folders[appState.activeSourceFolderIndex] || '';

  localStorage.setItem('sourceFolders', JSON.stringify(folders));
  localStorage.setItem('activeSourceFolderIndex', String(appState.activeSourceFolderIndex || 0));
  localStorage.setItem('sourceFolderPath', appState.sourceFolderPath || '');
}

function addSourceFolder(folderPath) {
  const cleaned = String(folderPath || '').trim();
  if (!cleaned) {
    return { added: false, activated: false, removedOldest: false };
  }

  let folders = normalizeSourceFolders(appState.sourceFolders);
  const existingIndex = folders.indexOf(cleaned);

  if (existingIndex >= 0) {
    appState.sourceFolders = folders;
    appState.activeSourceFolderIndex = existingIndex;
    appState.sourceFolderPath = cleaned;
    persistSourceFolderState();
    return { added: false, activated: true, removedOldest: false };
  }

  let removedOldest = false;
  if (folders.length >= MAX_SOURCE_FOLDERS) {
    folders = folders.slice(1);
    removedOldest = true;
  }

  folders.push(cleaned);
  appState.sourceFolders = folders;
  appState.activeSourceFolderIndex = folders.length - 1;
  appState.sourceFolderPath = cleaned;
  persistSourceFolderState();
  return { added: true, activated: true, removedOldest };
}

function setActiveSourceFolder(index) {
  const folders = normalizeSourceFolders(appState.sourceFolders);
  if (folders.length === 0) {
    appState.sourceFolders = [];
    appState.activeSourceFolderIndex = 0;
    appState.sourceFolderPath = '';
    persistSourceFolderState();
    return false;
  }

  const nextIndex = clampSourceFolderIndex(index, folders);
  appState.sourceFolders = folders;
  appState.activeSourceFolderIndex = nextIndex;
  appState.sourceFolderPath = folders[nextIndex] || '';
  persistSourceFolderState();
  return true;
}

function getSourcePanelsMode() {
  const configured = Number(localStorage.getItem('sourceFolderPanelsMode') || '2');
  if (configured === 1 || configured === 2 || configured === 3) {
    return configured;
  }
  return 2;
}

function renderSourceFolderPanels() {
  if (!sourceFolderPanels) {
    return;
  }

  const folders = normalizeSourceFolders(appState.sourceFolders);
  appState.sourceFolders = folders;
  appState.activeSourceFolderIndex = clampSourceFolderIndex(appState.activeSourceFolderIndex, folders);
  appState.sourceFolderPath = folders[appState.activeSourceFolderIndex] || '';

  const mode = getSourcePanelsMode();
  sourceFolderPanels.className = `source-folder-panels cols-${mode}`;

  if (sourceFolderPanelsMode) {
    sourceFolderPanelsMode.value = String(mode);
  }

  if (folders.length === 0) {
    sourceFolderPanels.innerHTML = '<div class="source-folder-empty">Brak folderów. Dodaj 1-3 lokalizacje źródłowe.</div>';
    return;
  }

  sourceFolderPanels.innerHTML = folders
    .map((folder, index) => {
      const isActive = index === appState.activeSourceFolderIndex;
      return `
        <button type="button" class="source-folder-panel ${isActive ? 'active' : ''}" data-index="${index}" title="${folder}">
          <span class="source-folder-panel-label">Panel ${index + 1}</span>
          <span class="source-folder-panel-path">${folder}</span>
        </button>
      `;
    })
    .join('');
}

// Helper: handle selected file
async function handleFileSelected(filePath) {
  console.log('File selected:', filePath);
  activeQueueItemId = null;

  const cleanupResult = await cleanupBeforeNewUpload();
  if (!cleanupResult.ok) {
    showError(cleanupResult.message || 'Nie udało się wyczyścić poprzednich plików tymczasowych');
    return;
  }

  resetAppStateAndUI();

  // Show upload progress
  uploadProgress.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = 'Ładowanie: 0%';

  // Simulate upload progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.random() * 20;
      if (progress > 90) progress = 90;
      progressFill.style.width = progress + '%';
      progressText.textContent = `Ładowanie: ${Math.round(progress)}%`;
    }
  }, 300);

  try {
    // Send to backend
    const response = await fetch('/api/upload-from-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: filePath })
    });

    clearInterval(progressInterval);

    if (response.ok) {
      const data = await response.json();
      appState.videoId = data.id;
      appState.videoCacheKey = data.cacheKey || data.id;
      appState.videoDuration = data.duration;
      appState.videoFile = { name: data.originalName };
      appState.currentPersonId = extractPersonIdFromVideoName(data.originalName);

      // Set default interval to 25s
      appState.thumbInterval = 25;
      intervalSlider.value = 25;
      intervalValue.textContent = '25';

      progressFill.style.width = '100%';
      progressText.textContent = 'Ładowanie: 100%';

      videoName.textContent = data.originalName;
  personName.textContent = appState.currentPersonId || '';
      videoDuration.textContent = formatTime(data.duration);
      previewSection.style.display = 'block';
      generateThumbsBtn.disabled = false;

      // Hide progress after 1 second
      setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '';

        // Auto-generate thumbnails
        console.log('🔄 Auto-generating thumbnails with 25s interval...');
        autoGenerateThumbnailsAfterImport();
      }, 1000);

      document.dispatchEvent(new Event('videoUploaded'));
      showSuccess('✅ Plik załadowany! 🔄 Generowanie screenów...');
      updatePersonModelStatsPanel();
    } else {
      clearInterval(progressInterval);
      uploadProgress.style.display = 'none';
      showError('Błąd ładowania pliku');
    }
  } catch (err) {
    console.error('Error:', err);
    clearInterval(progressInterval);
    uploadProgress.style.display = 'none';
    showError('Błąd połączenia');
  }
}

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    addFilesToQueue(e.dataTransfer.files);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    addFilesToQueue(e.target.files);
    e.target.value = '';
  }
});

// Helper: Time/Index conversion
function indexToTime(index) { return index * appState.thumbInterval; }
function indexToEndTime(index) { return Math.min((index + 1) * appState.thumbInterval, appState.videoDuration); }
function timeToIndex(time) { return Math.floor(time / appState.thumbInterval); }

function getNsfwAnalysisForTime(time) {
  const analysis = appState.nsfwAnalysis || {};
  const numericTime = Number(time);

  if (!Number.isFinite(numericTime)) {
    return null;
  }

  const directCandidates = [
    String(time),
    String(numericTime),
    numericTime.toFixed(2),
    numericTime.toFixed(3)
  ];

  for (const key of directCandidates) {
    if (Object.prototype.hasOwnProperty.call(analysis, key)) {
      return analysis[key];
    }
  }

  let nearest = null;
  let nearestDiff = Number.POSITIVE_INFINITY;
  for (const [key, value] of Object.entries(analysis)) {
    const keyNum = Number(key);
    if (!Number.isFinite(keyNum)) {
      continue;
    }

    const diff = Math.abs(keyNum - numericTime);
    if (diff < nearestDiff) {
      nearest = value;
      nearestDiff = diff;
    }
  }

  if (nearestDiff <= 0.001) {
    return nearest;
  }

  return null;
}

function updateThumbnailNsfwVisuals() {
  const thumbnailEls = document.querySelectorAll('.thumbnail');

  thumbnailEls.forEach((thumbEl, index) => {
    const thumb = appState.thumbnails[index];
    if (!thumb) {
      return;
    }

    const nsfwResult = getNsfwAnalysisForTime(thumb.time);
    const isNSFW = Boolean(nsfwResult && nsfwResult.is_nsfw);

    if (isNSFW) {
      thumbEl.classList.add('nsfw-detected');
      thumbEl.dataset.nsfw = 'true';

      if (!thumbEl.querySelector('.nsfw-badge')) {
        const badge = document.createElement('div');
        badge.className = 'nsfw-badge';
        badge.textContent = 'Xxx';
        thumbEl.appendChild(badge);
      }

      if (!thumbEl.querySelector('.feedback-container')) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'feedback-container';
        feedbackContainer.dataset.time = thumb.time;
        feedbackContainer.dataset.index = index;
        feedbackContainer.innerHTML = `
          <button class="feedback-btn feedback-correct" title="Prawidłowy - NSFW">✓</button>
          <button class="feedback-btn feedback-incorrect" title="Błędny - to nie NSFW">✗</button>
        `;

        const correctBtn = feedbackContainer.querySelector('.feedback-correct');
        const incorrectBtn = feedbackContainer.querySelector('.feedback-incorrect');

        correctBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submitMLFeedback(thumb.time, true, correctBtn);
        });

        incorrectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submitMLFeedback(thumb.time, false, incorrectBtn);
        });

        thumbEl.appendChild(feedbackContainer);
      }
    } else {
      thumbEl.classList.remove('nsfw-detected');
      delete thumbEl.dataset.nsfw;
      thumbEl.querySelector('.nsfw-badge')?.remove();
      thumbEl.querySelector('.feedback-container')?.remove();
    }
  });
}

// Helper: Segment overlap detection
function segmentOverlaps(segment, rangeStart, rangeEnd) {
  return segment.start < rangeEnd && segment.end > rangeStart;
}

// Helper: Split segment by range (remove middle part)
function splitSegmentByRange(segment, rangeStart, rangeEnd) {
  const parts = [];
  if (segment.start < rangeStart) {
    parts.push({ start: segment.start, end: rangeStart, groupId: segment.groupId });
  }
  if (segment.end > rangeEnd) {
    parts.push({ start: rangeEnd, end: segment.end, groupId: segment.groupId });
  }
  return parts;
}

// Helper: Show message notification
function showMessage(message, className, duration = 5000) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = message;
  document.querySelector('main').insertBefore(el, document.querySelector('main').firstChild);
  setTimeout(() => el.remove(), duration);
}

function debounce(fn, wait = 400) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

// Usuwa duplikaty segmentów (start, end, groupId)
function deduplicateSegments(segments) {
  const seen = new Set();
  return segments.filter(seg => {
    const key = `${seg.start}-${seg.end}-${seg.groupId||''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneSegment(segment) {
  return {
    ...segment
  };
}

function findMatchingSegmentIndexByRange(start, end, epsilon = 0.001) {
  return appState.selectedSegments.findIndex((segment) => {
    const segStart = Number(segment.start);
    const segEnd = Number(segment.end);
    if (!Number.isFinite(segStart) || !Number.isFinite(segEnd)) {
      return false;
    }

    return Math.abs(segStart - start) <= epsilon && Math.abs(segEnd - end) <= epsilon;
  });
}

function clearAutoNsfwSelectionIfOnlyAuto() {
  const hasAnySelection = appState.selectedSegments.length > 0;
  if (!hasAnySelection) {
    return;
  }

  const hasManual = appState.selectedSegments.some(seg => seg.groupId !== NSFW_GROUP_ID);
  if (hasManual) {
    return;
  }

  // User starts manual work while only auto NSFW is selected.
  // Clear auto selection once so manual groups map 1:1 to export files.
  appState.selectedSegments = [];
  appState.groupedSegments = [];
  updateSegmentsList();
}

function splitIntoContiguousRanges(segments, epsilon = 0.1) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const groups = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const seg = sorted[i];
    const last = current[current.length - 1];

    if (seg.start <= last.end + epsilon) {
      current.push(seg);
    } else {
      groups.push(current);
      current = [seg];
    }
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

function buildExportSelectionFromThumbnails() {
  const thumbs = Array.isArray(appState.thumbnails) ? appState.thumbnails : [];
  if (thumbs.length === 0) {
    return appState.selectedSegments.map(cloneSegment);
  }

  const selectedRanges = [];
  for (let i = 0; i < thumbs.length; i++) {
    const thumbRange = getThumbnailRangeByIndex(i);
    if (!thumbRange) {
      continue;
    }

    const isSelected = appState.selectedSegments.some((segment) =>
      segmentOverlaps(segment, thumbRange.start, thumbRange.end)
    );

    if (isSelected) {
      selectedRanges.push({
        start: thumbRange.start,
        end: thumbRange.end,
        groupId: null
      });
    }
  }

  return selectedRanges;
}

// Merge only truly overlapping groups (not merely touching at boundary).
// This removes accidental duplicate/overlap artifacts without collapsing
// two valid, separate selections.
function normalizeOverlappingGroups(groups, epsilon = 0.1) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return [];
  }

  const ranges = groups
    .map(group => {
      const start = group.segments[0].start;
      const end = group.segments.reduce((maxEnd, seg) => Math.max(maxEnd, seg.end), group.segments[0].end);
      return {
        start,
        end,
        groupId: group.segments[0].groupId ?? null
      };
    })
    .sort((a, b) => a.start - b.start);

  const normalized = [];
  for (const range of ranges) {
    const last = normalized[normalized.length - 1];
    if (!last) {
      normalized.push({ ...range });
      continue;
    }

    // Merge only when actual overlap exists (range.start < last.end - epsilon).
    // Do not merge if ranges only touch at boundary.
    if (range.start < (last.end - epsilon)) {
      last.end = Math.max(last.end, range.end);
      if (!Number.isFinite(last.groupId) && Number.isFinite(range.groupId)) {
        last.groupId = range.groupId;
      }
    } else {
      normalized.push({ ...range });
    }
  }

  return normalized.map((item, idx) => ({
    groupIndex: idx + 1,
    segments: [{ start: item.start, end: item.end, groupId: item.groupId }]
  }));
}

function getThumbnailRangeByIndex(index) {
  const thumb = appState.thumbnails[index];
  if (!thumb) {
    return null;
  }

  const start = Number(thumb.time);
  const fallbackEnd = Math.min(start + appState.thumbInterval, appState.videoDuration);
  const nextThumb = appState.thumbnails[index + 1];
  const nextStart = nextThumb ? Number(nextThumb.time) : null;
  const end = Number.isFinite(nextStart) && nextStart > start
    ? Math.min(nextStart, appState.videoDuration)
    : fallbackEnd;

  return { start, end };
}

// Zapisuje historię zaznaczeń użytkownika do localStorage
function saveSelectionHistory() {
  const history = JSON.parse(localStorage.getItem('selectionHistory') || '[]');
  const now = Date.now();
  history.push({
    date: now,
    segments: appState.selectedSegments.map(s => ({start: s.start, end: s.end}))
  });
  localStorage.setItem('selectionHistory', JSON.stringify(history.slice(-100)));
}

// Oblicza poziom nagości na podstawie liczby/długości segmentów
function calculateNudityLevel() {
  const total = appState.selectedSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
  if (total === 0) return 0;
  if (total < 30) return 1;
  if (total < 120) return 2;
  if (total < 300) return 3;
  return 4;
}

// Cut Video
async function cutVideo() {
  // Prevent double-clicking
  if (appState.isCutting) {
    showError('Wcinanie już w toku - czekaj na zakończenie');
    return;
  }
  if (appState.selectedSegments.length === 0) {
    showError('Nie wybrano żadnych fragmentów');
    return;
  }
  // USUŃ DUPLIKATY przed cięciem
  appState.selectedSegments = deduplicateSegments(appState.selectedSegments);
  appState.groupedSegments = deduplicateSegments(appState.groupedSegments || []);

  // Export is derived from currently selected thumbnails (what user actually sees),
  // then normalized into contiguous islands.
  let exportSelection = buildExportSelectionFromThumbnails();

  if (exportSelection.length === 0) {
    showError('Brak fragmentów do eksportu');
    return;
  }

  const exportGroupIds = [...new Set(
    exportSelection
      .map(seg => seg.groupId)
      .filter(id => Number.isFinite(id))
  )].sort((a, b) => a - b);
  console.log('[CUT] manual groups in selection=', exportGroupIds.length, '(merged by adjacency into islands)');

  // ===== ОЧИСТИТЬ РЕЗУЛЬТАТЫ ПЕРЕД CUT =====
  // Wyczyść poprzednie wyniki ZARAZ - nie czekaj na confirm
  console.log('🧹 Clearing previous results IMMEDIATELY');
  resultsList.innerHTML = '';
  downloadAllBtn.style.display = 'none';

  // Zapisz historię zaznaczeń
  saveSelectionHistory();
  // Oblicz poziom nagości
  const nudityLevel = exportSelection.reduce((sum, s) => sum + (s.end - s.start), 0);
  appState.isCutting = true;
  cutBtn.disabled = true;

  // Wyczyść poprzednie wyniki (bez confirm - robimy to zawsze!)
  if (resultsList.children.length > 0) {
    console.log('🧹 Clearing', resultsList.children.length, 'previous results');
    resultsList.innerHTML = '';
  }

  cutProgress.style.display = 'block';
  resultsList.innerHTML = '<p>Łączenie fragmentów wideo...</p>';
  // Build export plan by merging adjacent time ranges.
  // Number of output files = number of disconnected contiguous islands in the selection.
  // This is the correct model: 5 neighbouring thumbnails clicked one-by-one → 1 file,
  // 2 well-separated selections → 2 files. groupId is irrelevant for file count.
  const sortedSelection = [...exportSelection]
    .map(cloneSegment)
    .sort((a, b) => a.start - b.start);

  const validSelection = sortedSelection.filter((segment) => {
    const s = Number(segment.start);
    const e = Number(segment.end);
    return Number.isFinite(s) && Number.isFinite(e) && e > s;
  });

  // Merge touching/overlapping segments into contiguous islands (epsilon = 0.1s).
  const mergeEpsilon = 0.1;
  const mergedRanges = [];
  for (const segment of validSelection) {
    const start = Number(segment.start);
    const end = Number(segment.end);
    const last = mergedRanges[mergedRanges.length - 1];
    if (!last) {
      mergedRanges.push({ start, end });
      continue;
    }
    if (start <= last.end + mergeEpsilon) {
      last.end = Math.max(last.end, end);
    } else {
      mergedRanges.push({ start, end });
    }
  }

  const segmentsForCut = mergedRanges.map((range, idx) => ({
    start: range.start,
    end: range.end,
    groupId: idx + 1
  }));

  const normalizedGroups = mergedRanges.map((range, idx) => ({
    groupIndex: idx + 1,
    segments: [{ start: range.start, end: range.end, groupId: idx + 1 }]
  }));

  console.log('[CUT] normalized groups=', normalizedGroups.length, 'from selected=', sortedSelection.length);

  if (segmentsForCut.length === 0) {
    throw new Error('Nie udało się zbudować planu cięcia');
  }

  console.log('[CUT] selectedSegments=', appState.selectedSegments.length, 'exportSelection=', exportSelection.length, 'segmentsForCut=', segmentsForCut.length);

  // Zapamiętaj groupedSegments w appState
  appState.groupedSegments = normalizedGroups;
  try {
    const response = await fetch(API.CUT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath: API.VIDEO(appState.videoId),
        segments: segmentsForCut,
        originalName: appState.videoFile.name
      })
    });
    if (!response.ok) {
      let errorMessage = 'Błąd łączenia wideo';

      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorMessage;
      } catch {
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          // Keep the default fallback message.
        }
      }

      throw new Error(errorMessage);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.cutFiles)) {
      throw new Error(data?.error || 'Nieprawidłowa odpowiedź serwera: brak listy cutFiles');
    }
    const cutFiles = data.cutFiles;

    // DEBUG: Log how many files backend returned
    console.log('=== BACKEND RESPONSE ===');
    console.log('Total cutFiles returned:', cutFiles.length);
    console.log('Expected planned groups:', segmentsForCut.length, '| selectedSegments:', appState.selectedSegments.length, '| exportSelection:', exportSelection.length);
    console.log('Files:', cutFiles.map(f => f.filename));
    console.log('Output folder:', data.outputFolderPath);
    console.log('========================');

    appState.lastExportFolderPath = data.outputFolderPath || '';

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 100) {
        progress += Math.random() * 30;
        if (progress > 100) progress = 100;
        cutProgressFill.style.width = progress + '%';
        cutProgressText.textContent = `Przetwarzanie: ${Math.round(progress)}%`;
      } else {
        clearInterval(progressInterval);
      }
    }, 500);
    // Display results
    resultsList.innerHTML = '';
    // Sort files by index for proper ordering (1, 2, 3, ...)
    const sortedFiles = cutFiles.sort((a, b) => a.index - b.index);
    sortedFiles.forEach((file, visibleIndex) => {
      // Find the correct segment by matching group index
      let duration = 0;
      if (appState.groupedSegments && appState.groupedSegments.length > 0) {
        const group = appState.groupedSegments.find(g => g.groupIndex === file.index);
        if (group && group.segments.length > 0) {
          // Sum all segment durations in this group
          duration = group.segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
        }
      } else if (visibleIndex < appState.selectedSegments.length) {
        const segment = appState.selectedSegments[visibleIndex];
        duration = segment ? (segment.end - segment.start) : 0;
      }
      const durationStr = formatTime(duration);
      const resultEl = document.createElement('div');
      resultEl.className = 'result-item';
      resultEl.dataset.filename = file.filename;
      resultEl.innerHTML = `
        <div class="result-item-info">
          <div class="result-filename">📁 ${file.filename}</div>
          <div class="result-details">
            ⏱️ Długość: ${durationStr} | 📦 Rozmiar: <span class="file-size" data-path="${file.path}">pobieranie...</span>
          </div>
        </div>
        <div class="result-item-actions">
          <a href="${file.path}" download="${file.filename}" class="btn-download">⬇️ Pobierz</a>
        </div>
      `;
      resultsList.appendChild(resultEl);
      // Fetch file size
      fetchFileSize(file.path, resultEl.querySelector('.file-size'));
    });
    // Show "Download All" button if there are files
    if (sortedFiles.length > 0) {
      downloadAllBtn.style.display = 'block';
    }

    // Auto-save to destination folder in Electron mode if a custom destination is configured
    if (window.electron?.ipcRenderer && sortedFiles.length > 0 && appState.destinationFolderPath && appState.destinationFolderPath !== DEFAULT_OUTPUT_PATH) {
      const autoLinks = [];
      resultsList.querySelectorAll('.result-item').forEach((resultEl, index) => {
        const link = resultEl.querySelector('.btn-download');
        if (link && link.href) {
          autoLinks.push({
            url: link.href,
            fileName: link.getAttribute('download') || resultEl.dataset.filename || `fragment_${index + 1}`,
            resultEl
          });
        }
      });
      if (autoLinks.length > 0) {
        saveAllFragmentsToDestination(autoLinks);
      }
    }

    // Keep selection after export so user can fine-tune segments and export again.
    showSuccess(`Eksportowano ${cutFiles.length} fragmentów do osobnego folderu.`);
    updatePersonModelStatsPanel();
    cutProgress.style.display = 'none';
  } catch (err) {
    console.error('Cut video error:', err);
    cutProgress.style.display = 'none';
    if (resultsList.innerHTML.includes('Łączenie fragmentów wideo')) {
      resultsList.innerHTML = '';
    }
    showError('Błąd: ' + err.message);
  } finally {
    appState.isCutting = false;
    cutBtn.disabled = false;
  }
}

function updateSegmentsModalContent() {
  const groups = {};

  // Group segments by groupId
  appState.selectedSegments.forEach(segment => {
    if (!groups[segment.groupId]) {
      groups[segment.groupId] = [];
    }
    groups[segment.groupId].push(segment);
  });

  let html = '';
  const colorMap = {
    1: '#10b981', 2: '#3b82f6', 3: '#fbbf24', 4: '#f97316',
    5: '#ec4899', 6: '#06b6d4', 7: '#a855f7', 8: '#ef4444', 9: '#14b8a6'
  };

  Object.keys(groups).sort((a, b) => a - b).forEach(groupId => {
    const segments = groups[groupId];
    const color = colorMap[groupId] || '#6366f1';
    const bgColor = groupId % 2 === 0 ? color + '15' : color + '10';

    html += `
      <div class="segment-group" style="border-left-color: ${color}; background: ${bgColor};">
        <div class="segment-group-title" style="color: ${color};">
          📁 Grupa ${groupId} (${segments.length} segment${segments.length > 1 ? 'ów' : ''})
        </div>
    `;

    segments.forEach((segment, idx) => {
      const startMin = Math.floor(segment.start / 60);
      const startSec = Math.floor(segment.start % 60);
      const endMin = Math.floor(segment.end / 60);
      const endSec = Math.floor(segment.end % 60);

      html += `
        <div style="padding: 8px; margin: 5px 0; background: white; border-radius: 6px; font-size: 0.9em; border-left: 3px solid ${color};">
          <strong>Segment ${idx + 1}:</strong> ${startMin}:${startSec.toString().padStart(2, '0')} → ${endMin}:${endSec.toString().padStart(2, '0')}
        </div>
      `;
    });

    html += '</div>';
  });

  segmentsList.innerHTML = html || '<p style="text-align: center; color: #999;">Brak zaznaczonych fragmentów</p>';
}

// File Upload Handler
async function handleFileUpload(file) {
  activeQueueItemId = null;
  const cleanupResult = await cleanupBeforeNewUpload();
  if (!cleanupResult.ok) {
    showError(cleanupResult.message || 'Nie udało się wyczyścić poprzednich plików tymczasowych');
    return;
  }

  resetAppStateAndUI();

  const isValidFormat = SUPPORTED_FORMATS.mimeTypes.some(fmt => file.type.includes(fmt)) ||
                        SUPPORTED_FORMATS.extensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isValidFormat) {
    showError('Niewłaściwy format pliku. Obsługiwane: MP4, MKV, TS, HEVC/H265');
    return;
  }

  // Brak limitowania rozmiaru - backend ma limit 100GB

  appState.videoFile = file;
  appState.selectedSegments = [];
  appState.nextGroupId = 1; // Resetuj ID grupy

  uploadProgress.style.display = 'block';
  generateThumbsBtn.disabled = true;

  const formData = new FormData();
  formData.append('video', file);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressFill.style.width = percentComplete + '%';
        progressText.textContent = `Wgrywanie: ${Math.round(percentComplete)}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);

          appState.videoId = response.id;
          appState.videoCacheKey = response.cacheKey || response.id;
          appState.videoDuration = response.duration;
          appState.currentPersonId = extractPersonIdFromVideoName(response.originalName);

          videoName.textContent = response.originalName;
          personName.textContent = appState.currentPersonId || '';
          videoDuration.textContent = formatTime(response.duration);

          previewSection.style.display = 'block';
          generateThumbsBtn.disabled = false;
          uploadProgress.style.display = 'none';

          // Always auto-generate thumbnails after importing a new file.
          autoGenerateThumbnailsAfterImport();

          // Trigger auto-generate event
          document.dispatchEvent(new Event('videoUploaded'));

          showSuccess('Plik wgrany pomyślnie!');
          updatePersonModelStatsPanel();
        } catch (e) {
          console.error('Parse error:', e);
          showError('Błąd parsowania odpowiedzi: ' + e.message);
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          console.error('Server error response:', errorResponse);
          showError('Błąd ' + xhr.status + ': ' + (errorResponse.error || 'Nieznany błąd'));
        } catch (e) {
          console.error('Could not parse error response:', xhr.responseText);
          showError('Błąd przy wgrywaniu pliku (kod ' + xhr.status + ')');
        }
      }
    });

    xhr.addEventListener('error', () => {
      console.error('XHR error event');
      showError('Błąd połączenia - sprawdź czy serwer działa');
      uploadProgress.style.display = 'none';
    });

    xhr.addEventListener('abort', () => {
      console.error('XHR abort event');
      showError('Wgrywanie anulowane');
      uploadProgress.style.display = 'none';
    });

    xhr.open('POST', API.UPLOAD);

    xhr.send(formData);
  } catch (err) {
    console.error('handleFileUpload exception:', err);
    showError('Błąd: ' + err.message);
  }
}

function autoGenerateThumbnailsAfterImport() {
  if (!appState.videoId) {
    return;
  }

  // Keep behavior consistent across every import path.
  generateThumbnails();
}

async function cleanupBeforeNewUpload() {
  try {
    const response = await fetch(API.CLEANUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearCache: false })
    });

    if (!response.ok) {
      let message = 'Nie udało się wyczyścić poprzednich plików tymczasowych';

      try {
        const errorData = await response.json();
        message = errorData?.error || message;
      } catch {
        // Keep fallback message.
      }

      return { ok: false, message };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: 'Błąd czyszczenia: ' + (err?.message || 'nieznany błąd')
    };
  }
}

// Generate Thumbnails
let regenerateThumbnailsTimeout = null;

function regenerateThumbnailsDebounced() {
  if (regenerateThumbnailsTimeout) {
    clearTimeout(regenerateThumbnailsTimeout);
  }
  regenerateThumbnailsTimeout = setTimeout(() => {
    generateThumbnails();
  }, 300);
}

async function generateThumbnails() {
  if (!appState.videoId) return;

  generateThumbsBtn.disabled = true;
  thumbContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Wczytywanie screenów...</p>';

  try {
    const data = await fetchThumbnailsForVideo({
      videoId: appState.videoId,
      videoDuration: appState.videoDuration,
      thumbInterval: appState.thumbInterval,
      videoCacheKey: appState.videoCacheKey || appState.videoId,
      threshold: parseFloat(thresholdSlider?.value || '0.50')
    });

    appState.thumbnails = data.thumbnails;
    appState.nsfwAnalysis = data.nsfw_analysis || {};
    if (data.cache_key) {
      appState.videoCacheKey = data.cache_key;
    }

    console.log('[THUMBS] cache_key=', data.cache_key, 'thumbnails_cached=', Boolean(data.thumbnails_cached), 'analysis_cached=', Boolean(data.analysis_cached), 'count=', Array.isArray(data.thumbnails) ? data.thumbnails.length : 0);

    if (data.thumbnails_cached === true) {
      showSuccess('♻️ Wczytano screeny z cache');
    }

    renderThumbnailsFromState();

    const activeItem = activeQueueItemId !== null
      ? fileQueue.find((item) => item.id === activeQueueItemId)
      : null;
    const savedState = activeItem?.savedState || null;
    const currentThreshold = parseFloat(thresholdSlider?.value || '0.50');
    const savedThreshold = Number(savedState?.nsfwThresholdUsed);
    const canReuseQueueScan = Boolean(
      savedState
      && savedState.nsfwScanDone
      && Array.isArray(savedState.thumbnails)
      && savedState.thumbnails.length > 0
      && Number.isFinite(savedThreshold)
      && Math.abs(savedThreshold - currentThreshold) < 0.0001
      && Number(savedState.thumbInterval) === Number(appState.thumbInterval)
      && String(savedState.videoCacheKey || '') === String(appState.videoCacheKey || appState.videoId || '')
    );

    if (canReuseQueueScan) {
      // Reuse one-time queue scan result; do not scan again on every render/generate.
      appState.selectedSegments = (savedState.selectedSegments || []).map((segment) => ({ ...segment }));
      updateSegmentsList();
    } else if (AUTO_SELECT_NSFW_SEGMENTS && appState.thumbnails.length > 0) {
      console.log('🔍 Triggering NSFW segment detection & auto-selection...');
      await scanNSFWFragments();
      renderThumbnailsFromState();
    }
  } catch (err) {
    console.error('Generate thumbnails error:', err);
    showError('❌ Błąd generowania screenów: ' + err.message);
    thumbContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">❌ Błąd generowania screenów</p>';
    generateThumbsBtn.disabled = false;
  }
}

async function fetchThumbnailsForVideo({ videoId, videoDuration, thumbInterval, videoCacheKey, threshold }) {
  console.log('[THUMBS] request cacheKey=', videoCacheKey, 'interval=', thumbInterval, 'duration=', videoDuration);
  const response = await fetch(API.THUMBNAILS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoPath: API.VIDEO(videoId),
      duration: videoDuration,
      interval: thumbInterval,
      cacheKey: videoCacheKey,
      threshold
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Błąd generowania screenów');
  }

  const data = await response.json();
  console.log('[THUMBS] response cache_key=', data?.cache_key, 'cache_hit=', Boolean(data?.cache_hit), 'cache_reason=', data?.cache_reason || '-', 'thumbnails_cached=', Boolean(data?.thumbnails_cached), 'analysis_cached=', Boolean(data?.analysis_cached), 'count=', Array.isArray(data?.thumbnails) ? data.thumbnails.length : 0);
  if (!data.thumbnails || data.thumbnails.length === 0) {
    throw new Error('Nie udało się wygenerować screenów');
  }

  return data;
}

function renderThumbnailsFromState() {
  const thumbs = Array.isArray(appState.thumbnails) ? appState.thumbnails : [];
  if (thumbs.length === 0) {
    thumbContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Brak screenów do wyświetlenia</p>';
    return;
  }

  generateThumbsBtn.disabled = false;
  thumbContainer.innerHTML = '<div style="padding: 20px; text-align: center;"><div style="background: #e0e0e0; border-radius: 8px; overflow: hidden;"><div id="thumbProgress" style="background: linear-gradient(90deg, #10b981, #06b6d4); height: 8px; width: 0%; transition: width 0.3s ease;"></div></div><p id="thumbProgressText" style="margin-top: 10px; font-size: 14px; color: #666;">Renderowanie: 0%</p></div>';

  const totalThumbs = thumbs.length;
  let renderedCount = 0;

  thumbs.forEach((thumb, index) => {
    const thumbEl = document.createElement('div');
    thumbEl.className = 'thumbnail';
    thumbEl.dataset.index = index;
    thumbEl.dataset.time = thumb.time;

    const nsfwResult = getNsfwAnalysisForTime(thumb.time);
    const isNSFW = nsfwResult && nsfwResult.is_nsfw;

    if (isNSFW) {
      thumbEl.classList.add('nsfw-detected');
      thumbEl.dataset.nsfw = 'true';
    }

    thumbEl.innerHTML = `
      <img src="${thumb.thumbnail}" alt="Screen ${index + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2256%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%2256%22/%3E%3C/svg%3E'">
      ${isNSFW ? `
        <div class="nsfw-badge">Xxx</div>
        <div class="feedback-container" data-time="${thumb.time}" data-index="${index}">
          <button class="feedback-btn feedback-correct" title="Prawidłowy - NSFW">✓</button>
          <button class="feedback-btn feedback-incorrect" title="Błędny - to nie NSFW">✗</button>
        </div>
      ` : ''}
    `;

    const timeLabel = document.createElement('div');
    timeLabel.className = 'thumbnail-time';
    timeLabel.textContent = formatTime(thumb.time);
    thumbEl.appendChild(timeLabel);

    const feedbackContainer = thumbEl.querySelector('.feedback-container');
    if (feedbackContainer) {
      const correctBtn = feedbackContainer.querySelector('.feedback-correct');
      const incorrectBtn = feedbackContainer.querySelector('.feedback-incorrect');

      correctBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submitMLFeedback(thumb.time, true, correctBtn);
      });

      incorrectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submitMLFeedback(thumb.time, false, incorrectBtn);
      });
    }

    thumbEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      appState.dragMoved = false;

      const isAlreadySelected = thumbEl.classList.contains('selected');
      if (isAlreadySelected) {
        appState.isDeselecting = true;
        appState.activeSelectionGroupId = null;
      } else {
        appState.isSelecting = true;
        appState.activeSelectionGroupId = appState.nextGroupId;
        appState.nextGroupId += 1;
      }
      appState.selectStartIndex = index;
    });

    thumbEl.addEventListener('mouseover', () => {
      if (appState.isSelecting && appState.selectStartIndex !== null) {
        if (index !== appState.selectStartIndex) {
          appState.dragMoved = true;
        }
        selectThumbnailRangeAdditive(appState.selectStartIndex, index, appState.activeSelectionGroupId);
      } else if (appState.isDeselecting && appState.selectStartIndex !== null) {
        if (index !== appState.selectStartIndex) {
          appState.dragMoved = true;
        }
        deselectThumbnailRange(appState.selectStartIndex, index);
      }
    });

    thumbEl.addEventListener('click', (e) => {
      if (appState.dragMoved) {
        appState.dragMoved = false;
        return;
      }
      e.preventDefault();
      toggleThumbnailSelection(index);
    });

    thumbContainer.appendChild(thumbEl);

    renderedCount++;
    const progress = (renderedCount / totalThumbs) * 100;
    const progressBar = document.getElementById('thumbProgress');
    const progressText = document.getElementById('thumbProgressText');
    if (progressBar) progressBar.style.width = progress + '%';
    if (progressText) progressText.textContent = `Renderowanie: ${Math.round(progress)}%`;

    if (renderedCount === totalThumbs) {
      setTimeout(() => {
        const progressTextEl = document.getElementById('thumbProgressText');
        if (progressTextEl && progressTextEl.parentElement) {
          progressTextEl.parentElement.style.display = 'none';
        }
      }, 300);
    }
  });

  updateSegmentsList();
}

// Toggle selection of a single thumbnail
function toggleThumbnailSelection(index) {
  const thumbnailEls = document.querySelectorAll('.thumbnail');
  const el = thumbnailEls[index];
  const thumbRange = getThumbnailRangeByIndex(index);

  if (!el || !thumbRange) {
    return;
  }

  const time = thumbRange.start;
  const endTime = thumbRange.end;

  if (el.classList.contains('selected')) {
    // Deselect - podziel segmenty które pokrywają ten thumbnail

    const newSegments = [];

    appState.selectedSegments.forEach(seg => {
      // Sprawdź czy segment się pokrywa z tym thumbnailem
      const overlaps = (seg.start < endTime && seg.end > time);

      if (overlaps) {
        // Segment się pokrywa - podziel go na części przed i po

        // Część PRZED thumbnail
        if (seg.start < time) {
          newSegments.push({
            start: seg.start,
            end: time,
            groupId: seg.groupId
          });
        }

        // Część PO thumbnail
        if (seg.end > endTime) {
          newSegments.push({
            start: endTime,
            end: seg.end,
            groupId: seg.groupId
          });
        }
        // Część która pokrywa thumbnail - NIE DODAJEMY (odzaczenie)
      } else {
        // Segment się nie pokrywa - zachowaj go cały
        newSegments.push(seg);
      }
    });

    appState.selectedSegments = newSegments;
    el.classList.remove('selected');
    el.removeAttribute('data-group');
  } else {
    // Select
    const targetGroupId = appState.nextGroupId;
    el.classList.add('selected');
    el.setAttribute('data-group', targetGroupId);
    const existingIndex = findMatchingSegmentIndexByRange(time, endTime);
    if (existingIndex >= 0) {
      // Convert existing (e.g. auto-NSFW) range into current manual group.
      appState.selectedSegments[existingIndex].groupId = targetGroupId;
    } else {
      appState.selectedSegments.push({ start: time, end: endTime, groupId: targetGroupId });
    }
    appState.nextGroupId++; // Increment for next manual selection group
  }

  appState.selectedSegments.sort((a, b) => a.start - b.start);
  updateSegmentsList();
}

// Select Thumbnail Range - Additive mode (Drag zaznaczanie)
// Dodaje do poprzedniego zaznaczenia bez usuwania
function selectThumbnailRangeAdditive(startIndex, endIndex, groupIdOverride = null) {
  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  const thumbnailEls = document.querySelectorAll('.thumbnail');
  const currentGroupId = Number.isFinite(groupIdOverride)
    ? groupIdOverride
    : appState.nextGroupId;

  // Zaznacz zakres (dodaj visual feedback)
  for (let i = startIndex; i <= endIndex; i++) {
    if (!thumbnailEls[i]?.classList.contains('selected')) {
      thumbnailEls[i]?.classList.add('selected');
    }
    thumbnailEls[i]?.setAttribute('data-group', currentGroupId);
  }

  // Dodaj segmenty dla zakresu (additive - nie usuwaj poprzednich)
  for (let i = startIndex; i <= endIndex; i++) {
    const thumbRange = getThumbnailRangeByIndex(i);
    if (!thumbRange) {
      continue;
    }

    const time = thumbRange.start;
    const endTime = thumbRange.end;

    // If this thumbnail already exists (often as auto-NSFW), move it into manual group.
    const existingIndex = findMatchingSegmentIndexByRange(time, endTime);
    if (existingIndex >= 0) {
      appState.selectedSegments[existingIndex].groupId = currentGroupId;
    } else {
      appState.selectedSegments.push({ start: time, end: endTime, groupId: currentGroupId });
    }
  }

  if (!Number.isFinite(groupIdOverride)) {
    appState.nextGroupId++; // Następne zaznaczenie będzie miało inny ID
  }
  appState.selectedSegments.sort((a, b) => a.start - b.start);
  updateSegmentsList();
}

// Deselect Thumbnail Range (dla drag-deselect)
function deselectThumbnailRange(startIndex, endIndex) {
  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  const thumbnailEls = document.querySelectorAll('.thumbnail');
  const startRange = getThumbnailRangeByIndex(startIndex);
  const endRange = getThumbnailRangeByIndex(endIndex);

  if (!startRange || !endRange) {
    return;
  }

  const rangeStart = startRange.start;
  const rangeEnd = endRange.end;

  // Odznaczy zakresy
  for (let i = startIndex; i <= endIndex; i++) {
    thumbnailEls[i]?.classList.remove('selected');
    thumbnailEls[i]?.removeAttribute('data-group');
  }

  // Podziel segmenty które pokrywają ten zakres
  const newSegments = [];

  appState.selectedSegments.forEach(seg => {
    // Sprawdź czy segment się pokrywa z zakresom
    const overlaps = (seg.start < rangeEnd && seg.end > rangeStart);

    if (overlaps) {
      // Segment się pokrywa - podziel go na części przed i po

      // Część PRZED zakresem
      if (seg.start < rangeStart) {
        newSegments.push({
          start: seg.start,
          end: rangeStart,
          groupId: seg.groupId
        });
      }

      // Część PO zakresie
      if (seg.end > rangeEnd) {
        newSegments.push({
          start: rangeEnd,
          end: seg.end,
          groupId: seg.groupId
        });
      }
      // Część która pokrywa zakres - NIE DODAJEMY (odzaczenie)
    } else {
      // Segment się nie pokrywa - zachowaj go cały
      newSegments.push(seg);
    }
  });

  appState.selectedSegments = newSegments;
  appState.selectedSegments.sort((a, b) => a.start - b.start);
  updateSegmentsList();
}

// Clear Selection
function clearSelection() {
  appState.selectedSegments = [];
  appState.groupedSegments = [];
  appState.nextGroupId = 1;
  selectAllCheck.checked = false;
  updateSegmentsList();
}

function toggleSelectAll(shouldSelect) {
  const thumbnailEls = document.querySelectorAll('.thumbnail');

  if (!shouldSelect || thumbnailEls.length === 0) {
    clearSelection();
    return;
  }

  appState.selectedSegments = [];
  const currentGroupId = appState.nextGroupId;

  thumbnailEls.forEach((thumbnailEl, index) => {
    const thumbRange = getThumbnailRangeByIndex(index);
    if (!thumbRange) {
      return;
    }

    thumbnailEl.classList.add('selected');
    thumbnailEl.setAttribute('data-group', currentGroupId);

    const time = thumbRange.start;
    const endTime = thumbRange.end;
    appState.selectedSegments.push({ start: time, end: endTime, groupId: currentGroupId });
  });

  appState.nextGroupId++;
  appState.selectedSegments.sort((a, b) => a.start - b.start);
  updateSegmentsList();
}

function updateSegmentsList() {
  // Update counter
  const segmentsCount = document.getElementById('segmentsCount');
  segmentsCount.textContent = appState.selectedSegments.length;

  // Show/hide cut section based on selection
  const hasVisibleResults = resultsList.children.length > 0;
  if (appState.selectedSegments.length > 0 || hasVisibleResults) {
    cutSection.style.display = 'block';
  } else {
    cutSection.style.display = 'none';
  }

  // Update modal content if modal is open
  if (segmentsModal.classList.contains('active')) {
    updateSegmentsModalContent();
  }

  // Update thumbnails
  const thumbnailEls = document.querySelectorAll('.thumbnail');
  thumbnailEls.forEach(el => {
    el.classList.remove('selected');
    el.removeAttribute('data-group');
  });

  appState.selectedSegments.forEach(segment => {
    thumbnailEls.forEach((thumbnailEl, index) => {
      const thumbRange = getThumbnailRangeByIndex(index);
      if (!thumbRange) {
        return;
      }

      if (segmentOverlaps(segment, thumbRange.start, thumbRange.end)) {
        thumbnailEl.classList.add('selected');
        if (segment.groupId) {
          thumbnailEl.setAttribute('data-group', segment.groupId % 10);
        }
      }
    });
  });

  const allSelected = thumbnailEls.length > 0 && Array.from(thumbnailEls).every(el => el.classList.contains('selected'));
  selectAllCheck.checked = allSelected;

  if (activeQueueItemId !== null) {
    const activeItem = fileQueue.find((item) => item.id === activeQueueItemId);
    if (activeItem && activeItem.savedState) {
      activeItem.savedState.selectedSegments = (appState.selectedSegments || []).map((segment) => ({ ...segment }));
    }
  }

  renderProfilePreviewSelector(appState.profilesSummary?.profiles || []);
}

// Download All Fragments - one by one with progress bar for each file
function downloadAllFragments() {
  // Get all download links from results
  const downloadLinks = [];
  const results = resultsList.querySelectorAll('.result-item');

  results.forEach((resultEl, index) => {
    const link = resultEl.querySelector('.btn-download');
    if (link && link.href) {
      downloadLinks.push({
        url: link.href,
        fileName: link.getAttribute('download') || resultEl.dataset.filename || `fragment_${index + 1}`,
        resultEl: resultEl
      });
    }
  });

  if (downloadLinks.length === 0) {
    showError('Brak fragmentów do pobrania');
    return;
  }

  if (window.electron?.ipcRenderer) {
    saveAllFragmentsToDestination(downloadLinks);
    return;
  }

  downloadAllFragmentsInBrowser(downloadLinks);
}

function downloadAllFragmentsInBrowser(downloadLinks) {
  if (!Array.isArray(downloadLinks) || downloadLinks.length === 0) {
    showError('Brak fragmentów do pobrania');
    return;
  }

  downloadProgress.style.display = 'block';
  downloadProgressFill.style.width = '0%';
  downloadProgressText.textContent = `Pobieranie: 0/${downloadLinks.length}`;
  showSuccess(`📥 Rozpoczęto pobieranie ${downloadLinks.length} fragmentów...`);

  // Download files one by one with progress tracking
  let downloadIndex = 0;

  function downloadNext() {
    if (downloadIndex >= downloadLinks.length) {
      downloadProgressFill.style.width = '100%';
      downloadProgressText.textContent = `Pobrano: ${downloadLinks.length}/${downloadLinks.length}`;
      showSuccess(`✅ Pobrano wszystkie ${downloadLinks.length} fragmenty!`);

      // Mark as downloaded and show delete button
      appState.filesDownloaded = true;
      deleteSourceBtn?.style && (deleteSourceBtn.style.display = 'block');
      markActiveQueueItemSavedToDisk();

      setTimeout(() => {
        downloadProgress.style.display = 'none';
      }, 2000);
      return;
    }

    const { url, fileName, resultEl } = downloadLinks[downloadIndex];

    // Update progress bar
    const progress = ((downloadIndex + 1) / downloadLinks.length) * 100;
    downloadProgressFill.style.width = progress + '%';
    downloadProgressText.textContent = `Pobieranie: ${downloadIndex + 1}/${downloadLinks.length} - ${fileName}`;

    // Update visual feedback on result item
    const resultStatus = resultEl.querySelector('.result-status') || document.createElement('div');
    resultStatus.className = 'result-status';
    resultStatus.textContent = '⬇️ Pobieranie...';
    resultStatus.style.color = '#ff9800';
    if (!resultEl.querySelector('.result-status')) {
      resultEl.appendChild(resultStatus);
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update status after click
    setTimeout(() => {
      resultStatus.textContent = '✅ Pobrane';
      resultStatus.style.color = 'green';
    }, 100);

    downloadIndex++;

    // Download next file after 1 second (stagger downloads)
    setTimeout(downloadNext, 1000);
  }

  downloadNext();
}

async function saveAllFragmentsToDestination(downloadLinks, overwrite = false, conflictStrategy = null) {
  const destinationFolderPath = appState.destinationFolderPath;

  if (!destinationFolderPath) {
    showError('Ustaw folder docelowy w Ustawieniach przed zapisaniem plików');
    return;
  }

  downloadProgress.style.display = 'block';
  downloadProgressFill.style.width = '0%';
  downloadProgressText.textContent = `Zapisywanie: 0/${downloadLinks.length}`;

  try {
    const response = await fetch(API.SAVE_ALL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: downloadLinks.map((link, index) => ({
          path: link.url,
          filename: link.fileName || `fragment_${index + 1}`
        })),
        destinationFolderPath,
        overwrite,
        conflictStrategy
      })
    });

    if (response.status === 409) {
      let conflictData = null;
      try {
        conflictData = await response.json();
      } catch {
        conflictData = null;
      }

      const conflicts = Array.isArray(conflictData?.conflicts) ? conflictData.conflicts : [];
      const sampleNames = conflicts.slice(0, 5).map((item) => item.filename).filter(Boolean);
      const messageLines = [
        `W folderze docelowym istnieje już ${conflicts.length || 'co najmniej 1'} plik o tej samej nazwie.`,
        sampleNames.length > 0 ? `Przykłady: ${sampleNames.join(', ')}` : '',
        '',
        'Czy chcesz zastąpić istniejące pliki?'
      ].filter(Boolean);

      // Create custom dialog (window.prompt() doesn't work in Electron)
      const dialogHtml = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
          <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <p style="margin: 0 0 16px 0; font-weight: bold; font-size: 16px;">Konflikt plików</p>
            ${messageLines.map(line => `<p style="margin: 0 0 8px 0; font-size: 14px;">${line}</p>`).join('')}
            <div style="margin-top: 20px; display: flex; gap: 8px;">
              <button id="conflict-overwrite" class="btn btn-primary" style="flex: 1;">Zastąp (1)</button>
              <button id="conflict-skip" class="btn btn-secondary" style="flex: 1;">Pomiń (2)</button>
              <button id="conflict-cancel" class="btn btn-danger" style="flex: 1;">Anuluj (3)</button>
            </div>
          </div>
        </div>
      `;

      const dialogEl = document.createElement('div');
      dialogEl.innerHTML = dialogHtml;
      document.body.appendChild(dialogEl);

      let dialogResult = null;
      const dialogPromise = new Promise(resolve => {
        dialogEl.querySelector('#conflict-overwrite').addEventListener('click', () => {
          dialogResult = '1';
          dialogEl.remove();
          resolve('1');
        });
        dialogEl.querySelector('#conflict-skip').addEventListener('click', () => {
          dialogResult = '2';
          dialogEl.remove();
          resolve('2');
        });
        dialogEl.querySelector('#conflict-cancel').addEventListener('click', () => {
          dialogEl.remove();
          resolve('3');
        });
      });

      const action = await dialogPromise;
      if (action === '1') {
        return saveAllFragmentsToDestination(downloadLinks, true, 'overwrite');
      }

      if (action === '2') {
        return saveAllFragmentsToDestination(downloadLinks, false, 'skip');
      }

      downloadProgress.style.display = 'none';
      showSuccess('Zapis anulowany - istniejące pliki nie zostały nadpisane.');
      return;
    }

    if (!response.ok) {
      let message = 'Nie udało się zapisać plików do folderu docelowego';
      try {
        const errorData = await response.json();
        message = errorData?.error || message;
      } catch {
        // Keep fallback message.
      }
      throw new Error(message);
    }

    const data = await response.json();
    const savedCount = Number(data?.count || downloadLinks.length);

    downloadProgressFill.style.width = '100%';
    downloadProgressText.textContent = `Zapisano: ${savedCount}/${downloadLinks.length}`;

    downloadLinks.forEach(({ resultEl }) => {
      const resultStatus = resultEl.querySelector('.result-status') || document.createElement('div');
      resultStatus.className = 'result-status';
      resultStatus.textContent = '✅ Zapisano do folderu docelowego';
      resultStatus.style.color = 'green';
      if (!resultEl.querySelector('.result-status')) {
        resultEl.appendChild(resultStatus);
      }
    });

    appState.filesDownloaded = true;
    appState.lastExportFolderPath = destinationFolderPath;
    deleteSourceBtn?.style && (deleteSourceBtn.style.display = 'block');
    markActiveQueueItemSavedToDisk();
    showSuccess(`✅ Zapisano ${savedCount} fragmentów do: ${destinationFolderPath}`);

    setTimeout(() => {
      downloadProgress.style.display = 'none';
    }, 2000);
  } catch (err) {
    console.error('Save all fragments error:', err);
    downloadProgress.style.display = 'none';
    showError('Błąd zapisu: ' + err.message);
  }
}

// Prompt and delete source file with confirmation
async function promptAndDeleteSourceFile() {
  if (!appState.videoId) {
    showError('Nie można usunąć pliku źródłowego - brak ID wideo');
    return;
  }

  // Show confirmation dialog
  const shouldDelete = confirm(
    '🗑️ Czy na pewno chcesz usunąć plik źródłowy?\n\nPliku nie będzie można odzyskać.'
  );

  if (!shouldDelete) {
    return;
  }

  await deleteSourceFile();
}

// Delete Source File
async function deleteSourceFile() {
  if (!appState.videoId) {
    showError('Nie można usunąć pliku źródłowego - brak ID wideo');
    return;
  }

  // Disable button and show loading state
  if (!deleteSourceBtn) {
    showError('Przycisk usuwania nie jest dostępny w tym widoku.');
    return;
  }

  deleteSourceBtn.disabled = true;
  const originalText = deleteSourceBtn.textContent;
  deleteSourceBtn.textContent = '⏳ Usuwanie...';

  try {
    const response = await fetch(API.DELETE_SOURCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: appState.videoId
      })
    });

    if (response.ok) {
      showSuccess('✅ Plik źródłowy przeniesiono do Kosza');
      deleteSourceBtn.textContent = '✅ W koszu';
      deleteSourceBtn.style.background = '#10b981';
      appState.videoFile = null;
      appState.videoId = null;
    } else {
      const error = await response.json();
      showError('Błąd usuwania: ' + (error.error || 'Nieznany błąd'));
      deleteSourceBtn.textContent = originalText;
      deleteSourceBtn.disabled = false;
    }
  } catch (err) {
    console.error('Delete source error:', err);
    showError('Błąd: ' + err.message);
    deleteSourceBtn.textContent = originalText;
    deleteSourceBtn.disabled = false;
  }
}

// Open Output Folder
function openOutputFolder() {
  const hasCustomDestination = Boolean(
    appState.destinationFolderPath
    && appState.destinationFolderPath !== DEFAULT_OUTPUT_PATH
  );

  // If files were already saved to destination folder, open that folder first.
  const targetPath = (appState.filesDownloaded && hasCustomDestination)
    ? appState.destinationFolderPath
    : (appState.lastExportFolderPath || appState.destinationFolderPath || DEFAULT_OUTPUT_PATH);

  if (!window.electron?.ipcRenderer) {
    alert(`Pliki wycięte znajdują się w folderze: ${targetPath}`);
    return;
  }

  window.electron.ipcRenderer.invoke('open-path', targetPath)
    .then((errorMessage) => {
      if (errorMessage) {
        showError('Nie udało się otworzyć folderu: ' + errorMessage);
      }
    })
    .catch((err) => {
      showError('Nie udało się otworzyć folderu: ' + err.message);
    });
}

// ==================== NSFW AUTO-SCAN ENDPOINT ====================
// Automatic NSFW scan - called after video upload to detect NSFW segments
function getFragmentLabel(count) {
  const abs = Math.abs(Number(count) || 0);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (abs === 1) {
    return 'fragment';
  }

  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return 'fragmenty';
  }

  return 'fragmentów';
}

async function scanNSFWFragments() {
  if (!appState.videoId || !appState.videoDuration) {
    console.log('[NSFW Scan] Video not ready, skipping scan');
    return;
  }

  console.log('[NSFW Scan] Starting automatic scan for NSFW content');
  console.log('[NSFW Scan] appState.videoId:', appState.videoId);
  console.log('[NSFW Scan] appState.videoDuration:', appState.videoDuration);
  console.log('[NSFW Scan] appState.thumbnails:', appState.thumbnails?.length || 0);

  let progressPoller = null;
  const stopProgressPolling = () => {
    if (progressPoller) {
      clearInterval(progressPoller);
      progressPoller = null;
    }
  };
  
  try {
    // Remove previous scan status panel to avoid stale/duplicated UI.
    document.getElementById('nsfwScanStatus')?.remove();

    // Create progress indicator
    const scanContainer = document.createElement('div');
    scanContainer.className = 'nsfw-scan-status';
    scanContainer.id = 'nsfwScanStatus';
    scanContainer.style.cssText = `
      padding: 15px;
      margin: 10px 0;
      background: #f0f4ff;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      color: #1e3a8a;
    `;
    scanContainer.innerHTML = `
      <div style="font-size: 16px; margin-bottom: 10px;">🔍 Skanowanie treści NSFW...</div>
      <div style="background: #e0e7ff; border-radius: 4px; overflow: hidden;">
        <div id="scanProgressBar" style="background: linear-gradient(90deg, #3b82f6, #06b6d4); height: 6px; width: 0%; transition: width 0.3s ease;"></div>
      </div>
      <div id="scanProgressText" style="margin-top: 8px; font-size: 13px; color: #3b82f6;"></div>
    `;
    
    const thumbContainer = document.getElementById('thumbContainer');
    if (thumbContainer && thumbContainer.parentElement) {
      thumbContainer.parentElement.insertBefore(scanContainer, thumbContainer.nextSibling);
    }

    const thumbnailTimes = (appState.thumbnails || []).map(t => t.time);
    if (thumbnailTimes.length === 0) {
      console.log('[NSFW Scan] No thumbnails available, skipping scan');
      return;
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const progressBar = document.getElementById('scanProgressBar');
    const progressText = document.getElementById('scanProgressText');

    console.log('[NSFW Scan] scanId:', scanId);
    console.log('[NSFW Scan] videoPath:', API.VIDEO(appState.videoId));
    console.log('[NSFW Scan] thumbnailTimes:', thumbnailTimes);

    progressPoller = setInterval(async () => {
      try {
        const progressResponse = await fetch(`/api/scan-nsfw-progress/${encodeURIComponent(scanId)}`);
        if (!progressResponse.ok) {
          return;
        }

        const progressData = await progressResponse.json();
        const percent = Math.max(0, Math.min(100, Number(progressData.progress || 0)));
        const analyzed = Number(progressData.analyzed || 0);
        const total = Number(progressData.total || thumbnailTimes.length);
        const stageLabel = progressData.stageLabel || 'Skanowanie';

        if (progressBar) {
          progressBar.style.width = `${percent}%`;
        }

        if (progressText) {
          progressText.textContent = `${stageLabel}: ${percent}% (${analyzed}/${total})`;
        }

        if (progressData.status === 'completed' || progressData.status === 'error') {
          stopProgressPolling();
        }
      } catch {
        // Ignore temporary polling errors to keep scan flow resilient.
      }
    }, 300);

    const fetchPromise = fetch('/api/scan-nsfw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId,
        videoPath: API.VIDEO(appState.videoId),
        cacheKey: appState.videoCacheKey,
        duration: appState.videoDuration,
        thumbnailTimes,
        threshold: parseFloat(thresholdSlider?.value || '0.50')
      })
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scan timeout (120s)')), 120000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise])
      .catch(err => {
        console.error('[NSFW Scan] Request error:', err.message);
        throw err;
      });

    const scanStatus = document.getElementById('nsfwScanStatus');
    stopProgressPolling();

    if (progressBar) {
      progressBar.style.width = '100%';
    }
    if (progressText) {
      progressText.textContent = `Zakonczono: 100% (${thumbnailTimes.length}/${thumbnailTimes.length})`;
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('[NSFW Scan] API returned error:', errorData);
      
      if (scanStatus) {
        scanStatus.style.background = '#fef2f2';
        scanStatus.style.borderColor = '#ef4444';
        scanStatus.style.color = '#7f1d1d';
        scanStatus.innerHTML = `
          <div>⚠️ Nie udało się skanować NSFW (tryb awaryjny)</div>
          <div style="font-size: 12px; margin-top: 5px;">${errorData.error || 'Błąd serwera'}</div>
        `;
      }
      return;
    }

    const data = await response.json();
    if (data.nsfw_analysis && typeof data.nsfw_analysis === 'object') {
      appState.nsfwAnalysis = data.nsfw_analysis;
      updateThumbnailNsfwVisuals();
    }

    const { nsfwSegments, segmentCount, framesAnalyzed } = data;
    const thresholdUsed = Number.isFinite(Number(data.threshold_used))
      ? Number(data.threshold_used).toFixed(2)
      : null;

    // Replace previous auto-NSFW selection on each scan (no accumulation).
    // Keep manual selections untouched.
    appState.selectedSegments = (appState.selectedSegments || [])
      .filter((segment) => segment.groupId !== NSFW_GROUP_ID);

    console.log(`[NSFW Scan] Results: ${segmentCount} NSFW segments detected in ${framesAnalyzed} screenów analyzed`);

    if (segmentCount === 0) {
      if (scanStatus) {
        scanStatus.style.background = '#f0fdf4';
        scanStatus.style.borderColor = '#22c55e';
        scanStatus.style.color = '#166534';
        scanStatus.innerHTML = `
          <div>✅ Skanowanie zakończone</div>
          <div style="font-size: 13px; margin-top: 5px;">Nie znaleziono fragmentów NSFW (przeskanowano ${framesAnalyzed} screenów)</div>
          ${thresholdUsed ? `<div style="font-size: 12px; margin-top: 5px;">Próg użyty w tym skanie: ${thresholdUsed}</div>` : ''}
        `;
      }
      return;
    }

    // Found NSFW segments - add them to selection
    console.log('[NSFW Scan] Adding detected NSFW segments to selection...');
    
    nsfwSegments.forEach((segment, idx) => {
      appState.selectedSegments.push({
        start: segment.start,
        end: segment.end,
        groupId: NSFW_GROUP_ID,
        confidence: segment.confidence,
        frameCount: segment.frameCount
      });
      console.log(`[NSFW Scan] Segment ${idx + 1}: ${segment.start}s - ${segment.end}s (confidence: ${(segment.confidence * 100).toFixed(1)}%)`);
    });

    appState.selectedSegments.sort((a, b) => a.start - b.start);
    updateSegmentsList();

    // Update status
    if (scanStatus) {
      scanStatus.style.background = '#f0fdf4';
      scanStatus.style.borderColor = '#22c55e';
      scanStatus.style.color = '#166534';
      const fragmentLabel = getFragmentLabel(segmentCount);
      scanStatus.innerHTML = `
        <div>✅ Skanowanie zakończone</div>
        <div style="font-size: 13px; margin-top: 5px;">Znaleziono ${segmentCount} ${fragmentLabel} NSFW (przeskanowano ${framesAnalyzed} screenów)</div>
        ${thresholdUsed ? `<div style="font-size: 12px; margin-top: 5px;">Próg użyty w tym skanie: ${thresholdUsed}</div>` : ''}
        <div style="font-size: 12px; margin-top: 5px;">Fragmenty zostały automatycznie zaznaczone - możesz je przejrzeć i wyeksportować</div>
      `;
    }

    showSuccess(`✅ Skanowanie NSFW zakończone: znaleziono ${segmentCount} ${getFragmentLabel(segmentCount)}`);

  } catch (err) {
    stopProgressPolling();
    console.error('[NSFW Scan] Error:', err);
    const scanStatus = document.getElementById('nsfwScanStatus');
    if (scanStatus) {
      scanStatus.style.background = '#fef2f2';
      scanStatus.style.borderColor = '#ef4444';
      scanStatus.style.color = '#7f1d1d';
      scanStatus.innerHTML = `
        <div>❌ Błąd skanowania NSFW</div>
        <div style="font-size: 12px; margin-top: 5px;">${err.message}</div>
      `;
    }
    showError('Błąd skanowania NSFW: ' + err.message);
  }
}

// ML Feedback Handler
async function submitMLFeedback(frameTime, userCorrection, buttonEl) {
  try {
    // Disable button during submission
    buttonEl.disabled = true;
    buttonEl.style.opacity = '0.5';
    const originalText = buttonEl.textContent;
    buttonEl.textContent = '⏳';

    // Get the prediction from NSFW analysis
    const nsfwResult = getNsfwAnalysisForTime(frameTime);
    if (!nsfwResult) {
      showError('Błąd: nie znaleziono wyniku NSFW dla tego frame');
      buttonEl.disabled = false;
      buttonEl.style.opacity = '1';
      buttonEl.textContent = originalText;
      return;
    }

    // Send feedback to ML backend
    const response = await fetch(API.ML_FEEDBACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frame_time: frameTime,
        model_predicted: nsfwResult.is_nsfw,
        user_corrected: userCorrection,
        confidence: nsfwResult.confidence,
        video_name: appState.videoFile ? appState.videoFile.name : 'unknown'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd wysyłania feedbacku');
    }

    const data = await response.json();

    // Update button state
    buttonEl.textContent = '✅';
    buttonEl.style.color = '#10b981';
    buttonEl.style.opacity = '1';

    // Show retraining status if triggered
    if (data.retrain_triggered) {
      showSuccess(`✅ Feedback wysłany! 🔄 Retrain triggered (${data.feedback_count}/5 feedbacks)`);
      if (data.retrain_progress) {
        showInfo(`Retrain w toku: ${data.retrain_progress}`);
      }
    } else {
      const feedbacksNeeded = 5 - (data.feedback_count || 0);
      showSuccess(`✅ Feedback wysłany! (${data.feedback_count || 0}/5 - ${feedbacksNeeded} do retrain'u)`);
    }

    // Reset button after 2 seconds
    setTimeout(() => {
      buttonEl.textContent = originalText;
      buttonEl.style.color = '';
      buttonEl.style.opacity = '1';
      buttonEl.disabled = false;
    }, 2000);

  } catch (err) {
    console.error('Feedback submission error:', err);
    showError('❌ Błąd wysyłania feedbacku: ' + err.message);
    buttonEl.disabled = false;
    buttonEl.style.opacity = '1';
    buttonEl.textContent = '✗';
  }
}

// Utility Functions
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }
}

// Format file size intelligently (B, KB, MB, GB)
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || bytes < 0) return '...';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Fetch file size from backend
async function fetchFileSize(filePath, element) {
  try {
    if (!filePath) {
      if (element) element.textContent = 'N/A';
      return;
    }

    if (!element) {
      return;
    }

    const response = await fetch(API.FILE_SIZE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    });

    if (response.ok) {
      const data = await response.json();
      element.textContent = formatFileSize(data.size);
    } else {
      const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
      element.textContent = 'N/A';
    }
  } catch (err) {
    console.error('Error fetching file size:', err);
    if (element) element.textContent = 'N/A';
  }
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error';
  errorEl.textContent = message;
  document.querySelector('main').insertBefore(errorEl, document.querySelector('main').firstChild);
  setTimeout(() => errorEl.remove(), 5000);
}

function showSuccess(message) {
  const successEl = document.createElement('div');
  successEl.className = 'success';
  successEl.textContent = message;
  document.querySelector('main').insertBefore(successEl, document.querySelector('main').firstChild);
  setTimeout(() => successEl.remove(), 5000);
}

function extractPersonIdFromVideoName(videoName) {
  const withoutExt = String(videoName || '').replace(/\.[^.]+$/, '');
  const normalized = withoutExt
    .replace(/^video_\d+_/, '')
    .toLowerCase()
    .trim();

  if (!normalized) {
    return null;
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

    if (!hasLetter || /^\d+p$/.test(token)) {
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
  return fallback ? fallback[1] : null;
}

function ensurePersonModelStatsPanel() {
  let panel = document.getElementById(personModelStatsPanelId);
  if (panel) {
    return panel;
  }

  panel = document.createElement('div');
  panel.id = personModelStatsPanelId;
  panel.className = 'nsfw-scan-status';
  panel.style.cssText = `
    padding: 12px;
    margin: 10px 0;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    color: #1f2937;
    font-size: 13px;
  `;

  const targetSection = cutSection || previewSection;
  if (targetSection && targetSection.parentElement) {
    targetSection.parentElement.insertBefore(panel, targetSection);
  }

  return panel;
}

function renderPersonQualityMiniChart(precision, recall) {
  const precisionPct = Math.max(0, Math.min(100, Number(precision) || 0));
  const recallPct = Math.max(0, Math.min(100, Number(recall) || 0));

  return `
    <div class="person-quality-chart" aria-label="Wykres jakości profilu osoby">
      <div class="person-quality-row">
        <span class="person-quality-label">Precision</span>
        <div class="person-quality-track">
          <div class="person-quality-fill precision" style="width:${precisionPct.toFixed(1)}%"></div>
        </div>
        <span class="person-quality-value">${precisionPct.toFixed(1)}%</span>
      </div>
      <div class="person-quality-row">
        <span class="person-quality-label">Recall</span>
        <div class="person-quality-track">
          <div class="person-quality-fill recall" style="width:${recallPct.toFixed(1)}%"></div>
        </div>
        <span class="person-quality-value">${recallPct.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

function renderNsfwDiagnosticsPanel() {
  const analysis = appState.nsfwAnalysis || {};
  const thumbnailTimes = Array.isArray(appState.thumbnails)
    ? appState.thumbnails.map((thumb) => String(thumb.time))
    : [];

  const analysisEntries = (thumbnailTimes.length > 0
    ? thumbnailTimes.map((time) => analysis[time] ?? analysis[Number(time)])
    : Object.values(analysis)
  ).filter((entry) => entry && typeof entry === 'object');

  if (analysisEntries.length === 0) {
    return `
      <details class="person-diagnostics" id="personDiagnosticsPanel">
        <summary>Diagnostyka NSFW</summary>
        <div class="person-diagnostics-body">Brak danych diagnostycznych. Wygeneruj screeny i uruchom skan NSFW.</div>
      </details>
    `;
  }

  const total = analysisEntries.length;
  const nsfwCount = analysisEntries.filter((entry) => Boolean(entry.is_nsfw)).length;
  const safeCount = total - nsfwCount;
  const nsfwRate = total > 0 ? (nsfwCount / total) * 100 : 0;

  const confidences = analysisEntries
    .map((entry) => Number(entry.confidence))
    .filter((value) => Number.isFinite(value));

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0;
  const maxConfidence = confidences.length > 0 ? Math.max(...confidences) : 0;
  const minConfidence = confidences.length > 0 ? Math.min(...confidences) : 0;
  const saturatedConfidence = confidences.filter((value) => value >= 0.999 || value <= 0.001).length;
  const saturatedRatio = confidences.length > 0
    ? (saturatedConfidence / confidences.length) * 100
    : 0;
  const showSaturationWarning = saturatedRatio >= 60;

  const methodCounts = new Map();
  for (const entry of analysisEntries) {
    const method = String(entry.method || 'unknown');
    methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
  }

  const methodRows = [...methodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([method, count]) => `<div><strong>${method}</strong>: ${count}</div>`)
    .join('');

  const thresholdNow = Number.isFinite(Number(thresholdSlider?.value))
    ? Number(thresholdSlider.value).toFixed(2)
    : 'n/a';

  return `
    <details class="person-diagnostics" id="personDiagnosticsPanel">
      <summary>Diagnostyka NSFW</summary>
      <div class="person-diagnostics-body">
        <div><strong>Aktualny próg UI:</strong> ${thresholdNow}</div>
        <div><strong>Klatki analizowane:</strong> ${total}</div>
        <div><strong>Wynik:</strong> NSFW ${nsfwCount} (${nsfwRate.toFixed(1)}%) | SFW ${safeCount}</div>
        <div><strong>Confidence:</strong> avg ${(avgConfidence * 100).toFixed(1)}% | min ${(minConfidence * 100).toFixed(1)}% | max ${(maxConfidence * 100).toFixed(1)}%</div>
        <div><strong>Nasycone confidence (0.0/1.0):</strong> ${saturatedConfidence}/${confidences.length}</div>
        ${showSaturationWarning ? `<div class="person-diagnostics-warning">⚠️ Ostrzeżenie: ${saturatedRatio.toFixed(1)}% predykcji ma nasycone confidence (0.0/1.0). To zwykle oznacza uszkodzony lub źle skalibrowany checkpoint modelu.</div>` : ''}
        <div class="person-diagnostics-methods">
          <strong>Metody (top):</strong>
          ${methodRows || '<div>brak</div>'}
        </div>
      </div>
    </details>
  `;
}

async function updatePersonModelStatsPanel() {
  const panel = ensurePersonModelStatsPanel();
  const personId = appState.currentPersonId || extractPersonIdFromVideoName(appState.videoFile?.name || '');

  const renderPersonPanel = (detailsHtml) => {
    panel.innerHTML = `
      <div class="person-panel-header-row">
        <div><strong>Profil osoby:</strong> ${personId}</div>
        <button type="button" class="btn btn-secondary btn-person-toggle" id="personPanelToggleBtn" aria-expanded="${personPanelExpanded ? 'true' : 'false'}">
          ${personPanelExpanded ? 'Zwiń' : 'Pokaż więcej'}
        </button>
      </div>
      <div class="person-panel-details ${personPanelExpanded ? '' : 'collapsed'}" id="personPanelDetails">
        ${detailsHtml}
      </div>
    `;

    const toggleBtn = panel.querySelector('#personPanelToggleBtn');
    const detailsEl = panel.querySelector('#personPanelDetails');
    toggleBtn?.addEventListener('click', () => {
      personPanelExpanded = !personPanelExpanded;
      toggleBtn.textContent = personPanelExpanded ? 'Zwiń' : 'Pokaż więcej';
      toggleBtn.setAttribute('aria-expanded', personPanelExpanded ? 'true' : 'false');
      detailsEl?.classList.toggle('collapsed', !personPanelExpanded);
    });
  };

  if (!personId) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  renderPersonPanel(`
    <div><strong>Status:</strong> Rozpoznano nazwę profilu z pliku wideo</div>
    <div>Ładowanie statystyk lokalnego modelu i statusu akceleracji...</div>
  `);

  try {
    const [response, runtimeResponse] = await Promise.all([
      fetch(API.ML_PERSON_PROFILE(personId)),
      fetch(API.ML_RUNTIME_STATUS).catch(() => null)
    ]);

    let runtimeData = null;
    if (runtimeResponse && runtimeResponse.ok) {
      runtimeData = await runtimeResponse.json();
    }

    const runtimeLine = (() => {
      if (!runtimeData || !runtimeData.available) {
        return '<div><strong>Akceleracja:</strong> Backend ML offline</div>';
      }



      const cpuDevice = runtimeData.active_device ? ` (${runtimeData.active_device})` : '';
      return `<div><strong>Akceleracja:</strong> CPU${cpuDevice}</div>`;
    })();

    if (!response.ok) {
      renderPersonPanel(`
        <div><strong>Status:</strong> Rozpoznano nazwę profilu z pliku wideo</div>
        ${runtimeLine}
        <div>Nie udało się pobrać statystyk</div>
      `);
      return;
    }

    const data = await response.json();
    const metrics = data.metrics || {};
    const precision = Number(metrics.precision || 0) * 100;
    const recall = Number(metrics.recall || 0) * 100;
    const positives = Number(metrics.positives || 0);
    const negatives = Number(metrics.negatives || 0);
    const support = Number(metrics.support || 0);
    const minPositive = Number(data.minPositive || 40);
    const minNegative = Number(data.minNegative || 80);
    const positiveProgress = Math.min(100, (positives / Math.max(1, minPositive)) * 100);
    const negativeProgress = Math.min(100, (negatives / Math.max(1, minNegative)) * 100);
    const retentionDays = Number(data.retentionDays || 60);
    const qualityChart = renderPersonQualityMiniChart(precision, recall);
    const diagnosticsPanel = renderNsfwDiagnosticsPanel();
    const profileStatus = data.exists
      ? (data.active ? 'Istniejący profil osoby aktywny' : 'Istniejący profil osoby, uczenie w toku')
      : 'Nowy profil osoby, zostanie utworzony przy eksporcie';

    renderPersonPanel(`
      <div><strong>Status:</strong> ${profileStatus}</div>
      <div><strong>Tryb modelu:</strong> ${data.active ? 'Profil osoby aktywny' : 'Model globalny (uczenie w toku)'}</div>
      ${runtimeLine}
      <div><strong>Próg detekcji:</strong> ${Number(data.threshold || 0.75).toFixed(2)} ${data.active ? '(profil osoby)' : '(globalny)'}</div>
      <div><strong>Próbki:</strong> ${support} (NSFW: ${positives}, SFW: ${negatives})</div>
      ${qualityChart}
      <div><strong>Aktywacja profilu:</strong> min ${minPositive} NSFW i ${minNegative} SFW</div>
      <div class="person-progress-mini">Postęp: NSFW ${positiveProgress.toFixed(0)}% | SFW ${negativeProgress.toFixed(0)}%</div>
      <div class="person-retention-mini">Retencja lokalna próbek: ${retentionDays} dni</div>
      ${diagnosticsPanel}
    `);
  } catch (err) {
    renderPersonPanel(`
      <div><strong>Status:</strong> Rozpoznano nazwę profilu z pliku wideo</div>
      <div>Błąd pobierania statystyk: ${err.message}</div>
    `);
  }
}

// Resetuje stan i UI przy nowym pliku
function resetAppStateAndUI() {
  // Resetuj stan (poza folderami i historią)
  appState.videoFile = null;
  appState.videoId = null;
  appState.videoCacheKey = null;
  appState.videoDuration = 0;
  appState.thumbnails = [];
  appState.selectedSegments = [];
  appState.groupedSegments = [];
  appState.thumbInterval = 25;
  appState.isSelecting = false;
  appState.isDeselecting = false;
  appState.selectStartIndex = null;
  appState.isMultiSelect = false;
  appState.nextGroupId = 1;
  appState.nsfwAnalysis = {};
  appState.isCutting = false;
  appState.filesDownloaded = false;
  appState.lastExportFolderPath = '';
  appState.currentPersonId = null;
  personPanelExpanded = false;
  // UI: ukryj/wyczyść sekcje i postępy
  if (previewSection) previewSection.style.display = 'none';
  if (videoName) videoName.textContent = '';
  if (personName) personName.textContent = '';
  if (videoDuration) videoDuration.textContent = '';
  if (thumbContainer) thumbContainer.innerHTML = '';
  if (timeline) timeline.innerHTML = '';
  if (segmentsList) segmentsList.innerHTML = '';
  if (cutSection) cutSection.style.display = 'none';
  if (resultsList) resultsList.innerHTML = '';
  if (downloadAllBtn) downloadAllBtn.style.display = 'none';
  deleteSourceBtn?.style && (deleteSourceBtn.style.display = 'none');
  if (uploadProgress) uploadProgress.style.display = 'none';
  if (cutProgress) cutProgress.style.display = 'none';
  if (downloadProgress) downloadProgress.style.display = 'none';
  if (progressFill) progressFill.style.width = '0%';
  if (progressText) progressText.textContent = '';
  if (cutProgressFill) cutProgressFill.style.width = '0%';
  if (cutProgressText) cutProgressText.textContent = '';
  if (downloadProgressFill) downloadProgressFill.style.width = '0%';
  if (downloadProgressText) downloadProgressText.textContent = '';
  if (selectAllCheck) selectAllCheck.checked = false;
  document.getElementById('nsfwScanStatus')?.remove();
  document.getElementById(personModelStatsPanelId)?.remove();
  if (appState.profilePreviewAnimationTimer) {
    clearInterval(appState.profilePreviewAnimationTimer);
    appState.profilePreviewAnimationTimer = null;
  }
  stopModelSettingsAutoRefresh();
  // Zamknij modale jeśli otwarte
  if (segmentsModal) segmentsModal.classList.remove('active');
  if (settingsModal) settingsModal.classList.remove('active');
}

// Auto-select NSFW detected fragments and adjacent non-NSFW fragments
function autoSelectNSFWFragments() {
  const nsfwCount = Object.entries(appState.nsfwAnalysis)
    .filter(([time, result]) => result && result.is_nsfw)
    .length;

  if (nsfwCount === 0) {
    return;
  }

  // Create NSFW group
  appState.nextGroupId = (appState.nextGroupId || 1) + 1;

  // Collect all NSFW indices
  const nsfwIndices = new Set();
  Object.entries(appState.nsfwAnalysis)
    .filter(([time, result]) => result && result.is_nsfw)
    .forEach(([time, result]) => {
      const timeNum = parseInt(time);
      const index = Math.round(timeNum / appState.thumbInterval);
      nsfwIndices.add(index);
    });

  // Collect indices to select (NSFW + adjacent non-NSFW)
  const indicesToSelect = new Set(nsfwIndices);

  // For each NSFW, add adjacent non-NSFW neighbors
  nsfwIndices.forEach(index => {
    // Check left neighbor
    const leftIndex = index - 1;
    const leftTime = leftIndex * appState.thumbInterval;
    const leftNsfwResult = getNsfwAnalysisForTime(leftTime);
    if (leftIndex >= 0 && !(leftNsfwResult && leftNsfwResult.is_nsfw)) {
      indicesToSelect.add(leftIndex);
    }

    // Check right neighbor
    const rightIndex = index + 1;
    const rightTime = rightIndex * appState.thumbInterval;
    const rightNsfwResult = getNsfwAnalysisForTime(rightTime);
    if (rightTime <= appState.videoDuration && !(rightNsfwResult && rightNsfwResult.is_nsfw)) {
      indicesToSelect.add(rightIndex);
    }
  });

  // Add segments for all selected indices
  indicesToSelect.forEach(index => {
    const time = index * appState.thumbInterval;
    const endTime = Math.min(time + appState.thumbInterval, appState.videoDuration);

    // Check if already exists
    const exists = appState.selectedSegments.some(s => s.start === time);
    if (!exists) {
      const nsfwResult = getNsfwAnalysisForTime(time);
      const isNSFW = nsfwResult && nsfwResult.is_nsfw;
      appState.selectedSegments.push({
        start: time,
        end: endTime,
        groupId: NSFW_GROUP_ID,
        isNSFW: isNSFW || false
      });
    }
  });

  appState.selectedSegments.sort((a, b) => a.start - b.start);
  updateSegmentsList();

  // Visual feedback
  const adjacentCount = indicesToSelect.size - nsfwCount;
  const message = adjacentCount > 0
    ? `⚠️ Zaznaczono ${nsfwCount} NSFW fragmentów + ${adjacentCount} sąsiadujące elementy`
    : `⚠️ Zaznaczono ${nsfwCount} NSFW fragmentów`;
  showSuccess(message);
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('pl-PL');
}

function isVisibleProfile(profile) {
  const personId = String(profile?.personId || '').trim().toLowerCase();
  return personId !== 'preview_test';
}

function translateTrainingStage(stage) {
  const value = String(stage || '').toLowerCase();
  const labels = {
    starting: 'Start',
    round_started: 'Rozpoczęto rundę',
    round_training: 'Trening rundy',
    round_testing: 'Test rundy',
    round_done: 'Runda zakończona',
    completed: 'Zakończono',
    failed: 'Błąd',
    crashed: 'Awaria',
    blocked: 'Zablokowane'
  };

  return labels[value] || (stage || '—');
}

function getCurrentTrainingTestLabel(runtime) {
  if (!runtime) {
    return '—';
  }

  if (runtime.currentTest) {
    return runtime.currentTest;
  }

  const stage = String(runtime.latestStatus?.stage || '').toLowerCase();
  const round = Number(runtime.latestStatus?.current_round || runtime.currentRound?.round || 0);
  const rounds = Number(runtime.latestStatus?.total_rounds || 0);

  if (runtime.skipTest) {
    return 'Pominięty (tryb bez testu)';
  }

  if (stage === 'round_testing' && round > 0) {
    return `Test po rundzie ${round}${rounds > 0 ? `/${rounds}` : ''}`;
  }

  if (runtime.running && round > 0) {
    return `Oczekiwanie na test po rundzie ${round}${rounds > 0 ? `/${rounds}` : ''}`;
  }

  return 'Brak aktywnego testu';
}

function stopModelSettingsAutoRefresh() {
  if (modelSettingsPoller) {
    clearInterval(modelSettingsPoller);
    modelSettingsPoller = null;
  }
}

function startModelSettingsAutoRefresh() {
  stopModelSettingsAutoRefresh();

  modelSettingsPoller = setInterval(() => {
    const isSettingsVisible = settingsModal?.classList.contains('active');
    const isModelTabActive = appState.settingsActiveTab === 'model';
    if (!isSettingsVisible || !isModelTabActive) {
      return;
    }

    refreshModelSettingsData();
  }, MODEL_SETTINGS_REFRESH_MS);
}

function setSettingsTab(tabName) {
  appState.settingsActiveTab = tabName;

  settingsTabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle('active', isActive);
  });

  settingsTabPanels.forEach((panel) => {
    const isActive = panel.dataset.tab === tabName;
    panel.classList.toggle('active', isActive);
  });
}

function renderModelTrainingFolders() {
  if (!modelTrainingFoldersList) {
    return;
  }

  if (!Array.isArray(appState.modelTrainingFolders) || appState.modelTrainingFolders.length === 0) {
    modelTrainingFoldersList.innerHTML = '<div class="model-empty-state">Brak wybranych folderów.</div>';
    return;
  }

  modelTrainingFoldersList.innerHTML = appState.modelTrainingFolders
    .map((folder, index) => `
      <div class="model-folder-item">
        <span class="model-folder-path" title="${folder}">${folder}</span>
        <button type="button" class="btn btn-secondary model-folder-remove" data-index="${index}">Usuń</button>
      </div>
    `)
    .join('');

  modelTrainingFoldersList.querySelectorAll('.model-folder-remove').forEach((button) => {
    button.addEventListener('click', (event) => {
      const index = Number(event.currentTarget.dataset.index);
      appState.modelTrainingFolders = appState.modelTrainingFolders.filter((_, itemIndex) => itemIndex !== index);
      renderModelTrainingFolders();
    });
  });
}

function renderModelSummaryBlocks(summary, runtime) {
  if (modelProfilesSummary) {
    if (!summary) {
      modelProfilesSummary.innerHTML = '<div class="model-empty-state">Brak danych modelu.</div>';
    } else {
      const precision = Number(summary.globalPrecision || 0) * 100;
      const recall = Number(summary.globalRecall || 0) * 100;
      modelProfilesSummary.innerHTML = `
        <div><strong>Liczba profili:</strong> ${summary.totalProfiles || 0}</div>
        <div><strong>Aktywne profile:</strong> ${summary.activeProfiles || 0}</div>
        <div><strong>Łączna liczba próbek:</strong> ${summary.totalSamples || 0}</div>
        <div><strong>Global precision:</strong> ${precision.toFixed(1)}%</div>
        <div><strong>Global recall:</strong> ${recall.toFixed(1)}%</div>
        <div><strong>Średni próg:</strong> ${Number(summary.averageThreshold || 0).toFixed(2)}</div>
        <div><strong>Ostatnia aktualizacja:</strong> ${formatDateTime(summary.lastUpdatedAt)}</div>
      `;
    }
  }

  if (modelTrainingRuntime) {
    if (!runtime) {
      modelTrainingRuntime.innerHTML = '<div class="model-empty-state">Brak statusu treningu.</div>';
    } else {
      const stage = runtime.latestStatus?.stage || '—';
      const stageLabel = translateTrainingStage(stage);
      const round = runtime.latestStatus?.current_round || 0;
      const rounds = runtime.latestStatus?.total_rounds || 0;
      const progress = Number(runtime.latestStatus?.progress_percent || 0);
      const lastCompletedStatus = runtime.lastCompleted?.status || '—';
      const lastCompletedTime = formatDateTime(runtime.lastCompleted?.finishedAt);
      const currentTest = getCurrentTrainingTestLabel(runtime);
      const statusTimestamp = formatDateTime(runtime.latestStatus?.timestamp);
      const lastRefreshTime = formatDateTime(modelSettingsLastRefreshedAt);
      const statusLabel = runtime.running ? 'Trwa' : (runtime.paused ? 'Wstrzymany' : 'Nieaktywny');
      const resumeCheckpoint = getTrainingResumeCheckpointLabel(runtime);
      modelTrainingRuntime.innerHTML = `
        <div><strong>Status:</strong> ${statusLabel}</div>
        <div><strong>Kolejka:</strong> ${runtime.queueLength || 0}</div>
        <div><strong>Etap:</strong> ${stageLabel}</div>
        <div><strong>Bieżący test nauki:</strong> ${currentTest}</div>
        <div><strong>Runda:</strong> ${round}/${rounds}</div>
        <div><strong>Postęp:</strong> ${progress.toFixed(1)}%</div>
        <div><strong>Ostatni status:</strong> ${statusTimestamp}</div>
        <div><strong>Ostatnio odświeżono:</strong> ${lastRefreshTime}</div>
        <div><strong>Wstrzymano:</strong> ${formatDateTime(runtime.pausedAt)}</div>
        <div><strong>Punkt wznowienia:</strong> ${resumeCheckpoint}</div>
        <div><strong>Start:</strong> ${formatDateTime(runtime.startedAt || runtime.latestReport?.started_at)}</div>
        <div><strong>Ostatni zakończony trening:</strong> ${lastCompletedStatus}</div>
        <div><strong>Zakończono:</strong> ${lastCompletedTime}</div>
      `;
    }
  }

  updateModelTrainingPauseResumeButton(runtime);

  if (modelRuntimeSummary) {
    const currentRuntime = runtime || {};
    const sourceFolders = Array.isArray(currentRuntime.sourceFolders) ? currentRuntime.sourceFolders : [];
    modelRuntimeSummary.innerHTML = `
      <div><strong>Tryb nauki:</strong> Tylko foldery NSFW (bez testu)</div>
      <div><strong>Rekurencyjnie:</strong> Tak, z podfolderami</div>
      <div><strong>Aktywny PID:</strong> ${currentRuntime.pid || '—'}</div>
      <div><strong>Aktualne źródła:</strong> ${sourceFolders.length > 0 ? sourceFolders.join(', ') : '—'}</div>
    `;
  }

  if (modelTrainingQueue) {
    const queueItems = Array.isArray(runtime?.queue) ? runtime.queue : [];

    if (queueItems.length === 0) {
      modelTrainingQueue.innerHTML = '<div class="model-empty-state">Kolejka jest pusta.</div>';
    } else {
      modelTrainingQueue.innerHTML = queueItems
        .map((item, index) => `
          <div class="model-queue-item">
            <div>
              <strong>Pozycja ${index + 1}</strong>
              <div class="model-queue-meta">Dodano: ${formatDateTime(item.createdAt)}</div>
              <div class="model-queue-meta">Foldery: ${(item.sourceFolders || []).join(', ') || '—'}</div>
            </div>
            <button type="button" class="btn btn-secondary model-queue-remove" data-item-id="${item.id}">Usuń z kolejki</button>
          </div>
        `)
        .join('');

      modelTrainingQueue.querySelectorAll('.model-queue-remove').forEach((button) => {
        button.addEventListener('click', async (event) => {
          const itemId = Number(event.currentTarget.dataset.itemId);
          if (!Number.isFinite(itemId) || itemId <= 0) {
            showError('Nieprawidłowa pozycja kolejki.');
            return;
          }

          if (event?.currentTarget) event.currentTarget.disabled = true;
          try {
            const response = await fetch(API.ML_TRAINING_QUEUE_REMOVE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: itemId })
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.error || 'Nie udało się usunąć pozycji z kolejki.');
            }

            showSuccess(payload.message || 'Usunięto pozycję z kolejki.');
            await refreshModelSettingsData();
          } catch (err) {
            showError('Błąd usuwania z kolejki: ' + err.message);
          } finally {
            if (event?.currentTarget) event.currentTarget.disabled = false;
          }
        });
      });
    }
  }
}

function updateModelTrainingPauseResumeButton(runtime) {
  if (!modelTrainingPauseResumeBtn) {
    return;
  }

  const isRunning = Boolean(runtime?.running);
  const hasResumeCheckpoint = Boolean(runtime?.resumeState);
  const isPaused = Boolean(runtime?.paused || hasResumeCheckpoint);

  if (modelTrainingResumeBtn) {
    modelTrainingResumeBtn.disabled = !isPaused;
  }

  if (isRunning) {
    modelTrainingPauseResumeBtn.textContent = 'Wstrzymaj uczenie';
    modelTrainingPauseResumeBtn.disabled = false;
    modelTrainingPauseResumeBtn.dataset.mode = 'pause';
    return;
  }

  if (isPaused) {
    modelTrainingPauseResumeBtn.textContent = 'Wznow uczenie';
    modelTrainingPauseResumeBtn.disabled = false;
    modelTrainingPauseResumeBtn.dataset.mode = 'resume';
    return;
  }

  modelTrainingPauseResumeBtn.textContent = 'Wstrzymaj/Wznow';
  modelTrainingPauseResumeBtn.disabled = true;
  modelTrainingPauseResumeBtn.dataset.mode = 'none';
}

function getTrainingResumeCheckpointLabel(runtime) {
  const resumeState = runtime?.resumeState;
  if (!resumeState || typeof resumeState !== 'object') {
    return runtime?.paused ? 'Oczekuje na zapisany checkpoint' : '—';
  }

  const round = Number(resumeState.current_round);
  const nextVideoIndex = Number(resumeState.next_video_index);
  const stage = String(resumeState.stage || '').trim() || 'nieznany';
  const roundLabel = Number.isFinite(round) && round > 0 ? `runda ${round}` : 'runda —';
  const videoLabel = Number.isFinite(nextVideoIndex) && nextVideoIndex > 0 ? `, video ${nextVideoIndex + 1}` : '';
  return `${roundLabel}, etap ${stage}${videoLabel}`;
}

function getPreferredProfilePersonId() {
  const current = String(appState.currentPersonId || '').trim().toLowerCase();
  if (current) {
    return current;
  }

  const fromName = extractPersonIdFromVideoName(appState.videoFile?.name || '');
  return String(fromName || '').trim().toLowerCase() || null;
}

function buildPreviewClipFromCurrentFrameSelection() {
  if (!Array.isArray(appState.selectedPreviewFrameTimes) || appState.selectedPreviewFrameTimes.length !== 1 || !appState.videoId) {
    return null;
  }

  const onlyTime = Number(appState.selectedPreviewFrameTimes[0]);
  const thumbIndex = appState.thumbnails.findIndex((thumb) => Number(thumb.time) === onlyTime);
  const thumbRange = thumbIndex >= 0 ? getThumbnailRangeByIndex(thumbIndex) : null;
  if (!thumbRange) {
    return null;
  }

  return {
    videoId: appState.videoId,
    start: thumbRange.start,
    end: thumbRange.end
  };
}

function renderProfilePreviewSelector(profiles) {
  if (!profilePreviewSelector || !profilePreviewTarget || !profilePreviewFrames || !profilePreviewSaveBtn) {
    return;
  }

  const hasCurrentThumbnails = Array.isArray(appState.thumbnails) && appState.thumbnails.length > 0;
  profilePreviewSelector.style.display = hasCurrentThumbnails ? 'block' : 'none';
  if (!hasCurrentThumbnails) {
    return;
  }

  const selectedSourceThumbnails = appState.thumbnails.filter((thumb, index) => {
    const thumbRange = getThumbnailRangeByIndex(index);
    if (!thumbRange) {
      return false;
    }

    return appState.selectedSegments.some((segment) => segmentOverlaps(segment, thumbRange.start, thumbRange.end));
  });

  const allowedTimes = new Set(selectedSourceThumbnails.map((thumb) => Number(thumb.time)));
  appState.selectedPreviewFrameTimes = appState.selectedPreviewFrameTimes
    .filter((time) => allowedTimes.has(Number(time)))
    .slice(0, PROFILE_PREVIEW_FRAME_LIMIT);

  const preferredPersonId = getPreferredProfilePersonId();
  const profileIds = profiles.map((profile) => String(profile.personId || '').toLowerCase()).filter(Boolean);
  const optionIds = [...profileIds];
  if (preferredPersonId && !optionIds.includes(preferredPersonId)) {
    optionIds.unshift(preferredPersonId);
  }

  profilePreviewTarget.innerHTML = optionIds
    .map((personId) => {
      const autoLabel = personId === preferredPersonId ? ' (auto z nazwy pliku)' : '';
      return `<option value="${personId}">${personId}${autoLabel}</option>`;
    })
    .join('');

  if (preferredPersonId && optionIds.includes(preferredPersonId)) {
    profilePreviewTarget.value = preferredPersonId;
  }

  profilePreviewTarget.disabled = optionIds.length === 0;

  if (selectedSourceThumbnails.length === 0) {
    profilePreviewFrames.innerHTML = '<div class="model-empty-state">Najpierw zaznacz screeny na osi czasu. Podgląd profilu zapisuje się tylko z aktualnie zaznaczonych klatek. Jeśli zaznaczysz jedną klatkę, zapisze się dokładnie ta jedna klatka.</div>';
    profilePreviewSaveBtn.disabled = optionIds.length === 0;
    return;
  }

  profilePreviewFrames.innerHTML = selectedSourceThumbnails
    .slice(0, 60)
    .map((thumb) => {
      const checked = appState.selectedPreviewFrameTimes.includes(Number(thumb.time)) ? 'checked' : '';
      return `
        <label class="preview-frame-option">
          <input type="checkbox" value="${thumb.time}" ${checked}>
          <img src="${thumb.thumbnail}" alt="frame ${thumb.time}">
          <span>${formatTime(thumb.time)}</span>
        </label>
      `;
    })
    .join('');

  profilePreviewSaveBtn.disabled = optionIds.length === 0;

  profilePreviewFrames.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      const selected = [...profilePreviewFrames.querySelectorAll('input[type="checkbox"]:checked')]
        .map((item) => Number(item.value))
        .slice(0, PROFILE_PREVIEW_FRAME_LIMIT);

      appState.selectedPreviewFrameTimes = selected;
      profilePreviewFrames.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (!selected.includes(Number(checkbox.value)) && selected.length >= PROFILE_PREVIEW_FRAME_LIMIT) {
          checkbox.disabled = true;
        } else {
          checkbox.disabled = false;
        }
      });

      profilePreviewSaveBtn.disabled = selected.length === 0 || optionIds.length === 0;
    });
  });
}

function rotateProfilePreviewImages() {
  if (appState.profilePreviewAnimationTimer) {
    clearInterval(appState.profilePreviewAnimationTimer);
    appState.profilePreviewAnimationTimer = null;
  }

  const animated = [...document.querySelectorAll('.profile-preview[data-frames]')];
  if (animated.length === 0) {
    return;
  }

  appState.profilePreviewAnimationTimer = setInterval(() => {
    animated.forEach((img) => {
      const frames = JSON.parse(img.dataset.frames || '[]');
      if (!Array.isArray(frames) || frames.length <= 1) {
        return;
      }

      const currentIndex = Number(img.dataset.frameIndex || 0);
      const nextIndex = (currentIndex + 1) % frames.length;
      img.dataset.frameIndex = String(nextIndex);
      img.src = frames[nextIndex];
    });
  }, 900);
}

function renderProfilesGrid(profiles) {
  if (!profilesGrid) {
    return;
  }

  const showAdvancedActions = Boolean(profilesAdvancedToggle?.checked);

  if (!Array.isArray(profiles) || profiles.length === 0) {
    profilesGrid.innerHTML = '<div class="model-empty-state">Brak istniejących profili.</div>';
    return;
  }

  profilesGrid.innerHTML = profiles
    .map((profile) => {
      const metrics = profile.metrics || {};
      const previewFrames = Array.isArray(profile.previewFrames) ? profile.previewFrames : [];
      const previewClip = profile.previewClip || null;
      const previewSlots = Array.isArray(profile.previewSlots) ? profile.previewSlots : [];
      const previewUrls = previewFrames.map((frame) => frame.url).filter(Boolean);
      const previewMain = previewUrls[0] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Crect fill="%23e2e8f0" width="320" height="180"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="16"%3EBrak podgladu%3C/text%3E%3C/svg%3E';
      const precision = Number(metrics.precision || 0) * 100;
      const recall = Number(metrics.recall || 0) * 100;
      const filledSlotNumbers = previewSlots
        .map((entry) => Number(entry.slot))
        .filter((slot) => Number.isFinite(slot) && slot >= 1 && slot <= 5)
        .sort((a, b) => a - b);
      const highestFilled = filledSlotNumbers.length > 0 ? filledSlotNumbers[filledSlotNumbers.length - 1] : 0;
      const activeSlotCount = Math.max(1, Math.min(5, highestFilled + 1));
      const filledSlots = new Set(previewSlots.map((entry) => Number(entry.slot)).filter((slot) => Number.isFinite(slot)));
      const slotsJson = encodeURIComponent(JSON.stringify(previewSlots));

      // Wybierz slot do wyświetlenia jako główny
      let mainSlot = 1;
      if (profile.activeSlot && Number.isFinite(Number(profile.activeSlot))) {
        mainSlot = Number(profile.activeSlot);
      } else if (filledSlotNumbers.length > 0) {
        mainSlot = filledSlotNumbers[0];
      }
      const mainSlotData = previewSlots.find((entry) => Number(entry.slot) === mainSlot);
      let previewMedia = '';
      if (mainSlotData?.url && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(mainSlotData.url)) {
        previewMedia = `
          <div class="profile-preview-media">
            <video class="profile-preview" src="${mainSlotData.url}" muted autoplay loop playsinline preload="metadata"></video>
            <span class="profile-preview-kind">slot ${mainSlot}</span>
          </div>`;
      } else if (mainSlotData?.url) {
        previewMedia = `<img class="profile-preview" src="${mainSlotData.url}" alt="Podgląd ${profile.personId}">`;
      } else if (previewClip?.url) {
        previewMedia = `
          <div class="profile-preview-media">
            <video class="profile-preview" src="${previewClip.url}" muted autoplay loop playsinline preload="metadata"></video>
            <span class="profile-preview-kind">video 25s</span>
          </div>`;
      } else {
        previewMedia = `<img class="profile-preview" src="${previewMain}" data-frames='${JSON.stringify(previewUrls)}' data-frame-index="0" alt="Podgląd ${profile.personId}">`;
      }

      return `
        <article class="profile-tile" data-person-id="${profile.personId}">
          ${previewMedia}
          <div class="profile-tile-body">
            <div class="profile-title-row">
              <strong>${profile.personId}</strong>
              <span class="profile-status-badge ${profile.active ? 'active' : 'inactive'}">${profile.active ? 'aktywne' : 'nieaktywne'}</span>
            </div>
            <div class="profile-metrics-row">Próbki: ${metrics.support || 0} | Precision: ${precision.toFixed(1)}% | Recall: ${recall.toFixed(1)}%</div>
            <div class="profile-metrics-row">Ostatnia aktualizacja: ${formatDateTime(profile.updatedAt)}</div>
            <div class="profile-slots" data-selected-slot="1" data-slots="${slotsJson}">
              <div class="profile-slots-header">Sloty podglądu 25s (LPM: podgląd, PPM: usuń):</div>
              <div class="profile-slot-buttons">
                ${[1, 2, 3, 4, 5].map((slot) => `
                  <button type="button" class="btn btn-secondary profile-slot-btn ${filledSlots.has(slot) ? 'filled' : ''}" data-slot="${slot}" title="Slot ${slot}" ${slot > activeSlotCount ? 'disabled' : ''}>${slot}</button>
                `).join('')}
              </div>
            </div>
            <div class="profile-threshold-row">
              <label>Próg:</label>
              <input type="number" step="0.01" min="0.10" max="0.99" value="${Number(profile.threshold || 0.75).toFixed(2)}" class="profile-threshold-input">
              <button type="button" class="btn btn-secondary profile-threshold-save">Zapisz próg</button>
            </div>
            ${showAdvancedActions ? `
            <div class="profile-delete-row">
              <button type="button" class="btn btn-danger profile-delete-btn">Usuń profil i wszystkie miniatury</button>
            </div>
            ` : ''}
          </div>
        </article>
      `;
    })
    .join('');

  const parseSlots = (slotsContainer) => {
    try {
      return JSON.parse(decodeURIComponent(slotsContainer?.dataset.slots || '[]'));
    } catch (err) {
      return [];
    }
  };

  const isVideoPreviewUrl = (value) => /\.(mp4|webm|mov|mkv)(\?|$)/i.test(String(value || ''));

  const updateTilePreview = (tile, previewUrl, personId, selectedSlot) => {
    if (!tile || !previewUrl) {
      return;
    }

    let mediaWrap = tile.querySelector('.profile-preview-media');
    if (!mediaWrap) {
      const existingPreview = tile.querySelector('.profile-preview');
      mediaWrap = document.createElement('div');
      mediaWrap.className = 'profile-preview-media';
      if (existingPreview && existingPreview.parentElement) {
        existingPreview.parentElement.insertBefore(mediaWrap, existingPreview);
        mediaWrap.appendChild(existingPreview);
      } else {
        tile.insertBefore(mediaWrap, tile.firstChild);
      }
    }

    let nextPreview;
    if (isVideoPreviewUrl(previewUrl)) {
      nextPreview = document.createElement('video');
      nextPreview.className = 'profile-preview';
      nextPreview.src = previewUrl;
      nextPreview.muted = true;
      nextPreview.autoplay = true;
      nextPreview.loop = true;
      nextPreview.playsInline = true;
      nextPreview.preload = 'metadata';
    } else {
      nextPreview = document.createElement('img');
      nextPreview.className = 'profile-preview';
      nextPreview.src = previewUrl;
      nextPreview.alt = `Podglad ${personId}`;
    }

    const currentPreview = mediaWrap.querySelector('.profile-preview');
    if (currentPreview) {
      currentPreview.replaceWith(nextPreview);
    } else {
      mediaWrap.prepend(nextPreview);
    }

    let kindBadge = mediaWrap.querySelector('.profile-preview-kind');
    if (!kindBadge) {
      kindBadge = document.createElement('span');
      kindBadge.className = 'profile-preview-kind';
      mediaWrap.appendChild(kindBadge);
    }
    kindBadge.textContent = `slot ${selectedSlot}`;
  };

  profilesGrid.querySelectorAll('.profile-slot-btn').forEach((button) => {
    // Standardowy klik – podgląd
    button.addEventListener('click', (event) => {
      const tile = event.currentTarget.closest('.profile-tile');
      const selectedSlot = Number(event.currentTarget.dataset.slot);
      const slotsContainer = tile?.querySelector('.profile-slots');
      const slots = parseSlots(slotsContainer);
      const selectedData = slots.find((entry) => Number(entry.slot) === selectedSlot);

      if (!selectedData?.url) {
        showError(`Slot ${selectedSlot} nie ma zapisanego podglądu.`);
        return;
      }

      updateTilePreview(tile, selectedData.url, tile?.dataset.personId || '', selectedSlot);
      if (slotsContainer) {
        slotsContainer.dataset.selectedSlot = String(selectedSlot);
      }

      tile?.querySelectorAll('.profile-slot-btn').forEach((slotBtn) => {
        slotBtn.classList.toggle('selected', slotBtn === event.currentTarget);
      });
    });

    // Długie przytrzymanie LPM – zapisz miniaturę
    let holdTimer = null;

    let longPressActive = false;
    button.addEventListener('mousedown', async (event) => {
      if (event.button !== 0) return; // tylko LPM
      longPressActive = false;
      holdTimer = setTimeout(async () => {
        longPressActive = true;
        const confirmSave = window.confirm('Ustawić ten slot jako główny podgląd profilu?');
        if (!confirmSave) return;
        button.classList.add('selected');
        const tile = button.closest('.profile-tile');
        const personId = tile?.dataset.personId;
        const selectedSlot = Number(button.dataset.slot);
        let profile = (appState.profilesSummary?.profiles || []).find(p => p.personId === personId);
        const slotsContainer = tile?.querySelector('.profile-slots');
        const slots = slotsContainer ? JSON.parse(decodeURIComponent(slotsContainer.dataset.slots || '[]')) : [];
        const selectedData = slots.find((entry) => Number(entry.slot) === selectedSlot);
        if (selectedData?.url) {
          // Sprawdź, czy plik istnieje (próba pobrania)
          try {
            const testResp = await fetch(selectedData.url, { method: 'HEAD' });
            if (!testResp.ok) {
              showError('Plik podglądu nie istnieje lub jest uszkodzony. Wygeneruj nowy podgląd.');
              return;
            }
          } catch {
            showError('Plik podglądu nie istnieje lub jest uszkodzony. Wygeneruj nowy podgląd.');
            return;
          }
          // Slot istnieje i plik jest OK – ustaw jako główny
          if (slotsContainer) {
            slotsContainer.dataset.selectedSlot = String(selectedSlot);
          }
          tile?.querySelectorAll('.profile-slot-btn').forEach((slotBtn) => {
            slotBtn.classList.toggle('selected', slotBtn === button);
          });
          showSuccess('Wybrano slot jako główny podgląd profilu!');
          await refreshModelSettingsData();
          return;
        }
        // Jeśli slot pusty – generuj podgląd jak dotychczas
        let previewClip = profile?.previewClip;
        if (!previewClip) {
          try {
            const selectedFrames = Array.from(document.querySelectorAll('.profile-preview-frame.selected'));
            if (!personId || selectedFrames.length === 0) {
              showError('Wybierz najpierw miniaturę do wygenerowania podglądu!');
              return;
            }
            const selectedIndexes = selectedFrames.map(frame => Number(frame.dataset.index));
            const selectedThumbs = selectedIndexes.map(idx => appState.thumbnails[idx]);
            const resp = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frames`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                frames: selectedThumbs.map(t => ({ time: t.time, thumbnail: t.thumbnail }))
              })
            });
            const payload = await resp.json();
            if (!resp.ok) {
              showError(payload.error || 'Nie udało się wygenerować podglądu.');
              return;
            }
            await refreshModelSettingsData();
            profile = (appState.profilesSummary?.profiles || []).find(p => p.personId === personId);
            previewClip = profile?.previewClip;
          } catch (err) {
            showError('Błąd generowania podglądu: ' + err.message);
            return;
          }
        }
        if (!personId || !previewClip) {
          showError('Brak danych do zapisu slotu podglądu!');
          return;
        }
        try {
          const response = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-slot/${selectedSlot}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewClip })
          });
          const payload = await response.json();
          if (!response.ok) {
            showError(payload.error || 'Nie udało się zapisać slotu podglądu.');
            return;
          }
          showSuccess('Slot podglądu został zapisany!');
          await refreshModelSettingsData();
        } catch (err) {
          showError('Błąd zapisu slotu podglądu: ' + err.message);
        }
      }, 3000);
    });
    button.addEventListener('mouseup', (event) => {
      clearTimeout(holdTimer);
      // Jeśli był long press, blokuj domyślny click
      if (longPressActive) {
        event.stopImmediatePropagation();
      }
    });
    button.addEventListener('mouseleave', () => { clearTimeout(holdTimer); });

    button.addEventListener('contextmenu', async (event) => {
      event.preventDefault();
      const tile = event.currentTarget.closest('.profile-tile');
      if (!tile) {
        return;
      }

      const personId = tile.dataset.personId;
      const selectedSlot = Number(event.currentTarget.dataset.slot);
      const slotsContainer = tile?.querySelector('.profile-slots');
      const slots = parseSlots(slotsContainer);
      const selectedData = slots.find((entry) => Number(entry.slot) === selectedSlot);

      if (!personId) {
        showError('Nie znaleziono profilu.');
        return;
      }

      if (!selectedData?.url) {
        showError(`Slot ${selectedSlot} jest pusty.`);
        return;
      }

      const userConfirm = window.confirm(`Usunąć slot ${selectedSlot} dla profilu ${personId}?`);
      if (!userConfirm) {
        return;
      }

      if (event?.currentTarget) event.currentTarget.disabled = true;
      try {
        const response = await fetch(API.ML_PERSON_PREVIEW_SLOT(personId, selectedSlot), {
          method: 'DELETE'
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Nie udało się usunąć slotu podglądu.');
        }

        showSuccess(`Usunięto slot ${selectedSlot} dla profilu ${personId}.`);
        await refreshModelSettingsData();
      } catch (err) {
        showError(`Błąd usuwania slotu: ${err.message}`);
      } finally {
        if (event?.currentTarget) event.currentTarget.disabled = false;
      }
    });
  });

  profilesGrid.querySelectorAll('.profile-delete-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const tile = event.currentTarget.closest('.profile-tile');
      const personId = tile?.dataset.personId;
      if (!personId) {
        showError('Nie znaleziono profilu do usunięcia.');
        return;
      }

      const userConfirm = window.confirm(`Usunąć profil ${personId} wraz ze wszystkimi powiązanymi miniaturami i podglądami?`);
      if (!userConfirm) {
        return;
      }

      if (event?.currentTarget) event.currentTarget.disabled = true;
      try {
        const response = await fetch(API.ML_PERSON_DELETE(personId), {
          method: 'DELETE'
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Nie udało się usunąć profilu.');
        }

        showSuccess(`Usunięto profil ${personId}.`);
        await refreshModelSettingsData();
      } catch (err) {
        showError(`Błąd usuwania profilu: ${err.message}`);
      } finally {
        if (event?.currentTarget) event.currentTarget.disabled = false;
      }
    });
  });

  profilesGrid.querySelectorAll('.profile-threshold-save').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const tile = event.currentTarget.closest('.profile-tile');
      const personId = tile?.dataset.personId;
      const input = tile?.querySelector('.profile-threshold-input');
      const threshold = Number(input?.value);

      if (!personId || !Number.isFinite(threshold) || threshold < 0.1 || threshold > 0.99) {
        showError('Próg musi być w zakresie 0.10 - 0.99');
        return;
      }

      if (event?.currentTarget) event.currentTarget.disabled = true;
      try {
        const response = await fetch(API.ML_PERSON_THRESHOLD(personId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Nie udało się zapisać progu');
        }

        showSuccess(`Zapisano próg ${payload.threshold} dla profilu ${personId}`);
        await refreshModelSettingsData();
      } catch (err) {
        showError(`Błąd zapisu progu: ${err.message}`);
      } finally {
        if (event?.currentTarget) event.currentTarget.disabled = false;
      }
    });
  });

  rotateProfilePreviewImages();
}

async function refreshModelSettingsData() {
  const refreshToken = ++modelSettingsRefreshToken;

  try {
    const [profilesResp, trainingResp] = await Promise.all([
      fetch(API.ML_PROFILES),
      fetch(API.ML_TRAINING_SETTINGS)
    ]);

    const profilesData = profilesResp.ok ? await profilesResp.json() : null;
    const trainingData = trainingResp.ok ? await trainingResp.json() : null;

    if (refreshToken !== modelSettingsRefreshToken) {
      return;
    }

    modelSettingsLastRefreshedAt = new Date().toISOString();

    const retentionFromBackend = Number(profilesData?.retentionDays);
    if (Number.isFinite(retentionFromBackend) && retentionDaysInput && retentionDaysValue) {
      retentionDaysInput.value = String(retentionFromBackend);
      retentionDaysValue.textContent = `${retentionFromBackend} dni`;
      localStorage.setItem('retentionDays', String(retentionFromBackend));
    }

    const visibleProfiles = Array.isArray(profilesData?.profiles)
      ? profilesData.profiles.filter(isVisibleProfile)
      : [];

    appState.profilesSummary = {
      ...(profilesData || {}),
      profiles: visibleProfiles
    };
    appState.modelTrainingFolders = Array.isArray(trainingData?.trainingFolders) ? trainingData.trainingFolders : [];

    renderModelTrainingFolders();
    renderModelSummaryBlocks(profilesData, trainingData?.runtime || null);
    renderProfilesGrid(visibleProfiles);
    renderProfilePreviewSelector(visibleProfiles);
  } catch (err) {
    console.error('Failed to refresh model settings data:', err);
  }
}

// Update Settings Display
function updateSettingsDisplay() {
  appState.sourceFolders = normalizeSourceFolders(appState.sourceFolders);
  appState.activeSourceFolderIndex = clampSourceFolderIndex(appState.activeSourceFolderIndex, appState.sourceFolders);
  appState.sourceFolderPath = appState.sourceFolders[appState.activeSourceFolderIndex] || '';

  if (sourceFolderPath) {
    sourceFolderPath.value = appState.sourceFolderPath || '(nie ustawiono)';
  }
  if (destinationFolderPath) {
    destinationFolderPath.value = appState.destinationFolderPath || DEFAULT_OUTPUT_PATH;
  }
  if (sourceFolderClear) {
    sourceFolderClear.style.display = appState.sourceFolders.length > 0 ? 'inline-flex' : 'none';
  }
  if (destinationFolderClear) {
    destinationFolderClear.style.display = appState.destinationFolderPath !== DEFAULT_OUTPUT_PATH ? 'inline-flex' : 'none';
  }
  
  // Load retention days from localStorage
  const savedRetentionDays = localStorage.getItem('retentionDays') || '90';
  if (retentionDaysInput) {
    retentionDaysInput.value = savedRetentionDays;
  }
  if (retentionDaysValue) {
    retentionDaysValue.textContent = `${savedRetentionDays} dni`;
  }

  renderSourceFolderPanels();
  renderModelTrainingFolders();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Clean up localStorage history (keep settings)
  localStorage.removeItem('selectionHistory');

  // Load settings display (including retention days)
  updateSettingsDisplay();
  setSettingsTab(appState.settingsActiveTab || 'folders');

  if (profilesAdvancedToggle) {
    profilesAdvancedToggle.checked = localStorage.getItem('profilesAdvancedMode') === '1';
    profilesAdvancedToggle.addEventListener('change', () => {
      localStorage.setItem('profilesAdvancedMode', profilesAdvancedToggle.checked ? '1' : '0');
      const visibleProfiles = Array.isArray(appState.profilesSummary?.profiles) ? appState.profilesSummary.profiles : [];
      renderProfilesGrid(visibleProfiles);
    });
  }

  // Hide feedback buttons (✓/✗) on NSFW thumbnails
  const style = document.createElement('style');
  style.innerHTML = `
    .feedback-btn {
      display: none !important;
    }
    .feedback-container {
      pointer-events: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);

  // Test connection
  fetch(API.TEST)
    .then(r => r.json())
    .catch(e => console.error('Server test failed:', e));

  // Verify all DOM elements are found
  const elementsToCheck = [
    'uploadArea', 'fileInput', 'uploadProgress', 'progressFill', 'progressText',
    'previewSection', 'videoName', 'videoDuration', 'intervalSlider', 'generateThumbsBtn',
    'thumbContainer', 'timelineSection', 'timeline', 'selectAllCheck', 'clearSelectionBtn',
    'segmentsList', 'cutSection', 'cutBtn', 'resultsList', 'openOutputBtn'
  ];

  let missingElements = [];
  elementsToCheck.forEach(id => {
    if (!document.getElementById(id)) {
      missingElements.push(id);
    }
  });

  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements);
  }

  // Add global mouseup handler for drag end (moved from generateThumbnails)
  if (!appState.mouseupListenerAttached) {
    document.addEventListener('mouseup', () => {
      appState.isSelecting = false;
      appState.isDeselecting = false;
      appState.selectStartIndex = null;
      appState.activeSelectionGroupId = null;
    });
    appState.mouseupListenerAttached = true;
  }

  document.addEventListener('keydown', handleGlobalNavigationShortcut);

  // Modal Event Listeners
  viewSegmentsBtn?.addEventListener('click', () => {
    segmentsModal.classList.add('active');
    updateSegmentsModalContent();
  });

  closeSegmentsBtn?.addEventListener('click', () => {
    segmentsModal.classList.remove('active');
  });

  settingsBtn?.addEventListener('click', () => {
    settingsModal.classList.add('active');
    setSettingsTab(appState.settingsActiveTab || 'folders');
    updateSettingsDisplay();
    refreshModelSettingsData();
    startModelSettingsAutoRefresh();
  });

  closeSettingsBtn?.addEventListener('click', () => {
    stopModelSettingsAutoRefresh();
    settingsModal.classList.remove('active');
  });

  closeSettingsConfirmBtn?.addEventListener('click', () => {
    stopModelSettingsAutoRefresh();
    settingsModal.classList.remove('active');
  });

  settingsTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      if (!tabName) {
        return;
      }
      setSettingsTab(tabName);
    });
  });

  // Settings Buttons
  sourceFolderBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const path = await window.electron?.ipcRenderer?.invoke('open-folder-dialog');
      if (path) {
        const result = addSourceFolder(path);
        updateSettingsDisplay();
        if (result.added && result.removedOldest) {
          showSuccess(`✓ Dodano folder źródłowy: ${path} (zastąpiono najstarszy panel)`);
        } else if (result.added) {
          showSuccess(`✓ Dodano folder źródłowy: ${path}`);
        } else {
          showSuccess(`✓ Ustawiono aktywny folder źródłowy: ${path}`);
        }
      }
    } catch (err) {
      showError('Błąd wyboru folderu: ' + err.message);
    }
  });

  sourceFolderClear?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    appState.sourceFolders = [];
    appState.activeSourceFolderIndex = 0;
    appState.sourceFolderPath = '';
    localStorage.removeItem('sourceFolders');
    localStorage.removeItem('activeSourceFolderIndex');
    localStorage.setItem('sourceFolderPath', '');
    updateSettingsDisplay();
    showSuccess('✓ Foldery źródłowe usunięte');
  });

  sourceFolderPanels?.addEventListener('click', (e) => {
    const panelButton = e.target.closest('.source-folder-panel');
    if (!panelButton) {
      return;
    }

    const nextIndex = Number(panelButton.dataset.index);
    if (!setActiveSourceFolder(nextIndex)) {
      return;
    }

    updateSettingsDisplay();
    showSuccess(`✓ Aktywny panel źródłowy: ${appState.sourceFolderPath}`);
  });

  sourceFolderPanelsMode?.addEventListener('change', (e) => {
    const selectedMode = Number(e.target?.value);
    const normalizedMode = selectedMode === 1 || selectedMode === 2 || selectedMode === 3 ? selectedMode : 2;
    localStorage.setItem('sourceFolderPanelsMode', String(normalizedMode));
    renderSourceFolderPanels();
  });

  destinationFolderBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const path = await window.electron?.ipcRenderer?.invoke('open-folder-dialog');
      if (path) {
        appState.destinationFolderPath = path;
        localStorage.setItem('destinationFolderPath', path);
        updateSettingsDisplay();
        showSuccess(`✓ Folder docelowy: ${path}`);
      }
    } catch (err) {
      showError('Błąd wyboru folderu: ' + err.message);
    }
  });

  destinationFolderClear?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    appState.destinationFolderPath = DEFAULT_OUTPUT_PATH;
    localStorage.setItem('destinationFolderPath', DEFAULT_OUTPUT_PATH);
    updateSettingsDisplay();
    showSuccess('✓ Folder docelowy resetowany do domyślnego');
  });

  modelTrainingFolderBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.electron?.ipcRenderer) {
      showError('Wybór folderu działa tylko w aplikacji Electron.');
      return;
    }

    try {
      const selectedPath = await window.electron.ipcRenderer.invoke('open-folder-dialog');
      if (!selectedPath) {
        return;
      }

      if (!appState.modelTrainingFolders.includes(selectedPath)) {
        appState.modelTrainingFolders.push(selectedPath);
      }
      renderModelTrainingFolders();
    } catch (err) {
      showError('Błąd wyboru folderu nauki: ' + err.message);
    }
  });

  modelTrainingSaveFoldersBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!Array.isArray(appState.modelTrainingFolders) || appState.modelTrainingFolders.length === 0) {
      showError('Dodaj przynajmniej jeden folder do nauki.');
      return;
    }

    modelTrainingSaveFoldersBtn.disabled = true;
    try {
      const response = await fetch(API.ML_TRAINING_SETTINGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingFolders: appState.modelTrainingFolders })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Nie udało się zapisać folderów nauki.');
      }

      appState.modelTrainingFolders = payload.trainingFolders || appState.modelTrainingFolders;
      renderModelTrainingFolders();
      showSuccess('Foldery nauki zapisane.');
      await refreshModelSettingsData();
    } catch (err) {
      showError('Błąd zapisu folderów nauki: ' + err.message);
    } finally {
      modelTrainingSaveFoldersBtn.disabled = false;
    }
  });

  modelTrainingStartBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!Array.isArray(appState.modelTrainingFolders) || appState.modelTrainingFolders.length === 0) {
      showError('Dodaj i zapisz przynajmniej jeden folder do nauki.');
      return;
    }

    modelTrainingStartBtn.disabled = true;
    try {
      const response = await fetch(API.ML_TRAINING_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingFolders: appState.modelTrainingFolders })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Nie udało się uruchomić nauki.');
      }

      showSuccess(payload.message || 'Uruchomiono naukę modelu.');
      refreshModelSettingsData();
    } catch (err) {
      showError('Błąd uruchomienia nauki: ' + err.message);
    } finally {
      modelTrainingStartBtn.disabled = false;
    }
  });

  modelTrainingStopBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const userConfirm = window.confirm('Czy na pewno chcesz zatrzymać bieżący trening?');
    if (!userConfirm) {
      return;
    }

    modelTrainingStopBtn.disabled = true;
    try {
      const response = await fetch(API.ML_TRAINING_STOP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Nie udało się zatrzymać treningu.');
      }

      showSuccess(payload.message || 'Wysłano sygnał zatrzymania treningu.');
      await refreshModelSettingsData();
    } catch (err) {
      showError('Błąd zatrzymania treningu: ' + err.message);
    } finally {
      modelTrainingStopBtn.disabled = false;
    }
  });

  modelTrainingRefreshBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    modelTrainingRefreshBtn.disabled = true;
    try {
      await refreshModelSettingsData();
      showSuccess('Status modelu odświeżony.');
    } catch (err) {
      showError('Błąd odświeżania statusu: ' + err.message);
    } finally {
      modelTrainingRefreshBtn.disabled = false;
    }
  });

  modelTrainingPauseResumeBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const mode = modelTrainingPauseResumeBtn.dataset.mode;
    if (mode !== 'pause' && mode !== 'resume') {
      return;
    }

    modelTrainingPauseResumeBtn.disabled = true;
    try {
      const endpoint = mode === 'pause' ? API.ML_TRAINING_PAUSE : API.ML_TRAINING_RESUME;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || (mode === 'pause' ? 'Nie udało się wstrzymać treningu.' : 'Nie udało się wznowic treningu.'));
      }

      showSuccess(payload.message || (mode === 'pause' ? 'Wstrzymano trening.' : 'Wznowiono trening.'));
      await refreshModelSettingsData();
    } catch (err) {
      showError('Błąd akcji wstrzymaj/wznow: ' + err.message);
      modelTrainingPauseResumeBtn.disabled = false;
    }
  });

  modelTrainingResumeBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    modelTrainingResumeBtn.disabled = true;
    try {
      const response = await fetch(API.ML_TRAINING_RESUME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Nie udało się wznowic treningu.');
      }

      showSuccess(payload.message || 'Wznowiono trening.');
      await refreshModelSettingsData();
    } catch (err) {
      showError('Błąd wznowienia treningu: ' + err.message);
    } finally {
      modelTrainingResumeBtn.disabled = false;
    }
  });

  resetSettingsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const userConfirm = window.confirm('Czy na pewno chcesz zresetować wszystkie ustawienia?');
    if (userConfirm) {
      appState.sourceFolders = [];
      appState.activeSourceFolderIndex = 0;
      appState.sourceFolderPath = '';
      appState.destinationFolderPath = DEFAULT_OUTPUT_PATH;
      appState.recentFolders = [];
      localStorage.removeItem('sourceFolderPath');
      localStorage.removeItem('sourceFolders');
      localStorage.removeItem('activeSourceFolderIndex');
      localStorage.removeItem('destinationFolderPath');
      localStorage.removeItem('recentFolders');
      localStorage.removeItem('selectionHistory');
      appState.modelTrainingFolders = [];
      renderModelTrainingFolders();
      fetch(API.ML_TRAINING_SETTINGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingFolders: [] })
      }).catch(() => {});
      updateSettingsDisplay();
      showSuccess('🔄 Ustawienia przywrócone');
      refreshModelSettingsData();
    }
  });

  retentionDaysSave?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newDays = parseInt(retentionDaysInput?.value);
    if (!retentionDaysInput || isNaN(newDays) || newDays < 7 || newDays > 365) {
      showError('❌ Liczba dni musi być między 7 a 365');
      return;
    }

    retentionDaysSave.disabled = true;
    const originalText = retentionDaysSave.textContent;
    retentionDaysSave.textContent = '⏳ Zapisywanie...';

    try {
      const response = await fetch('/api/ml/retention-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: newDays })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd serwera');
      }

      const data = await response.json();
      
      retentionDaysValue.textContent = `${newDays} dni`;
      localStorage.setItem('retentionDays', newDays);
      showSuccess(`✅ Retencja zmieniona na ${newDays} dni`);
      refreshModelSettingsData();

      retentionDaysSave.textContent = originalText;
      retentionDaysSave.disabled = false;
    } catch (err) {
      showError(`❌ Błąd: ${err.message}`);
      retentionDaysSave.textContent = originalText;
      retentionDaysSave.disabled = false;
    }
  });

  profilePreviewSaveBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const personId = profilePreviewTarget?.value;
    if (!personId) {
      showError('Wybierz profil do zapisania podglądu.');
      return;
    }

    if (!Array.isArray(appState.selectedPreviewFrameTimes) || appState.selectedPreviewFrameTimes.length === 0) {
      showError(`Wybierz 1-${PROFILE_PREVIEW_FRAME_LIMIT} klatek z bieżących screenów.`);
      return;
    }

    const cacheKey = appState.videoCacheKey || appState.videoId;
    if (!cacheKey) {
      showError('Brak cache klatek dla bieżącego materiału.');
      return;
    }

    const previewClip = buildPreviewClipFromCurrentFrameSelection();

    if (previewClip) {
      const knownProfiles = Array.isArray(appState.profilesSummary?.profiles) ? appState.profilesSummary.profiles : [];
      const targetProfile = knownProfiles.find((profile) => String(profile.personId || '').toLowerCase() === String(personId).toLowerCase());
      let latestPreviewSlots = Array.isArray(targetProfile?.previewSlots) ? targetProfile.previewSlots : [];

      try {
        const profileResp = await fetch(API.ML_PERSON_PROFILE(personId));
        if (profileResp.ok) {
          const profileData = await profileResp.json();
          if (Array.isArray(profileData?.previewSlots)) {
            latestPreviewSlots = profileData.previewSlots;
          }
        }
      } catch (statsErr) {
        console.warn('Nie udało się pobrać aktualnych slotów profilu:', statsErr.message);
      }

      const takenSlots = new Set(
        latestPreviewSlots
          .map((entry) => Number(entry.slot))
          .filter((slot) => Number.isFinite(slot) && slot >= 1 && slot <= 5)
      );
      const nextSlot = [1, 2, 3, 4, 5].find((slot) => !takenSlots.has(slot));

      if (!nextSlot) {
        showError('Wszystkie sloty 1-5 są już zajęte. Usuń któryś prawym przyciskiem na przycisku slotu.');
        return;
      }

      profilePreviewSaveBtn.disabled = true;
      try {
        const response = await fetch(API.ML_PERSON_PREVIEW_SLOT(personId, nextSlot), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previewClip })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Nie udało się zapisać slotu podglądu.');
        }

        showSuccess(`Zapisano 25-sekundowy podgląd dla profilu ${personId} w slocie ${nextSlot}.`);
        appState.selectedPreviewFrameTimes = [];
        await refreshModelSettingsData();
      } catch (err) {
        showError('Błąd zapisu slotu: ' + err.message);
      } finally {
        profilePreviewSaveBtn.disabled = false;
      }

      return;
    }

    profilePreviewSaveBtn.disabled = true;
    try {
      const response = await fetch(API.ML_PERSON_PREVIEW_FRAMES(personId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: appState.selectedPreviewFrameTimes.map((time) => ({
            cacheKey,
            time
          })),
          previewClip
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Nie udało się zapisać podglądu profilu.');
      }

      showSuccess(
        payload.previewClip?.url
          ? `Zapisano 25-sekundowy klip podglądu dla profilu ${personId}`
          : `Zapisano podgląd GIF dla profilu ${personId}`
      );
      appState.selectedPreviewFrameTimes = [];
      refreshModelSettingsData();
    } catch (err) {
      showError('Błąd zapisu podglądu: ' + err.message);
    } finally {
      profilePreviewSaveBtn.disabled = false;
    }
  });

  // Other Event Listeners
  generateThumbsBtn?.addEventListener('click', generateThumbnails);
  prevVideoBtn?.addEventListener('click', () => navigateQueueVideo(-1));
  nextVideoBtn?.addEventListener('click', () => navigateQueueVideo(1));
  cutBtn?.addEventListener('click', cutVideo);
  downloadAllBtn?.addEventListener('click', downloadAllFragments);
  deleteSourceBtn?.addEventListener('click', promptAndDeleteSourceFile);
  clearSelectionBtn?.addEventListener('click', clearSelection);
  openOutputBtn?.addEventListener('click', openOutputFolder);
  selectAllCheck?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));

  // NSFW quick test handler
  document.getElementById('nsfwTestRunBtn')?.addEventListener('click', async () => {
    const pathInput = document.getElementById('nsfwTestImagePath');
    const resultDiv = document.getElementById('nsfwTestResult');
    const imagePath = pathInput?.value?.trim();

    if (!imagePath) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<span style="color:#ef4444;">Wpisz ścieżkę do pliku.</span>';
      return;
    }

    const btn = document.getElementById('nsfwTestRunBtn');
    btn.disabled = true;
    btn.textContent = '⏳';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="color:#3b82f6;">Analizuję...</span>';

    try {
      const response = await fetch('/api/nsfw/quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath })
      });
      const data = await response.json();

      if (!response.ok) {
        resultDiv.innerHTML = `<span style="color:#ef4444;">Błąd: ${data.error || 'Nieznany błąd'}</span>`;
        return;
      }

      const score = Number(data.nsfw_score || 0);
      const isNsfw = Boolean(data.is_nsfw);
      const color = isNsfw ? '#ef4444' : '#22c55e';
      const label = isNsfw ? 'NSFW' : 'SAFE';
      const barWidth = Math.round(score);
      const person = data.person_detected !== undefined
        ? `<div><strong>Wykryto osobę:</strong> ${data.person_detected ? 'Tak' : 'Nie'} (${(Number(data.person_confidence || 0) * 100).toFixed(0)}%)</div>`
        : '';
      const threshold = data.threshold_used !== undefined
        ? `<div><strong>Próg:</strong> ${Number(data.threshold_used).toFixed(2)}</div>`
        : '';

      resultDiv.innerHTML = `
        <div style="padding:10px;border-radius:6px;border:2px solid ${color};background:${color}18;">
          <div style="font-size:16px;font-weight:bold;color:${color};margin-bottom:6px;">${label} — ${score.toFixed(1)}%</div>
          <div style="background:#e5e7eb;border-radius:4px;overflow:hidden;height:8px;margin-bottom:8px;">
            <div style="background:${color};width:${barWidth}%;height:100%;transition:width 0.3s;"></div>
          </div>
          <div style="font-size:12px;color:#374151;">
            <div><strong>Plik:</strong> ${data.filename}</div>
            ${person}
            ${threshold}
            <div><strong>Metoda:</strong> ${data.method || '—'}</div>
          </div>
        </div>
      `;
    } catch (err) {
      resultDiv.innerHTML = `<span style="color:#ef4444;">Błąd połączenia: ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Testuj';
    }
  });

  const regenerateThumbnailsDebounced = debounce(() => {
    if (!appState.videoId) {
      return;
    }

    generateThumbnails();
  }, 450);

  const rescanNsfwDebounced = debounce(async () => {
    if (!appState.videoId) {
      return;
    }

    if (!AUTO_SELECT_NSFW_SEGMENTS) {
      return;
    }

    if (!Array.isArray(appState.thumbnails) || appState.thumbnails.length === 0) {
      console.log('🔍 Brak screenów do ponownego skanowania NSFW.');
      return;
    }

    console.log('🔄 Zmiana progu modelu - ponowne skanowanie istniejących screenów NSFW...');
    await scanNSFWFragments();
    renderThumbnailsFromState();
  }, 450);

  // Interval slider - regenerate thumbnails when changed
  intervalSlider?.addEventListener('input', (e) => {
    const newInterval = parseInt(e.target.value);
    intervalValue.textContent = newInterval;
    appState.thumbInterval = newInterval;

    // If video is already loaded, regenerate thumbnails with new interval
    if (appState.videoId) {
      console.log(`🔄 Zmiana interwału na ${newInterval} sekund - regenerowanie screenów...`);
      regenerateThumbnailsDebounced();
    }
  });

  // Threshold slider - re-scan existing thumbnails when changed
  thresholdSlider?.addEventListener('input', (e) => {
    const newThreshold = parseFloat(e.target.value).toFixed(2);
    thresholdValue.textContent = newThreshold;

    // If video is already loaded, re-scan current thumbnails only (no re-generation).
    if (appState.videoId && Array.isArray(appState.thumbnails) && appState.thumbnails.length > 0) {
      console.log(`🔄 Zmiana progu modelu na ${newThreshold} - ponowne skanowanie istniejących screenów...`);
      rescanNsfwDebounced();
    }
  });

  // ─── Queue Button Listeners ────────────────────────────────────────────
  document.getElementById('queuePauseBtn')?.addEventListener('click', () => {
    if (queuePaused) {
      queuePaused = false;
      renderQueueUI();
      processQueue();
    } else {
      queuePaused = true;
      renderQueueUI();
    }
  });

  document.getElementById('queueClearDoneBtn')?.addEventListener('click', () => {
    const before = fileQueue.length;
    for (let i = fileQueue.length - 1; i >= 0; i--) {
      if (fileQueue[i].status === 'done' || fileQueue[i].status === 'error') {
        fileQueue.splice(i, 1);
      }
    }
    if (fileQueue.length !== before) renderQueueUI();
  });

  document.getElementById('turboModeCheck')?.addEventListener('change', (e) => {
    turboModeEnabled = e.target.checked;
    if (turboModeEnabled && !queueProcessing) {
      const next = fileQueue.find(item => item.status === 'waiting');
      if (next) startTurboPreload(next);
    }
  });

  document.getElementById('queueCollapseBtn')?.addEventListener('click', () => {
    queueCollapsed = !queueCollapsed;
    renderQueueUI();
  });

  updateQueueNavigationButtons();
});;

// ─── FILE QUEUE FUNCTIONS ────────────────────────────────────────────────────

function getCompletedQueueItems() {
  return fileQueue.filter((item) => item.status === 'done' && item.savedState);
}

function getCurrentCompletedQueueIndex(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return -1;
  }

  if (activeQueueItemId !== null) {
    const byActiveId = items.findIndex((item) => item.id === activeQueueItemId);
    if (byActiveId >= 0) {
      return byActiveId;
    }
  }

  if (appState.videoId) {
    const byVideoId = items.findIndex((item) => Number(item.savedState?.videoId) === Number(appState.videoId));
    if (byVideoId >= 0) {
      return byVideoId;
    }
  }

  return -1;
}

function updateQueueFilePositionLabel() {
  if (!queueFilePosition) {
    return;
  }

  const total = fileQueue.length;
  if (total === 0) {
    queueFilePosition.textContent = '--/0';
    queueFilePosition.title = 'Brak plików w kolejce';
    return;
  }

  let currentIndex = -1;

  if (activeQueueItemId !== null) {
    currentIndex = fileQueue.findIndex((item) => item.id === activeQueueItemId);
  }

  if (currentIndex < 0 && appState.videoId) {
    currentIndex = fileQueue.findIndex((item) => Number(item.savedState?.videoId) === Number(appState.videoId));
  }

  if (currentIndex < 0 && queueCurrentId !== null) {
    currentIndex = fileQueue.findIndex((item) => item.id === queueCurrentId);
  }

  if (currentIndex >= 0) {
    queueFilePosition.textContent = `${currentIndex + 1}/${total}`;
    queueFilePosition.title = `Aktualnie otwarty plik: ${currentIndex + 1} z ${total}`;
  } else {
    queueFilePosition.textContent = `--/${total}`;
    queueFilePosition.title = `Łącznie plików w kolejce: ${total}`;
  }
}

function updateQueueNavigationButtons() {
  const items = getCompletedQueueItems();
  const disabled = items.length === 0;

  if (prevVideoBtn) {
    prevVideoBtn.disabled = disabled;
    prevVideoBtn.title = disabled ? 'Brak gotowych filmów w kolejce' : 'Poprzednie video';
  }

  if (nextVideoBtn) {
    nextVideoBtn.disabled = disabled;
    nextVideoBtn.title = disabled ? 'Brak gotowych filmów w kolejce' : 'Następne video';
  }

  updateQueueFilePositionLabel();
}

async function navigateQueueVideo(direction) {
  const items = getCompletedQueueItems();
  if (items.length === 0) {
    showError('Brak gotowych plików w kolejce do przełączania.');
    updateQueueNavigationButtons();
    return;
  }

  const step = direction < 0 ? -1 : 1;
  const currentIndex = getCurrentCompletedQueueIndex(items);
  let targetIndex;

  if (currentIndex < 0) {
    targetIndex = step > 0 ? 0 : items.length - 1;
  } else {
    targetIndex = currentIndex + step;
    if (targetIndex < 0 || targetIndex >= items.length) {
      showSuccess('To już skrajny element kolejki.');
      return;
    }
  }

  const targetItem = items[targetIndex];
  if (!targetItem?.savedState) {
    showError('Nie udało się odczytać stanu wybranego pliku.');
    return;
  }

  loadQueueItemState(targetItem);
  renderQueueUI();

  const hasCachedThumbnails = Array.isArray(targetItem.savedState?.thumbnails)
    && targetItem.savedState.thumbnails.length > 0;

  // For already processed queue items, reuse saved thumbnails/state.
  // Generate only when cache is missing.
  if (!hasCachedThumbnails) {
    await generateThumbnails();
  }
}

function shouldIgnoreGlobalShortcut(event) {
  const target = event?.target;
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tag = String(target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
    return true;
  }

  return false;
}

function handleGlobalNavigationShortcut(event) {
  if (!event) {
    return;
  }

  if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
    return;
  }

  if (shouldIgnoreGlobalShortcut(event)) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    navigateQueueVideo(-1);
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    navigateQueueVideo(1);
  }
}

function normalizeQueuePath(filePath) {
  return String(filePath || '')
    .trim()
    .replace(/\//g, '\\')
    .toLowerCase();
}

function buildQueueDedupKey({ file = null, filePath = null, name = '' } = {}) {
  if (filePath) {
    return `path:${normalizeQueuePath(filePath)}`;
  }

  if (file) {
    const fileName = String(file.name || name || '').toLowerCase();
    const fileSize = Number.isFinite(Number(file.size)) ? Number(file.size) : -1;
    const fileMtime = Number.isFinite(Number(file.lastModified)) ? Number(file.lastModified) : -1;
    return `file:${fileName}|${fileSize}|${fileMtime}`;
  }

  return `name:${String(name || '').toLowerCase()}`;
}

function collectQueueDedupKeys() {
  const keys = new Set();
  for (const item of fileQueue) {
    const key = buildQueueDedupKey(item);
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

function summarizeQueueAddResult({ added = 0, duplicate = 0, invalid = 0 } = {}) {
  if (added > 0) {
    showSuccess(`Dodano ${added} plik(ów) do kolejki.`);
  }

  if (duplicate > 0) {
    showError(`Nie dodano ${duplicate} plik(ów), bo są duplikatami.`);
  }

  if (invalid > 0) {
    showError(`Pominięto ${invalid} plik(ów) - nieobsługiwany format.`);
  }
}

function addFilesToQueue(files) {
  let added = 0;
  let duplicate = 0;
  let invalid = 0;
  const dedupKeys = collectQueueDedupKeys();

  for (const file of files) {
    const ext = file.name.toLowerCase();
    const valid = SUPPORTED_FORMATS.extensions.some(e => ext.endsWith(e));
    if (!valid) {
      invalid++;
      continue;
    }

    const dedupKey = buildQueueDedupKey({ file, name: file.name });
    if (dedupKeys.has(dedupKey)) {
      duplicate++;
      continue;
    }

    const id = ++queueIdCounter;
    fileQueue.push({ id, name: file.name, file, filePath: null, status: 'waiting', retryCount: 0, progress: 0, errorMsg: null, savedState: null, preloadData: null, fragmentsSavedOnDisk: false });
    dedupKeys.add(dedupKey);
    added++;
  }
  if (added > 0) { renderQueueUI(); processQueue(); }
  summarizeQueueAddResult({ added, duplicate, invalid });
}

function addPathsToQueue(paths) {
  let added = 0;
  let duplicate = 0;
  let invalid = 0;
  const dedupKeys = collectQueueDedupKeys();

  for (const filePath of paths) {
    const name = filePath.split(/[/\\]/).pop();
    const ext = name.toLowerCase();
    const valid = SUPPORTED_FORMATS.extensions.some(e => ext.endsWith(e));
    if (!valid) {
      invalid++;
      continue;
    }

    const dedupKey = buildQueueDedupKey({ filePath, name });
    if (dedupKeys.has(dedupKey)) {
      duplicate++;
      continue;
    }

    const id = ++queueIdCounter;
    fileQueue.push({ id, name, file: null, filePath, status: 'waiting', retryCount: 0, progress: 0, errorMsg: null, savedState: null, preloadData: null, fragmentsSavedOnDisk: false });
    dedupKeys.add(dedupKey);
    added++;
  }
  if (added > 0) { renderQueueUI(); processQueue(); }
  summarizeQueueAddResult({ added, duplicate, invalid });
}

async function processQueue() {
  if (queueProcessing || queuePaused) return;
  const next = fileQueue.find(item => item.status === 'waiting');
  if (!next) return;

  queueProcessing = true;
  queueCurrentId = next.id;
  next.status = 'processing';
  renderQueueUI();

  let done = false;
  while (!done) {
    try {
      await runQueueItemPipeline(next);
      next.status = 'done';
      next.progress = 100;
      done = true;
    } catch (err) {
      next.retryCount++;
      if (next.retryCount === 1) {
        next.errorMsg = `Ponawiam… (${err.message})`;
        renderQueueUI();
        await new Promise(r => setTimeout(r, 1500));
        next.errorMsg = null;
      } else {
        next.status = 'error';
        next.errorMsg = err.message;
        renderQueueUI();
        const action = await showQueueErrorDialog(next.name, err.message);
        if (action === 'retry') {
          next.retryCount = 0;
          next.status = 'processing';
          next.errorMsg = null;
          renderQueueUI();
        } else if (action === 'skip') {
          done = true;
        } else {
          queueProcessing = false;
          queuePaused = true;
          queueCurrentId = null;
          renderQueueUI();
          return;
        }
      }
    }
  }

  queueProcessing = false;
  queueCurrentId = null;
  renderQueueUI();

  if (turboModeEnabled) {
    const nextItem = fileQueue.find(item => item.status === 'waiting');
    if (nextItem) startTurboPreload(nextItem);
  }
  if (!queuePaused) processQueue();
}

async function runQueueItemPipeline(item) {
  let uploadData;
  if (item.preloadData) {
    uploadData = item.preloadData;
    item.preloadData = null;
    item.progress = 40;
  } else if (item.file) {
    uploadData = await uploadFilePromise(item.file, (pct) => {
      item.progress = Math.round(pct * 40);
      renderQueueUI();
    });
  } else {
    uploadData = await uploadPathPromise(item.filePath);
    item.progress = 40;
  }
  renderQueueUI();

  item.progress = 45;
  renderQueueUI();

  const snapshot = await buildQueueItemSnapshot(uploadData, item);

  item.progress = 95;
  renderQueueUI();

  item.savedState = {
    ...snapshot,
    selectedSegments: Array.isArray(snapshot.selectedSegments)
      ? snapshot.selectedSegments.map((segment) => ({ ...segment }))
      : (item.savedState?.selectedSegments
        ? item.savedState.selectedSegments.map((segment) => ({ ...segment }))
        : []),
    fragmentsSavedOnDisk: Boolean(item.savedState?.fragmentsSavedOnDisk || item.fragmentsSavedOnDisk)
  };

  if (activeQueueItemId === item.id) {
    loadQueueItemState(item);
  }
}

async function buildQueueItemSnapshot(uploadData, item) {
  const thumbInterval = 25;
  const threshold = parseFloat(thresholdSlider?.value || '0.50');
  const baseData = await fetchThumbnailsForVideo({
    videoId: uploadData.id,
    videoDuration: uploadData.duration,
    thumbInterval,
    videoCacheKey: uploadData.cacheKey || uploadData.id,
    threshold
  });

  item.progress = 80;
  renderQueueUI();

  let nsfwAnalysis = baseData.nsfw_analysis || {};
  const thumbnails = baseData.thumbnails || [];
  const analysisByThumbCoversAll = thumbnails.length > 0
    ? thumbnails.every((thumb) => {
      const key = String(thumb.time);
      return Object.prototype.hasOwnProperty.call(nsfwAnalysis, key)
        || Object.prototype.hasOwnProperty.call(nsfwAnalysis, thumb.time);
    })
    : false;

  let autoSelectedSegments = [];
  let nsfwThresholdUsed = threshold;
  let nsfwScanDone = false;

  // Run NSFW scan once in queue pipeline and persist reusable result in saved state.
  if (AUTO_SELECT_NSFW_SEGMENTS && thumbnails.length > 0) {
    const scanResponse = await fetch('/api/scan-nsfw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId: `queue_${item.id}_${Date.now()}`,
        videoPath: API.VIDEO(uploadData.id),
        cacheKey: baseData.cache_key || uploadData.cacheKey || uploadData.id,
        duration: uploadData.duration,
        thumbnailTimes: thumbnails.map((thumb) => thumb.time),
        threshold
      })
    });

    if (scanResponse.ok) {
      const scanData = await scanResponse.json();
      nsfwScanDone = true;
      if (scanData.nsfw_analysis && typeof scanData.nsfw_analysis === 'object') {
        nsfwAnalysis = scanData.nsfw_analysis;
      }
      nsfwThresholdUsed = Number.isFinite(Number(scanData.threshold_used))
        ? Number(scanData.threshold_used)
        : threshold;

      if (Array.isArray(scanData.nsfwSegments) && scanData.nsfwSegments.length > 0) {
        autoSelectedSegments = scanData.nsfwSegments.map((segment) => ({
          start: segment.start,
          end: segment.end,
          groupId: NSFW_GROUP_ID,
          confidence: segment.confidence,
          frameCount: segment.frameCount
        }));
      }
    }
  }

  return {
    videoId: uploadData.id,
    videoCacheKey: baseData.cache_key || uploadData.cacheKey || uploadData.id,
    videoDuration: uploadData.duration,
    videoFile: { name: uploadData.originalName },
    currentPersonId: extractPersonIdFromVideoName(uploadData.originalName),
    thumbnails,
    nsfwAnalysis,
    selectedSegments: autoSelectedSegments,
    nsfwScanDone,
    nsfwThresholdUsed,
    thumbInterval,
    originalName: uploadData.originalName,
    fragmentsSavedOnDisk: Boolean(item.savedState?.fragmentsSavedOnDisk || item.fragmentsSavedOnDisk)
  };
}

function markActiveQueueItemSavedToDisk() {
  let targetItem = null;

  if (activeQueueItemId !== null) {
    targetItem = fileQueue.find((item) => item.id === activeQueueItemId) || null;
  }

  if (!targetItem && appState.videoId) {
    targetItem = fileQueue.find((item) => item.savedState?.videoId === appState.videoId) || null;
  }

  if (!targetItem) {
    return;
  }

  targetItem.fragmentsSavedOnDisk = true;
  if (!targetItem.savedState) {
    targetItem.savedState = {};
  }
  targetItem.savedState.fragmentsSavedOnDisk = true;
  appState.filesDownloaded = true;
  renderQueueUI();
}

function uploadFilePromise(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file);
    const xhr = new XMLHttpRequest();
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      });
    }
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Błąd parsowania odpowiedzi serwera')); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Błąd połączenia')));
    xhr.addEventListener('abort', () => reject(new Error('Przerwano')));
    xhr.open('POST', API.UPLOAD);
    xhr.send(formData);
  });
}

async function uploadPathPromise(filePath) {
  const res = await fetch('/api/upload-from-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function startTurboPreload(item) {
  if (item.preloadData || item.status !== 'waiting') return;
  try {
    item.preloadData = item.file
      ? await uploadFilePromise(item.file, null)
      : await uploadPathPromise(item.filePath);
    renderQueueUI();
  } catch {
    item.preloadData = null;
  }
}

function loadQueueItemState(item) {
  if (!item.savedState) return;
  const s = item.savedState;
  activeQueueItemId = item.id;
  resetAppStateAndUI();
  appState.videoId = s.videoId;
  appState.videoCacheKey = s.videoCacheKey;
  appState.videoDuration = s.videoDuration;
  appState.videoFile = s.videoFile;
  appState.currentPersonId = s.currentPersonId;
  appState.thumbnails = [...(s.thumbnails || [])];
  appState.nsfwAnalysis = { ...(s.nsfwAnalysis || {}) };
  appState.selectedSegments = (s.selectedSegments || []).map((segment) => ({ ...segment }));
  appState.thumbInterval = s.thumbInterval || 25;
  if (intervalSlider) intervalSlider.value = appState.thumbInterval;
  if (intervalValue) intervalValue.textContent = appState.thumbInterval;
  if (thresholdSlider && Number.isFinite(Number(s.nsfwThresholdUsed))) {
    thresholdSlider.value = Number(s.nsfwThresholdUsed).toFixed(2);
  }
  if (thresholdValue && Number.isFinite(Number(s.nsfwThresholdUsed))) {
    thresholdValue.textContent = Number(s.nsfwThresholdUsed).toFixed(2);
  }
  if (videoName) videoName.textContent = s.originalName || (s.videoFile && s.videoFile.name) || '';
  if (personName) personName.textContent = s.currentPersonId || '';
  if (videoDuration) videoDuration.textContent = formatTime(s.videoDuration);
  if (previewSection) previewSection.style.display = 'block';
  if (generateThumbsBtn) generateThumbsBtn.disabled = false;
  appState.filesDownloaded = Boolean(s.fragmentsSavedOnDisk || item.fragmentsSavedOnDisk);
  if (deleteSourceBtn?.style) {
    deleteSourceBtn.style.display = appState.filesDownloaded ? 'block' : 'none';
  }
  updatePersonModelStatsPanel();
  renderThumbnailsFromState();
}

function showQueueErrorDialog(fileName, errorMsg) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('queueErrorDialog');
    const msgEl = document.getElementById('queueErrorMsg');
    if (!dialog || !msgEl) { resolve('skip'); return; }
    msgEl.textContent = `Plik: "${fileName}"\n${errorMsg}`;
    dialog.style.display = 'flex';

    const retryBtn = document.getElementById('queueErrorRetry');
    const skipBtn  = document.getElementById('queueErrorSkip');
    const stopBtn  = document.getElementById('queueErrorStop');

    const cleanup = (action) => {
      dialog.style.display = 'none';
      retryBtn.removeEventListener('click', onRetry);
      skipBtn.removeEventListener('click', onSkip);
      stopBtn.removeEventListener('click', onStop);
      resolve(action);
    };
    const onRetry = () => cleanup('retry');
    const onSkip  = () => cleanup('skip');
    const onStop  = () => cleanup('stop');
    retryBtn.addEventListener('click', onRetry);
    skipBtn.addEventListener('click', onSkip);
    stopBtn.addEventListener('click', onStop);
  });
}

function renderQueueUI() {
  const section = document.getElementById('queueSection');
  if (!section) return;
  const total = fileQueue.length;
  section.style.display = total > 0 ? 'block' : 'none';
  if (total === 0) {
    updateQueueNavigationButtons();
    return;
  }

  section.classList.toggle('queue-collapsed', queueCollapsed);
  const collapseBtn = document.getElementById('queueCollapseBtn');
  if (collapseBtn) {
    collapseBtn.textContent = queueCollapsed ? '▾ Rozwiń' : '▴ Zwiń';
    collapseBtn.title = queueCollapsed ? 'Rozwiń listę kolejki' : 'Zwiń listę kolejki';
    collapseBtn.setAttribute('aria-expanded', queueCollapsed ? 'false' : 'true');
  }

  const processed = fileQueue.filter(i => i.status === 'done' || i.status === 'error').length;
  const processedPercent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const fillEl = document.getElementById('queueProgressFill');
  const textEl = document.getElementById('queueProgressText');
  if (fillEl) fillEl.style.width = `${processedPercent}%`;
  if (textEl) textEl.textContent = `${processed}/${total}`;

  const countEl = document.getElementById('queueCount');
  if (countEl) countEl.textContent = total;
  const inlineSummaryEl = document.getElementById('queueInlineSummary');
  if (inlineSummaryEl) inlineSummaryEl.textContent = `${processed}/${total} · ${processedPercent}%`;
  updateQueueNavigationButtons();

  const pauseBtn = document.getElementById('queuePauseBtn');
  if (pauseBtn) {
    pauseBtn.textContent = queuePaused ? '▶ Wznów' : '⏸ Pauza';
    pauseBtn.className = 'btn ' + (queuePaused ? 'btn-primary' : 'btn-warning');
  }

  const list = document.getElementById('queueList');
  if (!list) return;
  list.innerHTML = '';

  const statusLabels = { waiting: 'Oczekuje', processing: 'Przetwarzanie', paused: 'Pauza', error: 'Błąd', done: 'Gotowe' };

  fileQueue.forEach(item => {
    const div = document.createElement('div');
    const isActive = queueCurrentId === item.id || activeQueueItemId === item.id;
    div.className = `queue-item queue-item-${item.status}${isActive ? ' queue-item-active' : ''}`;
    div.dataset.id = item.id;
    if (item.status === 'waiting') div.draggable = true;

    const isTurbo = turboModeEnabled && item.preloadData && item.status === 'waiting';
    const isSavedToDisk = Boolean(item.savedState?.fragmentsSavedOnDisk || item.fragmentsSavedOnDisk);
    const progressBar = item.status === 'processing'
      ? `<div class="queue-item-progress"><div class="queue-item-progress-fill" style="width:${item.progress}%"></div></div>`
      : '';
    const errMsg = item.errorMsg
      ? `<div class="queue-item-error-msg">${item.errorMsg}</div>`
      : '';
    const removeBtn = item.status !== 'processing'
      ? `<button class="queue-remove-btn" data-id="${item.id}" title="Usuń">✕</button>`
      : '';
    const deleteSourceBtnInline = isSavedToDisk && item.sourceDeleted !== true
      ? `<button class="queue-delete-source-btn" data-id="${item.id}" title="Usuń plik źródłowy">🗑️ Usuń źródło</button>`
      : item.sourceDeleted === true
        ? `<span class="queue-source-deleted-badge">🗑️ źródło w koszu</span>`
        : '';

    div.innerHTML = `
      <span class="queue-drag-handle">⠿</span>
      <div class="queue-item-body">
        <div class="queue-item-name" title="${item.name}">${item.name}${isTurbo ? ' <span class="turbo-badge">⚡</span>' : ''}${isSavedToDisk ? ' <span style="color:#16a34a; font-weight:600;">✅ zapisano fragmenty na hdd</span>' : ''}</div>
        ${progressBar}${errMsg}
      </div>
      ${deleteSourceBtnInline}
      <span class="queue-status-badge queue-status-${item.status}">${statusLabels[item.status] || item.status}</span>
      ${removeBtn}
    `;

    if (item.status === 'done') {
      div.style.cursor = 'pointer';
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('queue-remove-btn')) return;
        loadQueueItemState(item);
        list.querySelectorAll('.queue-item').forEach(el => el.classList.remove('queue-item-active'));
        div.classList.add('queue-item-active');
      });
    }

    div.querySelector('.queue-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = fileQueue.findIndex(i => i.id === item.id);
      if (idx !== -1 && item.status !== 'processing') {
        if (activeQueueItemId === item.id) {
          activeQueueItemId = null;
        }
        fileQueue.splice(idx, 1);
        renderQueueUI();
      }
    });

    div.querySelector('.queue-delete-source-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!item.savedState?.videoId && !item.videoId) {
        showError('Brak ID wideo – nie można usunąć pliku źródłowego');
        return;
      }
      const shouldDelete = confirm('🗑️ Czy na pewno chcesz przenieść plik źródłowy do Kosza?');
      if (!shouldDelete) return;
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = '⏳ Usuwanie...';
      try {
        const videoId = item.savedState?.videoId || item.videoId;
        const response = await fetch(API.DELETE_SOURCE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId })
        });
        if (response.ok) {
          item.sourceDeleted = true;
          showSuccess('✅ Plik źródłowy przeniesiono do Kosza');
          renderQueueUI();
        } else {
          const error = await response.json();
          showError('Błąd usuwania: ' + (error.error || 'Nieznany błąd'));
          btn.disabled = false;
          btn.textContent = '🗑️ Usuń źródło';
        }
      } catch (err) {
        showError('Błąd: ' + err.message);
        btn.disabled = false;
        btn.textContent = '🗑️ Usuń źródło';
      }
    });

    if (item.status === 'waiting') {
      div.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(item.id));
        div.classList.add('dragging');
      });
      div.addEventListener('dragend', () => div.classList.remove('dragging'));
    }

    div.addEventListener('dragover',  (e) => { e.preventDefault(); div.classList.add('drag-target'); });
    div.addEventListener('dragleave', ()  => div.classList.remove('drag-target'));
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-target');
      const srcId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (srcId === item.id) return;
      const fromIdx = fileQueue.findIndex(i => i.id === srcId);
      const toIdx   = fileQueue.findIndex(i => i.id === item.id);
      if (fromIdx < 0 || toIdx < 0) return;
      if (fileQueue[fromIdx].status !== 'waiting') return;
      const [moved] = fileQueue.splice(fromIdx, 1);
      fileQueue.splice(toIdx, 0, moved);
      renderQueueUI();
    });

    list.appendChild(div);
  });
}
