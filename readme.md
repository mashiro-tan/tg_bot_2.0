**WARN: аккуратнее с аккаунтами, и строго рекомендуется обновить тележную либу/проверить инициализацию/чекнуть иссуй-лист gram.js - аккаунту вполне может прилететь бан по неясной причине, увы**

1. Регистрируем свой клиент Телеграм и получаем ключи апишки

2. Регистрируем аккаунт для бота, первый вход через оф приложение

3. `npm i`; `npm run migrate`

4. `TG_API_ID=xxx TG_API_HASH=yyy npm run dev`

5. Логинимся через консольку (при запросе смс-кода смотрим в оф приложение)

6. Пишем в личку с предполагаемого админского аккаунта: `\reg 1111222233334444`

7. Для входа бота в чат кидаем ему `\join <ссылка-приглашение>`, далее в самом чате пишем `\ack`

8. Возможности бота: `\halp`

9. Для мутов с дуэли/рулетки потребуется выдать админские права

10. В ближайшее время обнов боту не предвидится, выложен на скорую руку

11. Если что-то не работает - FIY

12. Известные баги: может не работать реконнект при потере соединения - баг клиентской библиотеки, см. их иссуй-лист; при смене прав или входе-выходе людей из чата бот может их терять - приколы на стороне ТГ

13. Почему в зависимостях TS, хотя его нет в коде - мотивация пала смертью храбрых в процессе рефактора архитектуры бота; таким он и опубликован

14. Код гавно: вот и займись его полировкой :^)
