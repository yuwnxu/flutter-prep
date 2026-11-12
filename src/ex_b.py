from ex_lib import *

# ================= Dart: асинхронность и JSON =================
P = "dart-async"
skills(P, ["Написать `async`-функцию и обработать ошибку `try/catch`.", "Запустить и корректно остановить `Timer.periodic`.", "Разобрать JSON в модель и вернуть обратно.", "Посчитать разницу между датами."])
predict(P, 1, "Порядок выполнения", """
void main() {
  print('1');
  load();
  print('2');
}
Future<void> load() async {
  print('3');
  await Future.delayed(const Duration(seconds: 1));
  print('4');
}""", "1\n3\n2\n4", "load() выполняется синхронно до первого await (печатает 3), затем main продолжается (2), а 4 выводится после ожидания. await не блокирует остальной код.", hint="Что выполнится до первого await внутри load?")
fill(P, 1, "Ключевые слова async", """
Future<String> loadName() [[1]] {
  final name = [[2]] repo.getName();
  return name;
}""", [["async"], ["await"]], "Функция с await должна быть помечена async и возвращает Future.", hint="Два слова на a.")
order(P, 1, "try/catch в запросе", [
    "try {",
    "  final games = await repo.getGames();",
    "  return games;",
    "} on SocketException {",
    "  throw const NoInternetException();",
    "}"],
    "Запрос выполняется в try, нужные ошибки ловятся через on/catch. Так сетевая ошибка превращается в понятное исключение для интерфейса.", intro="Соберите блок обработки ошибки в правильном порядке.")
write(P, 1, "Загрузка с запасным значением", "Напишите функцию `Future<int> loadScore(Future<int> Function() request)`: вызывает `request`, а если произошла любая ошибка, возвращает 0. Используйте `async`, `await` и `try/catch`.",
    "Future<int> loadScore(Future<int> Function() request) async {\n  // ваш код\n}\n",
    [("есть async", r"\basync\b"), ("есть await", r"\bawait\b"), ("есть try", r"\btry\b"), ("есть catch", r"\bcatch\b|\bon\s+\w+"), ("есть return 0", r"return\s+0")],
    "Future<int> loadScore(Future<int> Function() request) async {\n  try {\n    return await request();\n  } catch (e) {\n    return 0;\n  }\n}",
    ["Внутри try: return await request();", "В catch верните 0.", "Не забудьте async в заголовке."],
    "Ошибки в async-коде ловятся обычным try/catch, как и в синхронном.")
fill(P, 2, "Таймер", """
Timer? _timer;
void start() {
  _timer = Timer.[[1]](const Duration(seconds: 1), (_) {
    setState(() => seconds++);
  });
}
@override
void dispose() {
  _timer?.[[2]]();   // обязательно остановить
  super.dispose();
}""", [["periodic"], ["cancel"]], "Timer.periodic вызывает функцию через равные интервалы; cancel в dispose предотвращает утечку и вызов setState после удаления виджета.", hint="Слова «периодический» и «отменить».")
bug(P, 2, "Забыли остановить таймер", """
class _TimerState extends State<TimerScreen> {
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }
  @override
  void dispose() {
    super.dispose();
  }
}""", [9, 10], "Строка 10: в dispose нет `_timer?.cancel();`. Таймер продолжит работать и вызовет setState у удалённого виджета.", hint="Что должно быть в dispose?")
write(P, 2, "Секундомер", "Напишите класс `Stopwatch1` с полем `int seconds`, методами `start()` (запускает `Timer.periodic` раз в секунду и увеличивает `seconds`) и `stop()` (отменяет таймер).",
    "import 'dart:async';\n\nclass Stopwatch1 {\n  // ваш код\n}\n",
    [("есть Timer.periodic", r"Timer\.periodic"), ("есть start", r"start\s*\("), ("есть stop", r"stop\s*\("), ("есть cancel", r"cancel\s*\("), ("увеличивается seconds", r"seconds\s*(\+\+|\+=)")],
    "import 'dart:async';\n\nclass Stopwatch1 {\n  int seconds = 0;\n  Timer? _timer;\n\n  void start() {\n    _timer = Timer.periodic(const Duration(seconds: 1), (_) => seconds++);\n  }\n\n  void stop() {\n    _timer?.cancel();\n    _timer = null;\n  }\n}",
    ["Таймер хранится в поле Timer? _timer.", "В start: _timer = Timer.periodic(...).", "В stop: _timer?.cancel();"],
    "Каждый таймер, запущенный на экране, нужно остановить при уходе с него.")
