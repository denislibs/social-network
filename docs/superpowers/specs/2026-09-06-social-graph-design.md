# Подсистема 2: профили, граф, сообщества, уведомления

Дата: 2026-09-06. Статус: одобрено в брейншторме. Родительский документ: `2026-09-05-vk-clone-architecture-design.md` (разделы 5, 6, 8, 13). Правила кода: `CLAUDE.md` (VKUI-only, FSD, DI через InversifyJS без декораторов, логика в хуках, TDD на Vitest).

## 1. Цель и рамки

Дать пользователю «социальный слой», на который ляжет лента подсистемы 3: страница профиля, друзья и заявки, подписки, сообщества, поиск людей и сообществ, «Возможно, вы знакомы» по графу без ML-модели, и минимальную систему уведомлений, работающую корректно при любом числе открытых вкладок.

### Входит
- Просмотр профиля по `/id{n}` и `/{screen_name}`; редактирование своего профиля: статус, о себе, город, день рождения, короткое имя.
- Дружба по модели VK: одна кнопка на профиле с состояниями; заявка в `pending` делает заявителя подписчиком; отклонение оставляет подписку молча.
- Подписка на сообщества, вступление и выход, создание сообщества пользователем, роли `member/editor/admin`.
- Поиск людей и сообществ по имени (`pg_trgm`), страница `/search` и поле в шапке.
- «Возможно, вы знакомы»: онлайн-SQL по эго-графу, кэш в Redis, скрытие кандидата.
- Уведомления: таблица и enum на все виды сразу, продьюсеры только для событий графа, фронтовый рендер для всех видов, опрос счётчика только из вкладки-лидера, рассылка между вкладками через `BroadcastChannel`.

### Не входит
- Стена профиля, посты сообществ, лайки, комментарии, упоминания (подсистема 3; enum уведомлений уже содержит их виды).
- Аватарки и обложки картинками (подсистема 6); пока `Avatar` с инициалами и градиентом.
- WebSocket и звук уведомлений (подсистема 5); интерфейсы заложены так, чтобы замена опроса на сокет не трогала фронтовые хуки.
- Приглашения в сообщества, настройки уведомлений, группировка «и ещё N человек» (колонка `group_key` заводится, агрегации нет), ML-ранжирование рекомендаций (подсистема 4, таблица `friend_suggestions` не используется).

## 2. Принятые решения

| Вопрос | Решение |
| --- | --- |
| Рамки | Полный слой: профиль с редактированием, друзья, подписки, сообщества с созданием, поиск, PYMK, уведомления. |
| Подписки на людей | Как в VK: отдельной кнопки «Подписаться» на человека нет. `follows(user)` пишется автоматически при заявке и остаётся при отклонении. «Подписаться» есть только у сообществ. |
| PYMK | Онлайн один SQL по эго-графу + город + общие сообщества, взвешенная сумма, топ-20, кэш Redis 10 минут на пользователя, инвалидация по событиям графа. |
| Уведомления | Отдельный модуль `notifications`, реагирует на доменные события через `EventBus`. Enum со всеми видами сразу. Доставка пока опросом раз в 30 с из вкладки-лидера. |
| Много вкладок | Лидер через Web Locks API, обмен через `BroadcastChannel`, «сигналит» активная вкладка, иначе лидер. |

## 3. Данные

Миграция `0003_social_graph`:

- Расширение `pg_trgm`. GIN-индексы: `users` по `lower(first_name || ' ' || last_name)` и по `lower(screen_name)`; `communities` по `lower(name)`.
- Индекс `friendships(requester_id, status)` для исходящих заявок.
- Enum `notification_kind`: `friend_request`, `friend_accepted`, `new_follower`, `community_invite`, `post_like`, `comment_like`, `post_comment`, `comment_reply`, `mention`, `repost`, `community_post`, `birthday`.
- Таблица `notifications`: `id bigint identity`, `user_id` (кому), `kind`, `actor_id` (кто, nullable для системных), `group_key varchar(128)` nullable, `payload jsonb not null default '{}'`, `created_at`, `read_at` nullable. Индексы: `(user_id, id desc)`, частичный `(user_id) where read_at is null`.
- Таблица `friend_suggestion_hidden(user_id, hidden_id, created_at)`, PK по паре.

Схемы Drizzle: `schema/notifications.ts`, дополнение `schema/social.ts`. Существующие таблицы `users`, `friendships`, `follows`, `communities`, `community_members` не меняются.

Payload по видам (фронт рендерит по нему): `friend_request {}`; `friend_accepted {}`; `new_follower {}`; `community_invite { communityId, communityName }`; `post_like`, `post_comment`, `repost`, `community_post` `{ postId, preview }`; `comment_like`, `comment_reply`, `mention` `{ postId, commentId, preview }`; `birthday { userId }`. Имя и инициалы актора подтягиваются джойном при чтении, не хранятся.

## 4. Бэкенд

### 4.1 Модули

