# VK-clone: общая архитектура и дизайн

Дата: 2026-09-05
Статус: утверждён в обсуждении, ждёт ревью текста

## 1. Цель и рамки

Собственная социальная сеть по образцу ВКонтакте: лента с ML-ранжированием, профили, друзья и подписки, сообщества, личный мессенджер, фото и музыка. Строится как реальный продукт (вариант «для живых людей»), но запускается локально; деплой на VPS позже без переделок.

Референсы лежат в `docs/reference/`:
- `vk-prototype.html` — кликабельный прототип экранов (лента, профиль, мессенджер, друзья, фото, музыка), хэш-роутер, тёмная и светлая тема.
- `vkui-design-system.html` — токены VKUI, снятые с vk.ru: цвета, 21 типографическая роль, радиусы, тени, длительности, кривые.

### Что входит

- Аккаунты, регистрация, сессии.
- Социальный граф как в VK: друзья (взаимно, через заявку), подписки (в одну сторону), сообщества с ролями.
- Посты с текстом, фото, аудио, ссылками; лайки, комментарии, репосты, просмотры.
- Лента: кандидаты из нескольких источников, ранжирование ML-моделью, правила разнообразия, сбор событий, дообучение.
- Рекомендации «Возможно, вы знакомы» и рекомендации сообществ.
- Мессенджер: личные чаты только между друзьями, realtime, прочитанность, онлайн, «печатает», переход к произвольному сообщению.
- Фото, альбомы, музыка, плеер (по прототипу).
- Сидер: 50 000 пользователей, сообщества, граф, посты, история взаимодействий.

### Что не входит

- Групповые беседы, приватность профиля, модерация, монетизация, микрофронты, event sourcing, отдельная read-БД, Kafka, Prometheus/Grafana.

## 2. Технологический стек

| Слой | Выбор | Почему |
|---|---|---|
| Фронт | SolidJS 1.9, Vite, TypeScript, `@solidjs/router`, `@tanstack/solid-query` | Ближе всего к прототипу, маленький бандл, быстрый список |
| Бэк | Bun, Elysia, Drizzle ORM, Eden Treaty | Одна кодовая база TypeScript, типы end-to-end без кодогена |
| ML | Python 3.12, FastAPI, LightGBM, sentence-transformers, uv | Стандартный ML-инструментарий, CPU-only |
| БД | PostgreSQL 17 + pgvector | Единая БД, векторный поиск без отдельного движка |
| Кэш и realtime | Redis 7 | Сессии, онлайн, кэш ленты, pub/sub, Redis Streams как шина событий |
| Файлы | MinIO (S3 API) | Локально и на VPS одинаково, заменяется на любой S3 |
| Инфра | Docker Compose, nginx как единый вход (локально и на проде), GitHub Actions | Один compose и один nginx-шаблон локально и на VPS |

Иконки: пакет `@vkontakte/icons` содержит React-компоненты, но внутри каждого лежит обычный SVG. Скрипт сборки достаёт SVG и генерирует спрайт с типизированным списком имён; React в рантайме отсутствует.

## 3. Монорепо

```
vk-clone/
  apps/
    web/        Solid-приложение
    api/        Elysia, DDD + Clean Architecture + CQRS
    ml/         FastAPI: скорер, консьюмер событий, тренер
    seeder/     генерация данных, корпус текстов в репозитории
  packages/
    ui-kit/     токены VKUI, спрайт иконок, базовые Solid-компоненты
    contracts/  тип Elysia-приложения для Eden, общие DTO и JSON-схемы
  docs/
  docker-compose.yml
  compose.prod.yml
```

Bun workspaces. Фичи фронта импортируют ui-kit только через его публичный `index.ts`.

### Почему не микрофронты

Микрофронты решают организационную задачу нескольких команд с независимыми деплоями. Здесь одна команда и один деплой. Вместо этого feature-slices внутри `apps/web` с запретом на импорты между фичами и lazy-роутами на каждую фичу. Если понадобится, слайс выделяется в микрофронт без переписывания, потому что границы уже есть.

