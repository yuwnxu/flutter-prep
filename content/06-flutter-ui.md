---
id: flutter-ui
stage: 3
title: Flutter: экраны, формы, навигация
lead: Тема, шрифты, ресурсы, поля ввода, навигация, диалоги, прокрутка. Всё для сборки реальных экранов.
---

## Структура проекта и pubspec.yaml

```
my_app/
  lib/
    main.dart
  assets/
    images/
    fonts/
  pubspec.yaml
  android/  ios/
  test/
```

```yaml
name: my_app
environment:
  sdk: ^3.11.0

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  shared_preferences: ^2.3.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
  fonts:
    - family: Manrope
      fonts:
        - asset: assets/fonts/Manrope-Regular.ttf
          weight: 400
        - asset: assets/fonts/Manrope-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Manrope-Bold.ttf
          weight: 700
```

::: warn
Отступы в YAML — только пробелы, ровно по структуре. Каждому весу шрифта соответствует **свой файл**: `w800` — это `Manrope-ExtraBold.ttf`, а не `ExtraLight`.
:::

После изменения `pubspec.yaml` выполните `flutter pub get`.

## Тема и типографика (Material 3)

Цвета и стили лучше хранить в одном месте (DRY): в UIKit это отдельные файлы `colors.dart` и `typography.dart`.

```dart
abstract final class AppColors {
  static const primary = Color(0xFF004AC6);
  static const white = Color(0xFFFFFFFF);
}

abstract final class AppText {
  static const _family = 'Manrope';
  static const header = TextStyle(
    fontFamily: _family, fontWeight: FontWeight.w700,
    fontSize: 24, height: 32 / 24, letterSpacing: -0.48,   // height = lineHeight / fontSize
  );
}

MaterialApp(
  theme: ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
    fontFamily: 'Manrope',
  ),
);
```

Из Figma берут: размер шрифта, начертание, **межстрочный интервал** (переводится в `height = lineHeight / fontSize`) и **letter spacing**.

## Поля ввода и формы

```dart
final _email = TextEditingController();
final _formKey = GlobalKey<FormState>();
bool _hidden = true;

Form(
  key: _formKey,
  child: Column(children: [
    TextFormField(
      controller: _email,
      keyboardType: TextInputType.emailAddress,
      validator: (v) => RegExp(r'^[a-z0-9]+@[a-z0-9]+\.[a-z]+$').hasMatch(v ?? '')
          ? null
          : 'Некорректный email',
    ),
    TextFormField(
      obscureText: _hidden,
      decoration: InputDecoration(
        suffixIcon: IconButton(
          icon: Icon(_hidden ? Icons.visibility_off : Icons.visibility),
          onPressed: () => setState(() => _hidden = !_hidden),
        ),
      ),
    ),
    FilledButton(
      onPressed: () {
        if (_formKey.currentState!.validate()) { /* отправка */ }
      },
      child: const Text('Create Account'),
    ),
  ]),
)

@override
void dispose() { _email.dispose(); super.dispose(); } // контроллеры нужно освобождать
```

Состояния поля: обычное, фокус, ошибка, отключено. Фокус можно получить настоящим `FocusNode` (лучше, чем передавать «состояние» параметром).

## Навигация

```dart
// Открыть экран
Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DetailsScreen()));

// Заменить текущий (после Splash, после входа)
Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));

// Очистить стек (после Success -> Landing)
Navigator.of(context).pushAndRemoveUntil(
  MaterialPageRoute(builder: (_) => const LandingScreen()),
  (route) => false,
);

// Назад
Navigator.of(context).pop();
```

Если нужно сохранять «последний экран», дайте маршрутам **имена**:

```dart
MaterialApp(
  initialRoute: '/splash',
  routes: {
    '/splash': (_) => const SplashScreen(),
    '/landing': (_) => const LandingScreen(),
  },
)
Navigator.pushNamed(context, '/landing');
```

## Диалоги, BottomSheet, SnackBar, пикеры

