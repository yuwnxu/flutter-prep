---
id: flutter-basics
stage: 3
title: Flutter: виджеты и состояние
lead: Всё в Flutter — виджет. Stateless и Stateful, жизненный цикл, основные контейнеры, setState.
---

## Что такое Flutter

Flutter — фреймворк Google для приложений Android, iOS и других платформ из одного кода на Dart. Интерфейс собирается из **виджетов**: кнопка, текст, отступ, строка, экран — всё виджеты. Дерево виджетов описывает, как выглядит экран **сейчас**; при изменении данных Flutter перестраивает нужную часть дерева.

## Минимальное приложение

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(body: Center(child: Text('Привет'))),
    );
  }
}
```

## StatelessWidget и StatefulWidget

| | StatelessWidget | StatefulWidget |
|---|---|---|
| Хранит изменяемое состояние | нет | да (в классе `State`) |
| Когда | Надпись, иконка, кнопка с параметрами | Поле ввода, чекбокс, таймер |
| Перерисовка | только при изменении параметров | при вызове `setState` |

```dart
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => setState(() => _count++), // setState запускает перерисовку
      child: Text('Нажато: $_count'),
    );
  }
}
```

## Жизненный цикл State (логируется в задании!)

| Метод | Когда вызывается | Что делать |
|---|---|---|
| `initState` | Один раз при создании | Создать контроллеры, подписки, запустить загрузку; **лог INFO** |
| `didChangeDependencies` | После `initState` и при изменении `InheritedWidget` | Читать `Theme.of`, `MediaQuery` |
| `build` | Каждый раз при перерисовке | Только описывать UI, без запросов |
| `didUpdateWidget` | Родитель передал новые параметры | Обновить внутреннее состояние |
| `dispose` | Виджет удалён навсегда | Отменить таймеры, закрыть контроллеры; **лог INFO** |

В задании «жизненный цикл экранов» нужно логировать на уровне INFO. Во Flutter это в первую очередь `initState` и `dispose`; для остального (`paused`, `resumed`) используйте `WidgetsBindingObserver`:

```dart
class _ScreenState extends State<Screen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    log.info('GameScreen', 'Жизненный цикл', 'initState');
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    log.info('GameScreen', 'Жизненный цикл', state.name); // resumed / inactive / paused / detached
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    log.info('GameScreen', 'Жизненный цикл', 'dispose');
    super.dispose();
  }
  ...
}
```

## Строительные блоки раскладки

| Виджет | Назначение |
|---|---|
| `Row` / `Column` | Элементы в строку / в столбец |
| `Stack` + `Positioned` | Наложение слоёв |
| `Container` | Размер, цвет, рамка, скругление, отступы |
| `Padding`, `SizedBox`, `Spacer` | Отступы и пустоты |
| `Expanded`, `Flexible` | Занять оставшееся место внутри `Row`/`Column` |
| `Align`, `Center` | Выравнивание |
| `ListView`, `GridView`, `SingleChildScrollView` | Прокрутка |
| `Wrap` | Перенос элементов на новую строку |
| `ClipRRect`, `DecoratedBox` | Скругление и оформление |

```dart
Row(
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [
    const CircleAvatar(radius: 24),
    const SizedBox(width: 12),
    Expanded( // текст не вылезет за границы и перенесётся
      child: Text('Длинное имя соперника', maxLines: 1, overflow: TextOverflow.ellipsis),
    ),
  ],
)
```

::: tip
Ошибка «RenderFlex overflowed by N pixels» — элементы не поместились. Решения: обернуть в `Expanded`/`Flexible`, дать прокрутку (`SingleChildScrollView`), использовать `Wrap`, добавить `overflow: TextOverflow.ellipsis`. В задании требуется «без горизонтального скролла» и «текст не обрезается блоком».
:::

## Ограничения (constraints)

Главное правило раскладки: **родитель передаёт ограничения вниз, ребёнок выбирает размер и отдаёт его вверх, родитель его позиционирует.** Поэтому `Column` внутри `Column` без `Expanded` вызывает ошибки высоты, а `ListView` внутри `Column` требует `Expanded` или `shrinkWrap: true`.

## Что нужно уметь

- Выбрать Stateless или Stateful.
- Перечислить методы жизненного цикла и сказать, что в каждом делать.
- Собрать экран из `Row`, `Column`, `Stack`, `Expanded`.
- Объяснить причину ошибки overflow и исправить её.

## Подробно: дерево виджетов и перерисовка

Экран в Flutter — **дерево**. Корень — `MaterialApp`, внутри `Scaffold`, внутри `Column`, внутри `Text` и так далее. Дерево не рисуется один раз: при изменении состояния Flutter **перестраивает** нужную ветку.

```
MaterialApp
 └─ Scaffold
     ├─ AppBar
     └─ Column
         ├─ Text('Счёт: 5')      ← при setState перестроится
         └─ ElevatedButton
