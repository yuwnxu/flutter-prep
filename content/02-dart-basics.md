---
id: dart-basics
stage: 2
title: Dart: основы языка
lead: Синтаксис, типы, null safety, функции, коллекции. Всё, что нужно для чтения и написания кода во Flutter.
---

## Переменные и типы

```dart
void main() {
  int age = 18;                 // целое
  double price = 19.99;         // дробное
  String name = 'Юлдуз';        // строка
  bool isReady = true;          // логическое
  var city = 'Сургут';          // тип выводится сам (String)
  final today = DateTime.now(); // нельзя переприсвоить, значение известно при запуске
  const maxScore = 100;         // константа времени компиляции

  print('Привет, $name! Тебе $age, баллов: ${maxScore - 5}');
}
```

| Ключевое слово | Когда |
|---|---|
| `var` | Тип понятен из значения |
| `final` | Значение задаётся один раз во время работы |
| `const` | Значение известно ещё при компиляции (цвета, отступы, константные виджеты) |

## Null safety

Обычный тип не может хранить `null`. Чтобы разрешить, добавьте `?`.

```dart
String? nickname;                 // может быть null
String title = nickname ?? 'Игрок'; // ?? — значение по умолчанию
print(nickname?.length);          // ?. — безопасный вызов, вернёт null
print(nickname!.length);          // ! — «я уверена, что не null» (упадёт, если null)

late String token;                // будет присвоено позже, до первого чтения
```

::: warn
Оператор `!` — частая причина падений. Используйте `??`, `?.` или проверку `if (x != null)`.
:::

## Условия и циклы

```dart
if (score >= 10) {
  print('Победа');
} else if (score >= 5) {
  print('Ничья');
} else {
  print('Поражение');
}

final label = score > 5 ? 'много' : 'мало'; // тернарный оператор

for (var i = 0; i < 3; i++) print(i);
for (final item in ['a', 'b']) print(item);
while (score < 10) { score++; }

switch (status) {
  case 'win':
    print('Победа');
  default:
    print('Другое');
}
```

В Dart 3 есть **switch-выражения** и **паттерны**:

```dart
final text = switch (status) {
  'win' => 'Победа',
  'lose' => 'Поражение',
  _ => 'Игра идёт',
};
```

## Функции

```dart
int sum(int a, int b) => a + b;                 // короткая запись

// Именованные параметры: удобно для виджетов и конфигураций
String greet({required String name, int age = 18}) => '$name, $age';
greet(name: 'Аня');

// Необязательный позиционный
String join(String a, [String? b]) => b == null ? a : '$a$b';

// Функция — это значение
final doubler = (int x) => x * 2;
[1, 2, 3].map(doubler);                         // (2, 4, 6)

typedef Callback = void Function(int value);    // тип функции
```

## Коллекции

```dart
final list = <int>[3, 1, 2];
list.add(4);
list.sort();                                   // [1, 2, 3, 4]
final even = list.where((e) => e.isEven).toList();
final names = list.map((e) => '№$e').toList();
final sumAll = list.fold(0, (acc, e) => acc + e);

final map = <String, int>{'Аня': 5, 'Боря': 3};
map['Вика'] = 7;
for (final e in map.entries) print('${e.key}: ${e.value}');

final set = {1, 2, 2, 3};                      // {1, 2, 3}, дубликаты исчезают

// Расширение коллекций прямо в литерале
final all = [...list, if (isAdmin) 99, for (var i in [7, 8]) i];
```

## Строки

```dart
final s = 'Hello';
s.toUpperCase(); s.substring(1, 3); s.contains('el');
s.padLeft(8, '0'); s.split(',').join(';');
final multi = '''Много
строк''';
final path = r'C:\raw\no\escape';             // r — «сырая» строка
```

## Типичные ошибки новичков

| Ошибка | Исправление |
|---|---|
| `int x = 5.5;` | `double x = 5.5;` или `x.toInt()` |
| `Null check operator used on a null value` | заменить `!` на проверку |
| `late` без присваивания | присвоить до чтения или сделать nullable |
| Забыли `await` | функция вернула `Future`, а не значение |
| Забыли `;` | компилятор подсвечит красным |

## Что нужно уметь

- Выбрать между `var`, `final`, `const`.
- Читать `?`, `??`, `?.`, `!`.
- Писать функции с именованными параметрами.
- Работать со списками и словарями (`map`, `where`, `fold`).

## Подробно: типы и их преобразования

Часто нужно превратить один тип в другой: пользователь вводит число в поле, а там строка.

