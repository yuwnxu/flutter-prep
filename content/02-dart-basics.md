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