fill(P, 3, "Разбор JSON", """
import 'dart:convert';
final map = [[1]]('{"id":"7","name":"Аня"}') as Map<String, dynamic>;
final player = Player.fromJson(map);
final text = [[2]](player.toJson());   // обратно в строку""", [["jsonDecode"], ["jsonEncode"]], "jsonDecode превращает строку в Map, jsonEncode — объект (Map) обратно в строку.", hint="json + decode / encode.")
predict(P, 3, "Вложенный JSON", """
final json = {
  'title': 'Evening battle',
  'players': [
    {'name': 'Аня'},
    {'name': 'Боря'},
  ],
};
final names = (json['players'] as List).map((p) => p['name']).toList();
print(names);""", "[Аня, Боря]", "players — список словарей. map берёт имя из каждого элемента.", hint="Что вернёт map для каждого игрока?")
write(P, 3, "Модель с вложенным списком", "Напишите класс `GameDto` с полями `String id`, `String title` и `List<String> playerNames`. В `factory GameDto.fromJson` список имён собирается из `json['players']` (список словарей с ключом `name`). Если `players` нет, должен получиться пустой список.",
    "class GameDto {\n  // ваш код\n}\n",
    [("есть factory GameDto.fromJson", r"factory\s+GameDto\.fromJson"), ("используется map по players", r"players[\s\S]*\.map\s*\("), ("есть защита от null (?? [] или ?)", r"(\?\?\s*\[\s*\]|\?\.|as\s+List\?)"), ("есть toList", r"toList\s*\(")],
    "class GameDto {\n  final String id;\n  final String title;\n  final List<String> playerNames;\n  GameDto({required this.id, required this.title, required this.playerNames});\n\n  factory GameDto.fromJson(Map<String, dynamic> json) => GameDto(\n        id: json['id'].toString(),\n        title: json['title'] as String,\n        playerNames: (json['players'] as List? ?? [])\n            .map((p) => (p as Map<String, dynamic>)['name'] as String)\n            .toList(),\n      );\n}",
    ["`json['players'] as List? ?? []` защитит от null.", "Для каждого элемента берите ['name'].", "Не забудьте .toList() в конце."],
    "Правила надёжного разбора: список может быть null, числа бывают int и double, id бывает числом или строкой.")
predict(P, 4, "Время напоминания", """
final start = DateTime(2027, 3, 15, 18, 30);
final remind = start.subtract(const Duration(hours: 1));
print(remind.hour);
print(remind.minute);""", "17\n30", "Вычитаем час: 18:30 → 17:30.", hint="Час уменьшается, минуты те же.")
fill(P, 4, "Разница между датами", """
final left = start.[[1]](now);        // Duration
print(left.[[2]]);                     // сколько целых минут осталось""", [["difference"], ["inMinutes"]], "difference возвращает Duration, у которого есть inMinutes, inHours, inDays.", hint="Разница и «в минутах».")
write(P, 4, "Сколько минут до игры", "Напишите функцию `int minutesUntil(DateTime start, DateTime now)`, которая возвращает число минут от `now` до `start` (если игра уже началась, вернуть 0).",
    "int minutesUntil(DateTime start, DateTime now) {\n  // ваш код\n}\n",
    [("есть функция minutesUntil", r"minutesUntil\s*\("), ("используется difference", r"difference\s*\("), ("используется inMinutes", r"inMinutes"), ("есть защита от отрицательного (0, isBefore, max)", r"(return\s+0|isBefore|isNegative|<\s*0|max\s*\(|\?\s*0|\b0\s*:)")],
    "int minutesUntil(DateTime start, DateTime now) {\n  final diff = start.difference(now);\n  return diff.isNegative ? 0 : diff.inMinutes;\n}",
    ["start.difference(now) даёт Duration.", "У Duration есть inMinutes и isNegative.", "Если isNegative, верните 0."],
    "Расчёты по датам нужны для уведомления за час и для статистики недели.")