Все новые модули следуют схеме identity после ретрофита DI: `application/ports.ts` с интерфейсами и токенами (`token<T>` из `kernel/di.ts`), `infrastructure/<module>.container.ts` с биндингами, `application/testing/container.ts` с фейками, `presentation/routes.ts` берёт зависимости из контейнера, `index.ts` экспортирует `<module>Module(c)`. `app.ts` монтирует модули по очереди. Boundaries-тест покрывает новые модули без изменений.

**`social-graph`**

Домен:
- `Friendship` — агрегат по упорядоченной паре `(userLo, userHi)`. Фабрика `Friendship.request(from, to)`: ошибка `SelfFriendshipError` при `from === to`. Методы `accept(by)` (только адресат, иначе `NotRequestAddressee`; из `accepted` идемпотентно), `decline(by)` (только адресат), `remove(by)` (любая сторона; из `accepted` в удалённое состояние, другая сторона остаётся подписчиком — это событие `FriendshipRemoved`, инфраструктура удаляет строку и пишет `follows`). События: `FriendRequested { requesterId, addresseeId }`, `FriendshipAccepted { userLo, userHi, acceptedBy }`, `FriendRequestDeclined`, `FriendshipRemoved { removedBy, other }`.
- `Community` — агрегат: `create(ownerId, name, screenName, topic, description)` делает создателя `admin`; `join(userId)` идемпотентен; `leave(userId)` запрещён последнему админу (`LastAdminCannotLeave`). События `CommunityCreated`, `CommunityJoined`, `CommunityLeft`.
- Value objects: `ScreenName` (регэксп `^[a-z][a-z0-9_.]{2,31}$`, зарезервированные префиксы `id\d`, `club\d`, точные имена `feed im friends communities photos music search login register edit notifications api`), `CommunityName` (2..120 символов).

Порты (`application/ports.ts`): `FriendshipRepository { find(a,b), save(f), delete(a,b) }`, `FollowRepository { add(followerId, target), remove }`, `CommunityRepository { findById, findByScreenName, save }`, `MembershipRepository { add, remove, roleOf, countAdmins }`, `SocialReadModel` (все запросы ниже), `SuggestionCache { get(userId), set(userId, items, ttl), invalidate(userIds[]) }`, `SuggestionHider`.

Команды: `SendFriendRequest`, `AcceptFriendRequest`, `DeclineFriendRequest`, `RemoveFriend`, `FollowCommunity`, `UnfollowCommunity`, `CreateCommunity`, `JoinCommunity`, `LeaveCommunity`, `HideSuggestion`. Каждая команда выполняется в транзакции Drizzle; события публикуются после коммита.

Встречные заявки: `SendFriendRequest` делает `INSERT ... ON CONFLICT (user_lo, user_hi) DO NOTHING RETURNING`; если строки нет в результате, читает существующую: `pending` от другой стороны означает согласие, команда переводит её в `accepted` и публикует `FriendshipAccepted`; `pending` от себя и `accepted` идемпотентны; `declined` от другой стороны обновляется в новую `pending` с новым `requester_id` не чаще раза в сутки (иначе `409 request_cooldown`).

Запросы (`SocialReadModel`, SQL → DTO): `GetRelation(me, other)` → `none | outgoing | incoming | friends | self`; `GetFriends(userId, cursor)`; `GetFriendRequests(me, incoming|outgoing, cursor)`; `GetFollowers(userId, cursor)`; `GetCommunity(idOrScreen, me)` с `membership: none|member|editor|admin` и `isFollowing`; `GetCommunityMembers(id, cursor)`; `GetMyCommunities(me)`; `GetSuggestedFriends(me)`; `GetCounters(userId)` → `{ friends, followers, communities, incomingRequests }`.

SQL рекомендаций (`GetSuggestedFriends`), один запрос с CTE:
1. `friends` — принятые дружбы `me`.
2. `fof` — друзья друзей, `count(*) as mutual`, до 200 строк по убыванию `mutual`.
3. `comm` — участники сообществ `me` (не более 5 сообществ, самые малочисленные, чтобы не тянуть миллионников), `count(*) as shared_communities`.
4. `city` — пользователи того же города с пересечением по теме подписок (`follows(community).topic`), до 100.
5. Объединение, исключение `me`, друзей, любых `friendships` с участием `me`, `friend_suggestion_hidden`.
6. `score = 3*mutual + 2*shared_communities + 1*same_city + 0.5*shared_topics`, топ-20, `mutual` возвращается для подписи «5 общих друзей».
Кэш в Redis ключ `pymk:{userId}` на 600 с. Инвалидация: `FriendRequested` и `FriendshipAccepted` для обоих участников, `CommunityJoined` для вступившего, `HideSuggestion` для скрывшего. Порог производительности: на базе с 50 тысячами пользователей `p95 < 200 мс` (интеграционный тест на `vk_test` с малым сидом проверяет план: нет seq scan по `friendships`).

**`identity` (расширение)**