## 4. Дизайн-система и ui-kit

`packages/ui-kit` состоит из трёх слоёв, взятых из витрины VKUI:

1. **Токены.** `tokens.css` со стартовым набором переменных: цвета светлой схемы на `:root`, тёмная схема под `@media (prefers-color-scheme: dark)` и под `:root[data-vk="dark"]`, типографика, радиусы, тени e1–e4, длительности, кривые. Тема переключается атрибутом `data-vk` на `html`, значение хранится в `localStorage`.
2. **Иконки.** `scripts/build-icons.ts` читает `node_modules/@vkontakte/icons`, извлекает SVG каждого компонента, генерирует `sprite.svg` и `icon-names.ts`. Компонент `<Icon name="like_outline_24" />` рендерит `<svg><use href="#...">`. Имена оригинальные VK (`name_style_size`).
3. **Компоненты (Solid):** Button (primary, secondary, tertiary, ripple), Avatar (меш-градиент как заглушка, онлайн-точка), Cell, Group/Card, Input, Textarea, Tabs, Modal, Snackbar, Skeleton, Tappable, Counter, Separator, типографические обёртки.

Каждый компонент — папка с `.tsx`, `.module.css` и стори. Каталог компонентов — маленькая Solid-страница внутри пакета вместо Storybook.

## 5. Схема данных

Одна база Postgres. ID везде `bigint identity`, время `timestamptz`.

### Аккаунты и граф

- `users`: id, login, password_hash, first_name, last_name, screen_name, status, bio, avatar_media_id, cover_media_id, birthday, city, is_verified, popularity_rank, created_at, last_seen_at.
- `communities`: id, screen_name, name, description, topic (enum из 12 тематик), avatar_media_id, is_verified, members_count, created_at.
- `friendships`: user_lo, user_hi (упорядоченная пара, одна строка на пару), status (`pending` / `accepted` / `declined`), requester_id, created_at, accepted_at. Пока `pending`, заявитель считается подписчиком.
- `follows`: follower_id, target_type (`user` / `community`), target_id, created_at.
- `community_members`: community_id, user_id, role (`member` / `editor` / `admin`).

### Контент

- `posts`: id, author_type (`user` / `community`), author_id, text, topic, attachments (jsonb: массив `{kind: photo|audio|link, media_id, meta}`), likes_count, comments_count, reposts_count, views_count, embedding `vector(384)`, created_at.
- `comments`: id, post_id, author_id, parent_id, text, likes_count, created_at.
- `likes`: user_id, target_type (`post` / `comment`), target_id, created_at. PK по трём полям.
- `media`: id, owner_id, kind (`photo` / `audio` / `avatar` / `generated`), bucket, key, content_hash, width, height, duration, blurhash, created_at. `content_hash` для дедупликации.
- `albums`, `album_media`, `tracks`, `playlists`: простые справочники по прототипу.

### События и ML

- `events`: id, user_id, post_id, kind (`view` / `like` / `comment` / `repost` / `click` / `hide`), source (источник кандидата), position, session_id (одна загрузка ленты), created_at. Партиционирована по месяцам.
- `author_stats_daily`: author_type, author_id, day, posts, likes, comments, views. Агрегаты для признаков автора, обновляются консьюмером событий.
- `user_profiles_ml`: user_id, interest_vector `vector(384)`, topic_weights (jsonb), updated_at.
- `friend_suggestions`: user_id, candidate_id, score, computed_at. Заполняется офлайн.
- `model_versions`: id, kind (`feed_ranker` / `pymk_ranker`), artifact_key, metrics (jsonb), trained_at, is_active.
- Показанные посты: Redis-set `impressions:{user_id}` с TTL 24 ч.

### Мессенджер

- `dialogs`: id, user_lo, user_hi, last_message_id, created_at.
- `messages`: id, dialog_id, dialog_local_id (монотонный счётчик внутри диалога), sender_id, text, attachments (jsonb), created_at, edited_at, deleted_at.
- `dialog_state`: dialog_id, user_id, last_read_local_id, unread_count, muted.

