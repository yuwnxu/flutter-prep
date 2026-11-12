#!/usr/bin/env python3
"""Собирает content/*.md + src/* в один dist/index.html."""
import json, re, subprocess, pathlib, sys, html as H

root = pathlib.Path(__file__).parent
STAGES = [
 (0, "Старт", "Понять, что оценивают и по каким правилам.", "Прочитать карту чемпионата и составить список пакетов."),
 (1, "Основы программирования", "Алгоритмы, типы, условия, циклы, клиент и сервер.", "Решить 5 мелких задач на бумаге или в DartPad."),
 (2, "Язык Dart", "Синтаксис, ООП, асинхронность и JSON: основа любого кода во Flutter.", "Написать консольную программу: класс Player, список, fromJson/toJson, асинхронная загрузка."),
 (3, "Flutter и верстка", "Виджеты, состояние, формы, навигация и адаптивность.", "Собрать по Figma три экрана на двух размерах эмулятора."),
 (4, "Git и процесс", "Ветки спринтов, коммиты, pull request, теги и пакеты из Git.", "Создать репозиторий пакета, поставить тег и подключить его в приложение."),
 (5, "Архитектура и качество кода", "Три слоя, SOLID, DRY, комментарии и логи.", "Написать экран логина «с нуля» в слоях Domain, Data, Presentation."),
 (6, "Разборы спринтов", "Каждый спринт: что оценивают, порядок работы, код и частые ошибки.", "Пройти каждый спринт с секундомером и сравнить с чек-листом."),
 (7, "Финиш", "Тактика, приоритеты и подготовка комплекта шпаргалок.", "Провести полную репетицию спринтов 1–2 за отведённое время."),
]
HOURS = {"start":1,"programming":2,"dart-basics":4,"dart-oop":4,"dart-async":3,"flutter-basics":4,"flutter-ui":5,"adaptive":4,"git":2,"architecture":5,"docs-logging":2,"sprint1":6,"sprint2":6,"sprint3":6,"sprint4":7,"sprint5":4,"sprint6":4,"points":2,"task-explained":2,"glossary":1,"cheatsheet":1,"mistakes":2}

def parse(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1); meta[k.strip()] = v.strip()
    return meta, m.group(2)

parts = []
for f in sorted((root / "content").glob("*.md")):
    meta, body = parse(f)
    out = subprocess.run(["pandoc", "-f", "markdown-tex_math_dollars-smart-auto_identifiers", "-t", "html", "--no-highlight", "--wrap=none"],
                         input=body, capture_output=True, text=True, check=True).stdout
    text = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", out)))
    parts.append({"id": meta["id"], "stage": int(meta["stage"]), "title": meta["title"], "lead": meta["lead"],
                  "html": out, "text": text, "hours": HOURS[meta["id"]], "minutes": max(3, round(len(text.split()) / 160))})

quiz = json.loads((root / "src/quiz_all.json").read_text(encoding="utf-8"))
counters = {}
for q in quiz:
    counters[q["part"]] = counters.get(q["part"], 0) + 1
    q["id"] = "%s-%d" % (q["part"], counters[q["part"]])
    assert q["part"] in {p["id"] for p in parts}, q["part"]
sys.path.insert(0, str(root / "src"))
import ex_lib
for _m in ("ex_a", "ex_b", "ex_c", "ex_d"):
    __import__(_m)
ids = {p["id"] for p in parts}
for e in ex_lib.E:
    assert e["part"] in ids, e["id"]
    assert 1 <= e["skill"] <= len(ex_lib.S[e["part"]]), (e["id"], "skill")
    if e["t"] == "fill":
        n = len(re.findall(r"\[\[\d+\]\]", e["code"]))
        assert n and n == len(e["answers"]), (e["id"], "blanks", n, len(e["answers"]))
config = json.loads((root / "src/config.json").read_text(encoding="utf-8"))
users = json.loads((root / "src/users.json").read_text(encoding="utf-8"))
if config.get("url") and config.get("anonKey"):
    # онлайн-режим: вход проверяет Supabase, хэши паролей на сайт не попадают
    users = {k: {kk: vv for kk, vv in v.items() if kk != "hash"} for k, v in users.items()}
else:
    config = {}
data = {"parts": parts, "quiz": quiz, "users": users, "config": config, "exercises": ex_lib.E, "skills": ex_lib.S,
        "stages": [{"n": n, "title": t, "goal": g, "practice": p} for n, t, g, p in STAGES]}
blob = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
tpl = (root / "src/template.html").read_text(encoding="utf-8")
page = tpl.replace("/*STYLE*/", (root / "src/style.css").read_text(encoding="utf-8")) \
          .replace("/*DATA*/", blob).replace("/*APP*/", (root / "src/app.js").read_text(encoding="utf-8"))
(root / "dist").mkdir(exist_ok=True)
(root / "dist/index.html").write_text(page, encoding="utf-8")
print("parts", len(parts), "size KB", len(page.encode()) // 1024, "hours", sum(p["hours"] for p in parts))
