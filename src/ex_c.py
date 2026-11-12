from ex_lib import *

# ================= Git =================
P = "git"
skills(P, ["Создать ветку, закоммитить, отправить и смёржить через PR.", "Найти хэш коммита и вставить его в карточку.", "Назвать правила semver и поставить тег.", "Подключить пакет из Git и из локальной папки."])
order(P, 1, "Цикл работы над спринтом", [
    "git checkout main",
    "git pull",
    "git checkout -b sprint-1",
    "git add .",
    'git commit -m "feat: компоненты UIKit"',
    "git push -u origin sprint-1"],
    "Сначала обновляем main, создаём ветку, затем коммитим и отправляем. После этого создаётся pull request и выполняется merge.", intro="Расставьте команды в правильном порядке.")
fill(P, 1, "Команды Git", """
git [[1]] -b sprint-2          # создать и переключиться на ветку
git [[2]] .                    # подготовить все изменения
git [[3]] -m "feat: экран входа"   # сохранить снимок
git [[4]] -u origin sprint-2   # отправить ветку на сервер""", [["checkout", "switch"], ["add"], ["commit"], ["push"]], "checkout -b создаёт ветку, add подготавливает файлы, commit сохраняет, push отправляет.", hint="checkout, add, commit, push.")
fill(P, 2, "Хэш коммита", """
git [[1]] --oneline      # список коммитов с хэшами
# 5899748 Учебный сайт
# bde42e6 Подключён проект
# Какой хэш указать в карточке для последнего коммита? Это самый [[2]] в списке (верхний).""", [["log"], ["новый", "верхний", "первый"]], "git log --oneline показывает хэши, последний коммит стоит первым. Его хэш (первые 7 символов) указывают в карточке.", hint="Команда «журнал».")
predict(P, 3, "Следующая версия", """
// сейчас версия 1.2.3
// добавили новый компонент, всё старое работает
print('?');   // какая версия будет?""", "1.3.0", "Новая функция без поломки старого → увеличиваем минорную часть и обнуляем патч: 1.3.0.", hint="МАЖОР.МИНОР.ПАТЧ.")
fill(P, 3, "Тег версии", """
git [[1]] v1.0.0
git push origin [[2]]""", [["tag"], ["v1.0.0"]], "git tag ставит метку на коммит, push origin v1.0.0 отправляет её на сервер.", hint="Команда называется как сам тег.")
fill(P, 4, "Зависимость из Git и из папки", """
dependencies:
  uikit:
    [[1]]:
      url: https://github.com/yuwnxu/uikit.git
      ref: [[2]]
  network_layer:
    [[3]]: ../network_layer""", [["git"], ["v1.0.0"]]+[["path"]], "Из Git: git с url и ref (тегом), из локальной папки: path.", hint="Два ключа: git и path.")

# ================= Архитектура =================
P = "architecture"
skills(P, ["Нарисовать схему слоёв и показать направление зависимостей.", "Создать сущность, интерфейс репозитория, UseCase, реализацию и контроллер.", "Объяснить каждую букву SOLID на своём коде.", "Найти и убрать дублирование."])
fill(P, 1, "Какому слою принадлежит класс", """
// Game (Entity)                 → слой [[1]]
// GameDto                       → слой [[2]]
// GameRepositoryImpl            → слой [[3]]
// LoginController               → слой [[4]]
// CreateGame (UseCase)          → слой [[5]]""", [["domain", "Domain"], ["data", "Data"], ["data", "Data"], ["presentation", "Presentation"], ["domain", "Domain"]], "Entity и UseCase — ядро (Domain); DTO и реализация репозитория — получение данных (Data); контроллер экрана — Presentation.", hint="Слоёв три: domain, data, presentation.")
bug(P, 1, "Нарушение слоёв", """
// файл lib/domain/usecases/get_games.dart
import 'package:flutter/material.dart';
import 'package:myapp/data/dto/game_dto.dart';
import 'package:myapp/domain/entities/game.dart';

class GetGames {}""", [2, 3], "Строки 2 и 3: Domain не должен импортировать Flutter и слой Data. Domain — чистое ядро без UI и сети.", hint="Какие импорты не должно быть в Domain? Верно две строки, укажите первую.")
write(P, 2, "Интерфейс репозитория и UseCase", "Напишите `abstract interface class GameRepository` с методом `Future<List<Game>> getGames()` и класс `GetGames` с полем `GameRepository _repo`, конструктором и методом `call()`, который возвращает `_repo.getGames()`.",
    "// ваш код\n",
    [("есть abstract interface class GameRepository", r"abstract\s+interface\s+class\s+GameRepository"), ("есть getGames", r"Future<List<Game>>\s+getGames\s*\("), ("есть класс GetGames", r"class\s+GetGames"), ("репозиторий передаётся в конструктор", r"GetGames\s*\(\s*this\._repo\s*\)|GetGames\s*\(\s*this\.\w+"), ("есть метод call", r"call\s*\(")],
    "abstract interface class GameRepository {\n  Future<List<Game>> getGames();\n}\n\nclass GetGames {\n  final GameRepository _repo;\n  GetGames(this._repo);\n\n  Future<List<Game>> call() => _repo.getGames();\n}",
    ["Интерфейс описывает метод без тела.", "UseCase получает репозиторий в конструкторе.", "call() можно вызывать как функцию: getGames()."],
    "UseCase зависит от интерфейса, а не от реализации: это принцип D из SOLID.")
