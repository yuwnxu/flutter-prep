---
id: dart-async
stage: 2
title: Dart: асинхронность и JSON
lead: Future, async/await, Stream, таймеры, работа с JSON. Без этого не сделать ни сеть, ни таймер игры.
---

## Зачем нужна асинхронность

Сетевой запрос идёт сотни миллисекунд. Если ждать «стоя», интерфейс замрёт. **Future** — «обещание» значения в будущем: приложение продолжает работать, а когда ответ придёт, выполнится продолжение.

```dart
Future<String> loadName() async {
  await Future.delayed(const Duration(seconds: 1)); // имитация запроса
  return 'Аня';
}

Future<void> main() async {
  final name = await loadName();   // подождали результат, UI при этом не заблокирован
  print(name);
}
```

| Правило | Пояснение |
|---|---|
| `async` помечает функцию, которая использует `await` | Возвращает `Future<T>` |
| `await` работает только внутри `async` | Ставит выполнение на паузу до результата |
| Ошибки ловятся обычным `try/catch` | И для `await`, и внутри `async` |
| `Future.wait([a(), b()])` | Выполнить несколько запросов параллельно |

## Stream: поток событий

Future даёт **одно** значение, Stream — **много** во времени. Пример: секундомер игры.

```dart
Stream<int> ticker() async* {
  var seconds = 0;
  while (true) {
    await Future.delayed(const Duration(seconds: 1));
    yield ++seconds;
  }
}

final sub = ticker().listen((s) => print('Прошло $s с'));
// не забудьте: sub.cancel();
```

Для таймера на экране проще использовать `Timer.periodic` и **обязательно отменять его в `dispose`**:

```dart
import 'dart:async';

Timer? _timer;
void start() {
  _timer = Timer.periodic(const Duration(seconds: 1), (_) {
    setState(() => seconds++);
  });
}

@override
void dispose() {
  _timer?.cancel();
  super.dispose();
}
```

::: warn
Не вызывайте `setState` после `dispose`. Проверяйте `if (!mounted) return;` после каждого `await` в виджете.
:::

## JSON

Сервер присылает строку JSON. Приложение превращает её в объекты.

```dart
import 'dart:convert';

const raw = '{"id":"7","name":"Аня","score":12}';
final Map<String, dynamic> map = jsonDecode(raw);   // строка -> Map
final player = Player.fromJson(map);                // Map -> объект

final body = jsonEncode(player.toJson());           // объект -> строка
```

Список объектов:

```dart
final List<dynamic> raw = jsonDecode(response.body);
final players = raw
    .map((e) => Player.fromJson(e as Map<String, dynamic>))
    .toList();
```

## Даты и время

```dart
final now = DateTime.now();
final start = DateTime(2027, 3, 15, 18, 30);
final remind = start.subtract(const Duration(hours: 1));   // для уведомления за час
final iso = start.toUtc().toIso8601String();                // для отправки на сервер
final parsed = DateTime.parse(iso).toLocal();
final left = start.difference(now);                         // Duration
```

Для вывода в нужном формате используют `intl` (`DateFormat('dd-MM-yyyy')`); если пакета нет, форматируйте вручную через `padLeft(2, '0')`.

## Что нужно уметь

- Написать `async`-функцию и обработать ошибку `try/catch`.
- Запустить и корректно остановить `Timer.periodic`.
- Разобрать JSON в модель и вернуть обратно.
- Посчитать разницу между датами.
