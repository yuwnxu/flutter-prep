---
id: mistakes
stage: 7
title: Типичные ошибки и как их чинить
lead: Тексты ошибок, которые вы увидите чаще всего, что они значат и как исправить за минуту.
---

## Ошибки раскладки

### RenderFlex overflowed by N pixels
**Что значит:** элементы в `Row` или `Column` не поместились.
**Как чинить:** оберните длинный элемент в `Expanded` или `Flexible`, добавьте `overflow: TextOverflow.ellipsis` у текста, либо дайте прокрутку (`SingleChildScrollView`). Для колонки на всю высоту экрана с содержимым, которое может не поместиться, используйте `SingleChildScrollView` или `ListView`.

### Vertical viewport was given unbounded height
**Что значит:** `ListView` лежит внутри `Column`, у него нет ограничений по высоте.
**Как чинить:** оберните `ListView` в `Expanded`, либо `shrinkWrap: true` (для небольших списков) и `physics: NeverScrollableScrollPhysics()`.

### BoxConstraints forces an infinite width
**Что значит:** виджет просят быть бесконечно широким (часто `TextField` в `Row`).
**Как чинить:** оберните `TextField` в `Expanded` или `SizedBox(width: ...)`.

### Incorrect use of ParentDataWidget
**Что значит:** `Expanded` или `Positioned` стоит не внутри `Row/Column/Stack`.
**Как чинить:** проверьте, что `Expanded` — прямой ребёнок `Row/Column/Flex`, а `Positioned` — прямой ребёнок `Stack`.

## Ошибки состояния и жизненного цикла

### setState() called after dispose()
**Что значит:** вы вызвали `setState` после ухода с экрана (таймер, `await`).
**Как чинить:** `if (!mounted) return;` после `await`; в `dispose` отменяйте таймеры и подписки.

### Null check operator used on a null value
**Что значит:** `!` применён к `null`.
**Как чинить:** вместо `!` используйте `??`, `?.` или `if (x != null)`.

### LateInitializationError
**Что значит:** `late`-переменную прочитали до присваивания.
**Как чинить:** присвойте в `initState` или сделайте поле nullable.

### Looking up a deactivated widget's ancestor is unsafe
**Что значит:** вы используете `context` после того, как виджет удалён (часто после `await`).
**Как чинить:** проверяйте `mounted` и не сохраняйте `context` надолго.

### A TextEditingController was used after being disposed
**Что значит:** контроллер освободили, а виджет ещё жив.
**Как чинить:** создавайте контроллер в `initState`, освобождайте в `dispose` того же `State`.

## Ошибки ресурсов и сборки

### Unable to load asset: assets/...
**Что значит:** файла нет в `pubspec.yaml` в `assets:`, либо опечатка в пути, либо внутри пакета не указан `package:`.
**Как чинить:** добавьте папку в `assets`, сделайте `flutter pub get`, перезапустите приложение (hot reload не подхватывает новые ассеты). В пакете: `Image.asset('assets/x.png', package: 'uikit')`.

### Because app depends on uikit ... version solving failed
**Что значит:** конфликт версий пакетов.
**Как чинить:** проверьте `environment: sdk` в `pubspec.yaml` библиотеки и приложения, подберите совместимые версии, `flutter pub upgrade`.

### Target of URI doesn't exist: 'package:...'
**Что значит:** пакет не подключён или `pub get` не выполнен.
**Как чинить:** добавьте пакет в `dependencies`, выполните `flutter pub get`.

### Gradle / Kotlin / SDK errors
**Как чинить:** `flutter clean`, `flutter pub get`, пересборка. Проверьте `minSdk` и версии Gradle по сообщению ошибки. Не меняйте версии наугад: читайте первую строку «What went wrong».

### MissingPluginException
**Что значит:** плагин добавлен, но приложение не пересобрано.
**Как чинить:** полностью остановить и запустить `flutter run` заново.

## Ошибки сети

### SocketException: Failed host lookup
**Что значит:** нет интернета или неверный адрес.
**Как чинить:** проверьте сеть и `baseUrl`. В приложении это должно превращаться в `NoInternetException` с SnackBar на 5 секунд.

### Cleartext HTTP traffic not permitted
**Что значит:** адрес начинается с `http://`, Android блокирует незащищённый трафик.
**Как чинить:** используйте `https://`, либо (если организатор разрешил) `android:usesCleartextTraffic="true"` в манифесте.

### FormatException: Unexpected character
**Что значит:** сервер вернул не JSON (HTML-страница ошибки или пустой ответ).
**Как чинить:** напечатайте `response.body` (уровень DEBUG), проверьте статус-код до `jsonDecode`.

### type 'Null' is not a subtype of type 'String'
**Что значит:** в JSON нет поля или оно `null`, а в модели оно обязательное.
**Как чинить:** проверьте названия полей в документации, сделайте поле nullable (`String?`) или значение по умолчанию (`?? ''`).

### 401 / 403 при запросах после входа
**Что значит:** токен не передан или устарел.
**Как чинить:** сохраните токен после логина, подставляйте в заголовок `Authorization`, восстановите при старте приложения.

## Ошибки Git

| Ситуация | Что делать |
|---|---|
| `rejected ... non-fast-forward` | `git pull --rebase origin <ветка>`, затем `git push` |
| Закоммитили `build/` | Добавить в `.gitignore`, выполнить `git rm -r --cached build` |
| Забыли ветку и сделали коммиты в `main` | Создать ветку: `git checkout -b sprint-N`; затем вернуть `main` на нужный коммит |
| Конфликт слияния | Открыть файл, оставить нужные строки, убрать маркеры `<<<<<<<`, затем `git add` и `git commit` |
| Не знаю хэш коммита | `git log --oneline` |

## Ошибки оформления, за которые снимают баллы

| Ошибка | Исправление |
|---|---|
| Нет шапки класса | Добавить по шаблону |
| Дата в формате `15.10.2026` | `15-10-2026` |
| Лог без формата `[Тег]: Событие — Детали` | Использовать `AppLog` |
| Файл в неправильной папке | Перенести в `domain`, `data` или `presentation` |
| Импорты `presentation` в `domain` | Убрать, вынести общее в `common` |
| Нет `package: 'uikit'` у ассетов | Добавить |
| Шрифт не из макета | Подключить в `pubspec.yaml` и в тему |