# ================= Flutter: виджеты и состояние =================
P = "flutter-basics"
skills(P, ["Выбрать Stateless или Stateful.", "Перечислить методы жизненного цикла и сказать, что в каждом делать.", "Собрать экран из `Row`, `Column`, `Stack`, `Expanded`.", "Объяснить причину ошибки overflow и исправить её."])
fill(P, 1, "Какой виджет нужен", """
// Надпись с фиксированным текстом — виджет [[1]]
// Поле ввода, которое помнит набранный текст — виджет [[2]]
// Таймер игры, число секунд растёт — виджет [[3]]""", [["Stateless", "StatelessWidget"], ["Stateful", "StatefulWidget"], ["Stateful", "StatefulWidget"]], "Если у виджета есть изменяющиеся данные (текст, секунды), нужен StatefulWidget. Для неизменяемого вывода достаточно StatelessWidget.", hint="Меняются ли данные внутри виджета?")
bug(P, 1, "Состояние без setState", """
class _CounterState extends State<Counter> {
  int _count = 0;
  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => _count++,
      child: Text('Нажато: $_count'),
    );
  }
}""", 6, "Строка 6: значение меняется, но экран не перерисуется. Нужно `onPressed: () => setState(() => _count++)`.", hint="Как Flutter узнаёт, что нужно перерисовать?")
order(P, 2, "Жизненный цикл State", [
    "initState",
    "didChangeDependencies",
    "build",
    "dispose"],
    "initState — один раз при создании (контроллеры, подписки); didChangeDependencies — после, при изменении зависимостей; build — каждый раз при перерисовке; dispose — при удалении (отмена таймеров).",
    intro="Расставьте методы State в порядке вызова.")
fill(P, 2, "Что делать в каждом методе", """
@override
void initState() {
  super.initState();
  _controller = TextEditingController();   // создаём в [[1]]
}
@override
void dispose() {
  _controller.[[2]]();                      // освобождаем в dispose
  super.dispose();
}""", [["initState"], ["dispose"]], "Контроллеры создаём в initState и освобождаем в dispose.", hint="Метод освобождения ресурса называется так же, как метод жизненного цикла.")
write(P, 3, "Карточка игрока", "Напишите виджет `PlayerRow(String name)`: в `Row` слева `CircleAvatar` радиусом 24, затем отступ 12, затем `Expanded` с `Text(name)`, у которого `maxLines: 1` и `overflow: TextOverflow.ellipsis`.",
    "class PlayerRow extends StatelessWidget {\n  final String name;\n  const PlayerRow(this.name, {super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    // ваш код\n  }\n}\n",
    [("есть Row", r"\bRow\s*\("), ("есть CircleAvatar", r"CircleAvatar"), ("есть SizedBox с шириной 12", r"SizedBox\s*\(\s*width:\s*12"), ("есть Expanded", r"Expanded"), ("есть ellipsis", r"TextOverflow\.ellipsis")],
    "return Row(\n  children: [\n    const CircleAvatar(radius: 24),\n    const SizedBox(width: 12),\n    Expanded(\n      child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),\n    ),\n  ],\n);",
    ["return Row(children: [...]);", "Expanded оборачивает Text.", "overflow: TextOverflow.ellipsis добавляет многоточие."],
    "Аватар фиксирован, середина тянется, длинный текст обрезается многоточием: так не бывает overflow.")
fill(P, 3, "Наложение слоёв", """
[[1]](
  children: [
    Image.asset('assets/bg.png'),
    [[2]](bottom: 16, left: 16, child: Text('Заголовок')),
  ],
)""", [["Stack"], ["Positioned"]], "Stack накладывает слои друг на друга, Positioned задаёт положение внутри Stack.", hint="Стопка и «позиционированный».")
bug(P, 4, "Найдите причину overflow", """
Row(
  children: [
    const CircleAvatar(radius: 24),
    const SizedBox(width: 12),
    Text('Очень длинное имя соперника, которое не помещается в строку'),
  ],
)""", 5, "Строка 5: Text не ограничен по ширине, поэтому выходит за границы Row. Нужно обернуть в `Expanded` и добавить `overflow: TextOverflow.ellipsis`.", hint="Какой элемент может занять сколько угодно места?")
fill(P, 4, "Исправьте переполнение", """
Row(children: [
  [[1]](child: Text(longText, overflow: TextOverflow.[[2]])),
])""", [["Expanded", "Flexible"], ["ellipsis"]], "Expanded ограничивает ширину текста, ellipsis добавляет многоточие вместо выхода за границы.", hint="Виджет, который занимает оставшееся место.")

# ================= Flutter: экраны, формы, навигация =================
P = "flutter-ui"
skills(P, ["Подключить шрифт и ресурсы в `pubspec.yaml`.", "Собрать форму с валидацией и показом пароля.", "Выбрать нужный способ навигации.", "Открыть BottomSheet и системные пикеры даты и времени."])
fill(P, 1, "pubspec.yaml: шрифты и ресурсы", """
flutter:
  [[1]]:
    - assets/images/
  fonts:
    - family: Manrope
      fonts:
        - asset: assets/fonts/Manrope-Regular.ttf
          weight: [[2]]
        - asset: assets/fonts/Manrope-Bold.ttf
          weight: [[3]]""", [["assets"], ["400"], ["700"]], "Ресурсы перечисляются в assets, у каждого начертания свой файл и вес: Regular — 400, Bold — 700.", hint="Regular = 400, Bold = 700.")
