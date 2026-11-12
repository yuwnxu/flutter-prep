---
id: dart-oop
stage: 2
title: Dart: ООП и обобщения
lead: Классы, наследование, интерфейсы, миксины, enum, sealed. Основа для SOLID и чистой архитектуры.
---

## Класс и объект

```dart
class Player {
  final String id;
  final String name;
  int score;

  Player({required this.id, required this.name, this.score = 0});

  // Именованный конструктор
  Player.guest() : this(id: '0', name: 'Гость');

  // Фабричный конструктор: собирает объект из JSON
  factory Player.fromJson(Map<String, dynamic> json) => Player(
        id: json['id'] as String,
        name: json['name'] as String,
        score: (json['score'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'score': score};

  // Геттер
  bool get isWinner => score >= 10;
}
```

## Инкапсуляция

В Dart нет `private`; всё, что начинается с `_`, приватно **в пределах файла (библиотеки)**. Для UIKit это ключ к инкапсуляции: детали лежат в `lib/src/`, наружу экспортируются только нужные классы.

```dart
class Timer1 {
  int _seconds = 0;           // не видно за пределами файла
  int get seconds => _seconds;
}
```

## Наследование, абстракции, интерфейсы

```dart
abstract class Shape {          // нельзя создать объект напрямую
  double area();
}

class Circle extends Shape {    // наследование
  final double r;
  Circle(this.r);
  @override
  double area() => 3.14159 * r * r;
}

// В Dart 3 интерфейс удобно описывать так:
abstract interface class HttpGateway {
  Future<String> get(String url);
}

class RealGateway implements HttpGateway { // implements — реализовать контракт
  @override
  Future<String> get(String url) async => '...';
}
```

| Слово | Смысл |
|---|---|
| `extends` | Унаследовать код и поля |
| `implements` | Пообещать реализовать все методы контракта |
| `with` | Подмешать миксин |
| `abstract` | Класс с незаконченными методами |
| `abstract interface class` | Чистый интерфейс (Dart 3) |

## Миксины и расширения

```dart
mixin Loggable {
  void log(String message) => print('[$runtimeType]: $message');
}

class Repo with Loggable {
  void load() => log('Загрузка');
}

extension EmailCheck on String {
  bool get isValidEmail => RegExp(r'^[a-z0-9]+@[a-z0-9]+\.[a-z]+$').hasMatch(this);
}
'ab1@mail.ru'.isValidEmail; // true
```

## Enum с полями

```dart
enum GameCategory {
  image('Image'),
  circle('Circle');

  final String title;
  const GameCategory(this.title);
}
```

## Sealed-классы и паттерны (Dart 3)

Удобны для состояний экрана и результатов запросов: компилятор проверит, что вы обработали **все** варианты.

```dart
sealed class Result<T> {}
class Success<T> extends Result<T> { final T data; Success(this.data); }
class Failure<T> extends Result<T> { final String message; Failure(this.message); }

String show(Result<int> r) => switch (r) {
      Success(:final data) => 'Данные: $data',
      Failure(:final message) => 'Ошибка: $message',
    };
```

## Обобщения (generics)

```dart
class Box<T> {
  final T value;
  Box(this.value);
}

abstract interface class Repository<T> {
  Future<List<T>> getAll();
  Future<T?> getById(String id);
}
```

## Исключения

```dart
class NoInternetException implements Exception {
  final String message;
  NoInternetException([this.message = 'Нет подключения к интернету']);
  @override
  String toString() => message;
}

try {
  await repo.load();
} on NoInternetException catch (e) {
  logger.error('Repo', 'Ошибка', '$e', e);   // в try-catch обязательно писать лог ERROR
} catch (e, stack) {
  logger.error('Repo', 'Неизвестная ошибка', '$stack', e);
  rethrow;
} finally {
  // выполнится всегда
}
```

## Что нужно уметь

- Написать класс с `fromJson` / `toJson`.
- Объяснить разницу `extends`, `implements`, `with`.
- Спрятать реализацию в `_приватных` членах и `lib/src`.
- Использовать `sealed` для состояний.

## Подробно: зачем нужны классы

Без классов данные игры — набор разрозненных переменных: `gameTitle`, `gameDate`, `gamePlayers`. Класс объединяет их в **одну сущность** и добавляет поведение.

