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
