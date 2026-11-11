# Подключение онлайн-режима (Supabase)

1. Создайте проект на https://supabase.com (бесплатного тарифа достаточно).
2. **SQL Editor → New query**: вставьте содержимое `setup.sql`, нажмите Run.
3. **Authentication → Providers → Email**: отключите «Confirm email» (иначе вход без подтверждения почты не сработает).
4. **Authentication → Users → Add user → Create new user** (отметьте «Auto Confirm User»), два пользователя:
   - `yuwnxu@flutter-prep.app`, пароль: тот, которым будет входить студентка (не короче 6 символов);
   - `asikpro13@flutter-prep.app`, пароль наставника.
5. **Project Settings → API**: скопируйте `Project URL` и ключ `anon public` в `src/config.json`:
   `{"url": "https://xxxx.supabase.co", "anonKey": "eyJ..."}`
6. `python3 build.py`, коммит, push. Pages обновится автоматически.

Ключ `anon` публичный по замыслу: данные защищены правилами (RLS) из `setup.sql`.
**Никогда не вставляйте в проект ключ `service_role`.**
