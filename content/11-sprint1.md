---
id: sprint1
stage: 6
title: Спринт 1: UIKit и StoryBook
lead: 1 ч 30 мин. Отдельная библиотека компонентов и приложение, в котором видны все состояния. Максимум 10,96 балла.
---

## Что нужно сделать

| Часть | Баллы | Что проверяют |
|---|---:|---|
| Цвета как на макете | 0,24 | −0,02 за каждый отсутствующий цвет |
| Типографика (тема) | 0,32 | −0,02 за каждый отсутствующий стиль |
| Поле ввода и все состояния | 1,20 | −0,15 за отсутствующий элемент; нет в StoryBook — половина |
| Select + BottomSheet | 0,90 + 0,30 | Тап по селекту открывает BottomSheet |
| Кнопка со всеми состояниями | 1,50 | −0,1 за каждый отсутствующий вариант |
| Pagination | 0,30 | Все состояния |
| Карточка со всеми состояниями | 1,50 | −0,3 за отсутствующий вариант |
| Bottom Bar | 0,80 | |
| Timer | 0,60 | |
| Checkbox | 0,80 | |
| Все компоненты адаптивны | 1,20 | −0,15 за каждый неадаптивный |
| Архитектура: DRY, отдельная библиотека | 0,50 + 0,50 | Половина, если нет комментариев и логов |
| Git: ветка, проект в ветке, merge | 0,30 | |

::: warn
Три общих правила в критериях: **нет библиотеки — ничего не проверяется**; **нет компонента в StoryBook — половина баллов**; **нет комментариев и логов — половина баллов**.
:::

## Порядок работы (план на 90 минут)

| Минуты | Действие |
|---|---|
| 0–5 | Создать репозиторий и ветку `sprint-1`, создать Flutter-пакет, переместить карточки в «В работе» (не более 2) |
| 5–20 | Цвета, типографика, шрифты, логгер, `uikit.dart` с экспортами |
| 20–55 | Поле, кнопка, чекбокс, карточка, bottom bar — самые дорогие |
| 55–70 | Select + BottomSheet, Pagination, Timer |
| 70–85 | StoryBook: все компоненты и все состояния |
| 85–90 | Тег `v1.0.0`, push, PR, merge, перенос карточек с коммитами |

## Создание библиотеки

```bash
flutter create --template=package uikit
cd uikit && git init
```

Структура с настоящей инкапсуляцией:

```
uikit/
  lib/
    uikit.dart                 # единственный публичный файл, только export
    src/
      theme/
        colors.dart
        typography.dart
      components/
        ui_button.dart
        ui_text_field.dart
        ui_select.dart
        ...
      core/
        logger.dart
        scale.dart
  assets/ icons...
  fonts/ Manrope-*.ttf
  pubspec.yaml
  CHANGELOG.md  README.md
```

```dart
// lib/uikit.dart
library;

export 'src/theme/colors.dart';
export 'src/theme/typography.dart';
export 'src/components/ui_button.dart';
export 'src/components/ui_text_field.dart';
export 'src/components/ui_select.dart';
export 'src/components/ui_checkbox.dart';
// ... всё, что должно быть доступно приложению
```

Приложение подключает `import 'package:uikit/uikit.dart';` и больше ничего. Это и есть **инкапсуляция**: «внутренняя реализация скрыта, наружу доступен только чётко определённый API».

## Шрифты и ресурсы внутри пакета

```yaml
# pubspec.yaml библиотеки
flutter:
  assets:
    - assets/
  fonts:
    - family: Manrope
      fonts:
        - asset: fonts/Manrope-Regular.ttf
          weight: 400
        - asset: fonts/Manrope-SemiBold.ttf
          weight: 600
        - asset: fonts/Manrope-Bold.ttf
          weight: 700
        - asset: fonts/Manrope-ExtraBold.ttf
          weight: 800
```

В стиле указывайте пакет, тогда приложению не нужно дублировать шрифты в своём `pubspec.yaml`:

```dart
const TextStyle screenHeader = TextStyle(
  fontFamily: 'Manrope',
  package: 'uikit',
  fontWeight: FontWeight.w700,
  fontSize: 24,
  height: 32 / 24,
  letterSpacing: -0.48,
);
```

