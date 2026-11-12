from ex_lib import *

# Практические задачи по спринтам (крупнее и ближе к заданию)
P = "sprint1"
skills(P, ["UIKit: структура пакета и экспорт.", "Компоненты: кнопка, поле, чекбокс.", "StoryBook и Git спринта."])
fill(P, 1, "uikit.dart: единственный публичный файл", """
// lib/uikit.dart
library;

[[1]] 'src/theme/colors.dart';
[[2]] 'src/components/ui_button.dart';

// в приложении: один импорт
import 'package:[[3]]/uikit.dart';""", [["export"], ["export"], ["uikit"]], "Публичный API пакета описывается через export; приложение импортирует только package:uikit/uikit.dart.", hint="Слово «экспортировать».")
fill(P, 1, "Иконка из пакета", "Image.asset('assets/eye.png', [[1]]: 'uikit');", [["package"]], "Без параметра package Flutter ищет ресурс в assets приложения и не находит.", hint="Параметр называется как сущность, в которой лежит файл.")
write(P, 2, "Кнопка с вариантами", "Напишите `enum UiButtonKind { primary, secondary, destructive }` и виджет `UiButton` с параметрами `text`, `kind` (по умолчанию primary) и `onPressed` (VoidCallback?). Если `onPressed == null`, кнопка выглядит полупрозрачной (opacity 0.4) и не нажимается.",
    "// ваш код\n",
    [("есть enum UiButtonKind", r"enum\s+UiButtonKind"), ("есть класс UiButton (StatelessWidget)", r"class\s+UiButton\s+extends\s+StatelessWidget"), ("есть VoidCallback? onPressed", r"VoidCallback\?\s+onPressed"), ("есть значение по умолчанию primary", r"UiButtonKind\.primary"), ("есть Opacity 0.4", r"0\.4")],
    "enum UiButtonKind { primary, secondary, destructive }\n\nclass UiButton extends StatelessWidget {\n  final String text;\n  final UiButtonKind kind;\n  final VoidCallback? onPressed;\n  const UiButton({super.key, required this.text, this.kind = UiButtonKind.primary, this.onPressed});\n\n  @override\n  Widget build(BuildContext context) {\n    final enabled = onPressed != null;\n    return Opacity(\n      opacity: enabled ? 1 : 0.4,\n      child: InkWell(onTap: onPressed, child: Center(child: Text(text))),\n    );\n  }\n}",
    ["Варианты через enum, а не три копии кода.", "onPressed == null отключает InkWell.", "Opacity(opacity: enabled ? 1 : 0.4, ...)."],
    "Один компонент с вариантами вместо нескольких копий: так выглядит DRY в UIKit.")
write(P, 2, "Один метод рамки для поля", "Напишите приватный метод `OutlineInputBorder _border(Color color)` для поля ввода (толщина 1, радиус 8).",
    "OutlineInputBorder _border(Color color) {\n  // ваш код\n}\n",
    [("есть OutlineInputBorder", r"OutlineInputBorder"), ("толщина 1", r"width:\s*1"), ("радиус 8", r"circular\s*\(\s*8"), ("используется color", r"color:\s*color")],
    "OutlineInputBorder _border(Color color) => OutlineInputBorder(\n      borderSide: BorderSide(color: color, width: 1),\n      borderRadius: BorderRadius.circular(8),\n    );",
    ["borderSide: BorderSide(color: color, width: 1).", "borderRadius: BorderRadius.circular(8)."], "Так вы убираете пять одинаковых блоков из своей симуляции.")
order(P, 3, "Завершение спринта 1", [
    "Проверить, что все компоненты есть в StoryBook",
    "Проверить шапки и логи скриптом",
    "Закоммитить и отправить ветку sprint-1",
    "Создать pull request и смёржить в main",
    "Поставить тег v1.0.0",
    "Перенести карточки в «Готово к тестированию» с хэшами коммитов"],
    "Сначала проверяем качество, затем Git, затем карточки: так не потеряются множители ×0,5.", intro="Расставьте финальные шаги спринта.")

