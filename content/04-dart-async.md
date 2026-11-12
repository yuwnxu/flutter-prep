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

## Учимся: навык 1. async, await и try/catch

**Идея.** Долгая операция (запрос в сеть) не должна замораживать экран. `await` говорит: «подожди результат здесь, а приложение пока работает».

**Три правила.**
1. Есть `await` внутри? Пометьте функцию `async` и сделайте её тип `Future<...>`.
2. Вызываете `async`-функцию и нужен результат? Ставьте `await`.
3. Операция может завершиться ошибкой? Оберните вызов в `try/catch`.

**Шаги на примере «загрузить список игр»:**

```dart
Future<List<Game>> loadGames() async {                // 1. async и Future
  AppLog.info('GameController', 'Запрос', 'Список игр');
  try {
    final games = await repo.getGames();              // 2. await
    AppLog.debug('GameController', 'Ответ', '${games.length}');
    return games;
  } on NoInternetException {                           // 3. ловим конкретную ошибку
    AppLog.error('GameController', 'Ошибка', 'Нет сети');
    rethrow;                                           // передаём выше: экран покажет SnackBar
  } catch (e, st) {                                    // 3. все остальные
    AppLog.error('GameController', 'Ошибка', '$e', e, st);
    rethrow;
  }
}
```

**Частые ошибки:** забыли `await` (в переменной окажется `Future`, а не значение); `catch` без лога (теряете баллы); после `await` в виджете забыли проверить `mounted`.

### Как читать код с await: порядок выполнения

Это самая трудная часть темы. Запомните четыре правила:

1. Код идёт сверху вниз, строка за строкой.
2. Вызванная `async`-функция **сразу начинает работать** и идёт до первого `await`.
3. На `await` функция **засыпает** и возвращает управление вызвавшему коду. Тот продолжает работать, не дожидаясь.
4. После ожидания функция просыпается и выполняет остаток.

**Разбор на примере.**

```dart
void main() {
  print('1');
  load();          // вызвали, но не ждём (нет await)
  print('2');
}
Future<void> load() async {
  print('3');
  await Future.delayed(const Duration(seconds: 1));
  print('4');
}
```

| Шаг | Где | Что делается | Вывод |
|---:|---|---|---|
| 1 | main | `print('1')` | 1 |
| 2 | main | вызов `load()`, вход внутрь | |
| 3 | load | `print('3')` (до `await` код обычный) | 3 |
| 4 | load | `await`: засыпает, управление возвращается в main | |
| 5 | main | `print('2')`, main закончился | 2 |
| 6 | load | через секунду просыпается, `print('4')` | 4 |

Итог: **1, 3, 2, 4**.

**Если бы в `main` перед `load()` стоял `await`** (и `main` был `async`), то `main` дождался бы окончания `load()`: вывод был бы 1, 3, 4, 2. Сравните сами: `await load();`: главный код ждёт, без `await` не ждёт.

**Аналогия.** `await` — это «поставил чайник и пошёл резать хлеб». Ждать у плиты (когда нужно результат сразу) значит написать `await` перед вызовом в той функции, которой результат нужен.

### Разбор: функция loadScore, которая не падает

Задача из упражнений: функция принимает **действие** (запрос) и должна вернуть его результат, а при любой ошибке вернуть 0.

**Функция как параметр.** В Dart функцию можно передать, как число. Тип `Future<int> Function()` читается: «функция без параметров, которая возвращает обещание целого числа».

```dart
int apply(int Function() f) => f();     // f — функция, f() — её вызов
apply(() => 7);                          // 7: стрелка () => 7 — маленькая функция
```

**Решение по шагам:**
1. Пишем заголовок: `Future<int> loadScore(Future<int> Function() request) async`.
2. «Попробовать» → `try { ... }`.
3. Внутри — вызвать `request()` и **дождаться**: `return await request();`.
4. «Если ошибка» → `catch (e) { return 0; }`.

```dart
Future<int> loadScore(Future<int> Function() request) async {
  try {
    return await request();
  } catch (e) {
    return 0;
  }
}
```