Иконки из пакета: `Image.asset('assets/eye.png', package: 'uikit')`.

## Цвета и типографика

Единый источник истины (DRY): цвета и стили определены один раз.

```dart
import 'package:flutter/painting.dart';

abstract final class UiColors {
  static const primary = Color(0xFF00C853);
  static const onPrimary = Color(0xFFFFFFFF);
  static const error = Color(0xFFBA1A1A);
  static const border = Color(0xFFC3C6D7);
  static const surface = Color(0xFFFAF8FF);
  static const text = Color(0xFF191B23);
}
```

Проверьте: в StoryBook должна быть страница «Цвета» (квадраты с названиями **всех** цветов макета) и «Типографика» (каждый стиль с подписью размера и начертания).

## Кнопка: варианты и состояния

Один класс, варианты через enum (O из SOLID и фабрики из DRY):

```dart
// Универсальная кнопка библиотеки. Отвечает только за отображение и нажатие.
// Дата создания: 11-11-2026
// Автор создания: 7
enum UiButtonKind { primary, secondary, destructive }

class UiButton extends StatelessWidget {
  final String text;
  final UiButtonKind kind;
  final bool isLoading;
  final VoidCallback? onPressed; // null = кнопка отключена

  const UiButton({
    super.key,
    required this.text,
    this.kind = UiButtonKind.primary,
    this.isLoading = false,
    this.onPressed,
  });

  const UiButton.secondary({super.key, required this.text, this.isLoading = false, this.onPressed})
      : kind = UiButtonKind.secondary;

  bool get _enabled => onPressed != null && !isLoading;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (kind) {
      UiButtonKind.primary => (UiColors.primary, UiColors.onPrimary, UiColors.primary),
      UiButtonKind.secondary => (UiColors.onPrimary, UiColors.primary, UiColors.primary),
      UiButtonKind.destructive => (UiColors.error, UiColors.onPrimary, UiColors.error),
    };
    return Opacity(
      opacity: _enabled ? 1 : 0.4, // состояние disabled
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(color: border, width: 2),
        ),
        child: InkWell( // состояние pressed: ripple-эффект
          borderRadius: BorderRadius.circular(8),
          onTap: _enabled
              ? () {
                  UiLog.info('UiButton', 'Нажатие', text);
                  onPressed!();
                }
              : null,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: double.infinity),
            child: Center(
              child: isLoading
                  ? SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: fg))
                  : Text(text, style: bodyMedium.copyWith(color: fg)),
            ),
          ),
        ),
      ),
    );
  }
}
```

Кнопка тянется на ширину родителя (`minWidth: double.infinity`), поэтому на разных экранах не «плавает». Нужна половина ширины — оберните в `Expanded` или `SizedBox`.

## Поле ввода

Варианты: обычное, в фокусе, с ошибкой, отключённое, пароль (с глазом), поиск (с иконкой).

```dart
class UiTextField extends StatefulWidget {
  final String label, hint;
  final String? errorText;
  final bool enabled;
  final UiTextFieldType type;           // normal | password | search
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  const UiTextField({super.key, required this.label, required this.hint,
    this.errorText, this.enabled = true, this.type = UiTextFieldType.normal,
    this.controller, this.onChanged});
  @override
  State<UiTextField> createState() => _UiTextFieldState();
}

class _UiTextFieldState extends State<UiTextField> {
  final _focus = FocusNode();
  bool _hidden = true;

  @override
  void initState() { super.initState(); _focus.addListener(() => setState(() {})); }
  @override
  void dispose() { _focus.dispose(); super.dispose(); }

  // Один метод создаёт рамку для любого состояния (DRY: вместо пяти копий)
  OutlineInputBorder _border(Color c) => OutlineInputBorder(
        borderSide: BorderSide(color: c, width: 1),
        borderRadius: BorderRadius.circular(8),
      );

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null;
    final color = hasError ? UiColors.error : _focus.hasFocus ? UiColors.primary : UiColors.border;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: fieldLabel.copyWith(color: color)),
        const SizedBox(height: 4),
        TextField(
          focusNode: _focus,
          enabled: widget.enabled,
          controller: widget.controller,
          onChanged: widget.onChanged,
          obscureText: widget.type == UiTextFieldType.password && _hidden,
          decoration: InputDecoration(
            filled: true, fillColor: UiColors.surface,
            hintText: widget.hint,
            errorText: widget.errorText,
            enabledBorder: _border(color), focusedBorder: _border(color),
            disabledBorder: _border(UiColors.border),
            errorBorder: _border(UiColors.error), focusedErrorBorder: _border(UiColors.error),
            suffixIcon: widget.type == UiTextFieldType.password
                ? IconButton(
                    icon: Icon(_hidden ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _hidden = !_hidden))
                : null,
          ),
        ),
      ],
    );
  }
}
```