`dialog_local_id` — ключевая идея из архитектуры сообщений VK: порядок, непрочитанные и пагинация считаются по нему, а не по глобальному id.

### Индексы

`posts(author_type, author_id, created_at desc)`; HNSW на `posts.embedding` и `user_profiles_ml.interest_vector`; `follows(follower_id)`; `friendships(user_lo)`, `friendships(user_hi)`; `events(user_id, created_at)`; `messages(dialog_id, dialog_local_id)`; `community_members(user_id)`.

### Сессии

Redis: `sess:{token}` → `{userId, createdAt, ua}`, TTL 30 дней со сдвигом при активности; `user_sessions:{userId}` set для «выйти со всех устройств». Токен — 32 случайных байта в httpOnly cookie `SameSite=Lax`. Пароли через `Bun.password` (argon2id).

## 6. Бэкенд: DDD + Clean Architecture + CQRS

### Ограниченные контексты

`identity`, `social-graph`, `content`, `feed`, `messaging`, `recommendations`, `analytics`. Каждый — папка в `apps/api/src/modules`. Контексты не импортируют репозитории друг друга; общение через доменные события и явные интерфейсы.

### Слои внутри модуля

```
modules/messaging/
  domain/          агрегаты (Dialog, Message), value objects, доменные события, инварианты
  application/     commands/ (SendMessage, MarkRead), queries/ (GetDialogs, GetMessages), порты
  infrastructure/  DrizzleDialogRepository, RedisPresence, MinioStorage, WsPublisher
  presentation/    Elysia-плагин: роуты → команда или запрос, DTO, маппинг ошибок
```

Зависимости направлены внутрь. Домен не знает про Drizzle, Redis, Elysia. Инварианты в агрегатах: `Dialog.send(sender, text)` проверяет, что отправитель участник, выдаёт следующий `dialog_local_id`, порождает `MessageSent`.

### CQRS в облегчённой форме

- Команды идут через агрегаты и репозитории транзакционно и публикуют доменные события.
- Запросы идут мимо домена: query handlers читают SQL через Drizzle напрямую в DTO. Лента, список диалогов, профиль — запросы.
- `CommandBus`, `QueryBus`: типизированные диспетчеры без библиотеки. `EventBus` внутри процесса для синхронных реакций плюс Redis Streams для других процессов.
- Одна база на запись и чтение. Без event sourcing, саг, отдельной read-БД, generic repository.

Примеры связей через события: `PostLiked` → `content` инкрементит счётчик, `analytics` пишет в стрим, `feed` инвалидирует кэш. `FriendshipAccepted` → `messaging` разрешает диалог, `recommendations` убирает кандидата.

## 7. API и realtime

- REST под `/api/v1`, валидация через TypeBox Elysia, ошибки в формате `{error: {code, message}}`. Тип приложения экспортируется в `packages/contracts`, фронт вызывает через Eden Treaty.
- Пагинация везде курсорная.
- Модули: `auth`, `users`, `communities`, `friends`, `follows`, `posts`, `feed`, `suggestions`, `dialogs`, `media` (presigned URL в MinIO, затем подтверждение), `events` (`POST /events` с батчами в Redis Stream `events:feed`).
- Права: писать сообщение можно только другу; посты в сообщество — только editor и admin.
- Rate limiting: счётчик в Redis `rl:{userId}:{route}` для постинга, сообщений и событий.

### Лента

`GET /feed?cursor=`. Без курсора: сборка кандидатов → скорер (`POST http://ml:8000/score/feed`, таймаут 150 мс, при ошибке эвристика «свежесть × популярность») → правила разнообразия → список id в Redis на 10 минут → первая страница. Следующие страницы читаются из списка. Каждый пост несёт `source`, клиент возвращает его в событиях.

### Мессенджер: окно сообщений

