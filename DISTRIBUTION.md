# 📦 Video Cutter - Distribution Guide (Portable)

## Jak rozpakować i uruchomić aplikację

### Krok 1: Pobierz i rozpakuj
1. Pobierz plik `video-cutter-portable.zip`
2. Rozpakuj do wybranego folderu (np. `C:\Program Files\video-cutter`)
3. Folder powinien zawierać: `run.bat`, `server.js`, `main.js`, itp.

### Krok 2: Sprawdzenie Node.js
Aplikacja wymaga zainstalowanego **Node.js**:
- Pobierz z: https://nodejs.org/ (LTS version)
- Zainstaluj (domyślne ustawienia)
- Zweryfikuj: otwórz CMD i wpisz `node --version`

### Krok 3: Uruchomienie
**Metoda 1 (Najprostsza):**
- Kliknij dwukrotnie `run.bat` w folderze aplikacji
- Czekaj na otwarcie okna aplikacji (może chwilę trwać przy pierwszym uruchomieniu)

**Metoda 2 (PowerShell):**
```powershell
.\run.ps1
```

**Metoda 3 (Zaawansowane):**
```bash
cd C:\sciezka\do\video-cutter
npm run electron
```

## 📋 Co się dzieje?

1. **Przy pierwszym uruchomieniu** (~5-10 minut):
   - Pobierają się zależności (npm packages)
   - Pobiera się FFmpeg
   - Terminal pokazuje "Installing dependencies..."

2. **Następne uruchomienia** (~2-3 sekundy):
   - Szybkie starty, bo wszystko jest już pobrane

3. **Okno aplikacji**:
   - Otwiera się natywne okno Windows
   - Aplikacja WebUI działa wewnątrz

## 🎯 Struktura folderu (co się tam znajduje)

```
video-cutter/
├── run.bat                    ← Kliknij tutaj!
├── run.ps1
├── main.js                    ← Electron app
├── server.js                  ← Backend
├── public/                    ← Interfejs (HTML/CSS/JS)
├── node_modules/              ← Zależności (pobiera się auto)
├── uploads/                   ← Temp. pliki video
├── output/                    ← Wyciete pliki
└── ... (inne pliki)
```

## 🚀 Optimalizacja (Opcjonalnie)

### Szybszy startup - stwórz shortcut
1. Kliknij PPM na `run.bat`
2. Wyślij do → Desktop (utwórz skrót)
3. Kliknij skrót aby uruchomić

### Zmiana folderu (jeśli potrzebujesz)
Możesz przenieść folder `video-cutter` gdziekolwiek na komputerze - aplikacja zawsze będzie działać.

## ⚠️ Typowe problemy

| Problem | Rozwiązanie |
|---------|-----------|
| "Node.js not found" | Zainstaluj Node.js z https://nodejs.org/ |
| Okno się nie otwiera | Czekaj dłużej przy pierwszym uruchomieniu |
| "Port 5000 in use" | Zmień PORT w server.js lub zamknij inne apki |
| Antywirus blokuje | To jest normalne, kliknij "Zezwalaj" |

## 📊 Systemy operacyjne

- ✅ **Windows 10 / 11** (64-bit) - **ZALECANE**
- ✅ Windows 7 SP1 (64-bit) - Powinno działać
- ❌ Windows 32-bit - **NIE OBSŁUGIWANE**
- ❌ macOS / Linux - Potrzeba osobnej wersji

## 🔄 Aktualizacja aplikacji

Aby zaktualizować do nowej wersji:
1. Usuń stary folder `video-cutter`
2. Rozpakuj nowy plik `video-cutter-portable.zip`
3. Uruchom `run.bat`

Folder `uploads/` i `output/` zostaną czyste (jeśli chcesz zachować wyciete pliki, skopiuj `output/` folder zanim usuniesz старый).

## 💾 Gdzie są moje pliki?

- **Wgrywane video**: `uploads/` (usuwa się po zamknięciu)
- **Screeny (cache)**: `cache/` (usuwa się automatycznie)
- **Wycięte pliki**: `output/` (**ZACHOWYWANE** - pobierz je!)

## 🎁 Funkcjonalności

✅ Wgrywanie video (MP4, MKV, TS)  
✅ Automatyczne generowanie screenów  
✅ Detekcja treści dla dorosłych (NSFW)  
✅ Zaznaczanie fragmentów (klik, drag, shift)  
✅ Drag-deselect (usuwanie przez drag)  
✅ Eksport do video  
✅ Pobieranie wszystkich fragmentów  

## 🔒 Bezpieczeństwo

- Wszystko działa lokalnie (NIE wysyłamy plików nigdzie)
- Folder `uploads/` jest czyszczony automatycznie
- Brak kont, haseł, subskrypcji

## 📞 Jeśli coś nie działa

1. **Sprawdź Node.js**: `node --version`
2. **Spróbuj PowerShell**: `.\run.ps1` zamiast `.bat`
3. **Uruchom manualne**: `npm run electron` w cmd
4. **Przeładuj**: F5 w oknie aplikacji

---

**Wersja:** 1.0.0  
**Ostatnia aktualizacja:** 2026-04-17
