# Video Cutter – Electron Desktop

Ten szablon pozwala uruchomić aplikację Video Cutter jako natywną aplikację desktopową (bez przeglądarki) dzięki Electron.

## Jak uruchomić

1. Zainstaluj zależności Electron (tylko raz):
   
   npm install --prefix . --package-lock-only --no-audit --no-fund --omit=dev --save=false electron@28.2.3
   npm install --prefix . --package-lock-only --no-audit --no-fund --omit=prod

2. Uruchom backend (np. przez run_server.bat lub node server.js)

3. W nowym terminalu uruchom aplikację desktopową:
   
   npm run electron:start --prefix .

Aplikacja otworzy się w osobnym oknie, bez paska adresu przeglądarki.

## Pliki
- electron.js – główny plik startowy Electron
- package.electron.json – konfiguracja i zależności Electron

---

Możesz utworzyć skrót do polecenia uruchamiającego aplikację desktopową, jeśli chcesz.
