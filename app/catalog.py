import json
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path


CATALOG_PATH = Path(__file__).resolve().parent / "data" / "unidades.json"


@lru_cache(maxsize=1)
def get_units() -> list[dict[str, str]]:
    names = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    totals = Counter(names)
    seen: defaultdict[str, int] = defaultdict(int)
    units = []
    for index, name in enumerate(names, start=1):
        seen[name] += 1
        display_name = f"{name} ({seen[name]})" if totals[name] > 1 else name
        units.append({"id": f"U{index:04d}", "name": name, "display_name": display_name})
    return sorted(units, key=lambda unit: (unit["name"], unit["id"]))


def unit_by_id(unit_id: str) -> dict[str, str] | None:
    return next((unit for unit in get_units() if unit["id"] == unit_id), None)