Команда `UpdateProfile(me, { status?, bio?, city?, birthday?, screenName? })`: агрегат `User.updateProfile(...)` с value object `ScreenName` (общий модуль `kernel/screen-name.ts`, чтобы `social-graph` и `identity` не импортировали друг друга). Уникальность `screen_name` через индекс, `23505` → `409 screen_name_taken`. Запросы `GetProfile(idOrScreen, me)` → `ProfileDto { id, login, firstName, lastName, screenName, status, bio, city, birthday, isVerified, createdAt, counters, relation }` (relation и counters берутся через `SocialReadModel`, который identity получает по токену, объявленному в `kernel/tokens.ts` как `KERNEL.SocialRead` — единственная разрешённая точка связи между контекстами помимо событий); `SearchUsers(q, limit)`.

**`notifications`**

Порты: `NotificationRepository { insert(rows) }`, `NotificationReadModel { unreadCount(userId), list(userId, cursor) }`. Подписчик `GraphNotificationsSubscriber` регистрируется в `EventBus` при монтировании модуля: `FriendRequested` → `friend_request` адресату; `FriendshipAccepted` → `friend_accepted` заявителю; `FriendRequestDeclined` → ничего (VK не сообщает); `new_follower` не пишется (решение: выключено). Команда `MarkNotificationsRead(me, uptoId)`: `update ... set read_at = now() where user_id = me and id <= uptoId and read_at is null`. Запросы `GetUnreadCount(me)`, `GetNotifications(me, cursor)` с джойном актора (`id, firstName, lastName, screenName`).

**`search`** (внутри `identity` и `social-graph` как запросы, объединяет presentation-роут `GET /search` в модуле `social-graph`): `SearchUsers` и `SearchCommunities` по `similarity(lower(name), lower(q)) > 0.2` либо префиксу, сортировка `similarity desc, popularity_rank desc`, по 10 на вид.

### 4.2 HTTP API

Все под `/api/v1`, cookie-сессия, `auth: true` везде, кроме `GET /users/:idOrScreen` и `GET /communities/:idOrScreen` (для них `auth` опционален: `relation`/`membership` вычисляются только при наличии сессии). Ошибки в формате `{ error: { code, message } }`.

| Метод и путь | Команда/запрос | Ответ |
| --- | --- | --- |
| `GET /users/:idOrScreen` | `GetProfile` | `{ user: ProfileDto }` |
| `PATCH /me/profile` | `UpdateProfile` | `{ user: ProfileDto }` |
| `GET /users/:id/friends?cursor` | `GetFriends` | `{ items: UserCellDto[], nextCursor }` |
| `GET /users/:id/followers?cursor` | `GetFollowers` | то же |
| `GET /me/friends/requests?dir=incoming\|outgoing&cursor` | `GetFriendRequests` | то же |
| `POST /friends/:id/request` | `SendFriendRequest` | `{ relation }` |
| `POST /friends/:id/accept` | `AcceptFriendRequest` | `{ relation }` |
| `POST /friends/:id/decline` | `DeclineFriendRequest` | `{ relation }` |
| `DELETE /friends/:id` | `RemoveFriend` | `{ relation }` |
| `GET /me/friends/suggestions` | `GetSuggestedFriends` | `{ items: SuggestionDto[] }` (`mutual`, `sameCity`) |
| `POST /me/friends/suggestions/:id/hide` | `HideSuggestion` | `204` |
| `GET /communities/:idOrScreen` | `GetCommunity` | `{ community: CommunityDto }` |
| `GET /communities/:id/members?cursor` | `GetCommunityMembers` | `{ items, nextCursor }` |
| `GET /me/communities` | `GetMyCommunities` | `{ items: CommunityCellDto[] }` |
| `POST /communities` | `CreateCommunity` | `201 { community }` |
| `POST /communities/:id/join` | `JoinCommunity` (+ `FollowCommunity`) | `{ membership, isFollowing }` |
| `DELETE /communities/:id/join` | `LeaveCommunity` (+ `UnfollowCommunity`) | `{ membership, isFollowing }` |
| `POST /communities/:id/follow` | `FollowCommunity` | `{ isFollowing }` |
| `DELETE /communities/:id/follow` | `UnfollowCommunity` | `{ isFollowing }` |
| `GET /search?q=&kind=all\|users\|communities` | `SearchUsers`+`SearchCommunities` | `{ users: [], communities: [] }` |
| `GET /me/notifications?cursor` | `GetNotifications` | `{ items: NotificationDto[], nextCursor }` |
| `GET /me/notifications/unread-count` | `GetUnreadCount` | `{ count }` |
| `POST /me/notifications/read` `{ uptoId }` | `MarkNotificationsRead` | `{ count }` (новое число непрочитанных) |

