"""Build the app's runtime artifacts from the local-only MR4 extract.

    python tools/build_data.py [--strict] [--no-images]

Reads  ../_mr4_extract/web/data.js            (window.MR4_DATA, tools/build_data_js.py in the extract)
       ../_mr4_extract/assets/renders/mr4/    (<species>_<Name>_35.png, 512 px 3/4 view, xgame_renders.py)
       ../_mr4_extract/assets/renders/evo/    (<evo breed>_<Name>_35.png: the 93 Evo imports, origin "evo" in data.js)
       ../_mr4_extract/data/monster/evo_species.json   (Evo import records: type + resists, tools/evo_records.py)
       ../_mrevo_extract/assets/icons/emblem_NN_<Name>.png   (Evo emblems for Maya / Piroro, _mrevo tools/evo_emblems.py)
       ../_mr4_extract/data/assets/icon_map.json + assets/icons/   (code-backed icon map, tools/icon_map.py)
       ../_mr4_extract/assets/renders/mr4_items/  (<id>_<Name>_35.png, tools/item_renders.py)
       ../_mr4_extract/data/assets/ui_panels.json + assets/icons/panel/   (rank letters + rank table, tools/layouts.py export)
Writes data/data.js                           (window.MR4_DATA, only the fields the app reads)
       assets/mon/<species>.webp              (detail image, 384 px)
       assets/mon/s/<species>.webp            (list thumbnail, 96 px)
       assets/item/<id>.webp, assets/item/s/<id>.webp   (item render, 256 / 64 px)
       assets/icon/waza/<set>_<slot>.png, assets/icon/ui/<tex>.png   (technique pictograms; element / category / type icons)
       assets/icon/panel/rank_<E..S>.png      (the game's rank letters)

Every image carries a provenance tag in data.js (`img`: "render:<file>" or "none:<reason>"); there is no fallback image.
--strict fails the build on any error: a reachable species without a render, a render whose name differs from the
species name, a dangling id reference, or an image path in data.js that does not exist on disk.
The extract itself is never copied here (G-extract-not-in-app).
"""
import hashlib, json, os, re, sys
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
X = os.path.join(os.path.dirname(APP), "_mr4_extract")
SRC = os.path.join(X, "web", "data.js")
RENDERS = os.path.join(X, "assets", "renders", "mr4")
EVO_RENDERS = os.path.join(X, "assets", "renders", "evo")
EVO_ICONS = os.path.join(os.path.dirname(APP), "_mrevo_extract", "assets", "icons")
EVO_EMBLEM = {"Maya": 23, "Piroro": 24}   # Evo emblem index = Evo birth-matrix row (evo_emblems.py)
ITEM_RENDERS = os.path.join(X, "assets", "renders", "mr4_items")
ICON_MAP = os.path.join(X, "data", "assets", "icon_map.json")
ICONS = os.path.join(X, "assets", "icons")
UI_PANELS = os.path.join(X, "data", "assets", "ui_panels.json")
MON = os.path.join(APP, "assets", "mon")
ITEM = os.path.join(APP, "assets", "item")
ITEM_DETAIL, ITEM_THUMB = 256, 64
STATS = ["LIF", "POW", "INT", "SKI", "SPD", "DEF"]  # Life first (user 2026-11-09)
DETAIL, THUMB = 384, 96

errors, warnings = [], []


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def load_js(path):
    s = open(path, encoding="utf-8").read()
    return json.loads(s[s.index("{"):s.rindex("}") + 1])


def crop_model(im, pad=6, haze=30):
    """Lit renders (Cycles shadow catcher): shadow pixels are black with partial alpha and a faint haze covers the whole
    frame. Drop the haze (alpha below `haze` on shadow pixels, the rest rescaled), then square-crop to the model only
    (alpha >= 250): the frame follows the monster, whatever shadow falls inside stays (user 2026-11-08)."""
    import numpy as np
    a = np.asarray(im).copy()
    sh = (a[..., :3].max(-1) < 8) & (a[..., 3] < 255)
    a[..., 3] = np.where(sh, np.clip((a[..., 3].astype(int) - haze) * 255 // (255 - haze), 0, 255), a[..., 3])
    im = Image.fromarray(a, "RGBA")
    box = Image.fromarray(((a[..., 3] >= 250) * 255).astype("uint8")).getbbox()
    if not box:
        return crop_alpha(im, pad)
    l, t, r, b = box
    side = max(r - l, b - t) + 2 * pad
    cx, cy = (l + r) // 2, (t + b) // 2
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(im.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)))
    return out


