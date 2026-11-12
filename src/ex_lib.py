"""Помощники для описания упражнений. Тип: fill, predict, bug, order, write."""
E = []          # все упражнения
S = {}          # навыки по темам: part -> [текст навыка, ...]
_n = {}

def skills(part, items):
    S[part] = items

def _id(part):
    _n[part] = _n.get(part, 0) + 1
    return "%s-e%d" % (part, _n[part])

def fill(part, skill, title, code, answers, why, hint="", rank=1):
    """code содержит пропуски [[1]], [[2]]...; answers: список списков допустимых ответов."""
    E.append(dict(id=_id(part), part=part, skill=skill, t="fill", title=title, code=code.strip("\n"), answers=answers, why=why, hint=hint, rank=rank))

def predict(part, skill, title, code, answer, why, hint="", rank=1):
    """Что выведет программа? answer: строка или список допустимых строк (строки разделены \\n)."""
    E.append(dict(id=_id(part), part=part, skill=skill, t="predict", title=title, code=code.strip("\n"), answer=answer if isinstance(answer, list) else [answer], why=why, hint=hint, rank=rank))

def bug(part, skill, title, code, line, why, hint=""):
    """Найдите строку с ошибкой (номер строки с 1)."""
    E.append(dict(id=_id(part), part=part, skill=skill, t="bug", title=title, code=code.strip("\n"), line=line, why=why, hint=hint))

def order(part, skill, title, lines, why, intro="", hint="", rank=1):
    """lines — правильный порядок; на экране показываются перемешанными."""
    E.append(dict(id=_id(part), part=part, skill=skill, t="order", title=title, lines=lines, why=why, intro=intro, hint=hint, rank=rank))

def write(part, skill, title, prompt, starter, checks, solution, hints, why=""):
    """Напишите код сами. checks: [(описание, regex JS)]; быстрая проверка по ключевым словам."""
    E.append(dict(id=_id(part), part=part, skill=skill, t="write", title=title, prompt=prompt, starter=starter.strip("\n"), checks=[{"label": l, "re": r} for l, r in checks], solution=solution.strip("\n"), hints=hints, why=why))