`GET /dialogs/:id/messages` в четырёх режимах: без параметров (последние), `before=`, `after=`, `around=` (по `dialog_local_id`, половина лимита до и после). Ответ содержит `hasMoreBefore`, `hasMoreAfter`. `around` превращается в `BETWEEN` по индексу `(dialog_id, dialog_local_id)`, стоимость не зависит от глубины истории. Тот же механизм обслуживает переход к сообщению, клик по цитате ответа, результаты поиска и закреплённые.

### Прочитанность

Клиент шлёт максимальный видимый `local_id` с дебаунсом 300 мс через WebSocket (`{type:'read', dialogId, localId}`). Сервер ставит `last_read_local_id = GREATEST(текущее, пришедшее)`, пересчитывает `unread_count` одним запросом, шлёт собеседнику `message.read`. При закрытии вкладки с несброшенным дебаунсом — `sendBeacon` на `POST /dialogs/:id/read`.

### WebSocket

Один эндпоинт `/ws`, аутентификация по cookie при апгрейде. Сервер → клиент: `message.new`, `message.read`, `dialog.typing`, `user.online`, `friend.request`, `notification`. Клиент → сервер: `typing`, `read`. Отправка сообщений через `POST /dialogs/:id/messages` (идемпотентность по client_id), WebSocket только доставляет. Между инстансами API — Redis pub/sub по каналу `u:{userId}`. Онлайн: ключ `online:{userId}` с TTL 60 с.

## 8. ML: лента и рекомендации

### Кандидаты (Elysia, SQL + pgvector), 300–500 на запрос

1. Свежие посты друзей, подписок и сообществ пользователя.
2. Похожие на лайкнутое: ближайшие к `interest_vector` пользователя в `posts.embedding`.
3. Коллаборативные: посты, лайкнутые пользователями с близким `interest_vector`.
4. Популярное за сутки.
5. Сообщества, на которые подписаны друзья.

Эмбеддинги текста: `multilingual-e5-small`, 384 измерения, CPU.

### Ранжировщик

LightGBM, бинарная классификация «будет вовлечение». Целевая переменная составная: раскрыл текст, открыл фото, лайк, комментарий с весами, потому что лайков мало. Признаки: скалярное произведение эмбеддингов, источник, свежесть, популярность автора, счётчики поста, агрегаты автора из `author_stats_daily`, частота реакций пользователя на автора, тип контента, час дня. `session_id` в событиях позволяет позже перейти к попарному обучению внутри сессии, как у VK.

### Пост-обработка

Не более двух постов подряд от одного автора, смешивание с непросмотренным от друзей, пессимизация показанного за 24 часа.

### Обучение

Синтетика из сидера (скрытый вектор интересов пользователя × тематика поста → вероятность реакции) даёт стартовый датасет. После запуска реальные события летят в Redis Streams, тренер раз в час дообучает на смеси, метрики AUC и NDCG@20 на отложенных двух днях. Новая версия активируется, если не хуже текущей минус порог. Скорер подхватывает без рестарта.

### Холодный старт

При регистрации пользователь выбирает 3–5 интересов → стартовый вектор. Пока событий мало, вес источника «популярное» выше.

### «Возможно, вы знакомы»

Считается офлайн. Кандидаты по эго-графу: друзья друзей по числу общих (только по взаимным друзьям, не по подписчикам, до 200 кандидатов), участники общих сообществ с хотя бы одним общим другом, близкие по `interest_vector`. Базовые признаки: общие друзья и Adamic/Adar, общие сообщества, косинус эмбеддингов, пересечение по лайкнутым постам, разница возраста аккаунтов. Вторая LightGBM-модель, метка — принятие заявки. Результат в `friend_suggestions`. Аналогично рекомендуются сообщества. Выводится в правой колонке, на вкладке «Рекомендации» в Друзьях и после регистрации.

### ML-сервис как процесс

`apps/ml`, один FastAPI-пакет с ролями по флагу:

