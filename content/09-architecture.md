---
id: architecture
stage: 5
title: Архитектура, SOLID и DRY
lead: Слои Domain, Presentation, Data. Принципы, по которым эксперты ставят баллы за архитектуру.
---

## Зачем архитектура

Требование задания: **«изменение бизнес-логики или представления одного экрана не должно повлечь изменений на других экранах»**. Для этого код делится на слои, а слои зависят друг от друга только в одну сторону.

## Три слоя

```
Presentation  --->  Domain  <---  Data
(экраны, state)    (ядро)        (API, БД, DTO)
```

| Слой | Что внутри | Что нельзя |
|---|---|---|
| **Domain** | Entities, UseCases, интерфейсы репозиториев, доменные ошибки | Импортировать Flutter, `http`, DTO, виджеты |
| **Presentation** | Screens, Controller / ViewModel / Bloc, виджеты, мапперы Domain→UI | Знать про DTO и реализацию репозитория |
| **Data** | Реализации репозиториев, DataSource (remote/local), DTO, мапперы DTO↔Entity | Знать про экраны |

Критерии А: «Слой DOMAIN не содержит других слоёв», то же для PRESENTATION и DATA. Проверка простая: откройте импорты файлов слоя. `domain` не должен импортировать `presentation` и `data`.

## Пример структуры

```
lib/
  main.dart
  common/                       # общее: константы, утилиты, DI
    di.dart
    constants.dart
  domain/
    entities/
      game.dart
      player.dart
    repositories/
      game_repository.dart      # abstract interface class
    usecases/
      create_game.dart
      get_games.dart
    exceptions/
      domain_exception.dart
  data/
    dto/
      game_dto.dart
    mappers/
      game_mapper.dart          # DTO <-> Entity
    datasources/
      game_remote_source.dart   # через абстракцию сетевого слоя
      session_local_source.dart # SharedPreferences
    repositories/
      game_repository_impl.dart
  presentation/
    screens/
      auth/
        login_screen.dart
        login_controller.dart
      landing/ ...
    widgets/
```

## Как слои общаются (на примере «Создать игру»)

```dart
// domain/entities/game.dart
class Game {
  final String id;
  final String title;
  final DateTime startAt;
  const Game({required this.id, required this.title, required this.startAt});
}

// domain/repositories/game_repository.dart
abstract interface class GameRepository {
  Future<Game> createGame({required String title, required DateTime startAt});
  Future<List<Game>> getGames();
}

// domain/usecases/create_game.dart
class CreateGame {
  final GameRepository _repo;
  CreateGame(this._repo);
  Future<Game> call({required String title, required DateTime startAt}) {
    if (startAt.isBefore(DateTime.now())) {
      throw const DomainException('Время начала в прошлом');
    }
    return _repo.createGame(title: title, startAt: startAt);
  }
}

// data/repositories/game_repository_impl.dart
class GameRepositoryImpl implements GameRepository {
  final GameRemoteSource _remote;
  GameRepositoryImpl(this._remote);
  @override
  Future<Game> createGame({required String title, required DateTime startAt}) async {
    final dto = await _remote.create(title: title, startAt: startAt);
    return GameMapper.toEntity(dto);
  }
  ...
}

// presentation/screens/schedule/schedule_controller.dart
class ScheduleController extends ChangeNotifier {
  final CreateGame _createGame;
  bool loading = false;
  String? error;
  ScheduleController(this._createGame);

  Future<bool> publish(String title, DateTime startAt) async {
    loading = true; notifyListeners();
    try {
      await _createGame(title: title, startAt: startAt);
      return true;
    } on DomainException catch (e) {
      error = e.message;
      return false;
    } finally {
      loading = false; notifyListeners();
    }
  }
}
```

## Управление состоянием

Задание не требует конкретного пакета. Выбирайте то, что умеете быстро и безошибочно.

| Подход | Плюсы | Минусы |
|---|---|---|
| `ChangeNotifier` + `ListenableBuilder` | Не нужны пакеты | Больше ручной работы |
| GetX (`GetxController`, `Obx`) | Быстро, DI и навигация в комплекте | Легко смешать слои, нужно дисциплины |
| Provider | Просто и привычно | Нужен пакет |
| Bloc / Cubit | Строгая структура, тестируемость | Больше кода |

Состояние экрана удобно описывать `sealed`-классом: `Loading`, `Data`, `Error`.

## Внедрение зависимостей (DI)

Контроллер получает зависимость **через конструктор**, а не создаёт сам.

```dart
// common/di.dart: единственное место, где знают реализации
final ApiClient api = HttpApiClient(baseUrl: Env.baseUrl);
final GameRepository gameRepo = GameRepositoryImpl(GameRemoteSource(api));
final createGame = CreateGame(gameRepo);
```

## SOLID на примерах

| Принцип | Нарушение | Как правильно |
|---|---|---|
| **S** Одна ответственность | `LoginScreen` сам парсит JSON и ходит в сеть | Экран → контроллер → UseCase → репозиторий |
| **O** Открыто/закрыто | `if (type == 'primary') ... else if ...` в кнопке | Параметры/фабрики вариантов; новые варианты без правки базового кода |
| **L** Подстановка Лисков | `SecondaryButton` ломает поведение `Button` | Наследники не меняют контракт |
| **I** Разделение интерфейсов | Один `Api` с 30 методами | `AuthApi`, `GameApi`, `ProfileApi` |
| **D** Инверсия зависимостей | Экран создаёт `http.Client()` | Зависеть от `ApiClient` (абстракция), реализацию подставляет DI |

## DRY: что обычно дублируют