bug(P, 3, "Нарушение принципа D", """
class LoginController {
  final LoginUseCase _login;
  LoginController(this._login);
  Future<void> run() async {
    final client = http.Client();
    await client.post(Uri.parse('https://api/login'));
  }
}""", 5, "Строка 5: контроллер сам создаёт http.Client и ходит в сеть. Должен вызывать UseCase, а реализацию получать через DI.", hint="Что контроллер делать не должен?")
fill(P, 3, "Буквы SOLID", """
// [[1]] — один класс, одна ответственность
// [[2]] — открыт для расширения, закрыт для изменения
// [[3]] — наследник заменяет родителя без поломок
// [[4]] — маленькие интерфейсы вместо одного большого
// [[5]] — зависим от абстракций, а не от реализаций""", [["S"], ["O"], ["L"], ["I"], ["D"]], "S — Single Responsibility, O — Open/Closed, L — Liskov, I — Interface Segregation, D — Dependency Inversion.", hint="S, O, L, I, D по порядку.")
write(P, 4, "Убрать дублирование рамок", """Сейчас в поле ввода пять одинаковых блоков:
OutlineInputBorder(borderSide: BorderSide(color: c, width: 1), borderRadius: BorderRadius.circular(8))
Напишите метод `OutlineInputBorder _border(Color c)` и покажите, как его использовать для `enabledBorder` и `focusedBorder`.""",
    "OutlineInputBorder _border(Color c) {\n  // ваш код\n}\n\n// использование:\n",
    [("есть метод _border", r"_border\s*\(\s*Color\s+\w+\s*\)"), ("создаётся OutlineInputBorder", r"OutlineInputBorder\s*\("), ("есть borderRadius.circular(8)", r"circular\s*\(\s*8"), ("метод используется для двух рамок", r"enabledBorder:\s*_border\([\s\S]*focusedBorder:\s*_border\(|focusedBorder:\s*_border\([\s\S]*enabledBorder:\s*_border\(")],
    "OutlineInputBorder _border(Color c) => OutlineInputBorder(\n      borderSide: BorderSide(color: c, width: 1),\n      borderRadius: BorderRadius.circular(8),\n    );\n\n// использование:\nenabledBorder: _border(grey),\nfocusedBorder: _border(primary),",
    ["Метод принимает цвет и возвращает рамку.", "Радиус и толщина общие, меняется только цвет.", "enabledBorder: _border(grey)."],
    "Это тот самый DRY, который оценивают: общее в одном месте, отличия в параметрах.")