`UserCellDto { id, firstName, lastName, screenName, city, isVerified, lastSeenAt }`. `CommunityDto { id, screenName, name, description, topic, isVerified, membersCount, membership, isFollowing }`. `NotificationDto { id, kind, createdAt, readAt, actor: UserCellDto | null, payload }`. Курсор: base64 от `${createdAtIso}|${id}`, непрозрачный для клиента. Резолвер `:idOrScreen`: `^id(\d+)$` и `^club(\d+)$` → по id, иначе по `screen_name`.

Коды ошибок: `self_friendship` 400, `friendship_not_found` 404, `not_addressee` 403, `request_cooldown` 409, `screen_name_taken` 409, `screen_name_reserved` 422, `invalid_screen_name` 422, `last_admin` 409, `community_not_found` 404, `user_not_found` 404, `validation` 422.

## 5. Фронт

### 5.1 FSD-слайсы

`shared`:
- `api`: гейтвеи не здесь, только `ApiClient`, `unwrap`, `UnauthorizedBus`, общие DTO-типы из контрактов, `Cursor`-типы.
- `lib/tabs`: порт `TabCoordinator` и токен `TAB_COORDINATOR` (см. 5.3), браузерная реализация, `fakeTabCluster`.
- `lib/query-keys.ts`: фабрика ключей TanStack (`userKeys.profile(id)`, `friendKeys.list(id)`, `friendKeys.requests(dir)`, `relationKeys(id)`, `communityKeys…`, `notificationKeys.unread`, `notificationKeys.list`, `searchKeys(q, kind)`).

`entities`:
- `user`: `UserCell` (VKUI `SimpleCell`/`RichCell`: аватар с инициалами, имя, подпись город/онлайн), `UserAvatar` (есть), типы `ProfileDto`, `UserCellDto`, `Relation`; порт `USER_GATEWAY { getProfile, getFriends, getFollowers, search }`.
- `community`: `CommunityCell`, типы, порт `COMMUNITY_GATEWAY { get, members, mine, search }`.
- `notification`: `NotificationItem` — маппинг `kind → { Icon, text(actor, payload), href }` для всех 12 видов в `model/kinds.ts` (чистая функция, табличный тест), неизвестный `kind` рендерится как «Новое уведомление»; тип `NotificationDto`; порт `NOTIFICATION_GATEWAY { unreadCount, list, markRead }`.
- `session`: без изменений.

`features`:
- `friendship`: порт `FRIENDSHIP_GATEWAY { request, accept, decline, remove }`; хук `useFriendAction(userId, relation)` → `{ label, mode, onClick, busy, secondary? }` со всеми переходами (`none → outgoing`, `incoming → friends|none`, `friends → none`, `outgoing → none` через «Отменить заявку» = `remove`), оптимистичное обновление `relationKeys(userId)`, откат и `Snackbar` при ошибке; вью `FriendButton` (VKUI `Button`/`ButtonGroup`).
- `community-membership`: `useJoinCommunity(communityId)`, `useFollowCommunity`, вью `JoinButton`.
- `edit-profile`: `useEditProfileForm(profile)` (поля, ошибки по кодам, сабмит через `USER_GATEWAY.updateProfile` — гейтвей объявлен в `entities/user`), вью `EditProfileForm` (`FormLayoutGroup`, `Input`, `Textarea`, `DateInput`, `Select` городов из `shared/config/cities.ts` — тот же список, что у сидера, вынесенный в `packages/contracts`).
- `create-community`: `useCreateCommunityForm()`, вью в `ModalPage` (`ModalRoot`) с `Select` тем.
- `search`: `useSearch(q, kind)` — дебаунс 300 мс через `useDeferredValue` + `useQuery(enabled: q.length >= 2)`; вью `SearchBox` для шапки (переход на `/search?q=` по Enter) и результаты.
- `suggestions`: `useSuggestions()` и `useHideSuggestion()`; вью `SuggestionCard` (аватар, имя, «N общих друзей», кнопки «Добавить» и «Скрыть»).
- `notifications`: `useUnreadCount()`, `useNotifications()` (infinite query), `useMarkRead()`, `useNotificationSync()` (см. 5.3); вью `NotificationBell` (`IconButton` + `Counter` + `Popover` со списком последних 10 и ссылкой «Все уведомления»).

`widgets`:
- `profile-card`: обложка `Gradient`, `Avatar size=96` с инициалами, имя + `Icon16Verified`, статус, город и дата регистрации, `FriendButton` или «Редактировать» для себя, счётчики друзей/подписчиков/сообществ как `SimpleCell` со ссылками.
- `friends-list`, `friend-requests` (`Tabs` входящие/исходящие, у входящих «Принять»/«Отклонить»), `pymk-block` (правая колонка: 3 карточки + «Показать всех»), `communities-list`, `community-header`, `notifications-list`, `search-results`.
- `app-shell`: шапка получает `SearchBox` и `NotificationBell`; пункт «Друзья» в `SideNav` получает `Counter` входящих заявок (из `GetCounters` текущего пользователя, ключ `friendKeys.counters`); правая колонка на ленте и профиле рендерит `pymk-block`.

