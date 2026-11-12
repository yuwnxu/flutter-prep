---
id: adaptive
stage: 3
title: Адаптивная верстка и Figma
lead: Как перенести макет в код так, чтобы он выглядел одинаково на разных экранах. Это самый дорогой по баллам навык.
---

## Что требует задание

| Требование | Как проверять у себя |
|---|---|
| Нет большого пустого пространства | Запустите на самом широком и самом высоком эмуляторе |
| Элементы не искажаются | У аватарок, превью и иконок зафиксировано соотношение сторон |
| Всё на месте и в границах | Нет горизонтального скролла, CTA-кнопки видны |
| Отступы пропорциональны макету | Либо масштабируются, либо фиксированы (если так в дизайн-системе) |
| Шрифты из макета | Не системные, размеры и межстрочные как в Figma |
| Текст не режется блоком | `maxLines` + `TextOverflow.ellipsis`, перенос строк |

## Инструменты Flutter

```dart
final size = MediaQuery.sizeOf(context);          // размер экрана
final padding = MediaQuery.paddingOf(context);    // вырезы и системные панели

LayoutBuilder(
  builder: (context, constraints) {
    final isCompact = constraints.maxWidth < 360;
    return isCompact ? const SmallLayout() : const NormalLayout();
  },
)
```

| Инструмент | Для чего |
|---|---|
| `SafeArea` | Отступ от выреза камеры и жестовой панели |
| `Expanded` / `Flexible` | Растянуть элемент на оставшееся место |
| `AspectRatio` | Фиксированное соотношение сторон (аватарка, превью) |
| `FittedBox` | Вписать содержимое в блок |
| `ConstrainedBox(constraints: BoxConstraints(maxWidth: 480))` | Ограничить ширину на планшетах |
| `Spacer` | Гибкая пустота между элементами |
| `FractionallySizedBox` | Размер в долях от родителя |
| `Wrap` | Перенос в несколько строк |

## Масштабирование от макета (подход «vize»)

В вашем коде размеры считаются от размера макета: `Vize.init(context, figmaWidth: 390, figmaHeight: 884)`, дальше `16.fw`, `24.fh`, `8.r`. Идея простая: коэффициент равен `ширина экрана / ширина макета`.

```dart
class Scale {
  static late double _w, _h;
  static void init(BuildContext c, {double figmaW = 390, double figmaH = 884}) {
    final s = MediaQuery.sizeOf(c);
    _w = s.width / figmaW;
    _h = s.height / figmaH;
  }
  static double w(double v) => v * _w;   // ширины и горизонтальные отступы
  static double h(double v) => v * _h;   // высоты и вертикальные отступы
}
```

::: warn
Размеры вида `width: 350.fw` для блоков, которые должны тянуться, — риск. На планшете блок останется «колонкой» посередине. Для основного контента чаще лучше `double.infinity` + горизонтальные отступы, а числа из Figma использовать для отступов, радиусов, иконок и высот. Фиксируйте только то, что должно быть фиксировано (аватар 60×60 с `AspectRatio`).
:::

## Перенос макета в код

1. Откройте макет, включите **Dev Mode** (режим разработчика) — там видны размеры, отступы, цвета и параметры шрифта.
2. Определите **сетку** экрана: боковые поля (обычно 20 или 24), шаг (8 px).
3. Идите сверху вниз: каркас (`Scaffold`, `AppBar`, `BottomBar`) → секции → детали.
4. Повторяющееся выносите в UIKit-компоненты.
5. Проверьте на трёх размерах: маленький телефон (≈360×640), обычный (≈390×844), большой (≈430×932 и планшет).

## Состояния компонентов

Дизайн-система описывает не только «покой». Для каждого компонента проверьте:

| Компонент | Состояния |
|---|---|
| Кнопка | default, pressed, disabled, loading; primary / secondary / destructive |
| Поле ввода | default, focused, filled, error, disabled; password, search |
| Чекбокс | unchecked, checked, disabled (checked и unchecked) |
| Селект | закрыт, открыт (BottomSheet), выбран, ошибка |
| Карточка | обычная, выбранная, неактивная |
| Нижнее меню | активный пункт для каждого из пунктов |
| Таймер | идёт, остановлен, время вышло |

## Проверка перед сдачей

- Запущено минимум на двух эмуляторах разных размеров.
- Включён увеличенный размер шрифта в системе: текст не ломает раскладку.
- Повёрнут экран (если макет допускает) либо ориентация зафиксирована.
- Клавиатура не перекрывает поле (`resizeToAvoidBottomInset`, прокрутка).

## Что нужно уметь

- Объяснить разницу между фиксированным и адаптивным размером.
- Использовать `LayoutBuilder`, `MediaQuery`, `AspectRatio`, `Expanded`.
- Снять размеры из Figma и перевести стили текста в `TextStyle`.

## Подробно: из Figma в код — таблица соответствия

| В Figma | Во Flutter |
|---|---|
| Frame (кадр) | `Container` / `SizedBox` / `Scaffold` |
| Auto layout, вертикальный | `Column` |
| Auto layout, горизонтальный | `Row` |
| Gap (расстояние между элементами) | `Column(spacing: n)` или `SizedBox(height: n)` |
| Padding | `Padding(padding: EdgeInsets...)` |
| Fill container (растянуть) | `Expanded` или `double.infinity` |
| Hug contents (по содержимому) | `mainAxisSize: MainAxisSize.min`, без фиксированного размера |
| Fixed width/height | `SizedBox(width:, height:)` |
| Corner radius | `BorderRadius.circular(r)` |
| Stroke | `Border.all(color:, width:)` |
| Drop shadow | `BoxShadow(color:, blurRadius:, offset:)` |
| Text style | `TextStyle(fontSize, fontWeight, height = lineHeight/fontSize, letterSpacing)` |
| Constraints (pin left/right) | `Positioned`, `Align`, `Stack` |
| Component variants | Параметры или enum в виджете |

Разница между Fixed, Hug и Fill — основа адаптивности: **Fixed** не меняется на разных экранах, **Hug** подстраивается под содержимое, **Fill** растягивается. Смотрите, какой режим выбрал дизайнер, и повторяйте.

## Подробно: разбор карточки игры

Допустим, в макете карточка шириной 350 (экран 390), внутри слева аватар 48×48, в центре название и время, справа статус.

Как собрать:

```dart
Container(
  width: double.infinity,                 // Fill: на любом экране занимает всю ширину
  padding: const EdgeInsets.all(16),      // фиксированные отступы из макета
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: border),
  ),
  child: Row(
    children: [
      SizedBox(
        width: 48,
        child: AspectRatio(aspectRatio: 1, child: ClipOval(child: avatar)), // не искажается
      ),
      const SizedBox(width: 12),
      Expanded(                            // середина тянется
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: subheader),
            Text(time, style: bodySmall),
          ],
        ),
      ),
      const SizedBox(width: 12),
      StatusChip(status: status),          // справа фиксированный по содержимому
    ],
  ),
)
```

Порядок рассуждения: что должно тянуться? (середина, Expanded) Что фиксировано? (аватар, статус) Что делать с длинным текстом? (многоточие). Карточка всегда на всю ширину, значит нет «пустоты» на широких экранах.

## Подробно: как проверять адаптивность

1. Создайте **минимум три эмулятора** разного размера (маленький 360×640, обычный 390×844, большой/планшет).
2. Пройдите все экраны на самом маленьком: ищите жёлто-чёрные полосы overflow.
3. Пройдите на самом большом: ищите узкие «колонки» с пустыми полями по бокам.
4. Включите **большой шрифт** в настройках Android: текст не должен ломать вёрстку.
5. Откройте клавиатуру в полях ввода: кнопки и поля не должны перекрываться; форма должна прокручиваться.
6. Сравните скриншот со скриншотом макета: отступы, радиусы, цвета, шрифты.