P = "sprint2"
skills(P, ["Ошибки и клиент сетевого слоя.", "Запросы и тесты."])
write(P, 1, "Иерархия ошибок", "Опишите `sealed class ApiException implements Exception` с полем `String message`, и двух наследников: `NoInternetException` (сообщение «Нет подключения к интернету») и `ServerException` (поля `int statusCode` и `message`).",
    "// ваш код\n",
    [("есть sealed class ApiException", r"sealed\s+class\s+ApiException"), ("есть implements Exception", r"implements\s+Exception"), ("есть NoInternetException", r"class\s+NoInternetException\s+extends\s+ApiException"), ("есть ServerException со statusCode", r"class\s+ServerException[\s\S]*statusCode")],
    "sealed class ApiException implements Exception {\n  final String message;\n  const ApiException(this.message);\n  @override\n  String toString() => message;\n}\n\nclass NoInternetException extends ApiException {\n  const NoInternetException() : super('Нет подключения к интернету');\n}\n\nclass ServerException extends ApiException {\n  final int statusCode;\n  const ServerException(this.statusCode, String message) : super(message);\n}",
    ["Базовый класс sealed, наследники через extends.", "super('...') передаёт сообщение родителю."], "Единая иерархия ошибок упрощает показ SnackBar на 5 секунд.")
fill(P, 1, "Преобразование ошибок клиента", """
try {
  final response = await request().timeout(_config.timeout);
  if (response.statusCode >= 200 && response.statusCode < 300) { /* успех */ }
  throw ServerException(response.statusCode, 'Ошибка сервера');
} on [[1]] {
  throw const NoInternetException();
} on [[2]] {
  throw const TimeoutApiException();
}""", [["SocketException"], ["TimeoutException"]], "Нет сети — SocketException (или ClientException), долгое ожидание — TimeoutException.", hint="dart:io и dart:async.")
write(P, 2, "Тест запроса с MockClient", "Напишите тест `test('getProfile: успех', ...)`: создайте `MockClient`, который проверяет, что путь запроса `/users/123`, и возвращает `http.Response(jsonEncode({'id': '123'}), 200)`. Затем вызовите метод и проверьте `expect(user.id, '123')`.",
    "test('getProfile: успех', () async {\n  // ваш код\n});\n",
    [("используется MockClient", r"MockClient\s*\("), ("проверяется путь /users/123", r"/users/123"), ("возвращается http.Response со статусом 200", r"http\.Response\s*\([\s\S]*200"), ("есть expect", r"expect\s*\(")],
    "test('getProfile: успех', () async {\n  final mock = MockClient((request) async {\n    expect(request.url.path, '/users/123');\n    return http.Response(jsonEncode({'id': '123'}), 200);\n  });\n  final api = ProfileApiImpl(HttpApiClient(const ApiConfig(baseUrl: 'https://t'), client: mock));\n  final user = await api.getProfile('123');\n  expect(user.id, '123');\n});",
    ["MockClient((request) async { ... }).", "Внутри проверьте request.url.path.", "Клиент принимает client: mock."], "Тест проверяет не только ответ, но и адрес запроса.")
write(P, 2, "Тест ошибки сервера", "Напишите тест: мок возвращает статус 500, ожидаем `ServerException`.",
    "test('getGames: ошибка 500', () async {\n  // ваш код\n});\n",
    [("есть статус 500", r"500"), ("ожидается ServerException", r"ServerException"), ("используется throwsA", r"throwsA")],
    "test('getGames: ошибка 500', () async {\n  final mock = MockClient((_) async => http.Response('{\"message\":\"boom\"}', 500));\n  final api = GameApiImpl(HttpApiClient(const ApiConfig(baseUrl: 'https://t'), client: mock));\n  expect(api.getGames(), throwsA(isA<ServerException>()));\n});",
    ["http.Response('...', 500).", "expect(future, throwsA(isA<ServerException>()))."], "На каждый запрос минимум: успех, ошибка сервера, нет интернета.")

P = "sprint3"
skills(P, ["Первый запуск и регистрация.", "Сессия и последний экран."])
write(P, 1, "Проверка email по заданию", "Напишите функцию `bool isValidEmail(String value)` по шаблону `name@domenname.ru` (имя и доменное имя только из маленьких латинских букв и цифр).",
    "bool isValidEmail(String value) {\n  // ваш код\n}\n",
    [("есть RegExp", r"RegExp\s*\("), ("есть hasMatch", r"hasMatch\s*\("), ("есть a-z0-9", r"a-z0-9"), ("есть @", r"@")],
    "bool isValidEmail(String value) =>\n    RegExp(r'^[a-z0-9]+@[a-z0-9]+\\.[a-z]+$').hasMatch(value);",
    ["Шаблон из трёх частей: имя @ домен . зона.", "[a-z0-9]+ — одна или больше букв и цифр."], "Эта функция оценивается отдельным пунктом (0,5 балла).")