`pages`: `profile` (`/id:n`, `/:screenName` — единый маршрут `/:handle` с резолвером `handle → {kind: user|community}` по префиксу `club`), `edit-profile` (`/edit`), `friends` (`/friends`, `Tabs`: Все, Заявки, Рекомендации; query-параметр `?tab=`), `communities` (`/communities`: Мои и Поиск), `community` (`/club:n` и `/:screenName`), `search` (`/search?q=&kind=`), `notifications` (`/notifications`). Заглушки для `photos`/`music` остаются.

### 5.2 Данные и мутации

TanStack Query: `staleTime` 10 с для профилей и списков, `unread` 0. Мутации инвалидируют: заявка/принятие → `relationKeys(other)`, `friendKeys.*`, `userKeys.profile(other)`, `userKeys.profile(me)`, `friendKeys.counters`, `notificationKeys.unread`; вступление в сообщество → `communityKeys.get(id)`, `communityKeys.mine`. Оптимистичное обновление только для `relation` и `membership`; списки перезапрашиваются.

### 5.3 Уведомления и вкладки

Порт `TabCoordinator` (`shared/lib/tabs/ports.ts`):
```ts
interface TabCoordinator {
  isLeader(): boolean
  onLeaderChange(cb: (leader: boolean) => void): () => void
  isActive(): boolean
  onActiveChange(cb: (active: boolean) => void): () => void
  broadcast(msg: TabMessage): void
  subscribe(cb: (msg: TabMessage) => void): () => void
}
type TabMessage =
  | { type: 'notifications:changed'; unread: number }
  | { type: 'notifications:read'; uptoId: number }
  | { type: 'tab:active'; tabId: string; active: boolean }
```
Браузерная реализация `createBrowserTabCoordinator()`: лидерство через `navigator.locks.request('vkc-leader', () => new Promise(() => {}))` (промис не резолвится, лок держится до закрытия вкладки; при отсутствии `navigator.locks` вкладка считает себя лидером), канал `new BroadcastChannel('vkc')`, активность из `document.visibilityState === 'visible' && document.hasFocus()` с событиями `visibilitychange`, `focus`, `blur`. Биндится в `app/composition/container.ts` как синглтон. Фейк `fakeTabCluster(n)` в `shared/lib/tabs/testing.ts`: n координаторов на общей шине, методы `close(i)`, `focus(i)` для тестов передачи лидерства и активности.

`useNotificationSync()` (features/notifications, монтируется в `app/App` один раз):
- Если лидер: `useQuery(unread, { refetchInterval: 30_000, refetchOnWindowFocus: true })`; при изменении значения `broadcast({ type: 'notifications:changed', unread })`.
- Не лидер: запрос выключен (`enabled: false`), значение приходит из сообщений: на `notifications:changed` кладём `unread` в кэш `setQueryData(notificationKeys.unread)` и инвалидируем `notificationKeys.list`.
- На `notifications:read` все вкладки инвалидируют оба ключа. `useMarkRead` после успеха шлёт это сообщение.
- Заголовок вкладки: `document.title = unread > 0 ? `(${unread}) ВКлон` : 'ВКлон'` во всех вкладках (заголовок не шумит).
- «Кто сигналит» для будущего звука/`Notification` API: чистая функция `pickAnnouncer({ isLeader, isActive, anyActive }): boolean` → активная вкладка сигналит; если активных нет, сигналит лидер. В этой подсистеме сигнал = только смена заголовка, поэтому функция реализуется и тестируется, но вызывается только для заголовка «мигания» нет.

### 5.4 Состояния загрузки: скелетоны, как у VK

VK не показывает спиннеры на страницах: пока данные грузятся, на месте каждого блока рисуется скелетон той же формы (шапка профиля с кругом аватара и полосками текста, список из строк «кружок + полоска», плитки сообществ). Мы делаем так же:

- Каждый виджет со списком или карточкой имеет парный компонент `<Name>Skeleton` в том же `ui/`, собранный из VKUI `Skeleton` (`width`/`height`/`borderRadius`, без своих цветов и анимаций — берутся из токенов компонента) внутри тех же `Group`/`SimpleCell`/`RichCell`, чтобы разметка не прыгала при появлении данных. Число строк-заглушек фиксировано (8 для списков, 3 для правой колонки).
- Скелетон показывается только при первой загрузке (`isPending`), при фоновой перезагрузке (`isFetching`) остаются данные. Для бесконечных списков внизу появляется один ряд скелетонов, не `PanelSpinner`.
- `PanelSpinner` остаётся только как `Suspense`-fallback ленивых маршрутов и в `RequireAuth` до ответа `/me`.
- Скелетон помечен `aria-busy="true"` и `aria-label="Загрузка"` на контейнере; тесты виджетов проверяют, что при `isPending` рендерится элемент с `aria-busy`, а после данных его нет.
- Для приятного ощущения при быстром ответе скелетон не «моргает»: если данные пришли быстрее 150 мс, его можно и не показывать — реализуется общим хуком `useDelayedPending(isPending, 150)` в `shared/lib`, с тестом на фейковых таймерах.

