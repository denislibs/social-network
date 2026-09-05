# Как собран vk.ru: карта компонентов VKUI по экранам

Снято 2026-09-06 с живого vk.ru (desktop, viewport 1728×963, тёмная схема) через DOM: у VK в вёрстке настоящие классы VKUI 8 (`vkuiButton__host`, `vkuiSimpleCell__host`, модификаторы вида `vkuiButton__modeSecondary`, `vkuiGroup__modeCard`). Это первоисточник для нашего фронта: **какой компонент VKUI стоит на каком месте**. Иконки — по классам `vkuiIcon--<name>`, они же имена в `@vkontakte/icons` (`like_outline_24` → `Icon24LikeOutline`).

Что важно для нас в целом:

- Везде **`densityCompact`** (десктопная плотность): `SimpleCell`, `IconButton`, `Search`, `TabsItem`, вся типографика. У нас: `AdaptivityProvider` с `sizeY="compact"`.
- Карточки — `Group` с `modeCard` + `paddingM`; страничный лейаут — `SplitLayout` → `SplitCol`. На 1728px центральная колонка контента **551px**, правая **345px**, зазор 16px; общий контент 912px; левое меню ~200px.
- Шапка — `FixedLayout` высотой 48px: логотип, `Search` (compact), `IconButton` ×3 (уведомления, плеер), `Avatar` пользователя + `dropdown_12`.
- Левое меню — **не** VKUI-компонент целиком (`LeftMenu__leftMenu`), но каждый пункт — `Tappable` + `Text` + иконка 24 + `Counter` (`modePrimary sizeS`, у нас — бейдж непрочитанных). Мы делаем то же через `SimpleCell` `before={<Icon24…/>}` `after={<Counter/>}`.
- Табы — `Tabs` с `withGaps`, элементы `TabsItem` в режимах `modeSecondary` (обычные) и `modeAccent` (выделенные), `selected`.
- Кнопки в ходу: `mode` `secondary` (чаще всего), `primary`, `tertiary`, `link`, `outline`; `appearance` `accent`/`neutral`/`overlay`; размеры `s`/`m`/`l`; `stretched`; `singleIcon`. Группы кнопок — `ButtonGroup`.
- Заголовки блоков — `Header` (`sizeM`) с `EllipsisText`, часто со счётчиком («Подписки 64») и правой ссылкой («Показать все»).
- Ссылки в тексте — `Link` с `withUnderline` (подчёркивание при ховере).
- Типографика: `Text`, `Subhead`, `Footnote`, `Caption`, `Paragraph`, `Headline`, `DisplayTitle` (имя в профиле). Прямых `font-size` нет.
- Тёмная схема применяется VKUI-провайдером на контейнере приложения, не на `:root` (на `:root` лежат светлые значения токенов).

Токены, снятые с `:root` (светлая схема, VKUI `--vkui--*`):

| Токен | Значение |
|---|---|
| `color_background` | `#edeef0` |
| `color_background_content` | `#ffffff` |
| `color_background_secondary` | `#f0f2f5` |
| `color_text_primary` | `#000000` |
| `color_text_secondary` | `#818c99` |
| `color_text_accent` / `color_icon_accent` | `#447bba` |
| `color_separator_primary` | `#dce1e6` |
| `size_border_radius--regular` | `8px` |
| `size_border_radius_paper--regular` | `12px` |
| `size_button_large_height--regular` | `44px` |

Ничего из этого не копировать в свой CSS — брать через `var(--vkui--…)` или, лучше, вообще не писать цвета.

## Профиль (`/deniscoreablev`)

Раскладка: `SplitLayout` → одна широкая колонка 912px (шапка профиля) → ниже две колонки 551 + 345.

1. **Шапка профиля** — `Group modeCard` на всю ширину: обложка, `Avatar` 128 с `AvatarBadge` (кнопка «+» смены аватара), имя `DisplayTitle` + эмодзи-статус, подпись `Footnote` + `Link` («Укажите информацию о себе ›»), справа `ButtonGroup`: `Button modeSecondary sizeM` «Редактировать профиль», `Button singleIcon` (`pen_outline_24` / share), `Button modeSecondary` «Ещё» с `dropdown_12`.
2. **Блок «Музыка / Фото / Видео / Альбомы / Клипы / Статьи»** — `Group modeCard`: `Tabs withGaps` с иконками 20 (`music_outline_20`, `picture_outline_20`, `video_square_outline_20`, `picture_stack_outline_20`, `logo_clips_outline_20`, `articles_outline_20`); контент вкладки — `HorizontalScroll` со `ScrollArrow`, элементы `HorizontalCell sizeAuto` (`Image` 96 + `Footnote` подпись), ниже список треков `SimpleCell` (`Image` 40 + `Subhead`/`Footnote` + время) и `Button modeSecondary stretched` «Показать всё».
3. **«Создать пост»** — `Group modeCard` с `ButtonGroup`: `Button modeTertiary` `add_24` «Создать пост», справа `Button singleIcon` ×2 (`statistics_outline_20`, `chevron`).
4. **Стена** — `Group modeCard` с `Header` из `Tabs` («Главная | Все посты | Мои посты») и `IconButton` `search_outline_24`; далее посты (см. «Пост»).
5. **Правая колонка**: `Group modeCard` «Друзья» (`Header` + `Placeholder`: `user_add_outline_24`, «У вас пока нет друзей», `Button modeTertiary` «Добавить друзей»), `Group modeCard` «Подарки 36» (`Header` + сетка `Image`), `Group modeCard` «Подписки 64» (`Header` + `SimpleCell` ×N: `Avatar` 40, `Subhead` имя, `Footnote` описание).

