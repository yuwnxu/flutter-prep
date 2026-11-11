---
id: sprint2
stage: 6
title: Спринт 2: сетевой слой и тесты
lead: 1 ч 10 мин. Отдельная библиотека для REST API, 11 запросов, обработка ошибок и тесты. Максимум 20,89 балла.
---

## Что нужно сделать

| Часть | Баллы |
|---|---:|
| Нет интернета → вернуть ошибку | 0,70 |
| Ошибка сервера → вернуть ошибку | 0,84 |
| 11 запросов, по 1,10 за каждый | 12,10 |
| Архитектура: библиотека, SOLID, DRY | 0,5 + 1,0 + 0,5 |
| Тесты: 11 запросов, по 0,45 за каждый | 4,95 |
| Git (ветка, merge) | 0,30 |

**11 запросов:** авторизация, регистрация, изменение профиля, получение профиля, выход, создание игры, список игр, информация об игре, подключение к игре, статистика игрока, сохранение результата игры.

Это **самый выгодный спринт по соотношению баллы/время**: 20,89 балла за 70 минут, и все пункты однотипные. Сделав первый запрос «по шаблону», остальные добавляются за 2–3 минуты.

::: tip
Спринт 2 в вашей симуляции не проверялся, а он вторым по цене. Подготовьте шаблон и отрепетируйте его до автоматизма.
:::

## Требования к библиотеке

| Свойство | Как выполнить |
|---|---|
| Изолированность | Отдельный репозиторий и пакет |
| Абстрагированность | Приложение зависит от `abstract interface class`, а не от `http` или `dio` |
| Заменяемость | Реализация `HttpApiClient` может быть заменена на `DioApiClient` без правок приложения |
| Версионирование | `version:` в pubspec и теги `v1.0.0` |

## Структура пакета

```
network_layer/
  lib/
    network_layer.dart             # экспорт публичного API
    src/
      config/api_config.dart       # baseUrl, заголовки, таймауты (единый источник)
      client/api_client.dart       # abstract interface class
      client/http_api_client.dart  # реализация на пакете http
      errors/api_exception.dart    # NoInternet, Server, Timeout, Parse
      models/                      # DTO: UserDto, GameDto, StatsDto, ...
      api/auth_api.dart            # abstract + impl
      api/game_api.dart
      api/profile_api.dart
  test/
    auth_api_test.dart ...
```

## Ошибки

```dart
// Базовая ошибка сетевого слоя.
sealed class ApiException implements Exception {
  final String message;
  const ApiException(this.message);
  @override
  String toString() => message;
}

class NoInternetException extends ApiException {
  const NoInternetException() : super('Нет подключения к интернету');
}

class TimeoutApiException extends ApiException {
  const TimeoutApiException() : super('Превышено время ожидания');
}

class ServerException extends ApiException {
  final int statusCode;
  const ServerException(this.statusCode, String message) : super(message);
}

class ParseException extends ApiException {
  const ParseException() : super('Не удалось обработать ответ сервера');
}
```

## Конфиг и абстракция клиента

```dart
class ApiConfig {
  final String baseUrl;
  final Duration timeout;
  final Map<String, String> defaultHeaders;
  const ApiConfig({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 15),
    this.defaultHeaders = const {'Content-Type': 'application/json'},
  });
}

abstract interface class ApiClient {
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query});
  Future<Map<String, dynamic>> post(String path, {Object? body});
  Future<Map<String, dynamic>> put(String path, {Object? body});
  Future<Map<String, dynamic>> delete(String path);
  void setToken(String? token);
}
```

Для интерфейсов из задания (I из SOLID) можно разделить на `AuthApiClient`, `FileApiClient`. Минимум — отдельные `AuthApi`, `GameApi`, `ProfileApi` поверх одного `ApiClient`.

## Реализация на пакете http

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

// Реализация ApiClient поверх пакета http.
// Единая точка выполнения запросов, ошибок и логирования.
class HttpApiClient implements ApiClient {
  final ApiConfig _config;
  final http.Client _client;
  String? _token;

  // client можно подставить в тестах (MockClient)
  HttpApiClient(this._config, {http.Client? client}) : _client = client ?? http.Client();

  @override
  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        ..._config.defaultHeaders,
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('${_config.baseUrl}$path').replace(queryParameters: query);

