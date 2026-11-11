---
id: sprint4
stage: 6
title: Спринт 4: бои, игроки, статистика, Image
lead: 1 ч. Самый дорогой спринт: 25,55 балла. Список игр, детали, профиль соперника, графики и первая игра.
---

## Что нужно сделать

| Задача | Верстка | Сеть |
|---|---:|---:|
| Discover Combats (все созданные и прошедшие игры) | 1,20 + 0,05 | 1,20 |
| Combat Information, вход в игру, если нет соперника | 0,90 + 0,10 | 1,20 |
| Player Information (из Most Popular Players) | 1,20 | 1,20 |
| Statistics: Earnings, Played Games, Scheduled Games | 0,80 + 3×0,5 | 1,20 |
| Игра **Image** | 2,00 + 0,30 | 1,20 |
| Автозавершение при сборке пазла | 2,00 | |
| Победитель — кто быстрее; результаты на сервер | 2,00 | |
| Архитектура: папки, 3 слоя, SOLID, DRY | | 5,30 |
| Хранение: последний экран, закрыл игру = проиграл, кэш медиа | | 1,20 |
| Уведомление за час до игры | | 1,00 |

Игра Image вместе с автозавершением и победителем даёт **6,3 балла** — это почти четверть всего спринта.

## Порядок (60 минут)

| Минуты | Что |
|---|---|
| 0–5 | Ветка `sprint-4`, обновить пакеты |
| 5–20 | Discover Combats + Combat Information (списки и детали — шаблон повторяется) |
| 20–32 | Player Information, Statistics |
| 32–52 | Игра Image: поле, перемешивание, таймер, победа, отправка результата |
| 52–58 | Уведомления, кэш |
| 58–60 | Коммиты, PR, карточки |

Если времени мало, реализуйте экраны полностью, а игру сначала **минимально рабочую** (сборка → завершение → отправка), а красоту доведите потом.

## Список игр и детали

Шаблон экрана с сетью — одинаковый для всех:

```dart
sealed class ScreenState<T> {}
class Loading<T> extends ScreenState<T> {}
class Loaded<T> extends ScreenState<T> { final T data; Loaded(this.data); }
class Failed<T> extends ScreenState<T> { final String message; Failed(this.message); }
```

```dart
// В контроллере
Future<void> load() async {
  state = Loading();
  notifyListeners();
  try {
    final games = await _getGames();
    state = Loaded(games);
  } on ApiException catch (e) {
    state = Failed(e.message);   // а экран покажет SnackBar на 5 секунд
  }
  notifyListeners();
}
```

В интерфейсе: `switch (state) { Loading() => spinner, Loaded(:final data) => список, Failed(:final message) => сообщение + «повторить» }`.

Различие «предстоящая» / «прошедшая» игра определяется по времени начала и статусу с сервера. Сравнивайте даты в одном часовом поясе (`toUtc()` либо `toLocal()` везде).

**Combat Information**: если соперника нет, кнопка «Join» вызывает запрос «подключение к игре», затем переход в игру.

## Статистика: кольцевая диаграмма без пакета

Из задания: «Played Games — количество выигранных игр, **синий круг** — Circle, **красный** — Image». Если нет разрешённого `fl_chart`, нарисуйте сами:

```dart
class DonutPainter extends CustomPainter {
  final List<double> values;     // например [circleWins, imageWins]
  final List<Color> colors;      // [синий, красный]
  const DonutPainter(this.values, this.colors);

  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<double>(0, (a, b) => a + b);
    final stroke = size.shortestSide * 0.18;
    final rect = Offset.zero & size;
    final area = rect.deflate(stroke / 2);
    var start = -3.14159 / 2; // начинаем сверху

    for (var i = 0; i < values.length; i++) {
      final sweep = total == 0 ? 0.0 : values[i] / total * 2 * 3.14159;
      final paint = Paint()
        ..color = colors[i]
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke;
      canvas.drawArc(area, start, sweep, false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(DonutPainter old) => old.values != values || old.colors != colors;
}

// использование
AspectRatio(aspectRatio: 1, child: CustomPaint(painter: DonutPainter([4, 3], [Colors.blue, Colors.red])))
```

Три показателя:

| Показатель | Как считать |
|---|---|
| THIS WEEK EARNINGS | Сумма баллов за текущую неделю из статистики игрока |
| Played Games | Количество выигранных игр по категориям Circle и Image |
| Scheduled Games | Количество созданных игр за текущую неделю |

Начало недели:

```dart
final now = DateTime.now();
final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
```

## Игра Image: идея и каркас

В макете и прототипе Figma посмотрите механику (в тексте задания: «логику можно посмотреть в режиме прототипа»): картинка режется на части, части перемешаны, игрок переставляет их, пока картинка не будет собрана. Время идёт, как только игра началась.

**Одинаковая картинка у обоих игроков, но разная в каждой игре.** Значит, выбор картинки и порядок перемешивания должны зависеть от того, что **одинаково у обоих игроков**, то есть от `id` игры:

```dart
import 'dart:math';

// Список возможных картинок
const images = ['assets/img/1.jpg', 'assets/img/2.jpg', 'assets/img/3.jpg'];

// seed — число-идентификатор игры (например, id с сервера)
String pickImage(int seed) => images[Random(seed).nextInt(images.length)];

List<int> shuffleTiles(int count, int seed) {
  final order = List<int>.generate(count, (i) => i);
  order.shuffle(Random(seed));
  return order;
}
```

::: warn
Не используйте `string.hashCode` как seed, если он должен совпасть на разных устройствах: значение не гарантируется одинаковым между запусками и платформами. Берите числовой `id` игры, либо превращайте строку в число вручную (сумма кодов символов).
:::