**Почему именно `await` внутри `try`.** Без него `return request();` вернёт обещание сразу, и ошибка произойдёт уже после выхода из `try`: `catch` её не поймает. Правило: чтобы поймать ошибку асинхронной операции, перед ней нужен `await`.

**Проверка работы:**

```dart
await loadScore(() async => 42);                           // 42
await loadScore(() async => throw Exception('нет сети'));  // 0
```

## Учимся: навык 2. Timer.periodic и остановка

**Идея.** Таймер повторяет действие. Его нужно **запустить** и обязательно **остановить**.

**Шаги:**
1. Объявите поле `Timer? _timer;`.
2. Запустите в `initState` или по кнопке: `_timer = Timer.periodic(Duration(seconds: 1), (_) { ... });`.
3. Остановите в `dispose`: `_timer?.cancel();`.
4. Если таймер должен останавливаться раньше (победа в игре), вызовите `cancel()` в этот момент.

```dart
class _GameState extends State<GameScreen> {
  Timer? _timer;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds++);
    });
  }

  void _onSolved() {
    _timer?.cancel();            // остановили при победе
    // отправка результата
  }

  @override
  void dispose() {
    _timer?.cancel();            // и при уходе с экрана
    super.dispose();
  }
}
```

**Что будет, если не остановить:** таймер продолжит работать после ухода с экрана, будет вызывать `setState` и приведёт к ошибке `setState() called after dispose()`, а в игре время будет идти уже не у вас.

### Разбор: класс Stopwatch1 (секундомер)

**Что нужно хранить:** сколько секунд прошло (`int seconds`) и «пульт» от таймера (`Timer? _timer`). Пульт нужен, чтобы потом остановить таймер; `?`, потому что до `start()` его нет.

**Что умеет:** `start()` включает таймер, `stop()` его выключает.

```dart
import 'dart:async';

class Stopwatch1 {
  int seconds = 0;
  Timer? _timer;

  void start() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      seconds++;                 // выполняется раз в секунду
    });
  }

  void stop() {
    _timer?.cancel();
  }
}
```

`Timer.periodic(как часто, что делать)`: второй аргумент — функция, которую таймер вызывает сам, как будильник.

## Учимся: навык 3. Разбор JSON в модель и обратно

**Алгоритм** для любого ответа сервера:
1. Получили строку `body`.
2. `jsonDecode(body)` превращает её в `Map` или `List`.
3. Для каждой модели вызываем `fromJson`.
4. Отправка в обратную сторону: `jsonEncode(model.toJson())`.

```dart
// ответ: {"id":"5","title":"Битва","players":[{"name":"Аня"},{"name":"Боря"}]}
final map = jsonDecode(body) as Map<String, dynamic>;
final game = GameDto.fromJson(map);

// список игр: [ {...}, {...} ]
final list = (jsonDecode(body) as List)
    .map((e) => GameDto.fromJson(e as Map<String, dynamic>))
    .toList();
```

**Как не ошибиться в `fromJson`:** сверяйте названия ключей с документацией (регистр важен: `start_at` и `startAt` разные ключи); вложенный список разбирайте через `map(...).toList()`; на каждое необязательное поле — `?` и `??`.

## Учимся: навык 4. Разница между датами

**Инструменты:**

| Что нужно | Как |
|---|---|
| Сколько осталось до игры | `start.difference(now)` → `Duration` |
| Минуты/часы/дни из Duration | `.inMinutes`, `.inHours`, `.inDays` |
| Сдвинуть дату | `start.add(Duration(hours: 1))`, `start.subtract(...)` |
| Раньше или позже | `a.isBefore(b)`, `a.isAfter(b)` |
| Начало недели | `day.subtract(Duration(days: day.weekday - 1))` |

```dart
final start = DateTime(2027, 3, 15, 18, 30);
final left = start.difference(DateTime.now());
final text = left.isNegative ? 'уже началась' : 'через ${left.inMinutes} мин';
final remindAt = start.subtract(const Duration(hours: 1));   // уведомление за час
```

**Ловушки:** все даты сравнивайте в одном часовом поясе (`toUtc()` или `toLocal()` у обеих); `inMinutes` отбрасывает остаток секунд; при отрицательной разнице игра уже началась.