  @override
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, () => _client.get(_uri(path, query), headers: _headers));

  @override
  Future<Map<String, dynamic>> post(String path, {Object? body}) => _send('POST', path,
      () => _client.post(_uri(path), headers: _headers, body: jsonEncode(body)));

  @override
  Future<Map<String, dynamic>> put(String path, {Object? body}) => _send('PUT', path,
      () => _client.put(_uri(path), headers: _headers, body: jsonEncode(body)));

  @override
  Future<Map<String, dynamic>> delete(String path) =>
      _send('DELETE', path, () => _client.delete(_uri(path), headers: _headers));

  // Единый обработчик: логирование, таймаут, преобразование ошибок (DRY).
  Future<Map<String, dynamic>> _send(
      String method, String path, Future<http.Response> Function() request) async {
    NetLog.info('HttpApiClient', 'Запрос', '$method $path'); // начало — INFO
    try {
      final response = await request().timeout(_config.timeout);
      final body = utf8.decode(response.bodyBytes);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        NetLog.debug('HttpApiClient', 'Ответ', '${response.statusCode} $path'); // успех — DEBUG
        if (body.isEmpty) return {};
        final decoded = jsonDecode(body);
        return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
      }

      // Код не 2xx — ошибка сервера: достаём message из тела, если оно есть
      final message = _extractMessage(body) ?? 'Ошибка сервера (${response.statusCode})';
      throw ServerException(response.statusCode, message);
    } on SocketException {
      NetLog.error('HttpApiClient', 'Ошибка', 'Нет интернета: $path');
      throw const NoInternetException();
    } on http.ClientException {
      NetLog.error('HttpApiClient', 'Ошибка', 'Нет соединения: $path');
      throw const NoInternetException();
    } on TimeoutException {
      NetLog.error('HttpApiClient', 'Ошибка', 'Таймаут: $path');
      throw const TimeoutApiException();
    } on FormatException {
      NetLog.error('HttpApiClient', 'Ошибка', 'Некорректный JSON: $path');
      throw const ParseException();
    } on ApiException {
      NetLog.error('HttpApiClient', 'Ошибка', 'Ответ сервера: $path');
      rethrow;
    }
  }

  String? _extractMessage(String body) {
    try {
      final json = jsonDecode(body);
      if (json is Map) return (json['message'] ?? json['error'])?.toString();
    } catch (_) {}
    return null;
  }
}
```

::: warn
Адреса, названия полей (`token`, `message`) и формат ответов зависят от выданного вам API. Внимательно прочитайте документацию/карточку запроса и сверяйте поля с реальным ответом (`curl` или Postman).
:::

## Модель, API и маппинг ответа

```dart
class UserDto {
  final String id;
  final String email;
  final String? name;
  final String? photoUrl;
  const UserDto({required this.id, required this.email, this.name, this.photoUrl});

  factory UserDto.fromJson(Map<String, dynamic> json) => UserDto(
        id: json['id'].toString(),
        email: json['email'] as String,
        name: json['name'] as String?,
        photoUrl: json['photo'] as String?,
      );
}

abstract interface class AuthApi {
  Future<AuthResultDto> login({required String email, required String password});
  Future<AuthResultDto> register({required String email, required String password});
  Future<void> logout();
}

class AuthApiImpl implements AuthApi {
  final ApiClient _client;
  AuthApiImpl(this._client);

  @override
  Future<AuthResultDto> login({required String email, required String password}) async {
    final json = await _client.post('/auth/login', body: {'email': email, 'password': password});
    return AuthResultDto.fromJson(json);
  }
  ...
}
```

Каждый следующий запрос: DTO + метод + строка в интерфейсе. Заведите шпаргалку-таблицу из 11 запросов (метод, путь, тело, ответ), как только получили документацию.

## Тестирование (модуль Е, 4,95 балла)

Тест-кейсы выдают в карточках. Пример из задания: «Успешный GET с десериализацией» — запускается мок-сервер, возвращается корректный JSON, проверяется код 200, содержимое модели и **адрес запроса**. В Dart мок-сервер заменяет `MockClient` из `package:http/testing.dart`.

```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:network_layer/network_layer.dart';

void main() {
  group('ProfileApi.getProfile', () {
    test('успешный GET с десериализацией', () async {
      // Предусловие: мок-сервер возвращает корректный JSON
      late http.Request captured;
      final mock = MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({'id': '123', 'email': 'a@b.ru', 'name': 'Аня'}),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });
      final client = HttpApiClient(const ApiConfig(baseUrl: 'https://test.local'), client: mock);
      final api = ProfileApiImpl(client);

      // Шаг: вызвать метод
      final user = await api.getProfile('123');

      // Ожидаемый результат
      expect(user.id, '123');
      expect(user.name, 'Аня');
      expect(captured.method, 'GET');
      expect(captured.url.path, '/users/123'); // мок зафиксировал правильный эндпоинт
    });

    test('ошибка сервера 500 → ServerException', () async {
      final mock = MockClient((_) async => http.Response('{"message":"fail"}', 500));
      final api = ProfileApiImpl(HttpApiClient(const ApiConfig(baseUrl: 'https://t'), client: mock));
      expect(() => api.getProfile('1'), throwsA(isA<ServerException>()));
    });

    test('нет интернета → NoInternetException', () async {
      final mock = MockClient((_) async => throw http.ClientException('offline'));
      final api = ProfileApiImpl(HttpApiClient(const ApiConfig(baseUrl: 'https://t'), client: mock));
      expect(() => api.getProfile('1'), throwsA(isA<NoInternetException>()));
    });
  });
}
```

Запуск: `flutter test`. На каждый из 11 запросов минимум: успех, ошибка сервера, нет интернета (то, что требуют тест-кейсы карточки). Тест по каждому запросу стоит 0,45, поэтому сначала сделайте **по одному успешному тесту на каждый запрос**, потом добавляйте ошибки.

Если используете `dio`, подменяйте адаптер (`http_mock_adapter`) или реализуйте `HttpClientAdapter`. Если вы пишете только на `http`, `MockClient` проще.

## Порядок на 70 минут

| Минуты | Действие |
|---|---|
| 0–5 | Репозиторий, ветка, пакет |
| 5–20 | Конфиг, ошибки, интерфейс клиента, реализация, логи |
| 20–45 | 11 запросов по шаблону (DTO + метод) |
| 45–65 | Тесты на каждый запрос |
| 65–70 | Тег, PR, merge, карточки |

## Чек-лист

- [ ] Приложение/тесты зависят от `ApiClient`/`AuthApi`, не от `http`.
- [ ] Нет сети → `NoInternetException`; код не 2xx → `ServerException(statusCode, message)`.
- [ ] URL, заголовки, таймаут — только в `ApiConfig`.
- [ ] Каждый запрос логируется: INFO старт, DEBUG успех, ERROR сбой.
- [ ] Тесты запускаются командой `flutter test` без сети.
- [ ] Версия и тег `v1.0.0`.
