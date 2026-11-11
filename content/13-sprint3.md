---
id: sprint3
stage: 6
title: Спринт 3: вход и расписание игры
lead: 1 ч. Первые экраны приложения на архитектуре с тремя слоями. Максимум 21,95 балла.
---

## Что нужно сделать

| Задача | Баллы (верстка) | Где ещё баллы |
|---|---:|---|
| SplashScreen | 0,15 | |
| 3 приветственных экрана, только при первом запуске, с кнопкой «Пропустить» | 0,60 | |
| Экран «Регистрация» | 1,10 + 0,70 (скролл) | Сеть 1,10 |
| Проверка email | 0,50 | |
| Показ пароля | 0,20 | |
| Авторизация | 0,70 | Сеть 1,10 |
| Landing Screen | 0,40 | |
| Меню-«гамбургер» слева с анимацией, закрывается свайпом и крестиком | 1,00 | |
| Центральная кнопка нижнего меню → Schedule Game | 0,05 | |
| Schedule Game, системные дата/время | 1,10 + 0,10 | Сеть 1,10 |
| Publish → Success → Landing | 0,05 | |
| Архитектура: папки, три слоя, SOLID, DRY | 6,20 | |
| Хранение: PDF-политика, соглашение, сессия, последний экран | 1,50 | |
| Аппаратная часть: фото профиля (галерея/камера) | 4,00 | |

Архитектура здесь стоит **6,2 балла** — почти как вся верстка. Не откладывайте слои «на потом».

## Подготовка (первые 10 минут)

1. Ветка `sprint-3` от `main`.
2. Создать проект, добавить `uikit` и `network_layer` из Git (по тегам), пакеты `shared_preferences`, `image_picker`, `logger`.
3. Создать папки `domain / data / presentation / common`.
4. Подключить DI-файл (`common/di.dart`).
5. Поднять `ScaffoldMessenger` для ошибок сети на 5 секунд.

## Splash и первый запуск

```dart
// presentation/screens/splash/splash_screen.dart
class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    AppLog.info('SplashScreen', 'Жизненный цикл', 'initState');
    _decide();
  }

  // Решает, какой экран открыть: онбординг, вход или последний сохранённый
  Future<void> _decide() async {
    await Future.delayed(const Duration(seconds: 2)); // время показа Splash по макету
    final prefs = await SharedPreferences.getInstance();
    final seenOnboarding = prefs.getBool('seen_onboarding') ?? false;
    final token = prefs.getString('token');
    final lastRoute = prefs.getString('last_route');

    if (!mounted) return;
    final next = !seenOnboarding
        ? '/onboarding'
        : token == null
            ? '/login'
            : (lastRoute ?? '/landing');
    Navigator.of(context).pushReplacementNamed(next);
  }
}
```

Приветственные экраны: `PageView` + `UiPagination` + кнопка «Skip», которая ведёт на **регистрацию**. Флаг `seen_onboarding = true` сохраняйте в момент выхода из онбординга (как через «Пропустить», так и на последнем экране).

```dart
PageView(
  controller: _page,
  onPageChanged: (i) => setState(() => _index = i),
  children: const [OnboardingPage1(), OnboardingPage2(), OnboardingPage3()],
)
```

## Регистрация и вход

Шаблон: `ЭкранRegistration` → `RegistrationController` → `RegisterUseCase` → `AuthRepository` (интерфейс в domain) → `AuthRepositoryImpl` (в data) → `AuthApi` (сетевая библиотека).

Проверка email по заданию (только маленькие буквы и цифры в имени и домене):

```dart
// Проверяет email на соответствие шаблону name@domenname.ru
// Принимает: строку [value]. Возвращает: true, если адрес корректен.
bool isValidEmail(String value) =>
    RegExp(r'^[a-z0-9]+@[a-z0-9]+\.[a-z]+$').hasMatch(value);
```

В реальном задании уточните по макету: допустимы ли точки в домене (`mail.co.uk`), нужна ли проверка на «живую» при вводе или при нажатии кнопки.

Макет регистрации: картинка сверху + заголовок «Create Account», который должен оставаться на месте при прокрутке — используйте `CustomScrollView` с `SliverAppBar(pinned: true)` или `Stack` с фиксированным заголовком.

Ошибки сети на 5 секунд с закрытием по кнопке:

```dart
void showError(BuildContext context, String text) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(SnackBar(
    duration: const Duration(seconds: 5),
    content: Text(text),
    action: SnackBarAction(label: 'OK', onPressed: messenger.hideCurrentSnackBar),
  ));
}
```

