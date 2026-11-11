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

## Максимальный балл: критерий за критерием

| Критерий (макс.) | Что сделать точно | Проверка |
|---|---|---|
| SplashScreen (0,15) | Экран по макету, показывается 1–3 секунды | Сравнить с макетом |
| 3 приветственных экрана только при первом запуске (0,6) | `PageView`, пагинация, «Пропустить» → регистрация, флаг `seen_onboarding` | Удалить данные приложения → показываются; второй запуск → нет |
| Регистрация по макету (1,1) | Все элементы, состояния полей, шрифты | Наложить на макет |
| Прокрутка с фиксированным заголовком (0,7) | `SliverAppBar(pinned)` либо `Stack` | Открыть на маленьком экране с клавиатурой |
| Проверка email (0,5) | RegExp, ошибка под полем | Ввести `Abc@mail.ru`, `a@b`, `a@b.ru` |
| Показ пароля (0,2) | Иконка-глаз переключает `obscureText` | Нажать |
| Авторизация по макету (0,7) | Экран входа со всеми состояниями | |
| Landing Screen (0,4) | По макету, Bottom Bar | |
| Меню-гамбургер (1,0) | Слева, с анимацией, закрывается свайпом влево и крестиком | Проверить оба способа |
| Центральная кнопка → Schedule Game (0,05) | `onTap` центральной кнопки | |
| Schedule Game (1,1) | Все поля и состояния | |
| Системные дата/время (0,1) | `showDatePicker`, `showTimePicker` | |
| Publish → Success → Landing (0,05) | `pushAndRemoveUntil` | Назад не возвращает на форму |
| Сеть: вход, регистрация, Schedule Game (по 1,1) | Через UseCase → репозиторий → сетевая библиотека; ошибка на 5 секунд | Отключить интернет |
| Папки (0,3) | Каждый файл в `domain/data/presentation/common` (−0,1 за файл вне папок) | Посмотреть дерево |
| Слои чистые (по 1,0) | grep-проверка из раздела «Архитектура» | |
| SOLID, DRY (по 1,0) | Нет дублей, зависимости через интерфейсы | |
| Хранение (1,5) | PDF-политика, соглашение, сессия, последний экран | Перезапустить приложение |
| Фото профиля (4,0 в модуле Д) | Галерея и камера, фото сменяется | Проверить на устройстве |
| Комментарии и логи | Шапки, методы, логи | Скрипт-проверка |

## Подробно: алгоритм «последний экран» без ошибок

Требование: после перезапуска приложение открывает тот экран, где пользователь остановился.

1. У каждого маршрута есть **имя** (`'/landing'`, `'/schedule'`, `'/profile'`).
2. `NavigatorObserver` записывает имя в `SharedPreferences` при открытии и закрытии маршрутов.
3. `SplashScreen` (или `main`) читает `last_route` и открывает его, **если есть токен**.
4. Для экранов с параметрами (`gameId`) сохраняйте аргумент отдельным ключом.
5. После выхода из аккаунта `last_route` стирается.

Пограничные случаи, о которых забывают:

| Случай | Что делать |
|---|---|
| Последний экран — Splash или онбординг | Не сохранять эти маршруты |
| Нет токена, но есть `last_route` | Открыть вход |
| Экран игры в процессе | Не восстанавливать игру, а засчитать поражение (спринты 4–5) |
| Сохранённый `gameId` больше не существует | Показать ошибку и открыть Landing |

## Подробно: слои для экрана авторизации (структура файлов)

```
lib/
  common/di.dart
  domain/
    entities/user.dart
    repositories/auth_repository.dart
    usecases/login.dart
    usecases/register.dart
    exceptions/domain_exception.dart
  data/
    datasources/auth_remote_source.dart
    datasources/session_local_source.dart
    mappers/user_mapper.dart
    repositories/auth_repository_impl.dart
  presentation/
    screens/login/login_screen.dart
    screens/login/login_controller.dart
    screens/register/register_screen.dart
    screens/register/register_controller.dart
    widgets/error_snackbar.dart
```

Пошагово:

1. `User` (Entity) без зависимостей.
2. `AuthRepository` (абстрактный интерфейс).
3. `LoginUseCase` и `RegisterUseCase`.
4. `AuthRemoteSource` вызывает `AuthApi` из сетевой библиотеки.
5. `UserMapper`.
6. `AuthRepositoryImpl`.
7. Контроллеры экранов.
8. Экраны.
9. `di.dart` собирает всё в одном месте.

Каждая шапка файла: описание, дата, номер.

## Подробно: меню слева — вариант без `Drawer`

Если макет требует нестандартного вида, сделайте свою панель:

```dart
Stack(children: [
  content,
  if (open) GestureDetector(onTap: close, child: Container(color: Colors.black54)), // затемнение
  AnimatedSlide(
    offset: open ? Offset.zero : const Offset(-1, 0),
    duration: const Duration(milliseconds: 250),
    curve: Curves.easeOut,
    child: GestureDetector(
      onHorizontalDragEnd: (d) { if ((d.primaryVelocity ?? 0) < 0) close(); },
      child: SizedBox(width: MediaQuery.sizeOf(context).width * 0.8, child: const MenuPanel()),
    ),
  ),
])
```

Обязательно: крестик внутри панели вызывает `close()`; тап по затемнению тоже закрывает; свайп влево закрывает.

## Подробно: фото профиля — полный сценарий

1. Нажатие на «Фото» → лог INFO → BottomSheet «Галерея / Камера».
2. `ImagePicker().pickImage(source: ...)`.
3. Пользователь отменил → `null` → ничего не делать.
4. Загрузка фото на сервер (запрос «изменение профиля»), если API это поддерживает; либо сохранить локально (путь в `SharedPreferences`).
5. Обновить аватар на экране (через контроллер), показать индикатор загрузки.
6. Ошибки сети — SnackBar на 5 секунд.
7. Отказ в разрешении — понятное сообщение, приложение не падает.

Манифесты (Android: `CAMERA`; iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`) настройте **заранее на симуляции**, чтобы на соревновании не искать.

## Репетиция спринта 3

1. Соберите экраны Splash → Onboarding → Регистрация → Вход → Landing по макету (любому).
2. Проведите проверку «перезапуск приложения на каждом экране».
3. Проверьте grep-скриптом слои.
4. Запишите в заметках симуляции всё, что вызвало вопросы.
