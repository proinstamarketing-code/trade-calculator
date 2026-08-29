Trade Calculator

Готовая визуальная версия калькулятора по утвержденному макету.

Файлы

src/App.tsx — интерфейс и расчеты.

src/index.css — весь визуальный стиль.

functions/api/bingx.ts — Cloudflare Pages Function для BingX.

index.html — русский title/description.

Локальный запуск

В PowerShell:

cd D:\Trade-calculator
npm.cmd run dev

Если Vite уже запущен, достаточно сохранить файлы и обновить страницу.

Важно про BingX

Локальный Vite сам по себе не запускает Cloudflare Pages Functions. Поэтому /api/bingx начнет полноценно работать после публикации проекта на Cloudflare Pages.

Калькулятор уже содержит резервный список тикеров, поэтому интерфейс можно тестировать локально и без API.

Cloudflare

После подключения GitHub-репозитория к Cloudflare Pages:

Framework preset: Vite

Build command: npm run build

Build output directory: dist

Папка functions должна находиться в корне проекта. Cloudflare Pages Functions автоматически создадут маршрут /api/bingx.

Примечание

Список контрактов и цена запрашиваются через серверную функцию, чтобы не зависеть от CORS браузера. Для публичных market-data запросов API-ключ в код калькулятора не зашивается.

Для TradFi используется тот же интерфейс выбора инструмента; BingX сейчас предоставляет TradFi perpetual futures на акции, индексы, товары и Forex.