bug(P, 1, "Неверный файл для веса", """
fonts:
  - family: Manrope
    fonts:
      - asset: fonts/Manrope-Regular.ttf
        weight: 400
      - asset: fonts/Manrope-Bold.ttf
        weight: 700
      - asset: fonts/Manrope-ExtraLight.ttf
        weight: 800""", 8, "Строка 8: для веса 800 подключён файл ExtraLight (он тонкий). Нужен Manrope-ExtraBold.ttf.", hint="Вес 800 — жирный, а файл какой?")
fill(P, 2, "Валидатор и пароль", """
TextFormField(
  validator: (v) => RegExp(r'^[a-z0-9]+@[a-z0-9]+\\.[a-z]+$').[[1]](v ?? '') ? null : 'Некорректный email',
),
TextFormField(
  [[2]]: _hidden,                                         // скрыть символы пароля
  decoration: InputDecoration(suffixIcon: IconButton(
    icon: Icon(_hidden ? Icons.visibility_off : Icons.visibility),
    onPressed: () => [[3]](() => _hidden = !_hidden),
  )),
)""", [["hasMatch"], ["obscureText"], ["setState"]], "hasMatch проверяет строку по шаблону, obscureText скрывает символы, setState перерисовывает экран после переключения.", hint="Проверка по шаблону, «скрыть текст», перерисовка.")
write(P, 2, "Проверка email", "Напишите функцию `String? validateEmail(String? value)`: возвращает `null`, если email подходит под шаблон `name@domain.ru` (только маленькие латинские буквы и цифры), иначе текст `Некорректный email`.",
    "String? validateEmail(String? value) {\n  // ваш код\n}\n",
    [("есть функция validateEmail", r"validateEmail\s*\("), ("есть RegExp", r"RegExp\s*\("), ("есть hasMatch", r"hasMatch\s*\("), ("есть текст ошибки", r"Некорректный email"), ("есть return null", r"null")],
    "String? validateEmail(String? value) {\n  final ok = RegExp(r'^[a-z0-9]+@[a-z0-9]+\\.[a-z]+$').hasMatch(value ?? '');\n  return ok ? null : 'Некорректный email';\n}",
    ["Шаблон: r'^[a-z0-9]+@[a-z0-9]+\\.[a-z]+$'.", "hasMatch(value ?? '').", "Верните null, если подходит."],
    "Именно такой валидатор нужен для экрана «Регистрация».")
fill(P, 3, "Способы навигации", """
Navigator.of(context).[[1]](MaterialPageRoute(builder: (_) => const Details()));   // открыть, можно вернуться
Navigator.of(context).[[2]](MaterialPageRoute(builder: (_) => const Home()));      // заменить текущий (после Splash)
Navigator.of(context).[[3]](MaterialPageRoute(builder: (_) => const Landing()), (r) => false); // очистить стек
Navigator.of(context).[[4]]();                                                      // назад""", [["push"], ["pushReplacement"], ["pushAndRemoveUntil"], ["pop"]], "push — поверх, pushReplacement — вместо текущего, pushAndRemoveUntil — очистить стек, pop — назад.", hint="Четыре метода Navigator.")
order(P, 3, "Success → Landing", [
    "Пользователь нажимает Publish",
    "Игра сохраняется на сервере",
    "Открывается экран Success",
    "Стек очищается и открывается Landing"],
    "После успеха стек очищают (pushAndRemoveUntil), чтобы кнопка «назад» не вернула на форму.", intro="Расставьте шаги сценария.")
fill(P, 4, "BottomSheet и пикеры", """
final picked = await [[1]]<String>(context: context, builder: (_) => const OptionsList());
final date = await [[2]](context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime(2100));
final time = await [[3]](context: context, initialTime: TimeOfDay.now());""", [["showModalBottomSheet"], ["showDatePicker"], ["showTimePicker"]], "Панель снизу — showModalBottomSheet, системные выбор даты и времени — showDatePicker и showTimePicker.", hint="show + название элемента.")
write(P, 4, "Собрать дату и время игры", "Напишите функцию `DateTime combine(DateTime date, TimeOfDay time)`, которая объединяет выбранные дату и время в один `DateTime`.",
    "DateTime combine(DateTime date, TimeOfDay time) {\n  // ваш код\n}\n",
    [("есть функция combine", r"combine\s*\("), ("создаётся DateTime", r"DateTime\s*\("), ("используются date.year, date.month, date.day", r"date\.year[\s\S]*date\.month[\s\S]*date\.day"), ("используются time.hour и time.minute", r"time\.hour[\s\S]*time\.minute")],
    "DateTime combine(DateTime date, TimeOfDay time) =>\n    DateTime(date.year, date.month, date.day, time.hour, time.minute);",
    ["Конструктор DateTime(год, месяц, день, час, минута).", "Часы и минуты берите из time.hour и time.minute."],
    "Это шаг из экрана Schedule Game: дата и время выбираются раздельно.")