### 5.5 Ошибки на фронте

Тексты по кодам в `model/errors.ts` каждой фичи: `self_friendship` «Нельзя добавить себя», `request_cooldown` «Заявку можно повторить через сутки», `screen_name_taken` «Короткое имя занято», `screen_name_reserved`/`invalid_screen_name` «3–32 символа: латиница, цифры, _ . ; не начинается с id/club», `last_admin` «Назначьте другого администратора перед выходом», остальное «Что-то пошло не так». Показ через VKUI `Snackbar` (портал в `AppRoot`), для форм — `FormItem status/bottom` с `aria-describedby`, как в auth. 401 идёт через `UnauthorizedBus`, 404 профиля рендерит `Placeholder` «Пользователь не найден».

## 6. Сидер

Без новых стадий. Дополнения: флаг `--users N` уже есть; добавляется детерминированный пользователь `demo_seed` (логин `demo_seed`, пароль `password123`) с 30 принятыми дружбами, 5 входящими и 3 исходящими заявками, членством в 4 сообществах и городом «Москва», чтобы e2e и ручная проверка имели известную точку входа. Строки `notifications` сидер не пишет: входящие заявки видны на вкладке «Заявки», а уведомления начнут накапливаться с живых действий.

## 7. Тесты

Бэкенд (Bun test):
- Домен: таблицы переходов `Friendship` (все пары состояние × действие × кто), `Community` (последний админ, идемпотентный `join`), `ScreenName` (валидные, зарезервированные, префиксы).
- Application: `createSocialGraphTestContainer`, `createNotificationsTestContainer` с in-memory фейками; сценарии: заявка → уведомление адресату; принятие → уведомление заявителю и `follows` не дублируется; отклонение → подписка остаётся, уведомления нет; встречная заявка = дружба; `HideSuggestion` инвалидирует кэш; `MarkRead` идемпотентен.
- Интеграционные (`vk_test`): SQL `GetSuggestedFriends` и поиск на сиде 2000 пользователей: правильные исключения, лимиты, отсутствие seq scan по `friendships` в `EXPLAIN (FORMAT JSON)`; уникальность `screen_name` → 409.
- HTTP e2e (`*.e2e.test.ts`): полный цикл заявки двумя сессиями, гонка встречных заявок (два параллельных `POST`), `PATCH /me/profile` с занятым именем, вступление/выход последнего админа, курсорная пагинация друзей (3 страницы), `unread-count` до и после `read`.

Фронт (Vitest, TDD, каждый хук через `withDi` + фейковые гейтвеи, вью по ролям и подписям):
- `useFriendAction`: все переходы, оптимистичное значение до ответа, откат и `Snackbar` при ошибке.
- `useSearch`: дебаунс (фейковые таймеры), не запрашивает при `q.length < 2`, отмена устаревшего ответа.
- `useNotificationSync` на `fakeTabCluster(3)`: запрашивает только лидер; смена значения доходит до всех; закрытие лидера передаёт роль; `notifications:read` инвалидирует всех.
- `pickAnnouncer` табличный; `kinds.ts` — по одному кейсу на каждый из 12 видов плюс неизвестный.
- Формы `EditProfileForm`, `CreateCommunityForm`: ошибки по полям, `aria-invalid`, сброс при вводе.
- Виджеты и страницы: рендер по данным, скелетоны при `isPending` (`aria-busy`), пустые состояния `Placeholder`, `Tabs` переключают контент, счётчик заявок в `SideNav`; `useDelayedPending` на фейковых таймерах.
- `vkui-only.test.ts`, Steiger, oxlint без изменений правил.

Playwright (новый файл `e2e/social.spec.ts`, `auth.spec.ts` не меняется): два `browserContext` (A и B): A ищет B через поиск, открывает профиль, отправляет заявку; у B во второй вкладке без перезагрузки появляется счётчик колокольчика и заявка; B принимает; у A уведомление `friend_accepted` и кнопка «У вас в друзьях»; A редактирует статус и короткое имя, профиль открывается по `/{screenName}`; A создаёт сообщество, B вступает, счётчик участников равен 2.

## 8. Порядок реализации (для плана)

1. Миграция `0003`, схемы, `kernel/screen-name.ts`, `KERNEL.SocialRead` токен.
2. `social-graph` домен + application + фейки + тесты.
3. `social-graph` инфраструктура (Drizzle, Redis кэш) + интеграционные тесты SQL рекомендаций и поиска.
4. `identity`: `UpdateProfile`, `GetProfile`, `SearchUsers`.
5. `notifications` модуль + подписчик на события.
6. Presentation всех трёх модулей + HTTP e2e + контракты.
7. Фронт `shared/lib/tabs`, `query-keys`, `entities/{user,community,notification}` с гейтвеями и биндингами.
8. Фронт `features/{friendship, community-membership, suggestions}` + виджеты + страницы профиля и друзей.
9. Фронт `features/{search, edit-profile, create-community}` + страницы поиска, сообществ, редактирования.
10. Фронт `features/notifications` + `useNotificationSync` + колокольчик + страница.
11. Сидер `demo_seed`, Playwright `social.spec.ts`, документация, финальное ревью.

