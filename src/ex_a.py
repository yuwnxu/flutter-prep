from ex_lib import *

# ================= Что такое программирование =================
P = "programming"
skills(P, ["Объяснить разницу между алгоритмом и программой.", "Назвать основные типы данных.", "Написать условие, цикл и функцию.", "Объяснить, что такое клиент, сервер, API и JSON."])
order(P, 1, "Алгоритм проверки пароля", [
    "Получить введённую строку",
    "Если длина меньше 8 — показать ошибку и остановиться",
    "Иначе отправить пароль на сервер",
    "Показать результат пользователю"],
    "Алгоритм — конечная последовательность шагов. Порядок важен: сначала проверка, потом отправка. Программа — тот же алгоритм, записанный на языке, понятном компьютеру.",
    intro="Расставьте шаги алгоритма в правильном порядке.")
fill(P, 2, "Подберите тип", """
[[1]] age = 18;
[[2]] price = 19.99;
[[3]] name = 'Аня';
[[4]] isReady = true;
[[5]] start = DateTime.now();""", [["int"], ["double"], ["String"], ["bool"], ["DateTime"]],
    "Целое число — int, дробное — double, текст — String, да/нет — bool, дата и время — DateTime. Тип нужен, чтобы в коробку для чисел нельзя было положить текст.",
    hint="Типы пишутся с учётом регистра: String и DateTime с большой буквы.")
predict(P, 3, "Трассировка цикла", """
var total = 0;
for (var i = 1; i <= 3; i++) {
  total += i * 2;
}
print(total);""", "12",
    "Шаги: i=1 → total=2; i=2 → total=6; i=3 → total=12. Проходите код по шагам и записывайте значения: это и есть трассировка.",
    hint="Выпишите таблицу: i, i*2, total.")
fill(P, 3, "Условие и функция", """
String result(int score) {
  [[1]] (score >= 10) {
    return 'Победа';
  } [[2]] {
    return 'Попробуй ещё';
  }
}""", [["if"], ["else"]], "Условие записывается через if, альтернативная ветка через else.", hint="Два коротких английских слова.")
write(P, 3, "Своя функция: максимум из двух", "Напишите функцию `int maxOf(int a, int b)`, которая возвращает большее из двух чисел. Не используйте готовую функцию `max`.",
    "int maxOf(int a, int b) {\n  // ваш код\n}\n",
    [("есть функция maxOf", r"maxOf\s*\("), ("есть return", r"\breturn\b"), ("есть сравнение или условие", r"(>|<|\bif\b|\?)")],
    "int maxOf(int a, int b) {\n  if (a > b) {\n    return a;\n  }\n  return b;\n}\n// короче: int maxOf(int a, int b) => a > b ? a : b;",
    ["Сравните a и b оператором >.", "Если a больше, верните a, иначе b.", "Короткая запись: условие ? значение1 : значение2."],
    "Функция принимает входные данные, делает одну вещь и возвращает результат.")
order(P, 4, "Что происходит при входе в приложение", [
    "Приложение отправляет POST-запрос /login с email и паролем",
    "Сервер проверяет пароль",
    "Сервер возвращает JSON с токеном",
    "Приложение сохраняет токен и открывает главный экран"],
    "Клиент (приложение) отправляет запрос на API сервера, сервер отвечает данными в формате JSON. Токен подтверждает, что вы уже вошли.",
    intro="Расставьте шаги общения клиента и сервера по порядку.")
predict(P, 4, "Прочитайте JSON", """
// сервер прислал: {"id": 7, "name": "Аня", "score": 12}
final json = {'id': 7, 'name': 'Аня', 'score': 12};
print(json['name']);""", "Аня", "JSON — это пары «ключ: значение». В Dart такие данные удобно хранить в Map и брать по ключу.", hint="Какой ключ указан в квадратных скобках?")

# ================= Dart: основы =================
P = "dart-basics"
skills(P, ["Выбрать между `var`, `final`, `const`.", "Читать `?`, `??`, `?.`, `!`.", "Писать функции с именованными параметрами.", "Работать со списками и словарями (`map`, `where`, `fold`)."])
fill(P, 1, "var, final или const", """
[[1]] today = DateTime.now();   // значение известно только при запуске
[[2]] maxScore = 100;            // константа, известна при компиляции
[[3]] city = 'Сургут';           // тип выводится сам, значение можно менять""", [["final"], ["const"], ["var"]],
    "final задаётся один раз во время работы, const известен ещё при компиляции, var подходит, если значение меняется.", hint="DateTime.now() нельзя знать заранее.")
