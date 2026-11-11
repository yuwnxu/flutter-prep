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
