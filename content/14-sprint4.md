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

## Максимальный балл: критерий за критерием

| Критерий (макс.) | Что сделать точно | Проверка |
|---|---|---|
| Discover Combats (1,2 + 0,05) | Список созданных и прошедших игр, карточки по макету, тап по предстоящей → Combat Information | Список пустой, с данными, с ошибкой |
| Combat Information (0,9 + 0,1) | Детали игры; если соперника нет, кнопка «войти в игру» | Игра без соперника |
| Player Information (1,2) | Открывается из «Most Popular Players», данные игрока | Переход с Landing |
| Statistics (0,8) | Экран по макету, открывается из меню и Landing, данные текущего пользователя | |
| THIS WEEK EARNINGS (0,5) | Сумма очков за неделю | Сверить с данными сервера |
| Played Games (0,5) | Число выигранных, синий — Circle, красный — Image | Диаграмма отражает данные |
| Scheduled Games (0,5) | Созданные за неделю | |
| Игра Image (2,0) + одинаковая картинка (0,3) | Пазл по прототипу; seed из id игры | У двух игроков картинка совпадает |
| Автозавершение (2,0) | Сразу при сборке: таймер стоп, отправка результата | Не нужно жать «готово» |
| Победитель, результаты на сервер (2,0) | Быстрее — победил; результат ушёл на сервер | В статистике появились данные |
| Сеть: пять экранов (по 1,2) | Через абстракцию, ошибка на 5 секунд | Отключить интернет |
| Папки и слои (0,3 + 1,0×3) | Новые файлы в нужных слоях | grep-проверка |
| SOLID, DRY (по 1,0) | Нет дублей между экранами и играми | |
| Хранение (1,2) | Последний экран, закрытие игры = поражение, кэш медиа | Свернуть игру |
| Уведомление за час (1,0, модуль Д) | Только если стояла галка | Проверка с интервалом в минуту |

## Подробно: порядок работы в спринте 4 по минутам

Спринт 4 самый дорогой (25,55 балла), поэтому тайм-менеджмент критичен.

| Минуты | Что | Результат |
|---|---|---|
| 0–3 | Ветка, обновить пакеты, взять 2 карточки | |
| 3–15 | Domain/Data для игр: UseCase получения списка и деталей | Данные доступны |
| 15–27 | Discover Combats + Combat Information | Два экрана работают |
| 27–35 | Player Information | |
| 35–42 | Statistics (кольцевая диаграмма + 3 показателя) | |
| 42–55 | Игра Image: плитки, перемешивание, таймер, победа | Игра завершается |
| 55–58 | Отправка результата, закрытие = поражение | |
| 58–60 | Коммит каждой карточки, PR | |

Если не успеваете, **пожертвуйте красотой, а не логикой**: игра, которая завершается и отправляет результат, ценнее красивой, которая не завершается. Уведомления можно сделать на спринте 5, если время остаётся.

## Подробно: экран с загрузкой, пустотой и ошибкой

Каждый экран с данными должен корректно показывать **четыре состояния**:

| Состояние | Что показать |
|---|---|
| Загрузка | Индикатор по центру |
| Данные | Контент |
| Пусто | Сообщение «Игр пока нет» и (если нужно) кнопка создать |
| Ошибка | SnackBar на 5 секунд + возможность повторить |

Эксперт проверяет именно ошибку: отключит интернет и откроет экран. Если приложение упало или показывает белый экран, баллы за сеть теряются.

```dart
Widget build(BuildContext context) => switch (controller.state) {
  Loading() => const Center(child: CircularProgressIndicator()),
  Loaded(:final data) when data.isEmpty => const EmptyView('Игр пока нет'),
  Loaded(:final data) => GamesList(games: data),
  Failed(:final message) => RetryView(message: message, onRetry: controller.load),
};
```

## Подробно: статистика — откуда берутся числа

Статистика строится по **данным игрока** и по **сохранённым результатам игр** (запросы «Статистика игрока» и «Сохранение результата игры»).

1. Игрок завершает игру → результат отправляется на сервер (категория, время, победа или поражение, очки).
2. Экран Statistics запрашивает статистику игрока.
3. Приложение показывает: сумму очков за неделю, число побед по категориям, число созданных игр.

Следовательно, **если результаты игр не сохраняются на сервере, статистика останется пустой**, и потеряются баллы сразу в нескольких местах. Проверьте порядок: сыграйте игру → откройте Statistics → цифры должны измениться.

Если API возвращает сырые данные, а не готовые суммы, считайте их в UseCase (`GetWeeklyStats`), а не в виджете: это бизнес-логика.

## Подробно: как проверить игру Image

Чек-лист тестирования на устройстве:

- [ ] Плитки перемешаны, но пазл решаем.
- [ ] Каждое нажатие/перетаскивание увеличивает счётчик ходов.
- [ ] Таймер идёт с первой секунды и останавливается при победе.
- [ ] После сборки игра **сама** завершается и открывает экран результата.
- [ ] Результат ушёл на сервер (проверить в статистике).
- [ ] У второго игрока та же картинка и тот же порядок.
- [ ] Новая игра — другая картинка/порядок.
- [ ] Сворачивание приложения в игре = поражение.
- [ ] Нет утечки таймера после выхода с экрана.

Про «решаем»: при случайной перестановке пазла-перетаскивания (swap) любая перестановка решаема. Для пазла «пятнашки» (с пустой клеткой) половина перестановок нерешаема, так что проверяйте по прототипу, какая механика у вас.

## Подробно: уведомления без ошибок

Самые частые проблемы с локальными уведомлениями:

1. Не запрошено разрешение на Android 13+ → уведомление не появляется.
2. Не настроен часовой пояс (`timezone`) → приходит в другое время.
3. Время в прошлом → ничего не планируется (нужна проверка).
4. Не прописаны права и ресиверы в манифесте.
5. Галка «уведомлять» не сохранена вместе с игрой.

Проверяйте функцию отдельно: временно запланируйте на «через 1 минуту», убедитесь, что приходит, затем верните «за 1 час». В коде оставьте константу `reminderBefore = Duration(hours: 1)` в одном месте.

## Репетиция спринта 4

Сыграйте полную цепочку на двух устройствах/эмуляторах: создать игру на одном → открыть на втором → войти → собрать пазл → посмотреть статистику у обоих. Все сбои запишите в заметки симуляции.