## Пост (в ленте и на стене)

Одна карточка = `Group modeCard`, внутри:

- Шапка: `SimpleCell` (`Avatar` 40 автор, `Subhead` имя [+ `verified_16`], `Footnote` дата/гео) + справа `Button modeSecondary sizeS` «Подписаться» и `IconButton` `more_horizontal_24`.
- Тело: `Text`/`Paragraph` с `Link`-ами и «Показать ещё»; медиа — `AspectRatio` + `Image`, карусель фото на `CarouselBase`/`HorizontalScroll` со `ScrollArrow`, бейдж «1/4».
- Действия: `IconButton` ×3 с `like_outline_24`, `comment_outline_24`, `share_outline_24` и счётчиками `Footnote`; справа `Footnote` просмотры и дата (`pin_12` для закреплённых, `repost_outline_16` для репостов).
- Комментарии: `SimpleCell` компактные, `Avatar` 32.

## Лента (`/feed`)

Колонки 551 + 345.

- **Истории** — `Group modeCard` без паддинга: `HorizontalScroll` карточек 80×132 с `Avatar` и `Footnote` подписью, первая — «История» с `add_outline_28`.
- **«Создать»** — `Group modeCard`: `ButtonGroup` → `Button modeTertiary` `add_24` «Создать» + `chevron`.
- **Посты** — по одной карточке на пост (см. выше). Между постами — рекламные/рекомендательные `Group` («Рекомендуем в VK Видео»: `Header` + `HorizontalScroll` `AspectRatio`-карточек + `IconButton` «Скрыть»).
- **Правая колонка**: `Group modeCard` «Лента» — вертикальные табы-ссылки («Фотографии», «Друзья», «Поиск», «Реакции») как `SimpleCell`, справа `IconButton` `sliders_outline_20` (настройки ленты); ниже промо-`Group` с картинкой и `Button modeSecondary stretched`.

## Мессенджер (`/im`, `/im?sel=…`)

Одна карточка `Group modeCard` на всю ширину 912px, внутри две панели: **список бесед 270px** и **чат**.

- Список: заголовок-строка (`IconButton` `menu_outline_20` «бургер», `Text` «Мессенджер», `IconButton` ×3: `phone_add_outline_24`, `archive_outline_24`, `write_outline_24`), `Search densityCompact withPadding` «Поиск», `Banner` «Бизнес-уведомления», `Tabs` (`TabsItem modeAccent`: «Все 1» с `Counter`, «Каналы 6») + `IconButton` `gear_outline_20`; беседы — `SimpleCell` (`Avatar` 48 [+ `verified_16`], `Text` имя, `Footnote` превью, справа `Footnote` время + `Counter sizeS` непрочитанных, `check_double_outline_16` для прочитанных своих); футер — `SimpleCell` «Только непрочитанные» с `Switch`; кнопка сворачивания `IconButton` `chevron_left_2_20`.
- Чат: шапка (`IconButton` `cancel_24` закрыть, `Avatar` 32, `Text` имя + `Footnote` «14,1M подписчиков», справа `IconButton` `search_outline_24`, `more_horizontal_24`); системная плашка `Banner`/`Div` с `Button modeSecondary sizeS`; пустое состояние — `Placeholder` с `messages_outline_56` «Здесь будет выводиться история переписки»; композер снизу — собственный VK-компонент (`ComposerInput`, не VKUI): `IconButton` `add_circle_fill_blue_24`, поле «Сообщение», справа стикеры (`smile`) и `mic`. У нас композер собираем из `Textarea`/`WriteBar` VKUI (`WriteBar` + `WriteBarIcon` — есть в VKUI как раз для этого).
- Сообщения-пузыри — свои классы VK (`ConvoListItem__message`), не VKUI; в VKUI аналога нет, делаем свой блок на токенах (`--vkui--color_background_secondary` для входящих, accent-tint для исходящих).

## Друзья (`/friends`)

Колонки 551 + 345.

