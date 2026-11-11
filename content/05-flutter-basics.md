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
