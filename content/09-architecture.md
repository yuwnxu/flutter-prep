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