- `serve`: `POST /score/feed`, `POST /embed`, `GET /health`. Модель в памяти, раз в минуту проверяет `model_versions.is_active`, горячо перезагружает артефакт из MinIO.
- `consume`: читает `events:feed` консьюмер-группой, пишет `events` пачками по 500, обновляет `author_stats_daily`.
- `train`: пересчёт `user_profiles_ml` (средний эмбеддинг лайкнутого за 30 дней с затуханием), датасет за 14 дней, обучение, валидация, запись в `model_versions`. Подзадача `friend_suggestions`.

Интерфейс `Scorer` в бэке абстрактный: при недоступности ML лента работает на эвристике.

## 9. Сидер

`apps/seeder`, TypeScript на Bun, детерминированный (фиксированный seed), четыре стадии с кэшем результатов в `seed-data/`.

1. **Корпус текстов в репозитории** (`apps/seeder/corpus/`), без внешних LLM-вызовов. На каждую из 12 тематик (кино, музыка, мемы, игры, IT, спорт, путешествия, еда, наука, авто, мода, новости города): ~120 полноценных постов разной длины, банки фрагментов (зачины, концовки, хэштеги), ~60 комментариев-реакций, 60 названий и описаний сообществ; общий банк ~300 реплик для диалогов. Генератор комбинирует основы с фрагментами и подменой чисел, имён и дат, давая 20–30k вариаций с чёткой тематикой.
2. **Пользователи и сообщества.** Faker (ru). У каждого пользователя скрытый вектор интересов: 2–4 тематики с весами. Популярность по Ципфу: ~100 «звёзд» (10–50k подписчиков), ~1500 «заметных» (500–5k), остальные обычные. 700 сообществ, крупные до 30k участников. Аватары — меш-градиенты (`media.kind = generated`).
3. **Граф.** Стохастическая блочная модель: вероятность дружбы выше при совпадении города и интересов, средняя степень 80, тяжёлый хвост. Часть пар остаётся `pending`. Подписки пропорциональны популярности × совпадению интересов. Итог ~2 млн рёбер дружбы, ~4 млн подписок.
4. **Посты и события.** Посты за 90 дней: сообщества 1–5 в день, звёзды раз в 1–3 дня, обычные редко. Эмбеддинги считает ML-сервис одним проходом. Симуляция: 30% активных пользователей × 60 сессий × 20 показов; вероятность реакции — сигмоида от совпадения интересов, популярности автора, свежести и шума. Пишется в `events` с `source`, `position`, `session_id`. Счётчики постов пересчитываются из событий. Итог 5–8 млн событий.

Вставка через `COPY`. Ориентир: стадии 2–4 за 5–10 минут на ноутбуке. Создаются аккаунты `demo` (пароль из env, 150 друзей, 20 пабликов) и «Денис Кораблев» из прототипа.

## 10. Фронт

Структура `apps/web/src`:

- `app/`: вход, роутер, провайдеры (Query, сессия, тема, WebSocket), `Layout` с шапкой, левой навигацией, правой колонкой.
- `features/`: `auth`, `feed`, `profile`, `friends`, `communities`, `im`, `photos`, `music`, `search`. Внутри: `pages/`, `components/`, `api.ts`, при необходимости `store.ts`. Фичи не импортируют друг друга.
- `entities/`: `PostCard`, `UserCell`, `CommunityCell`, `CommentItem` — рендер без бизнес-логики.
- `shared/`: `api/` (Eden, обработка 401), `session/`, `ws/` (клиент с реконнектом), `lib/`, `analytics/`.

Роуты: `/feed`, `/id{n}` и `/{screen_name}`, `/friends` (все, заявки, рекомендации), `/communities`, `/club{n}`, `/im`, `/im/{dialogId}`, `/photos`, `/music`, `/search`, `/login`, `/register`. Все через `lazy()`. CSS-модули поверх токенов ui-kit, без Tailwind.

### Лента

