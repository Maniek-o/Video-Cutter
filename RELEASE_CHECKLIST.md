# ✅ Checklist - Video Cutter Portable Release

## Pre-Release Checklist

### Kod
- [x] `main.js` - Electron entry point
- [x] `preload.js` - Security layer
- [x] `server.js` - Backend (bez zmian)
- [x] `public/` - Frontend (bez zmian)
- [x] `package.json` - Build configuration
- [x] `run.bat` - Windows launcher
- [x] `run.ps1` - PowerShell launcher

### Dokumentacja
- [x] `PORTABLE_SETUP.md` - Setup guide
- [x] `DISTRIBUTION.md` - User guide
- [x] `.github/workflows/build.yml` - CI/CD

### Testing
- [x] Electron app uruchamia się
- [x] Serwer startuje prawidłowo
- [x] Frontend ładuje się
- [x] Klik na `run.bat` działa

### Konfiguracja
- [x] `electron-builder` zainstalowany
- [x] `concurrently` zainstalowany
- [x] `wait-on` zainstalowany
- [x] Build scripts w package.json

## Instrukcja Pakowania (Do Wysłania)

### Krok 1: Przygotowanie
```bash
cd C:\Users\Administrator\Desktop\video-cutter

# Czyszczenie
rm -r dist/
rm -r build/
rm -r out/

# Upewnij się że node_modules istnieje
npm install
```

### Krok 2: Kompilacja (Opcjonalnie - Portable EXE)
```bash
npm run build-portable
```
Wynik: `dist/Video Cutter-1.0.0.exe` (~200-300MB)

### Krok 3: Pakowanie do ZIP

**Metoda 1: Ręcznie (File Explorer)**
1. Stwórz folder `video-cutter-portable`
2. Skopiuj te pliki:
   - `run.bat`
   - `run.ps1`
   - `main.js`
   - `preload.js`
   - `server.js`
   - `nsfw_detector.py`
   - `package.json`
   - `package-lock.json`
   - `PORTABLE_SETUP.md`
   - `DISTRIBUTION.md`
   - `public/` (cały folder)
   - `node_modules/` (cały folder)

3. Kliknij PPM na folder → Wyślij do → Kompresowany folder ZIP
4. Rezultat: `video-cutter-portable.zip` (~500MB-1GB z node_modules)

**Metoda 2: PowerShell**
```powershell
# Przejdź do folderu rodzica
cd C:\Users\Administrator\Desktop

# Pakuj
Compress-Archive -Path video-cutter `
                 -DestinationPath video-cutter-portable.zip `
                 -CompressionLevel Optimal

# Wynik: video-cutter-portable.zip
```

**Metoda 3: 7-Zip (Najlepsze compression)**
1. Zainstaluj 7-Zip (https://www.7-zip.org/)
2. Kliknij PPM na `video-cutter` → 7-Zip → Add to archive
3. Ustawienia: ZIP format, Normal compression
4. Rezultat: mniejszy plik

### Krok 4: Optymalizacja Rozmiaru (Opcjonalnie)

Jeśli chcesz zmniejszyć rozmiar ZIP:

```bash
# Usuń niepotrzebne pliki
rm -r node_modules/electron/dist/resources/inspector/  # ~50MB
rm -r .git/
rm -r .github/
rm cache/*
rm uploads/*
rm output/*
```

### Krok 5: Weryfikacja ZIP

Rozpakuj gdzieś i testuj:
```bash
# Rozpakuj
Expand-Archive -Path video-cutter-portable.zip -DestinationPath C:\temp\test

# Testuj
cd C:\temp\test\video-cutter
.\run.bat
```

## Rozmiary Plików

| Opcja | Rozmiar | Uwagi |
|-------|---------|-------|
| Folder (z node_modules) | ~800MB | Gotowy do użytku |
| ZIP kompresowany | ~300-400MB | Po rozpaku ~800MB |
| Portable EXE | ~150-200MB | Zbudowany przez electron-builder |
| Bez node_modules | ~50MB | Musi pobrać przy pierwszym starcie |

## Opcja: ZIP Bez node_modules (Mniejszy)

Jeśli chcesz mniejszy ZIP (użytkownicy pobiorą node_modules przy starcie):

```bash
# Utwórz plik .npmrc aby pominąć devDeps
echo "save-optional=false" > .npmrc

# Pakuj bez node_modules
Compress-Archive -Path video-cutter `
                 -Exclude 'video-cutter\node_modules' `
                 -DestinationPath video-cutter-portable-slim.zip

# Rozmiar: ~50MB
# Przy starcie: automatycznie pobierze npm install (~5-10 minut)
```

## Upload/Dystrybucja

### GitHub Releases
1. Przejdź na https://github.com/[user]/video-cutter
2. Kliknij "Releases" → "Create new release"
3. Tag: `v1.0.0`
4. Upload: `video-cutter-portable.zip`
5. Opis:
   ```markdown
   # Video Cutter v1.0.0 - Portable Release
   
   ## What's New
   - Desktop app (Electron)
   - Portable (ZIP, no installation)
   - Windows 10/11 native
   
   ## Requirements
   - Windows 10/11 (64-bit)
   - Node.js installed
   
   ## How to Run
   1. Extract ZIP
   2. Double-click `run.bat`
   3. Wait for app to open
   
   [Download](#assets)
   ```

### Itch.io (Opcjonalnie)
1. Upload na https://itch.io
2. Category: "Games" → "Tools"
3. Wymagania: Windows, HTML5
4. File type: ZIP archive

## Final Checklist Przed Wysyłką

- [ ] ZIP zawiera wszystkie pliki
- [ ] Testowałeś na czystym Windowsie (jeśli możliwe)
- [ ] Dokumentacja jest jasna
- [ ] `run.bat` jest uruchamialny
- [ ] FFmpeg zawiera się w node_modules
- [ ] Brak błędów w package.json
- [ ] Version w package.json = Version w tagu
- [ ] Notatka o Node.js requirement

## Troubleshooting Package

Jeśli użytkownicy mają problemy:

1. **Brakuje Node.js** → Instrukcja w DISTRIBUTION.md
2. **Port 5000 zajęty** → Instrukcja modyfikacji
3. **Antywirus blokuje** → Normalne, "Zezwalaj"
4. **Okno się nie otwiera** → PowerShell zamiast Bat

## Przyszłe Aktualizacje

Aby zaaktualizować:
1. Zmień version w `package.json`
2. Zmień version w `PORTABLE_SETUP.md`
3. `npm install` (dla nowych deps)
4. Retestuj
5. Pakuj i wysyłaj

---

**Gotowe do dystrybucji!** 🚀