```

Как это работает:

1. Вы вызываете `setState(() => score++)`.
2. Flutter помечает этот `State` «грязным» и вызывает `build` заново.
3. Новое дерево сравнивается со старым, обновляются только изменившиеся части.

Выводы:

- `build` вызывается **часто**; не делайте в нём запросы и тяжёлые вычисления.
- Чем ниже по дереву `setState`, тем меньше перерисовывается. Выносите изменяющийся кусок в отдельный виджет.
- Виджеты — «чертежи», они лёгкие; создавать их много не страшно.

## Подробно: const и Key

**`const`** сообщает Flutter, что виджет не меняется, поэтому его можно создать один раз и не перестраивать:

```dart
const SizedBox(height: 16);          // всегда один и тот же объект
const Text('Заголовок');
```

Если виджет зависит от переменной, `const` ставить нельзя. Линтер подскажет, где можно: `prefer_const_constructors`.

**`Key`** нужен, чтобы Flutter различал одинаковые виджеты в списках, особенно при перестановках. В игре Image плитки меняются местами, и без ключей состояние (например, анимация) может «прилипнуть» не к той плитке.

```dart
for (final tile in tiles) TileWidget(key: ValueKey(tile.id), tile: tile),
```

## Подробно: constraints на примерах

Правило: **родитель задаёт границы, ребёнок выбирает размер внутри них, родитель ставит ребёнка на место.**

| Родитель | Что передаёт ребёнку |
|---|---|
| `Scaffold.body` | Размер экрана (tight) |
| `Center` | «Можешь быть от нуля до всего экрана» (loose) |
| `Column` | По ширине — ограничение родителя, по высоте — без ограничений |
| `Row` | По высоте — ограничение родителя, по ширине — без ограничений |
| `Expanded` | Ровно оставшееся место по главной оси |
| `SizedBox(width: 100)` | Ровно 100 |

Поэтому:

- `Container(width: 100)` внутри `Center` будет 100, а внутри `Scaffold.body` без `Center` растянется на весь экран (родитель «жёсткий»).
- `ListView` внутри `Column` получает бесконечную высоту и падает, пока не обернёте в `Expanded`.

```dart
Column(children: [
  const Header(),
  Expanded(child: ListView(children: items)),   // список занимает всё оставшееся место
  const BottomButton(),
])
```

## Подробно: как выбрать способ управления состоянием

| Вопрос | Ответ → решение |
|---|---|
| Состояние нужно одному маленькому виджету (раскрыт ли блок) | `StatefulWidget` + `setState` |
| Состояние экрана (загрузка, список, ошибка) | Контроллер: `ChangeNotifier` / GetX / Bloc |
| Состояние нужно многим экранам (пользователь) | Хранить в репозитории/сервисе и отдавать через DI |

Минимальный контроллер без пакетов:

```dart
class CounterController extends ChangeNotifier {
  int value = 0;
  void inc() { value++; notifyListeners(); }
}

final controller = CounterController();

ListenableBuilder(
  listenable: controller,
  builder: (_, __) => Text('${controller.value}'),
)
```

С GetX:

```dart
class CounterController extends GetxController {
  final value = 0.obs;
  void inc() => value.value++;
}
Obx(() => Text('${controller.value}'));
```

Главное правило из задания: **контроллер лежит в Presentation и не знает о сети**; он вызывает UseCase, а тот — репозиторий.

## Практика

1. Сделайте экран-счётчик на `StatefulWidget`, затем перепишите на `ChangeNotifier`.
2. Соберите карточку игры: аватар, два текста, иконка справа; проверьте на узком экране, что нет overflow.
3. Добавьте `initState`/`dispose` с логами по формату задания.
4. Сделайте список из 20 элементов с кнопкой внизу, прибитой к низу экрана.
5. Объясните вслух, что произойдёт при нажатии на кнопку со `setState`.
