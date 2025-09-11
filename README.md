# API Converter

Микросервисное веб‑приложение для конвертации файлов с браузерным клиентом, Nginx reverse proxy и обменом событиями через RabbitMQ. Проект оформлен как портфолио: демонстрирует работу с React/TypeScript, FastAPI, Nginx, RabbitMQ и Docker.

## Ключевая идея
- Перетащил файл → получил список доступных форматов → нажал кнопку → скачал результат.
- Микросервисы за Nginx; каждый сервис делает одну вещь.
- События/метрики публикуются в RabbitMQ (fanout), отдельный сервис умеет их читать (опционально).

## Архитектура
```
[Browser (React/Vite)]
       |
       v
   [Nginx Reverse Proxy]
     /        |         \
    v         v          v
[format]   [image]    [stats]*
 service    service    service
   |           |          ^
   |           v          |
   |        [RabbitMQ] ---+
   |
  (определяет доступные форматы)

* stats-service опционален: в текущем UI скрыт, но доступен по API.
```

- client — React/Vite UI с drag‑n‑drop и динамическими кнопками форматов.
- services/image-service — FastAPI + Pillow: принимает файл, конвертирует, публикует события.
- services/format-service — FastAPI: по расширению файла возвращает доступные форматы и подходящие сервисы.
- services/stats-service — FastAPI: потребитель RabbitMQ, агрегирует /metrics (опционально).
- infra/nginx — Nginx reverse proxy: `/` → client, `/api/image` → image-service, `/api/format` → format-service, `/api/stats` → stats-service.

## Технологии
- Frontend: React 18, TypeScript, Vite.
- Backend: Python 3.11, FastAPI, Uvicorn, Pillow.
- Messaging: RabbitMQ (management UI на :15672, guest/guest).
- Web: Nginx (reverse proxy, статика клиента и прокси API).
- Контейнеризация: Docker + Docker Compose.

## Быстрый старт
Требования: Docker Desktop.

```bash
# из корня репозитория
docker compose up -d --build
# клиент
http://localhost
# RabbitMQ UI
http://localhost:15672  (guest/guest)
```

## Маршруты
- Клиент: `/`
- Format API: `/api/format/available-formats/{ext}`
- Image API: `/api/image/convert` (POST multipart: file, format)
- Stats API (опц.): `/api/stats/metrics`, `/api/stats/health`

Пример конвертации:
```bash
curl -X POST http://localhost/api/image/convert \
  -F "file=@./example.jpg" \
  -F "format=png" \
  -o converted.png
```

## Как это работает (коротко)
1) Клиент определяет расширение и запрашивает у format-service доступные форматы.
2) Пользователь выбирает целевой формат → клиент отправляет файл в image-service.
3) image-service конвертирует (Pillow) и возвращает файл; публикует событие в RabbitMQ.
4) (Опц.) stats-service читает события и отдаёт агрегированные метрики.

## План развития
- Добавить pdf-service / video-service и зарегистрировать в format-service.
- История конвертаций в БД, авторизация, квоты.
- Экспорт метрик в Prometheus/Grafana.

## Структура
```
client/
infra/nginx/nginx.conf
services/
  image-service/
  format-service/
  stats-service/
docker-compose.yml
```

Лицензия: MIT