- Центр: `Group modeCard` → строка `Tabs withGaps` («Все друзья 0» / «Друзья онлайн 0» — `TabsItem` с `Counter appearanceNeutral`) + `Button modeSecondary sizeS` «Найти друзей»; `Search densityCompact` «Введите запрос» с `IconButton` `sliders_outline_20`; пусто — `Placeholder` (`user_add_outline_56`, заголовок, `Button modeSecondary` «Найти друзей»). Со списком друзей — `SimpleCell` ×N (`Avatar` 56, `Subhead` имя, `Footnote` город/онлайн, справа `IconButton` `message_outline_24`, `more_horizontal_24`).
- Право: `Group modeCard` «Мои друзья» с выпадающим списком (`dropdown_12`) и пункты `SimpleCell` («Заявки в друзья», «Исходящие заявки», «Поиск друзей»); `Group modeCard` **«Возможные друзья»** — `Header` + `SimpleCell` ×5 (`Avatar` 40, `Subhead` имя, `Footnote` «N общих друзей», справа `IconButton` `user_add_outline_24`) + `Button modeSecondary stretched` «Показать всех». Это ровно наш блок рекомендаций из спека.

## Сообщества (`/groups`)

Колонки 551 + 345.

- Центр: `Group` с `Search` «Поиск сообществ» (+ `IconButton` очистки); `Group modeCard` «Недавно посещали» (`Header` + `HorizontalScroll` `HorizontalCell` с `Avatar` 56); `Group modeCard` «Все сообщества 83» — двухколоночная сетка `SimpleCell` (`Avatar` 48, `Subhead` имя [+ `verified_16`], `Footnote` тематика, `Badge`/`Counter` непрочитанного) + `CellButton` «Показать все ›»; `Group modeCard` «Для вас» — `Header` с `Link` «Показать все», `HorizontalScroll` карточек (`AspectRatio` обложка, `Footnote` «249,1K подписчиков», название, тематика, `Button modeSecondary sizeS stretched` «Подписаться»).
- Право: `Group modeCard` с `Button modePrimary stretched` «Создать сообщество» и пункты `SimpleCell` («Главная», «Мероприятия»); `Group modeCard` «Популярное» — `SimpleCell` ×6 (`Avatar`, `Subhead`, `Footnote` подписчики, `IconButton` подписаться).

## Иконки, которые точно понадобятся (имена `@vkontakte/icons`)

Навигация 24: `user_outline`, `newsfeed_outline`, `message_outline`, `users_outline`, `users_3_outline` (сообщества), `picture_outline`, `music_outline`, `video_outline`, `bookmark_outline`, `help_outline`, `services_outline`.
Шапка: `search_outline_16/24`, `notification_outline_24`, `skip_back_24`, `play_24`, `skip_forward_24`, `dropdown_12`, `cancel_24`.
Пост: `like_outline_24`, `comment_outline_24`, `share_outline_24`, `more_horizontal_24`, `repost_outline_16`, `pin_12`, `add_24`, `add_outline_28`.
Профиль: `pen_outline_24`, `add_circle_fill_blue_24`, `statistics_outline_20`, `music_outline_20`, `picture_outline_20`, `video_square_outline_20`, `picture_stack_outline_20`, `logo_clips_outline_20`, `articles_outline_20`, `user_add_outline_24`, `verified_16`.
Мессенджер: `menu_outline_20`, `write_outline_24`, `archive_outline_24`, `phone_add_outline_24`, `gear_outline_20`, `check_double_outline_16`, `message_unread_top_outline_20`, `chevron_left_2_20`, `messages_outline_56`, `sliders_outline_20`.

Проверять каждое имя по каталогу https://vkcom.github.io/icons/ и через MCP `vkui` перед использованием.

## Что из VKUI брать под наши экраны (сводка)

| Наш экран | Компоненты VKUI |
|---|---|
| Оболочка | `ConfigProvider`, `AdaptivityProvider sizeY=compact`, `AppRoot`, `SplitLayout`, `SplitCol` (200 / 551 / 345), `FixedLayout` (шапка), `Search`, `IconButton`, `Avatar`, `SimpleCell` + `Counter` (левое меню) |
| Вход / регистрация | `Panel`, `Group modeCard`, `FormLayoutGroup`, `FormItem`, `Input`, `Button size=l stretched`, `Link`, `Footnote` |
| Лента | `Group modeCard` на пост, `SimpleCell` (шапка поста), `Text`/`Paragraph`, `AspectRatio` + `Image`, `HorizontalScroll` + `HorizontalCell` (истории), `IconButton` + `Footnote` (действия), `Placeholder`, `Spinner`/`ScreenSpinner` |
| Профиль | `Group modeCard`, `Avatar` 128 + `AvatarBadge`, `DisplayTitle`, `ButtonGroup`, `Tabs`/`TabsItem`, `HorizontalScroll`, `Header`, `SimpleCell` |
| Друзья | `Tabs` + `Counter`, `Search`, `SimpleCell` (`Avatar` 56), `IconButton`, `Placeholder`, `Header`, `Button stretched` |
| Сообщества | `Search`, `Header`, `SimpleCell` сетка, `HorizontalScroll`, `CellButton`, `Badge` |
| Мессенджер | `Search`, `Tabs`, `SimpleCell` (`Avatar` 48, `Counter`), `Switch`, `Banner`, `Placeholder`, `WriteBar` + `WriteBarIcon` (композер), свои пузыри на токенах |
