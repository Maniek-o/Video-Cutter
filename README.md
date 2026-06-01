# 🎬 Video Cutter - Aplikacja Portable

Przenośna desktopowa aplikacja do wycinania fragmentów z wideo na Windows. Brak instalacji, brak przeglądarki - natywne okno desktopowe.

## ✨ Główne Cechy

- ✅ **Bezstratne wycinanie** - Fragmenty wycinane na keyframach bez re-encodingu
- ✅ **Podgląd klatek** - Generowanie automatycznych screenów
- ✅ **Wielokrotne wycięcia** - Zaznaczanie dowolnej ilości fragmentów
- ✅ **Detekcja NSFW** - Automatyczne zaznaczanie treści dla dorosłych + sąsiednie ramki
- ✅ **Desktop App** - Natywne okno Electron, bez przeglądarki
- ✅ **Portable** - ZIP, brak instalacji
- ✅ **Export** - Pobierz fragmenty jeden po jednym lub wszystkie naraz
- ✅ **UI/UX** - Czerwone ramki dla zaznaczonych, szarość dla pozostałych
- ✅ **Interfejs PL** - W pełni w polskim

## 🚀 Szybki Start

### 1. Wymagania Wstępne
- **Windows 10/11** (64-bit)
- **Node.js 16+** (LTS) - [Pobierz](https://nodejs.org/)

### 2. Pobranie i Rozpakowanie
1. Pobierz `video-cutter-portable.zip`
2. Rozpakuj gdziekolwiek na dysku (np. `C:\Applications\video-cutter`)

### 3. Uruchomienie (Wybierz Jedną Opcję)

**Opcja A: Domyślnie (Rekomendowany)**
```bash
Kliknij dwukrotnie: run.bat
```
Batch automatycznie:
- Instaluje Node.js packages (jeśli brakuje)
- Uruchamia Express backend (port 5000)
- Otwiera aplikację Electron

**Opcja B: PowerShell** (Alternatywa)
```powershell
.\run.ps1
```

**Opcja C: Ręczne**
```bash
npm install
npm run electron
```

⏱️ Przy pierwszym uruchomieniu instalacja pakietów npm może trwać 2-3 minuty.

## 🐳 Docker i Unraid

Prywatne pliki modelu NSFW nie są częścią repozytorium GitHub ani kontekstu budowania obrazu. Aplikacja obsługuje zewnętrzny katalog danych modelu przez zmienną środowiskową `NSFW_MODEL_DATA_DIR`.

Jeśli Unraid nie pokazuje aktualizacji kontenera, najczęściej powód jest prosty: kontener nie korzysta z obrazu z rejestru albo rejestr nie dostaje nowego `latest`. Żeby aktualizacje były wykrywane, używaj obrazu `ghcr.io/maniek-o/video-cutter:latest`. Lokalny build z Dockerfile lub własna nazwa obrazu nie będzie raportowana przez mechanizm aktualizacji Unraid.

Domyślne lokalizacje:
- Windows/dev: `Pliki do modelu NFSW` w katalogu projektu
- Kontener: `/data/nsfw-model`

Przykład uruchomienia:

```bash
docker run -d \
  --name video-cutter \
  -p 5001:5001 \
  -p 5003:5003 \
  -e NSFW_MODEL_DATA_DIR=/data/nsfw-model \
  -v /mnt/user/appdata/video-cutter/nsfw-model:/data/nsfw-model \
  ghcr.io/maniek-o/video-cutter:latest
```

Na Unraid skopiuj swoje prywatne pliki modelu do katalogu hosta, na przykład `/mnt/user/appdata/video-cutter/nsfw-model`, a następnie zamontuj go w kontenerze pod `/data/nsfw-model`.

Przykładowa konfiguracja kontenera w Unraid:
- Repository: `ghcr.io/maniek-o/video-cutter:latest`
- Network Type: `bridge`
- WebUI: `http://[IP]:[PORT:5001]`
- Port map 1: `5001` host -> `5001` container
- Port map 2: `5003` host -> `5003` container
- Path: `/mnt/user/appdata/video-cutter/nsfw-model` host -> `/data/nsfw-model` container
- Variable: `NSFW_MODEL_DATA_DIR=/data/nsfw-model`
- Device: `/dev/dri` -> `/dev/dri`

Po wypchnięciu zmian do `master` workflow GitHub Actions opublikuje nowy obraz `ghcr.io/maniek-o/video-cutter:latest`. Dopiero wtedy Unraid będzie miał co wykryć jako nową wersję.

Jeśli korzystasz z zewnętrznego skryptu treningowego, ustaw dodatkowo:
- `NSFW_TRAINING_SCRIPT`
- `NSFW_TRAINING_PYTHON`
- opcjonalnie `NSFW_EXTERNAL_LOG_DIR`

Bez tych zmiennych start lub wznowienie zewnętrznego treningu zwróci czytelny błąd konfiguracji, zamiast używać twardych ścieżek Windows.

### Payload plików modelu poza GitHub

Jeżeli chcesz przenieść wszystkie duże prywatne pliki modelu do Unraid jednym ruchem, użyj skryptu:

PowerShell:

./tools/unraid/build-unraid-model-payload.ps1

Skrypt tworzy:
- `unraid-transfer/video-cutter-unraid-payload/`
- `unraid-transfer/video-cutter-unraid-payload.zip`

Wypakuj payload i skopiuj zawartość folderu `nsfw-model` do:
- `/mnt/user/appdata/video-cutter/nsfw-model`

### Electron na Windows jako okienko WebUI Unraid

Do uruchamiania Video Cutter jako okna Electron podłączonego do serwera na Unraid użyj:

PowerShell:

./tools/unraid/create-desktop-shortcut-video-cutter-unraid.ps1 -TargetUrl "http://IP_UNRAID:5001"

To tworzy skrót na pulpicie:
- `Video-cutter (unraid)`

Uruchamianie ręczne bez skrótu:
- `tools/unraid/launch-video-cutter-unraid.bat`

## 📦 Obsługiwane Formaty

| Format | Rozszerzenie | Maks. Rozmiar |
|--------|-------------|---------------|
| MPEG-4 | .mp4 | 5 GB |
| Matroska | .mkv | 5 GB |
| MPEG TS | .ts | 5 GB |

## 📖 Instrukcja Użytkowania

### Krok 1: Wgranie Wideo
- Kliknij na obszar "Przeciągnij wideo tutaj" 
- LUB: Otwórz dialog plików (przycisk "Wybierz plik")
- Obsługiwane formaty: **MP4, MKV, TS** (limit 5GB)

### Krok 2: Generowanie Screenów
- Aplikacja wyświetli dane wideo (nazwa, długość, FPS)
- Ustaw interwał screenów suwukiem (domyślnie 30 sekund)
  - Mniejszy interwał = więcej screenów (wolniejsze)
  - Większy interwał = mniej screenów (szybsze)
- Kliknij **"Wygeneruj screeny"**
- Czekaj na ukończenie generowania

### Krok 3: Zaznaczanie Fragmentów

**Podstawowe zaznaczanie:**
- Kliknij na screen lub element osi czasu aby zaznaczyć
- Zaznaczone fragmenty pojawią się z **czerwoną ramką**
- Niezaznaczone fragmenty są **szare (grayscale)**

**Zaznaczanie wielokrotne:**
- Drag-select po screenach aby zaznaczyć wiele naraz
- Kliknij na zaznaczony element aby odznaczyć

**Detekcja NSFW:**
- Aplikacja automatycznie skanuje zawartość
- Treść NSFW zostanie zaznaczona (jeśli wykryta)
- Sąsiednie ramki również zostaną zaznaczone

### Krok 4: Przegląd Fragmentów
- Na liście pojawią się wszystkie zaznaczone fragmenty
- Każdy fragment pokazuje: czas początkowy, czas końcowy, długość
- Fragmenty nie mogą się nakładać i muszą być chronologiczne

### Krok 5: Wycięcie i Export
- Kliknij **"Wytnij i eksportuj wideo"** aby rozpocząć
- LUB: Kliknij **"Pobierz wszystko"** aby pobrać naraz
- Każdy fragment będzie zapisany jako osobny plik

### Krok 6: Pobranie Plików
- Pliki pojawią się na liście z przyciskiem **"Pobierz"**
- Nazewnictwo: `original_1.mp4`, `original_2.mp4`, etc.
- Pliki znajdują się również w folderze `.\output\` (jeśli pobierałeś z folderu)

## 🛠️ Struktura Projektu

```
video-cutter/
├── main.js                # Electron - Entry point
├── preload.js             # Electron - Security layer
├── server.js              # Express backend
├── run.bat                # Windows batch launcher
├── run.ps1                # PowerShell launcher
├── public/
│   ├── index.html         # Interfejs HTML
│   ├── js/
│   │   └── main.js        # Logika frontendu
│   └── css/
│       └── style.css      # Style (red borders, grayscale)
├── uploads/               # Wgrywane pliki video
├── cache/                 # Cached screeny (thumbnails)
├── output/                # Wycięte fragmenty
├── node_modules/          # Dependencje (auto-instaluje)
├── package.json           # Konfiguracja projektu
└── README.md              # Ten plik
```

## 🎨 Interfejs Użytkownika

### Visual Design
- **Zaznaczone fragmenty** - Czerwona ramka `#FF0000` z efektem glow
- **Niezaznaczone fragmenty** - Czarno-białe (grayscale 100%, opacity 70%)
- **Przejścia** - Smooth transitions (300ms ease)
- **Responsywne** - Działa na różnych rozmiarach okna

### Komponenty
- Obszar upload/drag-drop
- Galeria screenów (thumbnails)
- Oś czasu (timeline) z fragmentami
- Lista zaznaczonych segmentów
- Progress bar dla operacji

## ⚙️ Konfiguracja

### Zmiana Interwału Screenów
- Suwak w interfejsie: 5-60 sekund
- Mniejszy = więcej screenów (bardziej szczegółowy, wolniejszy)
- Większy = mniej screenów (mniej szczegółów, szybszy)

### Limity Systemu
- Max rozmiar wideo: **5 GB**
- Max liczba fragmentów: bez limitu (zależy od RAM)
- Timeout wycięcia: 10 minut na fragment
- Cache thumbnails: ~50 MB na godz. wideo

## 🔧 Technologia

| Komponenta | Technologia |
|-----------|------------|
| Desktop App | Electron 31.0.0 |
| Backend | Node.js + Express.js |
| Przetwarzanie Wideo | FFmpeg + fluent-ffmpeg |
| Generowanie Screenów | Sharp.js |
| Detekcja NSFW | nsfw_detector.py |
| Frontend | HTML5 + Vanilla JS + CSS3 |
| Build | electron-builder |

## 📝 Notatki Techniczne

### Bezstratne Wycinanie
```bash
ffmpeg -i video.mp4 -ss START -to END -c:v copy -c:a copy output.mp4
```
- Brak re-encodingu = brak utraty jakości
- Wycinanie na keyframach (nie na pikselu)
- Niedokładność ±0.5-1 sekunda (normalne)

### Cache Screenów
- Screeny buforowane w `.\cache\`
- Jeśli istnieją, nie są regenerowane
- Znacznie przyspiesza powtórne otwarcie

### Bezpieczeństwo
- Context isolation włączone
- preload.js bridge dla IPC
- Brak dostępu do system API z renderer
- Komunikacja poprzez bezpieczne kanały

## 🐛 Rozwiązywanie Problemów

### Problem: "FFmpeg not found"
**Rozwiązanie:**
```bash
npm install
```
FFmpeg powinien zainstalować się automatycznie.

### Problem: Serwer się nie uruchamia
**Powody:**
- Port 5000 jest już zajęty
- Brakuje praw do zapisu w folderze projektu
- Brakuje Node.js

**Rozwiązanie:**
```bash
# Sprawdź Node.js
node --version
npm --version

# Zainstaluj dependencje
npm install

# Uruchom ręcznie
npm run electron
```

### Problem: Screeny się nie generują
**Przyczyny:**
- Plik video jest uszkodzony
- Nieobsługiwany format

**Rozwiązanie:**
- Sprawdź plik w VLC/MPC
- Konwertuj do MP4 jeśli w innym formacie
- Spróbuj inny plik

### Problem: Wycięcie nie działa
**Przyczyny:**
- Brak wybranych fragmentów
- Brak miejsca na dysku
- Brakuje uprawnień do zapisu

**Rozwiązanie:**
- Zaznacz co najmniej jeden fragment
- Sprawdź wolne miejsce na dysku
- Uruchom jako Administrator

### Problem: Aplikacja się zawiesza
**Rozwiązanie:**
- Zmniejsz interwał screenów
- Spróbuj mniejszy plik wideo
- Zamknij inne aplikacje żeby zwolnić RAM

### Problem: "Port 5000 already in use"
```bash
# Znajdź proces na porcie 5000
netstat -ano | findstr :5000

# Zabij proces (zamień PID)
taskkill /PID XXXX /F
```

## � Porady i Sztuczki

### Szybsze Generowanie Screenów
- Zwiększ interwał screenów (30 → 60 sekund)
- Każdy screen = 2-3 sekundy generowania

### Lepsze Wycięcia
- Jeśli ujęcie zaczyna się w środku sceny, odznaacz i zaznacz od pełnego keyframe'a
- MPEG TS (ts) może wymagać konwersji do MP4

### Zbiorczy Export
- Użyj przycisku "Pobierz wszystko" zamiast pobierać jeden po jednym
- 1-sekundowy interval między pobieraniami

## 📄 Licencja

ISC

## 👨‍💻 Autor

Aplikacja stworzona z Node.js, Express.js, Electron i FFmpeg.

---

**Wersja:** 1.0.0  
**Ostatnia aktualizacja:** Kwiecień 2026  
**Status:** Stabilna - Production Ready