```dart
final s = '42';
final a = int.parse(s);          // 42; но упадёт с FormatException на 'abc'
final b = int.tryParse('abc');   // null — безопасный вариант
final c = double.parse('3.5');
final text = 42.toString();      // '42'
final rounded = 3.7.round();     // 4
final intFromDouble = 3.7.toInt(); // 3 (отбрасывает дробную часть)
```

Правило: **ввод пользователя всегда проверяйте** через `tryParse`, а не `parse`. Так приложение не упадёт из-за пустого поля.

Различие `num`, `int` и `double`: `num` — общий родитель. JSON часто присылает число то как `5`, то как `5.0`, поэтому надёжнее разбирать так:

```dart
final score = (json['score'] as num?)?.toInt() ?? 0;
```

## Подробно: null safety на живом примере

Допустим, пользователь заполняет форму регистрации. Поле «имя» необязательное.

```dart
class Profile {
  final String email;     // обязательное: null нельзя
  final String? name;     // необязательное: может быть null
  Profile({required this.email, this.name});
}

String greeting(Profile p) {
  // p.name может быть null, поэтому нужна защита:
  final shown = p.name ?? p.email;     // если имени нет, показываем email
  return 'Привет, $shown';
}

int nameLength(Profile p) => p.name?.length ?? 0;
```

Алгоритм выбора:

1. Значение может отсутствовать? Делайте тип с `?`.
2. Используете значение с `?`? Выберите: `??` (значение по умолчанию), `?.` (безопасный доступ) или `if (x != null)`.
3. Пишете `!`? Остановитесь и подумайте: что будет, если там всё же `null`?

**Промоция типа.** После проверки `if (name != null)` внутри блока Dart сам считает `name` ненулевым (но только для локальных переменных и `final`-полей текущего класса).

```dart
final String? name = getName();
if (name != null) {
  print(name.length); // здесь name — уже String
}
```

## Подробно: коллекции на примере списка игр

Списки и словари — рабочие инструменты для экранов Discover и Statistics.

```dart
class Game {
  final String id; final String title; final DateTime startAt; final bool finished;
  const Game(this.id, this.title, this.startAt, this.finished);
}

final games = <Game>[ /* ... пришли с сервера ... */ ];

// Предстоящие игры, отсортированные по времени
final upcoming = games.where((g) => g.startAt.isAfter(DateTime.now())).toList()
  ..sort((a, b) => a.startAt.compareTo(b.startAt));

// Количество созданных игр на этой неделе
final monday = DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1));
final thisWeek = games.where((g) => g.startAt.isAfter(monday)).length;

// Сгруппировать по дням: Map<день, список игр>
final byDay = <String, List<Game>>{};
for (final g in games) {
  final key = '${g.startAt.day}-${g.startAt.month}';
  byDay.putIfAbsent(key, () => []).add(g);
}

// Есть ли хоть одна завершённая? Все ли завершены?
final anyDone = games.any((g) => g.finished);
final allDone = games.every((g) => g.finished);

// Первая подходящая игра или null
final next = games.where((g) => !g.finished).firstOrNull;
```

Шпаргалка по методам:

| Метод | Что делает | Возвращает |
|---|---|---|
| `where` | Отфильтровать | `Iterable` (добавьте `.toList()`) |
| `map` | Преобразовать каждый элемент | `Iterable` |
| `fold` / `reduce` | Свернуть в одно значение | значение |
| `sort` | Отсортировать на месте | `void` |
| `any` / `every` | Хотя бы один / все подходят | `bool` |
| `firstWhere` | Найти первый | элемент (или ошибка) |
| `take(n)` / `skip(n)` | Взять / пропустить n | `Iterable` |
| `contains` | Есть ли значение | `bool` |

## Подробно: как читать сообщения компилятора

Dart подсвечивает ошибки красным до запуска. Типичные:

| Сообщение | Причина |
|---|---|
| `The name 'x' isn't defined` | Опечатка или забыт импорт |
| `A value of type 'int?' can't be assigned to a variable of type 'int'` | Значение может быть `null`: обработайте |
| `The argument type 'String' can't be assigned to the parameter type 'int'` | Передан не тот тип |
| `Missing required argument` | Не указан параметр с `required` |
| `Expected to find ';'` | Пропущена точка с запятой |
| `Undefined class` | Нет импорта: наведите курсор и нажмите Alt+Enter (импортировать) |

Читайте ошибки **снизу вверх по важности**: сначала исправьте первую красную, остальные часто исчезают сами.