write(P, 1, "Показывать приветствие один раз", "Напишите функцию `Future<bool> shouldShowOnboarding()`: читает из `SharedPreferences` флаг `seen_onboarding` (по умолчанию false) и возвращает `true`, если приветствие ещё не показывали.",
    "Future<bool> shouldShowOnboarding() async {\n  // ваш код\n}\n",
    [("есть SharedPreferences.getInstance", r"SharedPreferences\.getInstance\s*\("), ("чтение seen_onboarding", r"getBool\s*\(\s*'seen_onboarding'"), ("значение по умолчанию false", r"\?\?\s*false"), ("инверсия результата", r"!\s*\(?\s*\w+|==\s*false")],
    "Future<bool> shouldShowOnboarding() async {\n  final prefs = await SharedPreferences.getInstance();\n  final seen = prefs.getBool('seen_onboarding') ?? false;\n  return !seen;\n}",
    ["prefs.getBool('seen_onboarding') ?? false.", "Показывать нужно, если НЕ видели: return !seen."], "Флаг записывается при выходе из онбординга (и после «Пропустить», и на последнем экране).")
write(P, 2, "Запоминание последнего экрана", "Напишите класс `LastRouteObserver extends NavigatorObserver`, который в `didPush` сохраняет имя маршрута (`route.settings.name`) в `SharedPreferences` по ключу `last_route`, если имя не null.",
    "class LastRouteObserver extends NavigatorObserver {\n  // ваш код\n}\n",
    [("есть extends NavigatorObserver", r"extends\s+NavigatorObserver"), ("переопределён didPush", r"void\s+didPush\s*\("), ("используется route.settings.name", r"route\.settings\.name"), ("сохранение last_route", r"setString\s*\(\s*'last_route'")],
    "class LastRouteObserver extends NavigatorObserver {\n  @override\n  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {\n    final name = route.settings.name;\n    if (name != null) _save(name);\n  }\n\n  Future<void> _save(String name) async {\n    final prefs = await SharedPreferences.getInstance();\n    await prefs.setString('last_route', name);\n  }\n}",
    ["@override void didPush(Route route, Route? previousRoute).", "Имя маршрута: route.settings.name.", "prefs.setString('last_route', name)."], "Подключается так: MaterialApp(navigatorObservers: [LastRouteObserver()]).")

P = "sprint4"
skills(P, ["Статистика и недели.", "Игра Image."])
write(P, 1, "Начало текущей недели", "Напишите функцию `DateTime startOfWeek(DateTime now)`, которая возвращает понедельник текущей недели в 00:00.",
    "DateTime startOfWeek(DateTime now) {\n  // ваш код\n}\n",
    [("есть функция startOfWeek", r"startOfWeek\s*\("), ("используется weekday", r"weekday"), ("используется subtract и Duration", r"subtract\s*\(\s*Duration\s*\(\s*days"), ("дата без времени: DateTime(now.year, ...)", r"DateTime\s*\(\s*now\.year")],
    "DateTime startOfWeek(DateTime now) {\n  final day = DateTime(now.year, now.month, now.day);\n  return day.subtract(Duration(days: now.weekday - 1));\n}",
    ["weekday: понедельник = 1, воскресенье = 7.", "Вычтите weekday - 1 дней.", "Сначала обнулите время: DateTime(now.year, now.month, now.day)."], "Нужна для показателей THIS WEEK EARNINGS и Scheduled Games.")
write(P, 2, "Перемешивание плиток с seed", "Напишите функцию `List<int> shuffleTiles(int count, int seed)`: создаёт список 0..count-1 и перемешивает его с `Random(seed)`, чтобы у обоих игроков порядок был одинаковым.",
    "import 'dart:math';\n\nList<int> shuffleTiles(int count, int seed) {\n  // ваш код\n}\n",
    [("есть функция shuffleTiles", r"shuffleTiles\s*\("), ("создаётся список через generate", r"List<int>\.generate\s*\(|List\.generate\s*\("), ("используется Random(seed)", r"Random\s*\(\s*seed\s*\)"), ("используется shuffle", r"shuffle\s*\(")],
    "import 'dart:math';\n\nList<int> shuffleTiles(int count, int seed) {\n  final order = List<int>.generate(count, (i) => i);\n  order.shuffle(Random(seed));\n  return order;\n}",
    ["List<int>.generate(count, (i) => i).", "list.shuffle(Random(seed)).", "Одинаковый seed даёт одинаковый порядок."], "seed берут из id игры: он одинаков у обоих игроков и разный у разных игр.")