В StoryBook показывайте **настоящее** состояние фокуса (поле с `autofocus` или принудительный `FocusNode.requestFocus()`), а не раскрашенную имитацию.

## Select и BottomSheet

```dart
class UiSelect<T> extends StatelessWidget {
  final String label, hint;
  final T? value;
  final List<T> options;
  final String Function(T) titleOf;
  final ValueChanged<T> onChanged;
  const UiSelect({super.key, required this.label, required this.hint, required this.value,
    required this.options, required this.titleOf, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () async {
        final picked = await showModalBottomSheet<T>(
          context: context,
          builder: (_) => UiBottomSheet<T>(options: options, titleOf: titleOf, selected: value),
        );
        if (picked != null) onChanged(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, suffixIcon: const Icon(Icons.keyboard_arrow_down)),
        child: Text(value == null ? hint : titleOf(value as T)),
      ),
    );
  }
}
```

`UiBottomSheet` — отдельный публичный компонент (в таблице он отдельная строка 0,3 балла): заголовок, список вариантов, отметка выбранного.

## Pagination, Timer, Card, Bottom Bar

**Pagination** — точки приветственных экранов. Активная шире остальных:

```dart
class UiPagination extends StatelessWidget {
  final int count, current;
  const UiPagination({super.key, required this.count, required this.current});
  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(count, (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == current ? 24 : 8, height: 8,
              decoration: BoxDecoration(
                color: i == current ? UiColors.primary : UiColors.border,
                borderRadius: BorderRadius.circular(4)),
            )),
      );
}
```

**Timer** — компонент *отображает* время, а считает его тот, кто его использует (SRP). Принимает `Duration` и форматирует `мм:сс`:

```dart
String formatDuration(Duration d) {
  final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  return '$m:$s';
}
```

**Card** — состояния: обычная, выбранная, неактивная; контент передаётся параметрами (`title`, `subtitle`, `leading`, `trailing`, `onTap`).

**Bottom Bar** — список данных, а не три копии кода; центральная кнопка выделена (по ней открывается Schedule Game):

```dart
class UiBottomBarItem {
  final String label;
  final String iconAsset;
  const UiBottomBarItem(this.label, this.iconAsset);
}
// в виджете: items.asMap().entries.map((e) => _Tab(...)).toList()
```

**Checkbox** — состояния: выкл, вкл, отключён (с отметкой и без).

## StoryBook

Приложение подключает библиотеку из Git по тегу и содержит **одну страницу на компонент** (или один длинный экран с заголовками), где видны **все** состояния.

```yaml
dependencies:
  uikit:
    git:
      url: https://github.com/<логин>/uikit.git
      ref: v1.0.0
```

```dart
import 'package:uikit/uikit.dart';   // только один импорт

class ButtonsPage extends StatelessWidget {
  const ButtonsPage({super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(spacing: 16, children: [
          UiButton(text: 'Primary', onPressed: () {}),
          const UiButton(text: 'Primary disabled'),
          UiButton.secondary(text: 'Secondary', onPressed: () {}),
          UiButton(text: 'Destructive', kind: UiButtonKind.destructive, onPressed: () {}),
          UiButton(text: 'Loading', isLoading: true, onPressed: () {}),
        ]),
      );
}
```

## Разбор вашей симуляции (6,39 из 10,51)

