"""Build the app's runtime artifacts from the local-only MR4 extract.

    python tools/build_data.py [--strict] [--no-images]

Reads  ../_mr4_extract/web/data.js            (window.MR4_DATA, tools/build_data_js.py in the extract)
       ../_mr4_extract/assets/renders/mr4/    (<species>_<Name>_35.png, 512 px 3/4 view, xgame_renders.py)
Writes data/data.js                           (window.MR4_DATA, only the fields the app reads)
       assets/mon/<species>.webp              (detail image, 384 px)
       assets/mon/s/<species>.webp            (list thumbnail, 96 px)

Every image carries a provenance tag in data.js (`img`: "render:<file>" or "none:<reason>"); there is no fallback image.
--strict fails the build on any error: a reachable species without a render, a render whose name differs from the
species name, a dangling id reference, or an image path in data.js that does not exist on disk.
The extract itself is never copied here (G-extract-not-in-app).
"""
import json, os, re, sys
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
X = os.path.join(os.path.dirname(APP), "_mr4_extract")
SRC = os.path.join(X, "web", "data.js")
RENDERS = os.path.join(X, "assets", "renders", "mr4")
MON = os.path.join(APP, "assets", "mon")
STATS = ["POW", "INT", "SKI", "SPD", "DEF", "LIF"]
DETAIL, THUMB = 384, 96

errors, warnings = [], []


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def load_js(path):
    s = open(path, encoding="utf-8").read()
    return json.loads(s[s.index("{"):s.rindex("}") + 1])


def crop_alpha(im, pad=6):
    box = im.getchannel("A").getbbox()
    if not box:
        return im
    l, t, r, b = box
    side = max(r - l, b - t) + 2 * pad
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(im.crop(box), ((side - (r - l)) // 2, (side - (b - t)) // 2))
    return out


def save_webp(im, path, size):
    im = im.copy()
    im.thumbnail((size, size), Image.LANCZOS)  # non-AI filter (G-no-ai-scaler)
    im.save(path, "WEBP", quality=88, method=4)


def main():
    strict = "--strict" in sys.argv
    images = "--no-images" not in sys.argv
    d = load_js(SRC)

    renders = {}
    for f in os.listdir(RENDERS):
        m = re.match(r"(\d{3})_(.+)_35\.png$", f)
        if m:
            renders[int(m.group(1))] = (f, m.group(2))

    item_ids = {i["id"] for i in d["items"]}
    tech_ids = {t["id"] for t in d["techniques"]}
    trait_ids = {t["id"] for t in d["traits"]}
    enemy_ids = {e["id"] for e in d["enemies"]}
    book = {b["species"]: b for b in d["book"]}

    if images:
        os.makedirs(os.path.join(MON, "s"), exist_ok=True)

    species = []
    for s in d["species"]:
        if not s["name"]:
            continue  # ids 340-345: no name, unreachable (extract hygiene.txt)
        sid = s["id"]
        if sid in renders:
            f, rname = renders[sid]
            if norm(rname) != norm(s["name"]):
                errors.append(f"species {sid} {s['name']}: render name {rname}")
            img = f"render:{f}"
            if images:
                im = crop_alpha(Image.open(os.path.join(RENDERS, f)).convert("RGBA"))
                save_webp(im, os.path.join(MON, f"{sid}.webp"), DETAIL)
                save_webp(im, os.path.join(MON, "s", f"{sid}.webp"), THUMB)
        else:
            img = "none:no-model-set" if s["main"] is None else "none:missing-render"
            (warnings if s["main"] is None else errors).append(f"species {sid} {s['name']}: {img}")
        for k, ids, pool in (("traits", s["traits"], trait_ids), ("favItems", s["favItems"], item_ids),
                             ("startTechs", s["startTechs"], tech_ids)):
            for i in ids or []:
                if i not in pool:
                    errors.append(f"species {sid}: {k} id {i} not found")
        b = book.get(sid)
        species.append({k: s[k] for k in ("id", "name", "main", "sub", "base", "grade", "growthMod", "growthType",
                                          "lifespan", "traits", "favItems", "startTechs")} |
                       {"img": img, "book": b["routes"] if b else None,
                        "disc": b["discObtainable"] if b else None})

    # ids 128-133: no name, not on the calendar (extract hygiene.txt)
    tournaments = [t for t in d["tournaments"] if t["name"]]
    for t in tournaments:
        for e in t["opponents"]:
            if e not in enemy_ids:
                errors.append(f"tournament {t['id']}: opponent {e} not found")
        if t["prizeItem"] is not None and t["prizeItem"] not in item_ids:
            errors.append(f"tournament {t['id']}: prize item {t['prizeItem']} not found")

    out = {
        "meta": {"game": d["meta"]["game"], "status": d["meta"]["status"],
                 "source": d["meta"]["generatedAt"], "stats": STATS, "statNames": d["meta"]["statNames"]},
        "breeds": d["breeds"],
        "species": species,
        "techniques": [{k: t[k] for k in ("id", "genus", "slot", "name", "type", "guts", "hit", "sharpness",
                                          "damage", "withering", "heal", "followup")} for t in d["techniques"]],
        "traits": [{k: t[k] for k in ("id", "name", "desc")} for t in d["traits"]],
        "items": [{k: i[k] for k in ("id", "name", "category", "kind", "price", "desc")} for i in d["items"]],
        "tournaments": [{k: t[k] for k in ("id", "name", "rank", "format", "entrants", "official", "monstersNeeded",
                                           "prizeMoney", "prizeItem", "opponents")} for t in tournaments],
        "calendar": d["calendar"],
        "enemies": [{k: e[k] for k in ("id", "name", "rank", "species", "stats")} for e in d["enemies"]],
    }

    for s in species:  # 404 guard: every image path the app will request exists
        if s["img"].startswith("render:"):
            for p in (f"{s['id']}.webp", f"s/{s['id']}.webp"):
                if not os.path.exists(os.path.join(MON, p)):
                    errors.append(f"species {s['id']}: assets/mon/{p} missing on disk")

    os.makedirs(os.path.join(APP, "data"), exist_ok=True)
    with open(os.path.join(APP, "data", "data.js"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// Generated by tools/build_data.py from the MR4 datamine. Do not edit.\n")
        fh.write("window.MR4_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")

    for w in warnings:
        print("warn ", w)
    for e in errors:
        print("ERROR", e)
    print(f"species {len(species)}, techniques {len(out['techniques'])}, items {len(out['items'])}, "
          f"tournaments {len(out['tournaments'])}; {len(errors)} errors, {len(warnings)} warnings")
    if strict and errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
