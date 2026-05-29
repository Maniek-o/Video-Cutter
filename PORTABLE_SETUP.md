# Video Cutter - Portable Application Setup

## 🎬 O aplikacji
Video Cutter to narzędzie do wycinania fragmentów video bez utraty jakości, działające jako natywna aplikacja desktopowa na Windows.

## 📋 Wymagania wstępne

### System operacyjny
- **Windows 7 SP1** lub nowszy (64-bit)

### Oprogramowanie
- **Node.js** (wersja 16+ zalecana)
  - Pobierz z: https://nodejs.org/ (wyber LTS)
  - Instalator automatycznie doda `npm` do PATH

### FFmpeg (opcjonalnie, już zawarty w pakiecie)
- Aplikacja zawiera wbudowany FFmpeg
- Nie wymaga dodatkowej instalacji

## 🚀 Uruchomienie aplikacji

### Metoda 1: Skrypt Batch (Najprostsza)
1. Rozpakuj folder `video-cutter`
2. **Kliknij dwukrotnie** na `run.bat`
3. Aplikacja uruchomi się automatycznie

### Metoda 2: PowerShell
```powershell
.\run.ps1
```

### Metoda 3: Command Line (Terminal)
```bash
cd video-cutter
npm install    # Tylko przy pierwszym uruchomieniu
npm run electron
```

## 📦 Struktura folderu (Portable)

```
video-cutter/
├── run.bat                    # Skrypt uruchomieniowy (Windows)
├── run.ps1                    # Skrypt PowerShell
├── main.js                    # Electron entry point
├── preload.js                 # Security layer
├── server.js                  # Express backend
├── nsfw_detector.py           # NSFW detection script
├── package.json               # Konfiguracja Node.js
├── package-lock.json
├── public/                    # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── node_modules/              # Dependencies (pobierane auto)
├── uploads/                   # Folder na wgrywane pliki (temp)
├── cache/                     # Cache dla screenów
├── output/                    # Folder z wycietymi plikami
└── README.md                  # Ta instrukcja
```

## 🎯 Użytkowanie

1. **Wgrywanie pliku**
   - Przeciągnij video na obszar upload lub kliknij
   - Obsługiwane formaty: MP4, MKV, TS
   - Rozmiar do 100GB

2. **Generowanie screenów**
   - Ustaw interwał (domyślnie 30s)
   - Kliknij "Wygeneruj screeny"
   - Automatycznie wykryje treści dla dorosłych (NSFW)

3. **Zaznaczanie fragmentów**
   - **Klik** - zaznacz/odznaacz element
   - **Drag** - zaznacz zakres
   - **Drag na zaznaczonym** - odznaacz zakres
   - Niezaznaczone są szarawe, zaznaczone mają CZERWONĄ ramkę

4. **Eksport**
   - Kliknij "Połącz fragmenty i eksportuj"
   - Poczekaj na przetwarzanie
   - Pobierz wszystkie fragmenty jednocześnie

## 🔧 Konfiguracja

### Zmiana portu serwera
Edytuj `server.js`, linia:
```javascript
const PORT = 5000;  // Zmień na inny port
```

### Zwiększenie limitu rozmiaru pliku
Edytuj `server.js`, linia:
```javascript
limits: {
  fileSize: 100 * 1024 * 1024 * 1024 // Zmień GB
}
```

## 🐛 Rozwiązywanie problemów

### Problem: "Node.js not found"
**Rozwiązanie**: Zainstaluj Node.js z https://nodejs.org/

### Problem: Aplikacja nie otwiera się
**Rozwiązanie**: 
1. Kliknij `run.ps1` zamiast `run.bat`
2. Lub otwórz terminal i uruchom: `npm run electron`

### Problem: "Port 5000 already in use"
**Rozwiązanie**: 
1. Zmień PORT w `server.js`
2. Lub zamknij inne aplikacje na tym porcie

### Problem: Brak FFmpeg
**Rozwiązanie**: `npm install` powinno pobrać FFmpeg automatycznie

## 📊 Logi i Debug

Aby zobaczyć szczegółowe logi:
```bash
# Terminal
npm run electron

# Logi pojawią się w DevTools (F12 w aplikacji)
```

## 🎁 Dostępne komendy

```bash
npm start              # Uruchom serwer bez Electron (dev)
npm run electron       # Uruchom aplikację Electron
npm run electron-dev   # Uruchom dev mode (serwer + Electron)
npm run build-app      # Zbuduj aplikację instalatora
npm run build-portable # Zbuduj portable executable
```

## 📈 Kompilacja na .exe (Advanced)

Aby utworzyć wersję portable `.exe` (wszystko w jednym pliku):

```bash
npm install                # Zainstaluj zależności
npm run build-portable     # Kompiluj portable executable
```

Wynik: `dist/Video Cutter-1.0.0.exe`

## 🔒 Bezpieczeństwo

- ✅ Izolacja kontekstu Electron (no nodeIntegration)
- ✅ Preload script do komunikacji z backendend
- ✅ FFmpeg sandbox
- ✅ Sprawdzanie typów plików

## 📝 Notatki

- Wszystkie pliki są przechowywane tymczasowo w folderze `uploads/` i `cache/`
- Wycięte video są w folderze `output/`
- Po zamknięciu aplikacji serwer jest automatycznie zatrzymywany

## 🌍 Wielojęzyczność

Interfejs dostępny w: **Polskim**

## 💡 Porady

- Zmień interwał screenów dla lepszej jakości (mniejszy = więcej screenów)
- NSFW fragmenty są automatycznie zaznaczane (razem z sąsiadami)
- Drag-select pozwala zaznaczać duże zakresy szybko

## 📞 Support

Dla problemów:
1. Sprawdź logi (F12 -> Console)
2. Upewnij się że Node.js jest zainstalowany
3. Upewnij się że port 5000 jest wolny

## 📄 Licencja
ISC

---

**Wersja:** 1.0.0  
**Data:** 2026-04-17  
**Platform:** Windows (x64)
