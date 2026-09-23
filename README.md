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
    recognition/        vision + barcode lookup
  apps/
    api/                Fastify backend (POST /valuation и т.д.)
    mobile/             Expo app (только после Phase 3)
  eval/
    dataset/            100 тестовых товаров (Phase 0)
    scripts/            repeatable evaluation
```