bug(P, 1, "Найдите ошибку", """
final city = 'Сургут';
const maxScore = 100;
const now = DateTime.now();
var counter = 0;""", 3, "Строка 3: DateTime.now() вычисляется только при запуске, поэтому `const` нельзя. Нужно `final now = DateTime.now();`.", hint="Какая из констант не может быть известна заранее?")
predict(P, 2, "Что выведет ?? и ?.", """
String? nickname;
print(nickname ?? 'Игрок');
print(nickname?.length);""", "Игрок\nnull", "?? подставляет значение по умолчанию, ?. безопасно вызывает метод и возвращает null, если объект null.", hint="nickname пустой (null).")
fill(P, 2, "Подставьте оператор", """
String? name;
final shown = name [[1]] 'гость';   // если name пустой — 'гость'
final length = name[[2]]length;      // безопасный доступ к length""", [["??"], ["?."]], "?? даёт значение по умолчанию, ?. не падает на null.", hint="Два оператора из двух символов.")
write(P, 2, "Приветствие без падений", "Напишите функцию `String greeting(String? name)`: если имя есть, вернуть `Привет, <имя>`, иначе `Привет, гость`. Не используйте `!`.",
    "String greeting(String? name) {\n  // ваш код\n}\n",
    [("есть функция greeting", r"greeting\s*\("), ("обработан null (?? или if)", r"(\?\?|[!=]=\s*null|\?[^?:;{]*:)"), ("нет оператора !", r"^(?![\s\S]*\w!\.)[\s\S]*$"), ("есть 'Привет'", r"Привет")],
    "String greeting(String? name) {\n  return 'Привет, ${name ?? 'гость'}';\n}",
    ["Используйте `??` для значения по умолчанию.", "Подстановка в строку: '${...}'.", "Можно через if (name == null) return ... ."],
    "Проверяйте null, а не обещайте компилятору, что его нет.")
fill(P, 3, "Именованные параметры", """
String greet([[1]] required String name, int age = 18[[2]] {
  return '$name, $age';
}
greet([[3]]: 'Аня');""", [["{"], ["}) "," })","})"], ["name"]],
    "Именованные параметры заключаются в фигурные скобки. required делает параметр обязательным, значение по умолчанию задаётся через =.", hint="Блок параметров начинается и заканчивается фигурными скобками.")
predict(P, 3, "Вызов функции", """
String greet({required String name, int age = 18}) => '$name, $age';
print(greet(name: 'Боря'));
print(greet(name: 'Вика', age: 20));""", "Боря, 18\nВика, 20", "Если age не передан, берётся значение по умолчанию 18.", hint="Сначала age по умолчанию, потом переданный.")
write(P, 3, "Функция с именованными параметрами", "Напишите функцию `String describe({required String title, int moves = 0})`, которая возвращает строку вида `Игра Image: 5 ходов` (название и число ходов).",
    "String describe({required String title, int moves = 0}) {\n  // ваш код\n}\n",
    [("есть required", r"required"), ("есть return или =>", r"(return|=>)"), ("подставляются title и moves", r"\$\{?title\}?[\s\S]*\$\{?moves\}?|\$\{?moves\}?[\s\S]*\$\{?title\}?")],
    "String describe({required String title, int moves = 0}) {\n  return '$title: $moves ходов';\n}",
    ["Подстановка в строку: '$title'.", "Верните готовую строку через return или =>."],
    "Именованные параметры делают вызов читаемым: describe(title: 'Image', moves: 5).")