## Практика

1. Напишите функцию `parseAge(String)`, которая возвращает `int?` и не падает на пустой строке.
2. Из списка `[5, 3, 9, 1]` получите сумму, максимум и список чётных.
3. Составьте `Map<String,int>` «ник → очки» и выведите лидера.
4. Запишите функцию с именованными параметрами `createGame({required title, DateTime? startAt})`.
5. Исправьте код: `String s = null;` двумя способами.

## Учимся: навык 1. var, final, const

**Правило выбора за 10 секунд:**
1. Значение будет меняться (счётчик, текущий экран)? → `var` (или конкретный тип).
2. Значение задаётся один раз, но вычисляется при запуске (`DateTime.now()`, ответ сервера, текст из поля)? → `final`.
3. Значение известно ещё до запуска (число, цвет, отступ, текст)? → `const`.

```dart
var moves = 0;                          // будет расти
final startedAt = DateTime.now();       // один раз при запуске
const padding = 16.0;                   // всегда 16
const primary = Color(0xFF00D95F);      // цвет в UIKit
```

**Подсказка Android Studio:** если подчёркнуто «prefer_const...», добавьте `const`. Если пишет «can't be a const», значит, значение вычисляется при запуске, нужен `final`.

**Частая ошибка.** `const now = DateTime.now();`: время известно только во время работы, поэтому только `final`.

## Учимся: навык 2. Операторы ?, ??, ?., !

Это четыре инструмента для работы с «может быть пустым».

| Запись | Читается как | Пример |
|---|---|---|
| `String?` | «строка или null» | `String? name;` |
| `a ?? b` | «если a пустое, возьми b» | `name ?? 'гость'` |
| `a?.length` | «если a не пустое, вызови, иначе null» | `name?.length` |
| `a!` | «я уверена, что не null» (опасно) | `name!.length` |

**Алгоритм выбора, когда видите значение с `?`:**
1. Есть разумное значение по умолчанию? → `??`.
2. Нужно вызвать метод, а результат может быть пустым? → `?.`.
3. Нужно выполнить блок только если значение есть? → `if (x != null) { ... }`.
4. Только если вы **доказали**, что null невозможен, пишите `!`.

**Пример: поле email из формы.**

```dart
String? email = controller.text.isEmpty ? null : controller.text;
final shown = email ?? 'не указан';      // что показать на экране
final len = email?.length ?? 0;           // длина или 0
if (email != null) {
  send(email);                            // здесь email уже String
}
```

## Учимся: навык 3. Функции с именованными параметрами

**Зачем.** Сравните два вызова: `createGame('Битва', true, 5)` и `createGame(title: 'Битва', notify: true, players: 5)`. Во втором всё понятно без заглядывания в функцию. Все виджеты Flutter используют именованные параметры.

**Как написать:**
1. Параметры заключаем в `{ }`.
2. Обязательные помечаем `required`.
3. Необязательным даём значение по умолчанию или делаем их nullable.

```dart
String describe({required String title, int moves = 0, String? note}) {
  final base = '$title: $moves ходов';
  return note == null ? base : '$base ($note)';
}

describe(title: 'Image');                     // Image: 0 ходов
describe(title: 'Circle', moves: 7, note: 'быстро');
```

**Частая ошибка.** Забыли `required` у обязательного параметра: компилятор разрешит вызвать без него, а внутри получится `null`.

## Учимся: навык 4. Списки и словари

**Три инструмента для списков.** Запомните как «вопросы к списку»:
- **Какие подходят?** → `where(...)`.
- **Во что превратить каждый?** → `map(...)`.
- **Что получится в сумме?** → `fold(начало, (итог, элемент) => ...)`.

```dart
final scores = [3, 9, 5, 12, 7];
final big = scores.where((s) => s >= 7).toList();         // [9, 12, 7]
final labels = scores.map((s) => 'очки: $s').toList();    // ['очки: 3', ...]
final sum = scores.fold(0, (acc, s) => acc + s);          // 36
final best = scores.reduce((a, b) => a > b ? a : b);      // 12
```

**Словарь** хранит пары. Перебор:

```dart
final scoreByName = {'Аня': 12, 'Боря': 7};
for (final e in scoreByName.entries) {
  print('${e.key}: ${e.value}');
}
scoreByName['Вика'] = 9;                  // добавить
final anya = scoreByName['Аня'] ?? 0;     // читать (может быть null!)
```

**Частая ошибка.** Забыли `.toList()` после `where` или `map`: получится `Iterable`, а не список.
