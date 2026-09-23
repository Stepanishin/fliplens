# Architecture Decision Records

## ADR-001: Monorepo на pnpm workspaces
Статус: принято.
Почему: core логика (pricing, normalization) переиспользуется в API, eval scripts и позже частично в mobile. Один TypeScript, одни типы. pnpm уже установлен, быстрый, строгий.
Без Turborepo/Nx на старте: не нужно, добавим если сборка станет медленной.

## ADR-002: Fastify вместо NestJS / Express
Статус: принято.
Почему: Fastify прост, быстрый, встроенная schema validation, хорошая TS поддержка. NestJS даёт DI и модули, но добавляет церемонию, которая не окупается для backend с десятком endpoints. Express устарел по эргономике (async errors, validation).
Validation: Zod схемы, общие для API и клиента.

## ADR-003: Drizzle вместо Prisma
Статус: принято.
Почему:
- Pricing и liquidity требуют аналитических SQL запросов (percentile_cont, window functions, агрегаты по датам). Drizzle близок к SQL и не мешает писать сырые запросы с типами.
- Нет отдельного query engine binary и codegen шага.
- Миграции как SQL файлы, легко ревьюить.
Минус: меньше экосистема, чем у Prisma. Приемлемо.

## ADR-004: Core как чистые функции без I/O
Статус: принято.
Почему: pricing, filtering, profit, decision должны быть детерминированы и тестируемы на fixtures. Одинаковые входные comparables дают одинаковую valuation. Это позволяет версионировать алгоритм (`algorithm_version`) и перепроверять на eval dataset.

## ADR-005: Нет Redis/BullMQ на старте
Статус: принято.
Почему: MVP укладывается в синхронный запрос + кэш в PostgreSQL. Если понадобится фоновая работа (liquidity re-fetch), сначала `pg-boss` (очередь поверх Postgres), Redis только при реальной нагрузке.

## ADR-006: Vision через LLM со structured output
Статус: принято для Phase 0-2, пересмотр по результатам eval.
Почему: мультимодальная модель читает текст на корпусе/коробке (model numbers, EAN), понимает поколения. Structured JSON output с confidence и top-N кандидатами. Модель не используется для оценки цены: цена только из рыночных данных.
Выбор конкретной модели (Claude Sonnet vs Opus) по accuracy/cost на eval.

## ADR-007: Деньги как integer minor units
Статус: принято.
Почему: никаких float для денег. Храним `amount_minor` (центы) + `currency` (ISO 4217). Для CHF/SEK/PLN и т.д. тот же подход. EUR нормализация хранится отдельно вместе с fx_rate_id.

## ADR-008: Локальная разработка на Homebrew PostgreSQL
Статус: принято.
Почему: Docker не установлен, PostgreSQL 14 уже есть. Production позже на managed Postgres (Neon / Supabase / RDS), выбор в Phase 5.
