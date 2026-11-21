# FocusAI для Android (Google Play) через Capacitor

Решение из `docs/ROADMAP.md`: тот же код (static export в `out/`) упаковывается в Android-приложение. Сервер не нужен, данные остаются на устройстве.

## Что нужно на компьютере
- Node 24+, Android Studio (с Android SDK и эмулятором), JDK 17+.
- Аккаунт Google Play Console (разовый взнос ~25 $) — только для публикации.

## Шаги (выполнить один раз)
```bash
npm i @capacitor/core @capacitor/android @capacitor/local-notifications
npm i -D @capacitor/cli
npx cap init FocusAI kz.focusai.app --web-dir out
npm run build
npx cap add android
npx cap sync android
npx cap open android        # откроется Android Studio → Run
```
После каждого изменения кода: `npm run build && npx cap sync android`.

## Что доработать в коде (отдельная задача)
1. **Напоминания без сервера** — `@capacitor/local-notifications`: ежедневное уведомление в выбранное время из `ReminderCard`. На сайте оставить календарь (.ics / Google).
2. **«Поделиться неделей»** — `@capacitor/share` вместо Web Share API (картинка из `src/lib/shareCard.ts`).
3. **Тактильный отклик** — `@capacitor/haptics` вместо `navigator.vibrate` в `src/lib/haptics.ts`.
4. Определять среду: `Capacitor.isNativePlatform()`; на сайте всё работает как сейчас.

## Перед публикацией в Google Play
- Иконки: `public/icon-512.png`, `public/icon-maskable-512.png`.
- Политика конфиденциальности: публичная ссылка на `/privacy/` (после деплоя на Vercel).
- Анкета Data safety: «данные не собираются и не передаются».
- Декларация для приложений о здоровье и благополучии: не медицинское приложение, без диагнозов.
- Для новых личных аккаунтов — закрытое тестирование (по правилам на момент написания: ≥12 тестировщиков 14 дней подряд). **Проверьте актуальные правила перед подачей.** Участники пилота «К сессии» закрывают это требование.
