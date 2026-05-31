# Video Cutter Frontend (WebUI)

Ten Dockerfile buduje frontend Video Cutter jako statyczny serwer WWW (nginx).

## Budowanie obrazu

```sh
docker build -f Dockerfile.frontend -t video-cutter-frontend:latest .
```

## Uruchamianie lokalnie

```sh
docker run -d -p 8080:8080 video-cutter-frontend:latest
```

## Użycie na Unraid
- Wybierz ten obraz jako nowy kontener.
- W mapowaniu portów ustaw: `8080:8080`.
- W szablonie Unraid ustaw WebUI na: `http://[HOST]:8080`.

Po uruchomieniu frontend będzie dostępny pod adresem:
```
http://[IP-serwera-Unraid]:8080
```

Aplikacja Electron może nadal korzystać z backendu ML na Unraid przez API.