predict(P, 4, "where и toList", "print([1, 2, 3, 4].where((e) => e.isEven).toList());", "[2, 4]", "where оставляет только подходящие элементы, toList превращает результат в список.", hint="Чётные числа.")
fill(P, 4, "Сумма через fold", "final total = [3, 5, 7].[[1]](0, (acc, e) => acc [[2]] e);\nprint(total); // 15", [["fold"], ["+"]], "fold начинает с 0 и последовательно накапливает результат: acc + e.", hint="Метод «свернуть» и арифметический знак.")
write(P, 4, "Сумма квадратов", "Напишите функцию `int sumOfSquares(List<int> numbers)`, которая возвращает сумму квадратов (для [1, 2, 3] будет 14). Используйте `fold` или цикл.",
    "int sumOfSquares(List<int> numbers) {\n  // ваш код\n}\n",
    [("есть функция sumOfSquares", r"sumOfSquares\s*\("), ("есть fold или цикл", r"(fold|for\s*\(|forEach)"), ("есть умножение", r"\*"), ("есть return или =>", r"(return|=>)")],
    "int sumOfSquares(List<int> numbers) {\n  return numbers.fold(0, (acc, e) => acc + e * e);\n}",
    ["Начните с суммы 0.", "К сумме добавляйте e * e.", "fold(0, (acc, e) => acc + ...)."],
    "fold и циклы дают одно и то же; выбирайте тот, который понятнее.")
write(P, 4, "Лидер по очкам", "Дан словарь `Map<String, int> scores`. Напишите функцию `String leader(Map<String, int> scores)`, которая возвращает имя игрока с максимальным количеством очков.",
    "String leader(Map<String, int> scores) {\n  // ваш код\n}\n",
    [("есть функция leader", r"leader\s*\("), ("перебираются элементы словаря", r"(entries|keys|forEach|for\s*\()"), ("есть сравнение", r"(>|<|reduce)"), ("есть return", r"return")],
    "String leader(Map<String, int> scores) {\n  var bestName = '';\n  var bestScore = -1;\n  for (final e in scores.entries) {\n    if (e.value > bestScore) {\n      bestScore = e.value;\n      bestName = e.key;\n    }\n  }\n  return bestName;\n}",
    ["Перебор: for (final e in scores.entries).", "e.key — имя, e.value — очки.", "Запоминайте лучшего: bestName и bestScore."],
    "Перебор словаря через entries — основа для экранов со статистикой.")

# ================= Dart: ООП =================
P = "dart-oop"
skills(P, ["Написать класс с `fromJson` / `toJson`.", "Объяснить разницу `extends`, `implements`, `with`.", "Спрятать реализацию в `_приватных` членах и `lib/src`.", "Использовать `sealed` для состояний."])
fill(P, 1, "Конструкторы", """
class Player {
  final String id;
  final String name;
  Player({[[1]] this.id, required this.name});

  [[2]] Player.fromJson(Map<String, dynamic> json) =>
      Player(id: json['id'] as String, name: json['name'] as String);
}""", [["required"], ["factory"]], "required — обязательный именованный параметр; factory — конструктор, который создаёт объект из JSON.", hint="Два слова: «обязательный» и «фабричный» по-английски.")
predict(P, 1, "toJson", """
class Player {
  final String name;
  int score;
  Player(this.name, this.score);
  Map<String, dynamic> toJson() => {'name': name, 'score': score};
}
void main() {
  print(Player('Аня', 5).toJson());
}""", ["{name: Аня, score: 5}"], "Map печатается в фигурных скобках без кавычек у строк.", hint="Dart печатает Map как {ключ: значение, ...}.")
write(P, 1, "Класс Game с fromJson и toJson", "Напишите класс `Game` с полями `id` (String), `title` (String) и `finished` (bool, по умолчанию false). Добавьте `factory Game.fromJson(Map<String, dynamic> json)` и метод `toJson()`.",
    "class Game {\n  // ваш код\n}\n",
    [("есть класс Game", r"class\s+Game"), ("есть три поля", r"final\s+String\s+id[\s\S]*final\s+String\s+title[\s\S]*bool\s+finished|bool\s+finished[\s\S]*String"), ("есть factory Game.fromJson", r"factory\s+Game\.fromJson"), ("есть toJson", r"toJson\s*\("), ("есть значение по умолчанию false", r"=\s*false")],
    "class Game {\n  final String id;\n  final String title;\n  final bool finished;\n\n  const Game({required this.id, required this.title, this.finished = false});\n\n  factory Game.fromJson(Map<String, dynamic> json) => Game(\n        id: json['id'].toString(),\n        title: json['title'] as String,\n        finished: json['finished'] as bool? ?? false,\n      );\n\n  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'finished': finished};\n}",
    ["Конструктор с именованными параметрами: Game({required this.id, ...}).", "fromJson берёт значения по ключам json['id'].", "Для необязательного bool: `json['finished'] as bool? ?? false`."],
    "Пара fromJson/toJson есть у каждой модели из сетевого слоя.")