Состояние игры в одном месте (контроллер/Cubit):

```dart
class ImageGameController extends ChangeNotifier {
  final int size;                    // сетка size × size
  late List<int> tiles;              // tiles[позиция] = номер части
  int moves = 0;
  final Stopwatch _watch = Stopwatch();

  ImageGameController({required this.size, required int seed}) {
    tiles = shuffleTiles(size * size, seed);
  }

  void start() => _watch.start();

  // Меняет местами две части и проверяет, собрана ли картинка
  void swap(int a, int b) {
    final t = tiles[a]; tiles[a] = tiles[b]; tiles[b] = t;
    moves++;
    notifyListeners();
    if (isSolved) _finish();
  }

  // Картинка собрана, если каждая часть на своём месте
  bool get isSolved {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i] != i) return false;
    }
    return true;
  }

  Duration get elapsed => _watch.elapsed;

  Future<void> _finish() async {
    _watch.stop();
    // отправить результат на сервер: время и победитель определяются сервером/сравнением
  }
}
```

Отображение частей из одной картинки:

```dart
// Показать часть картинки: Align + ClipRect + увеличенное изображение
ClipRect(
  child: Align(
    alignment: Alignment(-1 + 2 * col / (size - 1), -1 + 2 * row / (size - 1)),
    widthFactor: 1 / size,
    heightFactor: 1 / size,
    child: Image.asset(path, fit: BoxFit.cover),
  ),
)
```

Для перетаскивания используйте `Draggable` + `DragTarget` или `GestureDetector` с двумя нажатиями «выбрать-поменять». Начните с двух нажатий: надёжнее и быстрее, потом улучшайте.

Каждое движение и отправку позже придётся отправить в метрику (спринт 6), поэтому сразу делайте метод `onMove()` одним местом.

## Автозавершение и победитель

1. Как только `isSolved == true`, игра **сама** завершается: таймер стоп, экран блокируется, результат улетает на сервер («сохранение результата игры»).
2. Победитель — кто собрал быстрее. Сравнение делайте так, как описывает API: либо сервер возвращает победителя, либо вы сравниваете `time` обоих игроков.
3. Экран результата: время игрока, время соперника, победа/поражение.

Данные по играм должны попасть на сервер, иначе статистика не заполнится.

## Закрытие игры = поражение

```dart
class _GameScreenState extends State<GameScreen> with WidgetsBindingObserver {
  bool _finished = false;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Если приложение свернули или закрыли во время игры — засчитываем поражение
    if (!_finished && (state == AppLifecycleState.paused || state == AppLifecycleState.detached)) {
      _lose();
    }
  }

  Future<void> _lose() async {
    _finished = true;
    await controller.reportLose();   // запрос «сохранение результата игры»
  }
  ...
}
```

Дополнительно:

- Кнопка «назад» внутри игры — через `PopScope`: диалог «Выйти? Вы проиграете» и `_lose()` при согласии.
- Сохраните в `SharedPreferences` флаг `active_game_id` при старте игры и убирайте при завершении. При запуске приложения, если флаг остался (приложение убили), отправьте поражение.

## Кэширование медиа

«Все медиа ресурсы должны кэшироваться». Аватары, картинки игр:

```dart
CachedNetworkImage(
  imageUrl: player.photoUrl,
  fit: BoxFit.cover,
  placeholder: (_, __) => const ColoredBox(color: UiColors.border),
  errorWidget: (_, __, ___) => const Icon(Icons.person),
)
```

Проверьте: включите авиарежим, откройте экран, который уже открывали: картинки должны остаться.

## Локальное уведомление за 1 час

Если в Schedule Game стояла галка, при создании игры (и при загрузке списка, если приложение переустановили) планируйте уведомление.

```dart
final plugin = FlutterLocalNotificationsPlugin();

Future<void> initNotifications() async {
  tz.initializeTimeZones();                       // пакет timezone
  tz.setLocalLocation(tz.getLocation('Asia/Yekaterinburg')); // или flutter_timezone
  const settings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(),          // запросит разрешение на iOS
  );
  await plugin.initialize(settings);
  // Android 13+: запросить разрешение на показ
  await plugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.requestNotificationsPermission();
}

Future<void> scheduleReminder(Game game) async {
  final when = game.startAt.subtract(const Duration(hours: 1));
  if (when.isBefore(DateTime.now())) return;      // уже поздно
  await plugin.zonedSchedule(
    game.id.hashCode,                             // id уведомления
    'Скоро игра',
    'Через час: ${game.title}',
    tz.TZDateTime.from(when, tz.local),
    const NotificationDetails(
      android: AndroidNotificationDetails('games', 'Игры'),
      iOS: DarwinNotificationDetails(),
    ),
    androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
  );
}
```

::: warn
Сигнатуры `flutter_local_notifications` отличаются между версиями (например, у старых версий был обязательный параметр `uiLocalNotificationDateInterpretation`). Заранее создайте тестовый проект и проверьте с той версией, которую вам согласуют. Также нужны права в `AndroidManifest.xml`: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` (или `USE_EXACT_ALARM`) и ресиверы из README пакета.
:::

Для проверки в тесте можно временно поставить интервал в одну минуту.

## Частые ошибки

- Картинка у соперников разная: использовали `Random()` без seed.
- Игра не завершается, потому что `isSolved` проверяется только при отпускании пальца.
- Секундомер продолжает идти после победы или ухода с экрана (забыли `dispose`/`stop`).
- Результат не отправляется в сеть при сворачивании.
- `DateTime` в UTC сравнивают с локальным.