```dart
// BottomSheet (для компонента Select)
final picked = await showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
  ),
  builder: (_) => const OptionsList(),
);

// Дата и время (стандартные системные элементы)
final date = await showDatePicker(
  context: context,
  initialDate: DateTime.now(),
  firstDate: DateTime.now(),
  lastDate: DateTime(2100),
);
final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());

// Уведомление об ошибке на 5 секунд
ScaffoldMessenger.of(context).showSnackBar(
  const SnackBar(content: Text('Ошибка сети'), duration: Duration(seconds: 5)),
);
```

## Прокрутка и «закреплённый заголовок»

```dart
CustomScrollView(
  slivers: [
    SliverAppBar(pinned: true, title: Text('Create Account')),
    SliverToBoxAdapter(child: Image.asset('assets/images/hero.png')),
    SliverFillRemaining(hasScrollBody: false, child: FormContent()),
  ],
)
```

Это прямой ответ на требование спринта 3: «если контент не помещается, прокручивается картинка, а надпись Create Account остаётся сверху».

## Картинки

```dart
Image.asset('assets/images/logo.png', fit: BoxFit.cover);
Image.network(url, fit: BoxFit.cover);       // без кэша!
```

Для кэширования сетевых изображений используйте `cached_network_image` (подробно в разделе спринта 4).

Внутри **пакета** (UIKit) ресурсы подключаются с параметром `package`:

```dart
Image.asset('assets/eye.png', package: 'uikit');
```

Без него приложение будет искать файл в своих `assets` и не найдёт.

## Что нужно уметь

- Подключить шрифт и ресурсы в `pubspec.yaml`.
- Собрать форму с валидацией и показом пароля.
- Выбрать нужный способ навигации.
- Открыть BottomSheet и системные пикеры даты и времени.

## Подробно: форма регистрации по шагам

Задача из спринта 3: экран «Регистрация» с проверкой email, показом пароля, ошибкой и прокруткой.

1. **Каркас:** `Scaffold` → `SafeArea` → прокручиваемая область.
2. **Закреплённый заголовок:** `CustomScrollView` с `SliverAppBar(pinned: true)`.
3. **Картинка** сверху: `SliverToBoxAdapter`.
4. **Форма:** `Form` + `TextFormField` для email и пароля, кнопка.
5. **Логика:** контроллеры, валидатор, `isLoading`, вызов регистрации.
6. **Ошибки сети:** SnackBar на 5 секунд.
7. **Логи:** нажатие кнопки (INFO), запрос (INFO/DEBUG/ERROR).

```dart
Future<void> _submit() async {
  AppLog.info('RegisterScreen', 'Нажатие', 'Кнопка «Create Account»');
  if (!_formKey.currentState!.validate()) return;     // показали ошибки валидации
  setState(() => _loading = true);
  try {
    await controller.register(_email.text.trim(), _password.text);
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/landing');
  } on ApiException catch (e) {
    if (mounted) showError(context, e.message);
  } finally {
    if (mounted) setState(() => _loading = false);
  }
}
```

Эксперту важно увидеть: ошибку при некорректном email, кнопку, которая блокируется во время запроса, и то, что при маленькой высоте экрана форма прокручивается, а заголовок остаётся.

## Подробно: как устроена навигация

**Navigator** хранит **стек** экранов, как стопку бумаг.

- `push` кладёт новый экран сверху: пользователь может вернуться.
- `pop` убирает верхний экран.
- `pushReplacement` заменяет верхний (после Splash возвращаться некуда).
- `pushAndRemoveUntil(..., (r) => false)` очищает весь стек и кладёт один экран (после Success открыть Landing, а назад чтобы нельзя).

Передача данных:

```dart
// вперёд: через конструктор
Navigator.push(context, MaterialPageRoute(builder: (_) => CombatInfoScreen(gameId: game.id)));

// назад: результат pop
final picked = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const PickerScreen()));
```

**Именованные маршруты** с аргументами удобны для сохранения последнего экрана:

```dart
Navigator.pushNamed(context, '/combat', arguments: game.id);
// в onGenerateRoute читаем settings.arguments
```

Кнопка «назад» на Android: `PopScope` перехватывает её, например, в игре.