fill(P, 2, "extends, implements, with", """
class PrimaryButton [[1]] BaseButton {}              // наследует код
class HttpApiClient [[2]] ApiClient {}               // обещает реализовать контракт
class Repo [[3]] Loggable {}                          // подмешивает миксин""", [["extends"], ["implements"], ["with"]],
    "extends — наследование кода, implements — реализация контракта, with — подмешивание миксина.", hint="Три слова: extends, implements, with.")
fill(P, 2, "Какое слово выбрать", """
// Приложение должно зависеть от контракта, а реализацию можно заменить:
abstract [[1]] class ApiClient { Future<String> get(String path); }
class FakeApiClient [[2]] ApiClient {
  @override
  Future<String> get(String path) async => '{}';
}""", [["interface"], ["implements"]], "abstract interface class описывает контракт, implements выполняет его. Так приложение зависит от абстракции (принцип D из SOLID).", hint="Контракт — interface.")
fill(P, 3, "Приватность", """
class Counter {
  int [[1]]value = 0;                 // приватное поле (видно только в этом файле)
  int get value => _value;             // публичный геттер
  void increment() => _value++;
}""", [["_"]], "Имя с подчёркиванием приватно в пределах файла (библиотеки). Это основа инкапсуляции в UIKit: детали в lib/src, наружу только то, что экспортирует uikit.dart.", hint="Один символ перед именем.")
write(P, 3, "Счётчик с приватным полем", "Напишите класс `Counter`: приватное поле `_value`, геттер `value`, методы `increment()` и `reset()`.",
    "class Counter {\n  // ваш код\n}\n",
    [("есть приватное поле _value", r"_value"), ("есть геттер value", r"get\s+value"), ("есть increment", r"increment\s*\("), ("есть reset", r"reset\s*\(")],
    "class Counter {\n  int _value = 0;\n  int get value => _value;\n  void increment() => _value++;\n  void reset() => _value = 0;\n}",
    ["int _value = 0;", "int get value => _value;", "increment увеличивает на 1, reset ставит 0."],
    "Снаружи значение можно прочитать, но нельзя поменять напрямую.")
fill(P, 4, "sealed и switch", """
[[1]] class ScreenState {}
class Loading extends ScreenState {}
class Loaded extends ScreenState { final int count; Loaded(this.count); }
class Failed extends ScreenState { final String message; Failed(this.message); }

String show(ScreenState s) => [[2]] (s) {
      Loading() => 'Загрузка',
      Loaded(:final count) => 'Игр: $count',
      Failed(:final message) => 'Ошибка: $message',
    };""", [["sealed"], ["switch"]], "sealed ограничивает набор наследников, поэтому switch проверит, что обработаны все варианты.", hint="Одно слово обозначает «запечатанный», другое — выбор.")
write(P, 4, "Состояние экрана", "Опишите `sealed class Result`, у которого есть два наследника: `Success` (поле `int value`) и `Failure` (поле `String message`). Затем напишите функцию `String describe(Result r)` через `switch`.",
    "// ваш код\n",
    [("есть sealed class Result", r"sealed\s+class\s+Result"), ("есть Success и Failure", r"class\s+Success[\s\S]*class\s+Failure|class\s+Failure[\s\S]*class\s+Success"), ("есть switch", r"switch"), ("есть describe", r"describe\s*\(")],
    "sealed class Result {}\nclass Success extends Result { final int value; Success(this.value); }\nclass Failure extends Result { final String message; Failure(this.message); }\n\nString describe(Result r) => switch (r) {\n      Success(:final value) => 'Значение: $value',\n      Failure(:final message) => 'Ошибка: $message',\n    };",
    ["Оба класса наследуют Result через extends.", "switch (r) { Success(...) => ..., Failure(...) => ... }."],
    "Состояния экрана (загрузка, данные, ошибка) удобно описывать sealed-классами.")