Лучше сделать это компонентом UIKit (`UiToast`/`showErrorToast`), если макет отличается от стандартного SnackBar.

## Сессия и последний экран

Модуль Г: «данные входа и активная сессия сохраняются после перезапуска» и «сохранять состояние последнего экрана».

```dart
// Сохранение токена после успешного входа
final prefs = await SharedPreferences.getInstance();
await prefs.setString('token', result.token);
apiClient.setToken(result.token);   // и при старте приложения — восстановить

// Запоминаем последний открытый экран через NavigatorObserver
class LastRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    final name = route.settings.name;
    if (name != null) _save(name);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    final name = previousRoute?.settings.name;
    if (name != null) _save(name);
  }

  Future<void> _save(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_route', name);
  }
}

MaterialApp(navigatorObservers: [LastRouteObserver()], ...)
```

Если экран зависит от параметра (например, `gameId`), сохраняйте и его: `last_route_args`.

Выход из аккаунта: запрос `logout`, удалить токен и последний экран, вернуться на логин.

## Меню слева

Самый простой и надёжный способ: `Scaffold.drawer`. Он выезжает слева с анимацией и закрывается свайпом влево.

```dart
Scaffold(
  key: _scaffoldKey,
  drawer: AppDrawer(),           // стилизуйте под макет: ширина, фон, скругления
  appBar: AppBar(leading: IconButton(
    icon: const Icon(Icons.menu),
    onPressed: () => _scaffoldKey.currentState?.openDrawer())),
)

// Внутри AppDrawer кнопка закрытия:
IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop())
```

Если дизайн не похож на стандартный Drawer, соберите свой через `Stack` + `AnimatedSlide` + `GestureDetector(onHorizontalDragEnd: ...)`.

## Schedule Game

Поля: название, категория (Select), дата и время, галка уведомления. Для даты и времени — `showDatePicker` / `showTimePicker`. После Publish:

1. Валидация.
2. Вызов UseCase → репозиторий → сеть (игра сохраняется на сервере).
3. Переход на `Success`, оттуда — `pushAndRemoveUntil` на Landing.

```dart
final start = DateTime(d.year, d.month, d.day, t.hour, t.minute);
```

Если стоит галка уведомления, сохраните это поле (оно понадобится в спринте 4).

## Политика и соглашение

```dart
// PDF из assets: пакет pdfx
final doc = await PdfDocument.openAsset('assets/docs/privacy.pdf');
// Пользовательское соглашение: обычный экран с текстом и прокруткой
```

Пропишите файлы в `pubspec.yaml` в `assets`. Без пакета для PDF можно открыть файл через `url_launcher`, но проще и надёжнее показать внутри приложения.

## Фото профиля (камера и галерея)

```dart
final picker = ImagePicker();

Future<void> pickPhoto() async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    builder: (_) => const PhotoSourceSheet(), // Галерея / Камера
  );
  if (source == null) return;
  try {
    final file = await picker.pickImage(source: source, maxWidth: 1024, imageQuality: 85);
    if (file == null) return; // пользователь отменил
    // отправить на сервер или сохранить, затем обновить аватар на экране
  } catch (e, st) {
    AppLog.error('PlayerScreen', 'Фото', 'Не удалось выбрать фото', e, st);
  }
}
```

Права:

- **Android** — `AndroidManifest.xml`: `<uses-permission android:name="android.permission.CAMERA"/>`.
- **iOS** — `Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` с текстом на русском.

Проверьте поведение при **отказе** в разрешении: приложение не должно падать, показывает понятное сообщение.

## Что чаще всего теряют в спринте 3

- Слои смешаны: экран импортирует `data/`, `domain` знает про `http`.
- Файлы лежат вне нужных папок (−0,1 за файл).
- Нет проверки «только первый запуск»: онбординг показывается снова.
- Забыли `mounted` после `await` — падение при переходе.
- Не закрыли Success → Landing через очистку стека (можно вернуться назад).

## Чек-лист

- [ ] Три слоя, Domain без импортов Flutter и сети.
- [ ] Все обращения в сеть идут через интерфейс репозитория → интерфейс сетевого слоя.
- [ ] Ошибки: SnackBar 5 секунд + закрытие.
- [ ] Перезапуск приложения возвращает на сохранённый экран, сессия сохранена.
- [ ] Фото: галерея и камера, права прописаны.
- [ ] Комментарии и логи во всех классах.