Я прочитал оба репозитория. Это **вероятные** причины потерь по коду; точные баллы по пунктам видите только вы по протоколу.

| # | Что вижу в коде | Вероятный эффект | Что делать |
|---|---|---|---|
| 1 | `lib/uikit.dart` экспортирует только цвета, типографику и логи. Компоненты **не экспортируются**; StoryBook импортирует `package:uikit/components/custom_button.dart` напрямую | Нарушена инкапсуляция («наружу — чётко определённый API») | Папка `src/`, все публичные классы в `uikit.dart`, в приложении один импорт |
| 2 | Иконки подключены как `Image.asset('assets/eye.png')` без `package: 'uikit'`. В `storybook/assets` лежит только `ava.jpg` | Иконки не найдутся (ошибка ассета), компоненты ломаются | Всегда `package: 'uikit'` |
| 3 | В `pubspec.yaml` вес `800` указывает на `Manrope-ExtraLight.ttf` (файл `ExtraBold` лежит рядом, но не подключён) | Неверное начертание, минус за типографику | Исправить на `ExtraBold` |
| 4 | Даты в шапках `15.10.2026` | Формат по заданию `ДД-ММ-ГГГГ` | `15-10-2026` |
| 5 | Размеры вида `width: 350.fw`, `SizedBox(height: 109.fh)` в самих компонентах и в StoryBook | Критерий «Все компоненты адаптивны» (1,2 балла) | Ширина от родителя; числа Figma — для отступов и радиусов |
| 6 | Кнопка получает `fillColor`, `borderColor`, `textColor` снаружи; в StoryBook цвета перечислены вручную в каждой кнопке | DRY / OCP, «кнопка со всеми состояниями» не инкапсулирована | Enum вариантов (`primary / secondary / destructive`) |
| 7 | В `CustomTextField` пять одинаковых `OutlineInputBorder`; в `CustomBottomBar` три копии пункта | DRY (0,5 балла) | Метод `_border(color)`, список пунктов |
| 8 | Состояние поля («focused», «error») передаётся параметром, а не берётся из фокуса | «Все состояния» могут считаться имитацией | `FocusNode` и `errorText` |
| 9 | Нет Select/BottomSheet, Pagination, карточки, Timer; в зависимостях есть `modal_bottom_sheet`, но не используется | В реальном КЗ это около 4 баллов (0,9+0,3+0,3+1,5+0,6) | Тренировать эти компоненты |
| 10 | Один коммит в каждом репозитории, одна ветка `main`; тегов нет | Критерии Г (ветка спринта, merge) и «независимое версионирование» | Ветка `sprint-1`, PR, тег `v1.0.0` |
| 11 | `README.md` и `CHANGELOG.md` — шаблонные `TODO` | Мелкие потери по документации | Пара строк о компонентах и версии |
| 12 | Лог в каждом `initState` и `dispose` для кнопки: в UIKit это допустимо, но `Logging()` создаётся заново каждый раз; ошибка `error()` не используется нигде | Минор | Один синглтон, лог ERROR в `catch` |

::: tip
Если в вашей симуляции был другой набор компонентов (HR Design System: appbar, avatar, textarea, progress bar), это нормально. Важно, что в реальном КЗ набор другой: Select, BottomSheet, Pagination, Card, Timer, Bottom Bar, Checkbox, Input, Button.
:::

## Чек-лист перед сдачей спринта 1

- [ ] Репозиторий `uikit` отдельный, ветка `sprint-1`, смёржена в `main`, тег `v1.0.0`.
- [ ] `lib/uikit.dart` экспортирует все компоненты, `src/` приватен.
- [ ] Ресурсы с `package: 'uikit'`, шрифты подключены правильными файлами.
- [ ] Цвета и типографика: **все** из макета, с именами.
- [ ] В StoryBook: каждый компонент во всех состояниях.
- [ ] На узком (360 dp) и широком (430 dp) экране нет переполнений.
- [ ] Шапка у каждого класса, описания публичных методов, логи с форматом `[Тег]: Событие — Детали`.
- [ ] Карточки перенесены в «Готово к тестированию» с хэшами коммитов.