## 9. Отклонения при реализации

Зафиксировано по ходу задач 1–15 (журнал: `.superpowers/sdd/2026-09-06-social-graph/progress.md`), дата закрытия 2026-09-06.

### Данные и контракты
- `TOPICS` и `CITIES` переехали из сидера/бэкенда в `@vkc/contracts`, чтобы фронт (Select-опции в форме сообщества и профиля) и бэкенд (валидация) не расходились в списке значений.
- `NOTIFICATION_KIND` (enum) тоже описан в `@vkc/contracts`, а не только в Drizzle-схеме — фронтовый `describeNotification` типизирован по нему напрямую (задача 7/8).
- Курсоры пагинации по `created_at` используют `date_trunc` до миллисекунд вместо микросекунд/полного timestamp: Postgres `timestamptz` в JS теряет точность при сериализации в JSON, `date_trunc('milliseconds', …)` держит курсор стабильным при двух строках с «одинаковым» на вид временем (задача 7/8).

### Доменная модель
- `Friendship.cancel(by)` добавлен сверх спеки: UI требует кнопку «Отменить заявку» у исходящей заявки (симметрично «Отклонить» у входящей), а в §4.1 был только `remove`/`decline`.
- Правило повторной заявки после отклонения: исходный инициатор может отправить заявку заново через 24 часа (`RequestCooldown`); в спеке было решение «отклонение не мешает подписке», но не было явного правила про повторную заявку — принято по ходу задачи 3. Точка отсчёта и права отклонившего уточнены в финальной ревью-волне, см. ниже.
- `Community.save` в инфраструктуре оборачивается в `db.transaction` (участники и запись сообщества пишутся атомарно) — в §4.1 транзакция не была явно оговорена, добавлена по итогам ревью задачи 5/7.
- Сохранение дружбы через условный upsert («вставить или обновить, если заявка ещё не в терминальном статусе») вместо `ConflictError('race')`: `FriendshipRepository.save` возвращает исход (`created` / `updated` / `raced_accepted`), а «оба одновременно отправили заявку друг другу» — легитимный случай, обрабатываемый как мгновенное принятие, а не гонка-ошибка. При `raced_accepted` `FriendshipAccepted` публикует только тот запрос, что проиграл гонку на вставку, — иначе событие ушло бы дважды.
- Токен `SOCIAL.Clock` вынесен в кернел-контейнер (аналог `Clock` в других модулях), чтобы 24-часовой cooldown повторной заявки был детерминированно тестируем без реального времени.

### HTTP API
- `GET /handles/:handle` — отдельный роут разрешения «человек или сообщество» по короткому имени/`id{n}`/`club{n}`, не описанный явно в §4.2; нужен фронту (`useHandle`) до того, как решать, какую страницу рендерить.
- `GET /me/counters` добавлен в ходе задачи 11 — фронту нужны счётчики (друзья/подписчики/сообщества/входящие заявки) для правой колонки профиля и шапки, отдельного маршрута под это в исходном списке не было; реализован через ту же query, что и `GetProfile`.

### Фронт
- `SuggestionCard` получил слот `friendAction` (рендер `FriendButton` пробрасывается снаружи) вместо жёстко зашитого `relation="none"` — иначе кнопка не отражала реальное состояние после отправки заявки прямо из блока «Возможно, вы знакомы» (баг найден на ручной проверке демо, закрыт в задаче 13).
- `useJoinCommunity(community: CommunityDto)` принимает весь `CommunityDto`, а не только `id` — сигнатура понадобилась и для чтения `membership`/`isFollowing`, и чтобы инвалидировать `community.members`/`community.membersPreview` после вступления (добавлено ревью-волной после задачи 12b).
- `AppShell` получил слоты `wide` и `rightColumn`; `HandleRoute` (не `pages/handle`) сам решает «человек/сообщество/не найдено» и собирает `AppShell` — `pages/profile`/`pages/community` не могут импортировать друг друга под Steiger, а решение живёт на уровень выше, в `app/routes`.
- `Counter` (колокольчик уведомлений) рендерится с `size="s"` — дефолтный размер VKUI визуально не помещался в шапку рядом с 28px-иконками.
- `Icon28Notification` (закрашенная) используется как fallback-иконка для неизвестных видов уведомлений — `Icon28NotificationOutline` не существует в установленной версии `@vkontakte/icons`.
- VKUI `Avatar` ограничен максимальным `size=96` в поставленной версии — обложки профиля/сообщества (200px) используют плейсхолдер-блок, а не увеличенный `Avatar`, до появления настоящих картинок (подсистема 6).
- `TabsItem` в установленной версии VKUI не принимает проп `mode` — режим табов задаётся на родительском `Tabs`.
- `Popover` замокан в тесте колокольчика (`NotificationBell.test.tsx`): реальный `Popover` держит позиционирование на `floating-ui`, которое в jsdom не сходится (нулевые `getBoundingClientRect`), тест проверяет контракт «клик по триггеру показывает контент», а не саму библиотеку.