```dart
class Game {
  final String id;
  final String title;
  final DateTime startAt;
  final List<String> playerIds;

  const Game({required this.id, required this.title, required this.startAt, this.playerIds = const []});

  // Поведение рядом с данными
  bool get hasOpponent => playerIds.length >= 2;
  bool get isUpcoming => startAt.isAfter(DateTime.now());
}
```

Теперь вместо трёх проверок в разных экранах — `game.hasOpponent`. Если правило изменится, меняем в одном месте (**DRY**). Класс — это ещё и точка, куда вешают шапку-комментарий и где живёт **одна ответственность** (S).

## Подробно: extends, implements или with — что выбрать

Простое правило выбора:

| Ситуация | Что использовать | Пример |
|---|---|---|
| «Это разновидность» с общим кодом | `extends` | `PrimaryButton extends BaseButton` |
| Нужен только **контракт**, реализация разная | `implements` (интерфейс) | `HttpApiClient implements ApiClient` |
| Нужно подмешать способность нескольким классам | `with` (миксин) | `with Loggable` |

Почему интерфейсы важны для задания: **приложение зависит от `ApiClient`** (контракт), а не от `HttpApiClient`. Заменить реализацию можно без правок остального кода (D из SOLID).

```dart
abstract interface class GameRepository {
  Future<List<Game>> getGames();
}

class RemoteGameRepository implements GameRepository { /* ходит на сервер */ }
class FakeGameRepository implements GameRepository { /* возвращает тестовые данные */ }
```

Фейковую реализацию удобно использовать в тестах и пока нет сервера.

## Подробно: неизменяемые объекты и copyWith

Если поля `final`, объект нельзя изменить после создания. Это защищает от случайных ошибок: Flutter сразу видит, что состояние «новое», когда вы создаёте новый объект.

```dart
class GameState {
  final int moves;
  final bool finished;
  const GameState({this.moves = 0, this.finished = false});

  // Создаёт копию с заменой отдельных полей
  GameState copyWith({int? moves, bool? finished}) =>
      GameState(moves: moves ?? this.moves, finished: finished ?? this.finished);
}

var state = const GameState();
state = state.copyWith(moves: state.moves + 1);
```

## Подробно: равенство, hashCode, toString

По умолчанию два объекта с одинаковыми полями **не равны** (сравниваются адреса в памяти). Для сравнения по содержимому переопределяют `==` и `hashCode`.

```dart
class Point {
  final int x, y;
  const Point(this.x, this.y);

  @override
  bool operator ==(Object other) => other is Point && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => 'Point($x, $y)'; // удобно для логов
}
```

Для игры Image это пригодится, когда сравниваете порядок плиток; а `toString` делает логи читаемыми (формат из задания: `[Тег]: Событие — Детали`).

## Подробно: DTO и Entity — зачем два класса

**DTO** (Data Transfer Object) повторяет формат сервера: поля называются как в JSON, типы могут быть «сырыми». **Entity** — удобная для приложения модель.

```dart
// data/dto/game_dto.dart — как пришло с сервера
class GameDto {
  final String id;
  final String title;
  final String startAt;        // строка ISO
  GameDto({required this.id, required this.title, required this.startAt});
  factory GameDto.fromJson(Map<String, dynamic> j) =>
      GameDto(id: j['id'].toString(), title: j['title'] as String, startAt: j['start_at'] as String);
}

// domain/entities/game.dart — как нужно приложению
class Game { final String id; final String title; final DateTime startAt; /* ... */ }

// data/mappers/game_mapper.dart
class GameMapper {
  static Game toEntity(GameDto d) => Game(id: d.id, title: d.title, startAt: DateTime.parse(d.startAt).toLocal());
}
```

Если сервер переименует поле, поменяется только DTO и маппер. Экраны и бизнес-логика останутся нетронутыми (требование «изменение в одном месте не ломает другие»).

## Практика

1. Напишите класс `Player` с `fromJson`, `toJson`, `copyWith`.
2. Создайте `abstract interface class Timer` и две реализации.
3. Напишите `enum GameCategory` с полем `title` и методом `fromString`.
4. Сделайте `sealed class` состояния экрана с тремя вариантами и `switch` по нему.
5. Объясните, чем DTO отличается от Entity, и приведите пример из своей симуляции.

## Учимся: навык 1. Класс с fromJson и toJson