| Место | Дублирование | Решение |
|---|---|---|
| UIKit | Пять одинаковых `OutlineInputBorder(...)` | Один приватный метод `_border(Color)` |
| UIKit | Три одинаковых пункта нижнего меню | Список данных + `map` |
| Стили | `fontSize: 16` повторяется в `copyWith` | Добавить стиль в типографику |
| Сеть | `try/catch` в каждом запросе | Один обработчик ошибок в клиенте |
| Экраны | Одинаковый показ SnackBar ошибки | Один общий метод/виджет |
| Константы | URL и ключи в нескольких местах | Один конфиг |

## Что нужно уметь

- Нарисовать схему слоёв и показать направление зависимостей.
- Создать сущность, интерфейс репозитория, UseCase, реализацию и контроллер.
- Объяснить каждую букву SOLID на своём коде.
- Найти и убрать дублирование.

## Подробно: путь данных на примере кнопки «Войти»

Проследим, что происходит от нажатия до ответа, и **в каком слое** живёт каждый шаг.

| Шаг | Слой | Что происходит |
|---:|---|---|
| 1 | Presentation | `LoginScreen`: нажатие кнопки, лог INFO, валидация формы |
| 2 | Presentation | `LoginController.login(email, password)` включает `loading` |
| 3 | Domain | `LoginUseCase`: правила («пароль не пустой»), вызывает `AuthRepository` (интерфейс) |
| 4 | Data | `AuthRepositoryImpl`: вызывает `AuthRemoteSource` |
| 5 | Data | `AuthRemoteSource`: вызывает `AuthApi` из сетевой библиотеки (через абстракцию) |
| 6 | Сетевая библиотека | `HttpApiClient`: запрос на сервер, обработка ошибок |
| 7 | Data | Ответ превращается из `UserDto` в `User` (маппер) |
| 8 | Domain→Presentation | `User` возвращается контроллеру |
| 9 | Presentation | Сохранение токена, переход на Landing; при ошибке SnackBar на 5 секунд |

Стрелки зависимостей: Presentation → Domain ← Data. Domain **ничего не импортирует** ни из Presentation, ни из Data.

## Подробно: как сделать, чтобы слои были «чистыми»

Критерий: «Слой DOMAIN не содержит других слоёв» (1 балл за каждый слой в спринтах 3 и 4).

Проверка за минуту:

```bash
# в Domain не должно быть импортов Data, Presentation, flutter, http
grep -rnE "import .*(presentation|data|flutter|http)" lib/domain

# в Presentation не должно быть импортов Data
grep -rn "import .*data/" lib/presentation

# в Data не должно быть импортов Presentation
grep -rn "import .*presentation/" lib/data
```

Если нашли строки, исправьте:

| Нашли | Как исправить |
|---|---|
| `Domain` импортирует `flutter` | Вынести виджет из Domain; в Domain только чистый Dart |
| `Presentation` импортирует `data` | Заменить на интерфейс из `domain` |
| `Data` использует `Controller` | Передавать результат через возвращаемое значение |
| Общий код нужен всем | В `common` (константы, утилиты, DI) |

Папка `common` разрешена заданием «для общих файлов», но не складывайте туда всё подряд: чем меньше в `common`, тем чище.

## Подробно: GetX и слои

Вы знаете GetX, поэтому поместим его по слоям:

| Что | Слой | Пример |
|---|---|---|
| `GetxController` | Presentation | `LoginController` |
| `Obx`, `GetBuilder` | Presentation | в экранах |
| `Binding` | Presentation (или `common/di`) | Регистрация зависимостей для экрана |
| `Get.put`, `Get.find` | `common/di` и Binding | Единственное место, которое знает про реализации |
| `Get.snackbar` | Presentation | Ошибки |

Правила, чтобы не нарушить SOLID:

1. **Не вызывайте `Get.find` внутри UseCase/Repository**: зависимости передавайте через конструктор.
2. Контроллер получает **UseCase**, а не репозиторий и не `http`.
3. В Domain не должно быть `import 'package:get/get.dart'`.

```dart
class LoginBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AuthRepository>(() => AuthRepositoryImpl(Get.find<AuthRemoteSource>()));
    Get.lazyPut(() => LoginUseCase(Get.find<AuthRepository>()));
    Get.lazyPut(() => LoginController(Get.find<LoginUseCase>()));
  }
}
```

## Подробно: DRY на практике — как искать дублирование

1. Поиск копий: выделите кусок кода и поищите его по проекту (Ctrl+Shift+F).
2. Если один и тот же блок встречается 2 раза и больше, вынесите в функцию, виджет или константу.
3. Если куски отличаются парой значений, сделайте параметры.
4. Если есть `if/else` по типу, который растёт, подумайте об `enum` и `switch` или об отдельных классах.

Примеры из вашей симуляции и что с ними делать:

| Было | Стало |
|---|---|
| 5 одинаковых `OutlineInputBorder(...)` | `OutlineInputBorder _border(Color c)` |
| 3 копии пункта `_item(icon, label, ...)` | `items.map(_item)` по списку данных |
| Цвета кнопки передаются снаружи во всех местах | `enum UiButtonKind` внутри компонента |
| `fontSize: 16` в `copyWith` в десяти местах | Стиль `bodyMedium` с нужным размером |
| `Logging()` создаётся в каждом виджете | Один статический `AppLog` |

## Практика

1. Нарисуйте слои и стрелки зависимостей для запроса «Список игр».
2. Выполните grep-проверку на своём проекте и исправьте нарушения.
3. Перепишите экран, где в `build` вызывается `http.get`, на схему Controller → UseCase → Repository.
4. Найдите три места дублирования в своём коде и устраните.
5. Объясните вслух SOLID на примере своего `AuthRepository`.