### Сидер
- Аккаунт `demo` — существующий сидовый пользователь, переиспользован вместо создания отдельного `demo_seed` (второй аккаунт `deniscoreablev` не трогали). У `demo` теперь фиксированный (не зависящий от масштаба) граф: ровно 30 принятых дружб, 5 входящих заявок, 3 исходящих заявки, членство в 4 сообществах — раньше эти числа были верхней границей пула («до 150 друзей»), из-за чего при маленьком `--scale` реальные числа отличались от документации. Чистая часть вынесена в `apps/seeder/src/generate/demo.ts` (`buildDemoGraph`) с юнит-тестом на детерминизм и точные счётчики.

### Финальная ревью-волна (2026-09-06)

- **`ProfileDto.login` — только владельцу.** `login` — это логин входа, а не часть публичного профиля; раньше `GET /users/:id` отдавал его любому, включая неаутентифицированного гостя. Теперь поле опционально в контракте и присутствует в ответе только при `relation === 'self'` (`toProfileDto` / `getProfileHandler`). `PATCH /me/profile` всегда self, поэтому там оно есть.
- **Cooldown повторной заявки привязан к отклонению, а не к отправке.** Миграция `0004` добавляет `friendships.declined_at`; `Friendship.decline()` его проставляет (через `SOCIAL.Clock`, чтобы правило тестировалось без ожидания суток). Отклонивший может написать первым сразу — он и сказал «нет», передумать не запрещено; 24 часа ждёт только исходный инициатор, и отсчёт идёт от `declined_at`. Иначе заявка, провисевшая без ответа неделю, повторялась бы мгновенно после отклонения. Строки, созданные до `0004`, откатываются на `created_at` (прежнее поведение).
- **Идемпотентность уведомлений.** Частичный уникальный индекс `notifications_dedupe_uq` на `(user_id, kind, actor_id) WHERE read_at IS NULL` плюс `ON CONFLICT DO NOTHING` при вставке: повторная доставка того же события (ретрай публикации, at-least-once подписчик) не плодит непрочитанные строки, а после `markRead` новое событие от того же актора снова уведомляет.
- **Дружба ≠ подписка.** При принятии заявки (напрямую, встречной заявкой или через гонку взаимных заявок) строка `follows(инициатор → адресат)`, созданная заявкой, удаляется: связь теперь несёт ребро дружбы, а оставшаяся строка задваивала счётчик подписчиков. Отклонение подписку по-прежнему сохраняет.
- **Членство в сообществе меняется под блокировкой.** `CommunityRepository.withLock(id, fn)` читает сообщество через `SELECT … FOR UPDATE` и в той же транзакции пишет диф участников и пересчитанный `members_count`. Инвариант («последний админ не выходит») остаётся в `Community`; блокировка лишь гарантирует, что агрегат рассуждает о зафиксированном состоянии, а не о устаревшем снимке.
- **Поиск ходит в триграммный индекс.** `similarity(x, $q) > 0.2` заменён на индексируемый оператор `x % $q` (`gin_trgm_ops`); порог задаётся на запрос через `SET LOCAL pg_trgm.similarity_threshold` внутри транзакции, потому что `set_limit()` живёт в сессии, а bun-sql переиспользует соединения из пула. `GET /search` требует 2–64 символа в `q`.
- **Проверки существования перед записью.** Порт `SOCIAL.UserExists` (`select 1 from users`) отвечает 404 на заявку/скрытие несуществующему пользователю до любой записи, `friendships` пишется раньше `follows`; подписка на несуществующее сообщество — тоже 404, а не осиротевшая строка `follows`.
- **Хендлы регистронезависимы.** `resolveHandle`/`community()` приводят хендл к нижнему регистру и матчат `id{n}`/`club{n}` без учёта регистра — `/users/DENIS`, `/handles/DeNiS`, `/communities/KINO` больше не 404.

### Playwright
- `apps/web/e2e/social.spec.ts` проверяет догон счётчика непрочитанных во вторую вкладку через CSS-класс `.vkuiCounter__host` (внутренний, но стабильный класс компонента VKUI `Counter`), а не через свой `data-testid` — в разметке колокольчика (`NotificationBell.tsx`) счётчик не имеет отдельного testid, а `aria-label` кнопки-колокольчика неудобно матчить на промежуточное значение во время опроса.
- Экранное имя тестового сообщества — `klub_e2e_<ts>` (через «к», не «club»): зарезервированный префикс `club\d+` (для ссылок `/club{id}`) требует цифры сразу после `club`, так что `club_e2e_...` формально прошёл бы, но `klub_e2e_...` однозначно избегает даже видимости конфликта.