def crop_alpha(im, pad=6):
    box = im.getchannel("A").getbbox()
    if not box:
        return im
    l, t, r, b = box
    side = max(r - l, b - t) + 2 * pad
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(im.crop(box), ((side - (r - l)) // 2, (side - (b - t)) // 2))
    return out


def ver(rel):
    """A-cache-bust: app-relative path + ?v=<content md5[:8]>, so a re-rendered picture gets a new URL."""
    p = os.path.join(APP, rel)
    return rel + "?v=" + hashlib.md5(open(p, "rb").read()).hexdigest()[:8] if os.path.exists(p) else rel


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
            renders[int(m.group(1))] = (RENDERS, f, m.group(2))
    # Evo imports: render file keyed by the Evo breed id -> the app species id (data.js evoBreed)
    evo_sid = {s["evoBreed"]: s["id"] for s in d["species"] if s.get("origin") == "evo"}
    for f in os.listdir(EVO_RENDERS) if os.path.isdir(EVO_RENDERS) else []:
        m = re.match(r"(\d{3})_(.+)_35\.png$", f)
        if m and int(m.group(1)) in evo_sid:
            renders[evo_sid[int(m.group(1))]] = (EVO_RENDERS, f, m.group(2))

    im_map = json.load(open(ICON_MAP, encoding="utf-8"))
    errors.extend("icon_map: " + e for e in im_map["errors"])
    sk = {(r["genus"], r["slot"]): r for r in
          json.load(open(os.path.join(X, "data", "battle", "techniques.json"), encoding="utf-8"))["records"]}
    sp_raw = json.load(open(os.path.join(X, "data", "monster", "species.json"), encoding="utf-8"))
    sp_rows = sp_raw if isinstance(sp_raw, list) else sp_raw["records"]
    sp_rows = sp_rows + [dict(e["record"], index=e["mr4_index"]) for e in
                         json.load(open(os.path.join(X, "data", "monster", "evo_species.json"), encoding="utf-8"))["breeds"]]
    sp_type = {r["index"]: r["var_A9"] for r in sp_rows}
    # battle resists (extract 01_monster var 0x4A-0x54, 03_battle +0x994 / +0x998): element affinity by element id 1..8
    # (Fire, Ice, Thunder, Water, Wind, Earth, Heart, Magic) = vars 0x52, 0x51, 0x50, 0x4E, 0x4F, 0x4D, 0x53, 0x54;
    # category 1..3 resist = vars 0x4A, 0x4B, 0x4C
    sp_resist = {r["index"]: {"el": [r[f"var_{v}"] for v in ("52", "51", "50", "4E", "4F", "4D", "53", "54")],
                              "cat": [r[f"var_{v}"] for v in ("4A", "4B", "4C")]} for r in sp_rows}
    # special mains 0x26..0x2F have no breed id in data.js; their record's name provenance names it
    sp_special = {r["index"]: int(m.group(1), 16) for r in sp_rows
                  if (m := re.search(r"special main (0x[0-9A-Fa-f]+)", r.get("name_src") or ""))}
    shipped = []   # every icon / picture path data.js references (404 guard below)

    def icon(rel):   # rel = "ui/ui_116.png" | "waza/set00_00.png" -> app path (copied), provenance = icon_map row
        src = os.path.join(ICONS, rel)
        if not os.path.exists(src):
            errors.append(f"icon source missing: {rel}")
            return None
        dst = "assets/icon/" + rel.replace("ui/ui_", "ui/").replace("waza/set", "waza/").replace("breed/face_", "breed/")
        if True:   # icons are small: copied on every build, --no-images included
            os.makedirs(os.path.dirname(os.path.join(APP, dst)), exist_ok=True)
            Image.open(src).save(os.path.join(APP, dst), optimize=True)
        shipped.append(dst)
        return ver(dst)

    elements = [{"id": e["id"], "name": e["name"], "icon": icon(e["icon"])} for e in im_map["elements"]]
    categories = [{"id": c["id"], "icon": icon(c["icon"])} for c in im_map["categories"]]
    if [e["name"] for e in elements[1:]] != ["Fire", "Ice", "Thunder", "Water", "Wind", "Earth", "Heart", "Magic"]             or [c["id"] for c in categories[1:]] != [1, 2, 3]:
        errors.append("element / category ids no longer match the species resist order (sp_resist)")
    mon_types = [{"id": t["id"], "name": t["label"], "icon": icon(t["icon"])} for t in im_map["monster_types"]]
    # breed faces (res 0x8A, art-matched by id); "?" face 38 stands for the special monsters with no main breed
    breeds = [{"id": b["id"], "name": b["name"], "icon": icon(b["icon"])} for b in im_map["breeds"]]
    if [b["id"] for b in breeds] != [b["id"] for b in d["breeds"] if b.get("origin") != "evo"]:
        errors.append("icon_map breeds do not cover every breed")
    # Evo mains (Maya, Piroro): MR4 has no face art for them; their emblem = Evo's own (evo_face below, filled in
    # after the species loop)
    evo_mains = {b["id"]: b for b in d["breeds"] if b.get("origin") == "evo"}
    breeds += [{"id": b["id"], "name": b["name"], "icon": None, "origin": "evo"} for b in evo_mains.values()]
    face_rows = {b["tex"]: b for b in im_map["breeds"] + im_map["extra_faces"]}
    special_icon = icon(face_rows[0x26]["icon"])

    def faces(main, sub):
        # FUN_00296a30 (extract APP.md § Icon map): face index of the main and sub slot of the Mon info breed row
        if main in evo_mains or sub in evo_mains:          # resolved after the pictures exist (evo_face below)
            return [("evo", main) if main in evo_mains else faces(main, main)[0],
                    ("evo", sub) if sub in evo_mains else faces(0, sub)[1]]   # main 0: no Ape / special rule
        f_main = main
        if main == 0x1A and sub in (0x23, 0x24, 0x25):   # FUN_0028a6b0: Garu + Ape sub
            f_main = {0x25: 0x27, 0x24: 0x28, 0x23: 0x29}[sub]
        if 0x26 <= main < 0x30:                          # Mon_IsSpecialMain
            f_main = 0x21 + (main - 0x26) % 5
        f_sub = 0x26 if sub is None or 0x21 <= sub <= 0x25 or 0x26 <= sub < 0x30 else sub
        return [icon(face_rows[f_main]["icon"]), icon(face_rows[f_sub]["icon"])]
    ranges = {int(k): v for k, v in im_map["texts"]["technique_range"].items()}
    tech_icon = {t["id"]: t for t in im_map["techniques"]}

    # rank letters E..S (UI tex 0xD1 - rank) and the cmn_waza_rank table (extract APP.md § UI layouts)
    up = json.load(open(UI_PANELS, encoding="utf-8"))
    rank_icons = {r: icon(up["tex"]["rank_" + r]["png"]) for r in "EDCBAS"}
    wr = up["waza_rank"]

    def waza_rank(col, v):   # DB_CsvFindRow: first row r with t[r+1][col] > v, else the last row; 0..5 = E..S
        c = wr["cols"].index(col)
        return next((r for r in range(len(wr["rows"]) - 1) if wr["rows"][r + 1][c] > v), len(wr["rows"]) - 1)
    # Ape variants (Garu 0x1A + sub 0x23..0x25) use Garu's MONSKILL records but their own names (Mon_TechNameText:
    # msg 0xE3[0x22A + slot]) and pictures (last MON_WZP set, FUN_0028e938)
    msg_e3 = {e["i"]: e["text"] for e in
              json.load(open(os.path.join(X, "data", "core", "text_e3.json"), encoding="utf-8"))["strings"]}
    msg_db = {e["i"]: e["text"] for e in
              json.load(open(os.path.join(X, "data", "core", "text_db.json"), encoding="utf-8"))["strings"]}

    item_ids = {i["id"] for i in d["items"]}
    tech_ids = {t["id"] for t in d["techniques"]}
    trait_ids = {t["id"] for t in d["traits"]}
    # growth %: training gain x fitG / 20 with fitG = tra_fit_number_paraup[grade - 1] (res 0x49, Trn_GainFormula
    # 0x29f378), from the breed's own grade only: traits are swappable (mon_info SLOT_CHANGE_CRCT), so their grade lift
    # (cmn_hosei_fit) is left out (user 2026-11-08); extract MONSTER_DATA.md § Growth
    fit_up = [r[0] for r in json.load(open(os.path.join(X, "data", "raising", "49_tra_fit_number_paraup.json"),
                                           encoding="utf-8"))["data"]]

    def growth_pct(s):
        return {x: round((fit_up[s["grade"][x] - 1] / 20 - 1) * 100) for x in STATS}
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
            rdir, f, rname = renders[sid]
            if norm(rname) != norm(s["name"]):
                errors.append(f"species {sid} {s['name']}: render name {rname}")
            img = f"render:{os.path.basename(rdir)}/{f}"
            # Evo pictures are few: written whenever missing, --no-images included
            if images or (rdir == EVO_RENDERS and not os.path.exists(os.path.join(MON, "s", f"{sid}.webp"))):
                os.makedirs(os.path.join(MON, "s"), exist_ok=True)
                im = crop_model(Image.open(os.path.join(rdir, f)).convert("RGBA"))
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
                                          "lifespan", "traits", "favItems", "startTechs", "desc", "origin")} |
                       # Evo imports: where the numbers came from (stats / grade / trait: evo | rule | proposal | default)
                       ({"src": s["src"]} if s.get("src") else {}) |
                       {"img": img, "type": sp_type.get(sid), "resist": sp_resist.get(sid), "growthPct": growth_pct(s), "book": b["routes"] if b else None,
                        "pic": [ver(f"assets/mon/{sid}.webp"), ver(f"assets/mon/s/{sid}.webp")] if img.startswith("render:") else None,
                        "faces": faces(s["main"] if s["main"] is not None else sp_special.get(sid, 0x26), s["sub"]),
                        "disc": b["discObtainable"] if b else None})

    def evo_face(main):   # an Evo main's emblem = Evo's own (disc + ring baked in; extract _mrevo tools/evo_emblems.py)
        name = evo_mains[main]["name"]
        src = os.path.join(EVO_ICONS, f"emblem_{EVO_EMBLEM[name]:02d}_{name}.png")
        if not os.path.exists(src):
            errors.append(f"evo main {name}: {src} missing (run _mrevo_extract/tools/evo_emblems.py)")
            return None
        dst = f"assets/icon/evo/{name.lower()}.png"
        os.makedirs(os.path.join(APP, "assets", "icon", "evo"), exist_ok=True)
        Image.open(src).save(os.path.join(APP, dst), optimize=True)
        shipped.append(dst)
        return ver(dst)
    for s in species:
        s["faces"] = [evo_face(f[1]) if isinstance(f, tuple) else f for f in s["faces"]]
    for b in breeds:
        if b.get("origin") == "evo":
            b["icon"] = evo_face(b["id"])

    # ids 128-133: no name, not on the calendar (extract hygiene.txt)
    tournaments = [t for t in d["tournaments"] if t["name"]]
    for t in tournaments:
        for e in t["opponents"]:
            if e not in enemy_ids:
                errors.append(f"tournament {t['id']}: opponent {e} not found")
        if t["prizeItem"] is not None and t["prizeItem"] not in item_ids:
            errors.append(f"tournament {t['id']}: prize item {t['prizeItem']} not found")

    techniques = []
    for t in d["techniques"]:
        if t.get("origin") == "evo":   # Maya / Piroro: proposed MR4 numbers, no MR4 pictogram (icon none)
            techniques.append({k: t[k] for k in ("id", "genus", "slot", "name", "type", "guts", "hit", "sharpness",
                                                  "damage", "withering", "heal", "followup", "element", "category")} |
                              {"range": t["range"] if t["range"] in ranges else None,
                               "effect": msg_db.get(0xAF + t["effect"]) if 0 <= t["effect"] < 0x22 else None,
                               "rank": {c: waza_rank(c, t[c]) for c in wr["cols"]}, "nameApe": None,
                               "icon": None, "iconApe": None, "origin": "evo"})
            continue
        r = sk.get((t["genus"], t["slot"]))
        ti = tech_icon.get(t["id"])
        if r is None or ti is None or ti["name"] != t["name"]:
            errors.append(f"technique {t['id']} {t['name']}: MONSKILL record or icon map row missing / renamed")
            r, ti = r or {}, {}
        techniques.append({k: t[k] for k in ("id", "genus", "slot", "name", "type", "guts", "hit", "sharpness",
                                              "damage", "withering", "heal", "followup", "element", "category")} |
                          {"range": r.get("power_class") if r.get("power_class") in ranges else None,
                           # Mon info detail (FUN_0011c998): "Added Effects" = msg 0xDB[0xAF + effect_code] (< 0x22)
                           "effect": msg_db.get(0xAF + r["effect_code"]) if 0 <= r.get("effect_code", -1) < 0x22 else None,
                           "rank": {c: waza_rank(c, t[c]) for c in wr["cols"]},
                           "nameApe": msg_e3.get(0x22A + t["slot"]) if t["genus"] == 0x1A else None,
                           "icon": icon(ti["icon"]) if ti.get("icon") else None,
                           "iconApe": icon(ti["icon_ape"]) if ti.get("icon_ape") else None})

    item_renders = {}
    if os.path.isdir(ITEM_RENDERS):
        for f in os.listdir(ITEM_RENDERS):
            m = re.match(r"(\d{3})_(.+)_35\.png$", f)
            if m:
                item_renders[int(m.group(1))] = (f, m.group(2))
    if images:
        os.makedirs(os.path.join(ITEM, "s"), exist_ok=True)
    model_of = {i["id"]: i["model_file"] for i in im_map["items"]}
    items = []
    for i in d["items"]:
        iid = i["id"]
        if model_of.get(iid) is None:
            img = "none:no-model"
            if i["name"] and i["name"] != "(NONE)":
                warnings.append(f"item {iid} {i['name']}: {img}")
        elif iid in item_renders:
            f, rname = item_renders[iid]
            if norm(rname) != norm(i["name"]):
                errors.append(f"item {iid} {i['name']}: render name {rname}")
            img = f"render:{f}"
            if images:
                im = crop_alpha(Image.open(os.path.join(ITEM_RENDERS, f)).convert("RGBA"))
                save_webp(im, os.path.join(ITEM, f"{iid}.webp"), ITEM_DETAIL)
                save_webp(im, os.path.join(ITEM, "s", f"{iid}.webp"), ITEM_THUMB)
            shipped += [f"assets/item/{iid}.webp", f"assets/item/s/{iid}.webp"]
        else:
            img = "none:missing-render"
            errors.append(f"item {iid} {i['name']}: model file {model_of[iid]} has no render")
        items.append({k: i[k] for k in ("id", "name", "category", "kind", "price", "desc")} | {"img": img,
                      "pic": [ver(f"assets/item/{iid}.webp"), ver(f"assets/item/s/{iid}.webp")] if img.startswith("render:") else None})

    out = {
        "meta": {"game": d["meta"]["game"], "status": d["meta"]["status"],
                 "source": d["meta"]["generatedAt"], "stats": STATS, "statNames": d["meta"]["statNames"],
                 "elements": elements, "categories": categories, "monTypes": mon_types, "ranges": ranges,
                 "specialIcon": special_icon, "rankIcons": rank_icons,
                 "texts": {"pow": msg_db[0x85], "int": msg_db[0x86], "guts": msg_db[0x4D], "effects": msg_db[0x4E],
                           "skills": msg_db[0x4B]}},
        "breeds": breeds,
        "species": species,
        "techniques": techniques,
        "traits": [{k: t[k] for k in ("id", "name", "desc")} for t in d["traits"]],
        "items": items,
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
    for p in sorted(set(shipped)):   # icons and item pictures
        if not os.path.exists(os.path.join(APP, p)):
            errors.append(f"{p} missing on disk")

    os.makedirs(os.path.join(APP, "data"), exist_ok=True)
    with open(os.path.join(APP, "data", "data.js"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("// Generated by tools/build_data.py from the MR4 datamine. Do not edit.\n")
        fh.write("window.MR4_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")

    sys.path.insert(0, os.path.join(os.path.dirname(APP), "tools", "app"))
    import stamp_cache   # A-cache-bust: index.html ?v= tokens follow the files just written
    print("stamp-cache:", stamp_cache.stamp(APP) or "already current")

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
