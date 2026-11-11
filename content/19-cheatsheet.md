---
id: cheatsheet
stage: 7
title: Шпаргалки: команды и сниппеты
lead: То, что нужно копировать быстро: команды, шаблоны файлов и кусочки кода для каждого спринта.
---

## Команды Flutter

```bash
flutter doctor                     # проверка окружения
flutter create my_app              # новый проект
flutter create --template=package uikit   # новая библиотека
flutter pub get                    # скачать пакеты
flutter pub add http               # добавить пакет в pubspec
flutter run                        # запуск на устройстве/эмуляторе
flutter run -d <id>                # конкретное устройство
flutter devices                    # список устройств
flutter analyze                    # статический анализ кода
flutter test                       # запустить тесты
flutter clean                      # очистить сборку (при странных ошибках)
flutter build apk --release        # собрать APK
dart format .                      # форматирование
```

## Команды Git

```bash
git clone <url>
git checkout -b sprint-1           # создать ветку
git status
git add .
git commit -m "feat: описание"
git push -u origin sprint-1
git log --oneline                  # хэши коммитов для карточки
git checkout main && git pull
git merge sprint-1                 # слить локально
git tag v1.0.0 && git push origin v1.0.0
git restore <файл>                 # откатить файл
git stash                          # спрятать изменения
```

## Шапка файла (шаблон)

```dart
// Краткое описание: за что отвечает класс (одна фраза).
// Дата создания: 11-11-2026
// Автор создания: <номер участника>
```

## Логгер (копируйте в проект)

```dart
import 'package:logger/logger.dart';

class AppLog {
  static final Logger _log = Logger(printer: SimplePrinter());
  static String _f(String t, String e, String d) => '[$t]: $e — $d';
  static void debug(String t, String e, String d) => _log.d(_f(t, e, d));
  static void info(String t, String e, String d) => _log.i(_f(t, e, d));
  static void error(String t, String e, String d, [Object? err, StackTrace? st]) =>
      _log.e(_f(t, e, d), error: err, stackTrace: st);
}
```

## Шаблон экрана с состоянием загрузки

```dart
sealed class ScreenState<T> {}
class Loading<T> extends ScreenState<T> {}
class Loaded<T> extends ScreenState<T> { final T data; Loaded(this.data); }
class Failed<T> extends ScreenState<T> { final String message; Failed(this.message); }

Widget body(ScreenState<List<Game>> s) => switch (s) {
  Loading() => const Center(child: CircularProgressIndicator()),
  Loaded(:final data) => ListView(children: data.map(GameCard.new).toList()),
  Failed(:final message) => Center(child: Text(message)),
};
```

## SnackBar ошибки на 5 секунд

```dart
void showError(BuildContext context, String text) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentSnackBar();
  m.showSnackBar(SnackBar(
    duration: const Duration(seconds: 5),
    content: Text(text),
    action: SnackBarAction(label: 'OK', onPressed: m.hideCurrentSnackBar),
  ));
}
```

## SharedPreferences

```dart
final prefs = await SharedPreferences.getInstance();
await prefs.setString('token', token);
final token = prefs.getString('token');
await prefs.remove('token');
await prefs.setBool('seen_onboarding', true);
```

## Работа с датами

```dart
final start = DateTime(d.year, d.month, d.day, t.hour, t.minute);
final remind = start.subtract(const Duration(hours: 1));
final iso = start.toUtc().toIso8601String();
final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
String two(int v) => v.toString().padLeft(2, '0');
String date = '${two(d.day)}-${two(d.month)}-${d.year}';
```

## Тест с MockClient

```dart
final mock = MockClient((req) async {
  expect(req.url.path, '/games');
  return http.Response(jsonEncode([{'id': '1'}]), 200);
});
```

## Манифесты

Android (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

iOS (`ios/Runner/Info.plist`):

```xml
<key>NSCameraUsageDescription</key><string>Нужна камера для фото профиля</string>
<key>NSPhotoLibraryUsageDescription</key><string>Нужна галерея для фото профиля</string>
```

## Быстрая проверка перед сдачей

```bash
grep -rL "Автор создания" lib   # файлы без шапки
grep -rn "print(" lib           # забытые print
flutter analyze
flutter test
git status
```
