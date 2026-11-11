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

## Подробно: как Dart выполняет async

Dart выполняет код **в одном потоке**, но не стоит на месте во время ожидания. Представьте повара (поток): он ставит суп вариться (отправил запрос) и пока жарит котлету (рисует интерфейс). Когда суп готов, повар возвращается к нему.

- Есть **очередь событий**: «пришёл ответ», «нажали кнопку», «сработал таймер».
- `await` значит: «приостанови эту функцию, продолжи, когда будет результат, а пока обрабатывай другие события».
- Интерфейс не «зависает», пока вы ждёте сеть.

```dart
Future<void> onTap() async {
  print('1 — до запроса');
  final games = await repo.getGames();   // здесь функция «засыпает»
  print('3 — после запроса: ${games.length}');
}
print('2 — сразу после вызова onTap()'); // выполнится до строки «3»
```

Тяжёлые вычисления (например, обработка большой картинки) всё же блокируют поток. Для них используют `compute()` / изоляты, но для задания это обычно не нужно.

## Подробно: ошибки, таймауты, отмена

Любой запрос может завершиться неудачей. Три инструмента:

```dart
Future<List<Game>> load() async {
  try {
    final games = await repo.getGames().timeout(const Duration(seconds: 15)); // ограничили ожидание
    return games;
  } on TimeoutException {
    throw const TimeoutApiException();
  } on SocketException {
    throw const NoInternetException();
  } finally {
    AppLog.debug('GameController', 'Загрузка', 'завершена'); // выполнится всегда
  }
}
```

**Параллельные запросы:**

```dart
final results = await Future.wait([repo.getGames(), repo.getStats()]);
final games = results[0] as List<Game>;
final stats = results[1] as Stats;
```

**Отмена Stream-подписки и таймера** — в `dispose`:

```dart
late final StreamSubscription<int> _sub;
_sub = ticker().listen(...);
@override void dispose() { _sub.cancel(); super.dispose(); }
```

**Защита от двойного нажатия**: пока идёт запрос, отключайте кнопку (флаг `isLoading`), иначе игра создастся дважды.

## Подробно: JSON с вложенными данными

Ответ сервера часто содержит вложенные объекты и списки:

```json
{
  "id": "5",
  "title": "Evening battle",
  "players": [{"id": "1", "name": "Аня"}, {"id": "2", "name": "Боря"}],
  "result": null
}
```

```dart
class GameDto {
  final String id;
  final String title;
  final List<PlayerDto> players;
  final ResultDto? result;

  GameDto({required this.id, required this.title, required this.players, this.result});

  factory GameDto.fromJson(Map<String, dynamic> j) => GameDto(
        id: j['id'].toString(),
        title: j['title'] as String,
        players: (j['players'] as List? ?? [])
            .map((e) => PlayerDto.fromJson(e as Map<String, dynamic>))
            .toList(),
        result: j['result'] == null ? null : ResultDto.fromJson(j['result'] as Map<String, dynamic>),
      );
}
```

Правила надёжного разбора:

1. Список может прийти `null`, поэтому `?? []`.
2. Число может быть `int` или `double`, поэтому `as num`.
3. Идентификатор может быть числом или строкой, поэтому `.toString()`.
4. Поле может отсутствовать, поэтому тип с `?`.
5. Кириллица в ответе: декодируйте `utf8.decode(response.bodyBytes)`, а не `response.body`, если видите «кракозябры».

## Практика

1. Напишите `Future<int> slowSum()` с задержкой 2 секунды и вызовите её через `await`.
2. Запустите два «запроса» через `Future.wait` и замерьте время.
3. Сделайте секундомер на `Timer.periodic` с кнопкой пауза.
4. Разберите JSON из примера в модели и выведите имена игроков.
5. Придумайте, как показать пользователю ошибку таймаута, и напишите соответствующий `catch`.