```dart
PopScope(
  canPop: false,
  onPopInvokedWithResult: (didPop, _) { if (!didPop) _confirmExit(); },
  child: ...,
)
```

## Подробно: ресурсы и шрифты — где ошибаются

Чек-лист «картинка/шрифт не отображается»:

1. Файл лежит в папке, указанной в `pubspec.yaml` (`assets:`). Для папки пишут `assets/images/` (со слэшем на конце).
2. Отступы в `pubspec.yaml` точные, без табуляции.
3. После изменения выполнен `flutter pub get` и **полный перезапуск** приложения.
4. Имя файла в коде совпадает с настоящим, **включая регистр** и расширение.
5. Для файлов внутри пакета указан `package: 'имя_пакета'`.
6. Шрифт: у каждого начертания `weight` и файл соответствуют друг другу.
7. В `TextStyle` указан `fontFamily` (или шрифт задан в теме).

Иконки в формате SVG во Flutter по умолчанию не поддерживаются, нужен пакет `flutter_svg`. Если пакета нет в списке разрешённых, экспортируйте иконки из Figma в PNG (@2x и @3x) или используйте `Icons.*`.

## Подробно: списки и прокрутка

| Задача | Виджет |
|---|---|
| Небольшая страница, которая может не поместиться | `SingleChildScrollView(child: Column(...))` |
| Длинный список одинаковых элементов | `ListView.builder(itemCount: n, itemBuilder: ...)` |
| Сетка карточек | `GridView.count` / `GridView.builder` |
| Список + закреплённый заголовок + разные блоки | `CustomScrollView` + `Sliver*` |
| Горизонтальная прокрутка | `ListView(scrollDirection: Axis.horizontal)` |

`ListView.builder` создаёт элементы лениво (только видимые), поэтому быстрый и экономит память. Для экрана Discover Combats используйте именно его. Для пустого списка добавьте отдельное состояние («Игр пока нет»).

```dart
ListView.separated(
  padding: const EdgeInsets.symmetric(horizontal: 20),
  itemCount: games.length,
  separatorBuilder: (_, __) => const SizedBox(height: 12),
  itemBuilder: (_, i) => GameCard(game: games[i], onTap: () => open(games[i])),
)
```

## Подробно: анимации для меню и переходов

Для задания достаточно простых **неявных анимаций**: меняете значение, Flutter плавно анимирует.

```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 250),
  curve: Curves.easeOut,
  width: selected ? 24 : 8,
  decoration: BoxDecoration(color: selected ? green : grey, borderRadius: BorderRadius.circular(4)),
)

AnimatedSlide(
  offset: open ? Offset.zero : const Offset(-1, 0),   // -1 = целиком за левым краем
  duration: const Duration(milliseconds: 250),
  child: const MenuPanel(),
)

AnimatedOpacity(opacity: visible ? 1 : 0, duration: const Duration(milliseconds: 200), child: widget)
```

Для меню слева с закрытием по свайпу:

```dart
GestureDetector(
  onHorizontalDragEnd: (d) { if ((d.primaryVelocity ?? 0) < 0) closeMenu(); }, // свайп влево
  child: ...,
)
```

Но проще и надёжнее стандартный `Drawer` (он уже умеет анимацию и свайп).

## Практика

1. Соберите форму входа: два поля, показ пароля, кнопка, ошибка, SnackBar.
2. Откройте экран, передайте в него `id`, верните результат назад.
3. Сделайте экран со списком из 50 элементов на `ListView.builder` с состоянием «пусто».
4. Подключите свой шрифт и проверьте разные начертания.
5. Сделайте индикатор страниц `UiPagination` с `AnimatedContainer`.

## Учимся: навык 1. Шрифты и ресурсы в pubspec.yaml

**Порядок действий:**
1. Положите файлы в проект: `assets/fonts/Manrope-Regular.ttf`, `assets/images/logo.png`.
2. Откройте `pubspec.yaml`, найдите раздел `flutter:`.
3. Добавьте `assets:` и `fonts:` с **точными отступами** (два пробела на уровень).
4. Выполните `flutter pub get`.
5. **Полностью перезапустите** приложение (hot reload не подхватит новые файлы).
6. Укажите шрифт в теме или в `TextStyle(fontFamily: 'Manrope')`.