# ================= Адаптивная верстка =================
P = "adaptive"
skills(P, ["Объяснить разницу между фиксированным и адаптивным размером.", "Использовать `LayoutBuilder`, `MediaQuery`, `AspectRatio`, `Expanded`.", "Снять размеры из Figma и перевести стили текста в `TextStyle`."])
fill(P, 1, "Fixed, Hug, Fill", """
// Fixed (фиксированный размер)  →  SizedBox(width: [[1]])
// Fill container (растянуть)     →  [[2]]
// Hug contents (по содержимому)  →  mainAxisSize: MainAxisSize.[[3]]""", [["100", "48", "60", "24", "16"], ["Expanded", "double.infinity"], ["min"]], "Fixed — конкретное число; Fill — Expanded или double.infinity; Hug — минимальный размер по содержимому.", hint="В первом пропуске подойдёт любое число.")
fill(P, 2, "Инструменты адаптивности", """
final width = [[1]].sizeOf(context).width;
[[2]](builder: (context, c) => c.maxWidth < 360 ? const Small() : const Normal());
[[3]](aspectRatio: 1, child: avatar);   // квадрат, не искажается""", [["MediaQuery"], ["LayoutBuilder"], ["AspectRatio"]], "MediaQuery — размер экрана, LayoutBuilder — размер доступного места, AspectRatio — фиксированные пропорции.", hint="Три виджета с похожими названиями.")
write(P, 2, "Аватар без искажений", "Напишите виджет `Avatar(String url)`: `SizedBox` шириной 60, внутри `AspectRatio(aspectRatio: 1)`, внутри `ClipOval` с `Image.network(url, fit: BoxFit.cover)`.",
    "class Avatar extends StatelessWidget {\n  final String url;\n  const Avatar(this.url, {super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    // ваш код\n  }\n}\n",
    [("есть SizedBox шириной 60", r"SizedBox\s*\(\s*width:\s*60"), ("есть AspectRatio 1", r"AspectRatio\s*\(\s*aspectRatio:\s*1"), ("есть ClipOval", r"ClipOval"), ("есть BoxFit.cover", r"BoxFit\.cover")],
    "return SizedBox(\n  width: 60,\n  child: AspectRatio(\n    aspectRatio: 1,\n    child: ClipOval(child: Image.network(url, fit: BoxFit.cover)),\n  ),\n);",
    ["SizedBox → AspectRatio → ClipOval → Image.network.", "fit: BoxFit.cover обрезает лишнее, а не растягивает."],
    "Соотношение сторон аватара должно быть жёстко зафиксировано: это прямое требование задания.")
predict(P, 3, "Высота строки из Figma", """
// Figma: размер 24, межстрочный интервал 32
final height = 32 / 24;
print(height.toStringAsFixed(2));""", "1.33", "height в TextStyle — множитель от размера шрифта: 32 / 24 ≈ 1.33.", hint="Разделите межстрочный интервал на размер шрифта.")
write(P, 3, "Стиль заголовка из Figma", "Figma: шрифт Manrope, размер 24, начертание Bold (700), межстрочный интервал 32, letter spacing −0.48. Напишите `const TextStyle screenHeader`.",
    "const TextStyle screenHeader = TextStyle(\n  // ваш код\n);\n",
    [("fontFamily Manrope", r"fontFamily:\s*'Manrope'"), ("fontSize 24", r"fontSize:\s*24"), ("вес w700", r"FontWeight\.w700|\.w700"), ("height 32 / 24", r"height:\s*32\s*/\s*24"), ("letterSpacing -0.48", r"letterSpacing:\s*-0\.48")],
    "const TextStyle screenHeader = TextStyle(\n  fontFamily: 'Manrope',\n  fontWeight: FontWeight.w700,\n  fontSize: 24,\n  height: 32 / 24,\n  letterSpacing: -0.48,\n);",
    ["fontFamily: 'Manrope'", "height = межстрочный интервал / размер шрифта.", "fontWeight: FontWeight.w700."],
    "Так выглядят все стили типографики в UIKit: числа берутся из Dev Mode Figma.")
