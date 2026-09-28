# European Resale Sourcing Copilot

Europe-first инструмент для reseller'ов. Отвечает на один вопрос:

> «Я могу купить эту вещь за €X. Стоит ли её покупать для перепродажи?»

Фото или barcode, затем идентификация товара, comparable listings/sales, оценка resale value, fees, shipping, profit, ROI и простое решение: STRONG BUY / BUY / BORDERLINE / SKIP.

Это не marketplace. Мы не продаём, не принимаем оплату и не доставляем.

## Документы

| Файл | Что внутри |
|---|---|
| [docs/FEASIBILITY_REPORT.md](docs/FEASIBILITY_REPORT.md) | Phase 0: источники, лицензии, стоимость, риски, GO/NO-GO |
| [docs/PLAN.md](docs/PLAN.md) | Архитектура, стек, модель данных, pricing/decision engine, ключевые решения |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Фазы 0-9, deliverables, gate-критерии go/no-go |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Матрица источников данных и чеклист юридической проверки |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Журнал архитектурных решений (ADR) |
| [eval/README.md](eval/README.md) | Benchmark dataset и метрики |

## Главный принцип

Главный риск проекта не UI, а data layer: правильно определить товар и найти релевантные европейские comparables. Mobile app не начинается, пока Phase 0 не доказала, что данные достаточно хороши.

## Структура репозитория (целевая)

```text
resale-copilot/
  docs/                 планы, исследования, ADR
  packages/
    core/               чистый TS: normalization, pricing, profit, decision (без I/O)
    db/                 Drizzle schema + migrations
    sources/            адаптеры источников данных (eBay и т.д.)
    recognition/        VisionProvider + OpenAI provider (barcode lookup позже)
  apps/
    api/                Fastify backend (POST /api/valuation)
    web/                internal test PWA (Vite + React)
    mobile/             Expo app (только после Phase 3)
  eval/
    dataset/            100 тестовых товаров (Phase 0)
    scripts/            repeatable evaluation
```

## Запуск (internal test app)

```bash
pnpm install
pnpm dev            # API на :8787, web на http://localhost:5173
```

- Цены: eBay Browse API (active listings, DE/FR/IT/ES/NL). Нужны `EBAY_CLIENT_ID` и `EBAY_CLIENT_SECRET` в `.env`.
- Проверка ключей eBay: `scripts/ebay-smoke.sh "Sony WH-1000XM4"`.
- **Фото**: кнопки Scan item (камера) / Upload photo, до 3 фото, resize до 1280px на устройстве, распознавание через OpenAI (`OPENAI_API_KEY`, `OPENAI_VISION_MODEL`). Фото не сохраняются.

### PWA на телефоне

Service worker и установка работают только по HTTPS (или на localhost).

```bash
pnpm --filter @fliplens/api dev          # в одном терминале
pnpm --filter @fliplens/web dev:https    # в другом: self-signed HTTPS в локальной сети
```

Открыть `https://<IP ноутбука>:5173` на телефоне в той же Wi-Fi, принять сертификат, затем «Add to Home Screen».
Production build: `pnpm --filter @fliplens/web build` (результат в `apps/web/dist`, с `sw.js` и manifest).
