---
id: sprint5
stage: 6
title: Спринт 5: игра Circle
lead: 1 ч. Вторая игра, общее завершение и победитель. 11,65 балла.
---

## Что нужно сделать

| Задача | Баллы |
|---|---:|
| Игра **Circle**: собрать круги от большего к меньшему | 2,00 |
| Автозавершение после сборки | 2,00 |
| Победитель — кто быстрее; результаты на сервер для графиков | 2,00 |
| Сеть: экран Game Circle через абстракцию | 1,20 |
| Архитектура: SOLID, DRY, слои | 3,20 |
| Хранение: последний экран, закрыл игру = проиграл (0,35) | 1,25 |

В этом спринте самое важное — **повторно использовать** то, что сделали для Image: общий контроллер игры, таймер, отправку результата, проверку победителя. Если логика скопирована, вы теряете на DRY.

## Общая основа игр

Выделите абстракцию, а две игры сделайте её реализациями (O и L из SOLID):

```dart
// domain/entities/game_category.dart
enum GameCategory { image, circle }

// Общее поведение любой игры-пазла.
abstract class PuzzleGame extends ChangeNotifier {
  final Stopwatch _watch = Stopwatch();
  bool finished = false;

  bool get isSolved;                 // каждая игра определяет сама
  void onUserMove();                 // каждая игра определяет сама

  Duration get elapsed => _watch.elapsed;

  void start() => _watch.start();

  // Общий шаг: игрок сделал ход, проверяем, не собран ли пазл
  void afterMove() {
    notifyListeners();
    if (!finished && isSolved) {
      finished = true;
      _watch.stop();
      onFinished(); // отправка результата, переход на экран результата
    }
  }

  void onFinished();
}
```

`ImageGameController` и `CircleGameController` наследуют `PuzzleGame` и реализуют только `isSolved` и ходы. Экран результата, отправка в метрику, обработка выхода — общие.

## Логика Circle

Цель: расположить круги в порядке от большего к меньшему. Посмотрите в прототипе, как это выглядит: вложенные круги, которые нужно перетащить на места, или набор кругов, который ставят по порядку в стопку. Ниже — универсальная модель «упорядочить по размеру».

```dart
class CircleItem {
  final int id;
  final double radius;
  const CircleItem(this.id, this.radius);
}

class CircleGameController extends PuzzleGame {
  late List<CircleItem> items;       // текущее расположение

  CircleGameController({required int seed, required List<CircleItem> source}) {
    items = [...source]..shuffle(Random(seed));   // одинаково у обоих игроков
  }

  // Собрано, если радиусы идут по убыванию
  @override
  bool get isSolved {
    for (var i = 0; i < items.length - 1; i++) {
      if (items[i].radius < items[i + 1].radius) return false;
    }
    return true;
  }

  @override
  void onUserMove() => afterMove();

  // Перемещение круга на новое место
  void move(int from, int to) {
    final item = items.removeAt(from);
    items.insert(to, item);
    onUserMove();
  }

  @override
  void onFinished() {/* отправка результата */}
}
```

Рисование кругов — `Container` с `BoxShape.circle` или `CustomPaint`. Для перетаскивания — `ReorderableListView` (если макет линейный) либо `Draggable` + `DragTarget`.

```dart
ReorderableListView(
  onReorder: (oldIndex, newIndex) {
    if (newIndex > oldIndex) newIndex -= 1;   // особенность ReorderableListView
    controller.move(oldIndex, newIndex);
  },
  children: [
    for (final c in controller.items)
      CircleWidget(key: ValueKey(c.id), radius: c.radius),
  ],
)
```

## Завершение и победитель

Алгоритм одинаковый для обеих игр:

1. `isSolved == true` → таймер остановлен → экран заблокирован.
2. Запрос «сохранение результата» со временем и категорией.
3. Определение победителя (кто быстрее) по правилам API.
4. Экран результата и возврат на Landing.

Данные попадают в статистику: «Played Games» делится на **Circle (синий)** и **Image (красный)**, поэтому категорию нужно отправлять корректно.

## Закрытие игры = поражение

То же, что в спринте 4 (`WidgetsBindingObserver`, `PopScope`, флаг `active_game_id`). Вынесите это в общий миксин для игровых экранов, а не копируйте:

```dart
mixin GameLifecycleMixin<T extends StatefulWidget> on State<T> implements WidgetsBindingObserver {
  // ... общий код: подписка на lifecycle и вызов onGameAbandoned()
}
```

Если мешает `implements WidgetsBindingObserver`, используйте обычный базовый `State`-класс.

## Проверка перед сдачей

- Играйте две игры подряд, статистика растёт, круги не дублируются.
- Выйдите из игры: засчитано поражение.
- Перезапустите приложение посреди игры: вернулись на экран, где были, и не потеряли данные (либо засчитано поражение, если так сказано в карточке).
- Отключите интернет: ошибка на 5 секунд, приложение живо.
- Нет дублирования между `ImageGame` и `CircleGame`.

## Если не успеваете

1. Сначала сделайте игру без анимации и красоты.
2. Затем экран результата и отправка.
3. Потом перетаскивание и стили.