# ================= Комментарии и логи =================
P = "docs-logging"
skills(P, ["Написать шапку класса и описание метода по шаблону.", "Подключить `logger` и использовать формат задания.", "Расставить 4 обязательные точки логирования."])
bug(P, 1, "Ошибка в шапке", """
// Репозиторий для работы с API игр.
// Дата создания: 11.11.2026
// Автор создания: 7
class GameRepositoryImpl {}""", 2, "Строка 2: формат даты в задании ДД-ММ-ГГГГ, то есть 11-11-2026, а не с точками.", hint="Сравните формат даты с заданием.")
write(P, 1, "Шапка и описание метода", "Напишите шапку для класса `AuthController` (описание, дата `11-11-2026`, автор — номер участника `7`) и описание метода `login(String email, String password)` (что делает, что принимает, что возвращает).",
    "// ваш код\nclass AuthController {\n  Future<bool> login(String email, String password) async {\n    return true;\n  }\n}\n",
    [("есть дата в формате ДД-ММ-ГГГГ", r"\d{2}-\d{2}-\d{4}"), ("есть 'Автор создания'", r"Автор создания"), ("есть 'Дата создания'", r"Дата создания"), ("описан вход параметров", r"(Принимает|принимает)"), ("описан возврат", r"(Возвращает|возвращает)")],
    "// Контроллер авторизации: отвечает за вход пользователя и вызывает сценарий Login.\n// Дата создания: 11-11-2026\n// Автор создания: 7\nclass AuthController {\n  // Выполняет вход пользователя.\n  // Принимает: [email] и [password].\n  // Возвращает: true, если вход выполнен.\n  Future<bool> login(String email, String password) async {\n    return true;\n  }\n}",
    ["Первая строка: что делает класс.", "Дата и автор отдельными строками.", "Над методом: «Принимает: ... Возвращает: ...»."],
    "Шапка класса и описание публичных методов обязательны в каждом файле.")
fill(P, 2, "Формат сообщений", """
static String _fmt(String tag, String event, String details) =>
    '[$tag]: $event [[1]] $details';

AppLog.[[2]]('LoginScreen', 'Нажатие', 'Кнопка «Войти»');   // нажатие кнопки — уровень
AppLog.[[3]]('HttpApiClient', 'Ответ', '200 /login');       // успешный ответ — уровень
AppLog.[[4]]('HttpApiClient', 'Ошибка', 'Нет интернета');   // ошибка — уровень""", [["—"], ["info"], ["debug"], ["error"]], "Формат: [Тег]: Событие — Детали (длинное тире). Нажатие — INFO, успешный ответ — DEBUG, ошибка — ERROR.", hint="Тире в формате задания длинное: —")
write(P, 3, "Запрос с логами и try/catch", "Напишите метод `Future<void> loadGames()`, который: логирует INFO начало запроса, вызывает `await repo.getGames()`, логирует DEBUG успех и в `catch` логирует ERROR. Используйте `AppLog.info`, `AppLog.debug`, `AppLog.error` в формате `(тег, событие, детали)`.",
    "Future<void> loadGames() async {\n  // ваш код\n}\n",
    [("есть AppLog.info", r"AppLog\.info\s*\("), ("есть AppLog.debug", r"AppLog\.debug\s*\("), ("есть AppLog.error", r"AppLog\.error\s*\("), ("есть try и catch", r"try\s*\{[\s\S]*catch"), ("есть await repo.getGames()", r"await\s+repo\.getGames\s*\(")],
    "Future<void> loadGames() async {\n  AppLog.info('GameController', 'Запрос', 'Загрузка списка игр');\n  try {\n    final games = await repo.getGames();\n    AppLog.debug('GameController', 'Ответ', 'Получено игр: ${games.length}');\n  } catch (e, st) {\n    AppLog.error('GameController', 'Ошибка', 'Не удалось загрузить игры', e, st);\n  }\n}",
    ["Начало — INFO до try.", "Успех — DEBUG внутри try после await.", "В catch всегда AppLog.error."],
    "Три точки на каждый запрос: начало (INFO), успех (DEBUG), ошибка (ERROR).")
fill(P, 3, "Четыре обязательные точки", """
// 1. Жизненный цикл экрана (initState, dispose) — уровень [[1]]
// 2. Начало сетевого запроса — уровень [[2]]
// 3. Нажатие критической кнопки — уровень [[3]]
// 4. Любой catch — уровень [[4]]""", [["INFO", "info"], ["INFO", "info"], ["INFO", "info"], ["ERROR", "error"]], "Жизненный цикл, начало запроса и нажатия — INFO; исключения — ERROR; успешный ответ — DEBUG.", hint="Три раза INFO и один раз ERROR.")