```yaml
flutter:
  uses-material-design: true
  assets:
    - assets/images/          # со слэшем на конце: вся папка
  fonts:
    - family: Manrope
      fonts:
        - asset: assets/fonts/Manrope-Regular.ttf
          weight: 400
        - asset: assets/fonts/Manrope-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Manrope-Bold.ttf
          weight: 700
```

**Соответствие файла и веса:** Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800. Перепутанный файл даёт неверное начертание (в симуляции вес 800 указывал на ExtraLight).

**Чек-лист «не отображается»:** путь, регистр букв, отступы, перезапуск, для пакета `package: 'uikit'`.

## Учимся: навык 2. Форма с валидацией и показом пароля

**Сборка за 6 шагов:**
1. `final _formKey = GlobalKey<FormState>();`
2. Контроллеры для полей, `dispose` для них.
3. `Form(key: _formKey, child: Column(...))`.
4. В каждом `TextFormField` свой `validator`: возвращает текст ошибки или `null`, если всё хорошо.
5. Кнопка вызывает `_formKey.currentState!.validate()`; если `true`, отправляем данные.
6. Показ пароля: булева переменная `_hidden`, `obscureText: _hidden`, иконка в `suffixIcon` меняет её через `setState`.

```dart
bool _hidden = true;

TextFormField(
  controller: _password,
  obscureText: _hidden,
  validator: (v) => (v == null || v.length < 6) ? 'Минимум 6 символов' : null,
  decoration: InputDecoration(
    suffixIcon: IconButton(
      icon: Icon(_hidden ? Icons.visibility_off : Icons.visibility),
      onPressed: () => setState(() => _hidden = !_hidden),
    ),
  ),
)
```

**Не забудьте:** блокировать кнопку на время запроса (`isLoading`), логировать нажатие, показывать ошибку сервера в SnackBar на 5 секунд.

## Учимся: навык 3. Выбор способа навигации

**Вопросы для выбора:**
1. Пользователь должен иметь возможность вернуться назад? → `push` / `pop`.
2. Экран больше не нужен (Splash, онбординг, вход)? → `pushReplacement`.
3. Нужно «начать с чистого листа» (после выхода, после Success)? → `pushAndRemoveUntil` с `(route) => false`.
4. Нужно вернуть данные назад? → `final result = await Navigator.push<T>(...)` и `Navigator.pop(context, value)`.

**Сценарии из задания:**

| Переход | Метод |
|---|---|
| Splash → Онбординг | `pushReplacement` |
| Онбординг → Регистрация | `pushReplacement` |
| Landing → Combat Information | `push` |
| Publish → Success → Landing | `pushAndRemoveUntil` |
| Выход из аккаунта | `pushAndRemoveUntil` на экран входа |

**Для сохранения последнего экрана** давайте маршрутам имена (`'/landing'`) и используйте `NavigatorObserver`.

## Учимся: навык 4. BottomSheet и пикеры даты и времени

**Паттерн «показать и дождаться ответа»:** все эти функции асинхронные, возвращают значение, когда пользователь выберет, или `null`, если закрыл.

```dart
// Select: панель снизу
final picked = await showModalBottomSheet<String>(
  context: context,
  builder: (_) => OptionsList(options: options),   // внутри: Navigator.pop(context, value)
);
if (picked == null) return;              // закрыли — ничего не делаем
setState(() => selected = picked);

// Дата и время
final date = await showDatePicker(
  context: context,
  initialDate: DateTime.now(),
  firstDate: DateTime.now(),
  lastDate: DateTime(2100),
);
if (date == null) return;
final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
if (time == null) return;
final start = DateTime(date.year, date.month, date.day, time.hour, time.minute);
```

**Особенности:** после каждого `await` в виджете проверяйте `mounted`; `null` — нормальный результат (пользователь отменил); системные пикеры оцениваются отдельным пунктом «стандартные для системы элементы».