В Android Studio можно менять размер окна эмулятора и плотность. Для быстрой проверки используйте `MediaQuery.sizeOf(context)` в логе: `AppLog.debug('Screen', 'Размер', '${size.width}x${size.height}')`.

## Практика

1. Соберите по макету любую карточку и проверьте на трёх эмуляторах.
2. Сделайте вариант, где при узком экране карточки идут в одну колонку, а при широком в две (`LayoutBuilder`).
3. Составьте для своего UIKit таблицу «компонент → какие размеры фиксированы, какие тянутся».
4. Проверьте экран входа с клавиатурой и большим шрифтом.

## Учимся: навык 1. Фиксированный и адаптивный размер

**Вопрос к каждому элементу макета:** «Что должно происходить с этим при смене ширины экрана?»

| Ответ | Режим Figma | Во Flutter | Примеры |
|---|---|---|---|
| Остаётся таким же | Fixed | `SizedBox(width: ...)` | Иконка 24×24, аватар 60×60, высота кнопки 48 |
| Растягивается | Fill container | `Expanded` / `double.infinity` | Кнопка на всю ширину, поле ввода, карточка |
| Подстраивается под содержимое | Hug contents | `mainAxisSize: min`, без размера | Бейдж со статусом, чип |
| Должен сохранять пропорции | Fixed + соотношение | `AspectRatio` | Аватарка, превью картинки |

**Типичная ошибка.** Поставить всем блокам размеры из макета (`width: 350`). На широком экране блок останется узкой «колонкой», на узком выйдет за границы. Для основных блоков используйте `double.infinity` и боковые отступы 16–24.

## Учимся: навык 2. LayoutBuilder, MediaQuery, AspectRatio, Expanded

| Инструмент | Какой вопрос решает | Пример |
|---|---|---|
| `MediaQuery.sizeOf(context)` | Какой размер у всего экрана? | `final w = MediaQuery.sizeOf(context).width;` |
| `LayoutBuilder` | Сколько места дали **этому** блоку? | `builder: (c, box) => box.maxWidth < 360 ? ... : ...` |
| `AspectRatio` | Как не исказить картинку? | `AspectRatio(aspectRatio: 1, child: ...)` |
| `Expanded` / `Flexible` | Как занять остаток места? | В `Row`/`Column` |
| `ConstrainedBox` | Как не растянуться слишком сильно? | `maxWidth: 480` |

**Пример: список карточек, который на широком экране становится сеткой.**

```dart
LayoutBuilder(
  builder: (context, box) {
    final columns = box.maxWidth >= 600 ? 2 : 1;
    return GridView.count(
      crossAxisCount: columns,
      childAspectRatio: 3,
      children: games.map((g) => GameCard(g)).toList(),
    );
  },
)
```

## Учимся: навык 3. Из Figma в TextStyle

**Шаги:**
1. Откройте макет в Figma, включите **Dev Mode**.
2. Выделите текст. Справа найдите: **Font family, Weight, Size, Line height, Letter spacing**.
3. Переведите в Flutter:

| Figma | Flutter |
|---|---|
| Font: Manrope | `fontFamily: 'Manrope'` |
| Weight: Bold / 700 | `fontWeight: FontWeight.w700` |
| Size: 24 | `fontSize: 24` |
| Line height: 32 | `height: 32 / 24` |
| Letter spacing: −2% | `letterSpacing: -0.02 * 24` (= −0.48) |
| Color | `color: Color(0xFF191B23)` |

**Процент в Figma.** Если letter spacing задан в %, умножьте проценты на размер шрифта: −2% от 24 px = −0.48.

4. Дайте стилю **имя из макета** (`screenHeader`, `bodyMedium`).
5. Положите в одно место (`typography.dart`) и используйте везде.
6. Сверьте на экране: наложите скриншот на макет.