**Рецепт «модель из ответа сервера» за 5 шагов.** Допустим, сервер присылает `{"id": "7", "title": "Битва", "finished": false}`.

1. **Выпишите поля** и их типы: `id` String, `title` String, `finished` bool.
2. **Сделайте поля `final`** и конструктор с именованными параметрами.
3. **Напишите `factory Класс.fromJson(Map<String, dynamic> json)`**: для каждого поля берите `json['ключ']` и приводите тип (`as String`).
4. **Напишите `toJson()`**: верните словарь с теми же ключами.
5. **Проверьте** на примере: создайте объект из JSON и превратите обратно.

```dart
class Game {
  final String id;
  final String title;
  final bool finished;
  const Game({required this.id, required this.title, this.finished = false});

  factory Game.fromJson(Map<String, dynamic> json) => Game(
        id: json['id'].toString(),
        title: json['title'] as String,
        finished: json['finished'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'finished': finished};
}
```

**Важные детали:** `id` часто приходит числом, поэтому `.toString()`; необязательное поле: `as bool?` и `?? значение по умолчанию`; ключи в `toJson` должны совпадать с теми, что ждёт сервер (смотрите документацию API).

## Учимся: навык 2. extends, implements, with

**Вопрос, который нужно задать:** «Что я хочу получить от другого класса — **код**, **обещание** или **способность**?»

| Хочу | Слово | Пример |
|---|---|---|
| Унаследовать готовый код и поля | `extends` | `PrimaryButton extends BaseButton` |
| Только **пообещать**, что реализую те же методы | `implements` | `HttpApiClient implements ApiClient` |
| Добавить одну способность нескольким классам | `with` | `class Repo with Loggable` |

**Пример на сетевом слое.** Приложению нужен «кто-то, кто умеет делать запросы»:

```dart
abstract interface class ApiClient {                       // контракт: что умеем
  Future<Map<String, dynamic>> get(String path);
}
class HttpApiClient implements ApiClient { /* на пакете http */ }
class FakeApiClient implements ApiClient { /* возвращает готовые данные для тестов */ }
```

Экран и UseCase знают только `ApiClient`. Подставить `HttpApiClient` или `FakeApiClient` можно в одном месте. Это и есть «заменяемость» из задания.

**Частая ошибка.** Использовать `extends` там, где нужен только контракт: лишний код тянется за собой, а заменить реализацию сложнее.

## Учимся: навык 3. Приватность и lib/src

**Правило.** Всё, что начинается с `_`, видно только внутри своего файла. Всё остальное публично.

**Для библиотеки UIKit** это превращается в схему:
```
uikit/lib/
  uikit.dart          ← публичный: только export
  src/
    components/ui_button.dart   ← детали реализации
```
Файл `uikit.dart` экспортирует то, что приложение **может** использовать. Всё внутри `src/` по соглашению считается внутренним. Приложение пишет единственный импорт `import 'package:uikit/uikit.dart';`.

**Внутри класса:**

```dart
class Timer1 {
  int _seconds = 0;                 // приватное: снаружи не изменить
  int get seconds => _seconds;      // публичное только чтение
  void tick() => _seconds++;        // единственный способ изменить
}
```

Зачем: если завтра вы решите считать секунды иначе, изменится только класс, а не весь код, который его использует.

## Учимся: навык 4. sealed для состояний

**Задача.** Экран со списком игр бывает в трёх состояниях: идёт загрузка, данные получены, произошла ошибка. Нужно, чтобы экран **не мог** забыть обработать одно из них.

**Шаги:**
1. Объявите `sealed class` для состояния.
2. Для каждого состояния заведите класс-наследник (с нужными данными).
3. В экране используйте `switch` по состоянию: компилятор покажет ошибку, если пропущен вариант.

```dart
sealed class GamesState {}
class GamesLoading extends GamesState {}
class GamesLoaded extends GamesState { final List<Game> games; GamesLoaded(this.games); }
class GamesError extends GamesState { final String message; GamesError(this.message); }

Widget build(GamesState s) => switch (s) {
      GamesLoading() => const Center(child: CircularProgressIndicator()),
      GamesLoaded(:final games) => GamesList(games),
      GamesError(:final message) => Text(message),
    };
```

Добавите четвёртое состояние (например, «пусто») и компилятор подсветит все места, где его забыли обработать.