`createInfiniteQuery` по курсору. Виртуализация откладывается до необходимости. События: IntersectionObserver даёт `view` после секунды видимости, клики по «показать полностью» и фото дают `click`, лайк идёт как мутация и как событие. Буфер уходит батчем раз в 5 секунд или при уходе через `sendBeacon`.

### Мессенджер

Стор чата хранит непрерывный диапазон `[minLocalId, maxLocalId]`. Переход к сообщению: сброс диапазона, загрузка `around`, `scrollIntoView({block:'center'})`, подсветка. Скролл вверх — `before`, вниз — `after`. Якорь скролла при вставке сверху: разница `scrollHeight` до и после, `overflow-anchor: none`. Если `hasMoreAfter === true`, новые сообщения по WebSocket не дописываются, а увеличивают счётчик на кнопке «вниз». Окно обрезается при росте больше ~300 сообщений. Оптимистичная отправка с временным id. Прочитанность: observer с `threshold 0.5`, только при видимой вкладке и фокусе окна, отправка максимального видимого `local_id` с дебаунсом.

## 11. Тесты

- `bun test`: домен и application-хендлеры на in-memory портах, сборка кандидатов и правила разнообразия, сидер на 500 пользователях с проверкой инвариантов графа.
- Интеграционные: репозитории и запросы против Postgres из compose, тестовая БД, миграции перед прогоном.
- Python `pytest`: признаки, тренер на синтетике 1k событий (AUC > 0.6 как смоук), контрактный тест `/score/feed` против JSON-схемы из `packages/contracts`.
- Фронт: vitest + `@solidjs/testing-library` для ui-kit и логики окна чата; Playwright для трёх сценариев: регистрация → лента; добавить в друзья → написать сообщение; лайк → событие в стриме.
- CI: GitHub Actions, jobs lint+typecheck, bun test, pytest, playwright против compose.

## 12. Деплой и эксплуатация

`docker-compose.yml` для локали, `compose.prod.yml` с оверрайдами для VPS: тот же nginx-шаблон с upstream'ами на контейнеры `api`/`web` и TLS (certbot), образы в GitHub Container Registry, `docker compose pull && up -d`. Postgres и MinIO на volume, ежедневный `pg_dump` в MinIO. Секреты в `.env` на сервере, в репозитории `.env.example`. Ориентир по железу: 4 vCPU, 8 GB.

Наблюдаемость: структурированные логи в stdout (pino, structlog), `/health` у каждого сервиса, задержка ленты и доля ответов ML в логах.

## 13. Порядок реализации

Каждая подсистема получает свой спек и план.

1. **Фундамент**: монорепо, ui-kit с токенами и иконками, схема БД и миграции, каркас DDD-модулей, авторизация и сессии, сидер (все четыре стадии), compose.
2. **Профили и граф**: профиль, друзья, заявки, подписки, сообщества, «возможно знакомы» по графу без модели.
3. **Лента v1**: посты, лайки, комментарии, лента по подпискам без ML, сбор событий в Redis Streams, консьюмер.
4. **ML-сервис**: эмбеддинги, ранжировщик ленты, рекомендации людей, интеграция с лентой.
5. **Мессенджер**: личные чаты, WebSocket, окно сообщений, прочитанность, онлайн.
6. **Медиа**: фото, альбомы, музыка, плеер.

## 14. Источники по архитектуре VK, повлиявшие на решения

- Эволюция хранилища ВКонтакте: https://habr.com/ru/companies/vk/articles/905152/
- Переписать базу сообщений с нуля: https://habr.com/ru/companies/vk/articles/342570/ (локальные id внутри чата, два движка)
- Рекомендации друзей на эго-графах: https://habr.com/ru/companies/vk/articles/552162/ (Adamic/Adar, двухуровневая схема, офлайн-расчёт)
- Рекомендации историй: https://habr.com/ru/companies/vk/articles/947456/ (группы признаков, попарный лосс, составная цель)
- kphp-kdb: https://github.com/vk-com/kphp-kdb (состав движков: lists, friends, news, text, photo, hints, search)