write(P, 2, "Пазл собран?", "Напишите функцию `bool isSolved(List<int> tiles)`, которая возвращает `true`, если каждая плитка стоит на своём месте (`tiles[i] == i`).",
    "bool isSolved(List<int> tiles) {\n  // ваш код\n}\n",
    [("есть функция isSolved", r"isSolved\s*\("), ("есть цикл или every", r"(for\s*\(|every\s*\()"), ("есть сравнение с индексом", r"(tiles\[i\]\s*!=\s*i|tiles\[i\]\s*==\s*i|==\s*i\b|!=\s*i\b)"), ("есть return", r"return")],
    "bool isSolved(List<int> tiles) {\n  for (var i = 0; i < tiles.length; i++) {\n    if (tiles[i] != i) return false;\n  }\n  return true;\n}",
    ["Пройдите по списку циклом.", "Если нашли плитку не на месте, сразу false.", "После цикла верните true."], "Игра завершается автоматически сразу, как isSolved станет true.")

P = "sprint5"
skills(P, ["Игра Circle и победитель."])
write(P, 1, "Круги по убыванию", "Напишите функцию `bool isSolved(List<double> radii)`: возвращает `true`, если радиусы идут от большего к меньшему (каждый следующий не больше предыдущего).",
    "bool isSolved(List<double> radii) {\n  // ваш код\n}\n",
    [("есть функция isSolved", r"isSolved\s*\("), ("есть цикл", r"for\s*\("), ("сравниваются соседние элементы", r"radii\[i\]\s*<\s*radii\[i\s*\+\s*1\]|radii\[i\s*\+\s*1\]\s*>\s*radii\[i\]|radii\[i\s*-\s*1\]"), ("есть return", r"return")],
    "bool isSolved(List<double> radii) {\n  for (var i = 0; i < radii.length - 1; i++) {\n    if (radii[i] < radii[i + 1]) return false;\n  }\n  return true;\n}",
    ["Сравнивайте соседей: radii[i] и radii[i + 1].", "Если левый меньше правого, порядок нарушен.", "Цикл до length - 1."], "Общее завершение, таймер и отправку выносят в базовый класс игры.")
write(P, 1, "Кто победил", "Напишите функцию `String winner(Duration mine, Duration? opponent)`: если результата соперника нет, вернуть `'pending'`; если мой результат не больше, вернуть `'me'`, иначе `'opponent'`.",
    "String winner(Duration mine, Duration? opponent) {\n  // ваш код\n}\n",
    [("есть функция winner", r"winner\s*\("), ("обработан null соперника", r"opponent\s*==\s*null|opponent\s*\?\?|opponent\s*!=\s*null"), ("есть 'pending'", r"'pending'"), ("есть 'me' и 'opponent'", r"'me'[\s\S]*'opponent'|'opponent'[\s\S]*'me'")],
    "String winner(Duration mine, Duration? opponent) {\n  if (opponent == null) return 'pending';\n  return mine <= opponent ? 'me' : 'opponent';\n}",
    ["Сначала if (opponent == null).", "Duration можно сравнивать операторами <= и >."], "Меньшее время побеждает. Правило сравнения живёт в слое Domain.")

P = "sprint6"
skills(P, ["Метрика и публикация."])
fill(P, 1, "События метрики", """
await [[1]].activate(const AppMetricaConfig('API_KEY'));   // инициализация в main
AppMetrica.[[2]]('image_move');                              // каждое движение в игре Image""", [["AppMetrica"], ["reportEvent"]], "Инициализация — AppMetrica.activate в main, события — AppMetrica.reportEvent (проверьте точный API в README версии пакета).", hint="Класс пакета назван так же, как сервис.")
order(P, 1, "Подготовка к публикации", [
    "Создать keystore и настроить подпись",
    "Собрать release APK",
    "Загрузить APK и иконку",
    "Указать название, тип, возрастную категорию и категорию",
    "Заполнить краткое и основное описание",
    "Добавить 5 скриншотов"],
    "Сначала подпись и сборка, потом заполнение страницы приложения. За каждый отсутствующий скриншот (из пяти) минус 0,1.", intro="Расставьте шаги подготовки к публикации в RuStore.")
