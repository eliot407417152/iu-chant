#!/usr/bin/env python3
"""把「iu專輯以及單曲.md」轉成後端使用的 catalog.json

用法：
    python tools/parse_catalog.py <md 路徑> backend/src/main/resources/seed/catalog.json

規則：
- 標題含「翻唱」的是翻唱專輯（花書籤系列），類型為 remake；類別寫「OST」的是電視劇 OST，類型為 ost
- 曲目沒有時長（未發行音源）時，寫成「編號. 曲名 — *(備註)*」，時長記為 0
- 每個 ### 標題是一張專輯／單曲：「類別《標題》（日期）」
- 曲目行：「編號. 曲名 — `m:ss`」，曲名用 ** 包起來代表主打歌
- 曲名後面的 (Feat. ...) / (With ...) 會拆成 featuring 欄位
- 曲名後面的 *(...)* 會變成 note（例如先行單曲、CD Only）
- 純音樂版 (Inst.) 不收錄
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]

HEAD = re.compile(r"^###\s+\d+\.\s+(.+?)《(.+)》（(\d{4})\.(\d{2})\.(\d{2})）")
TRACK = re.compile(r"^(\d+)\.\s+(.*?)\s+—\s+`(\d+):(\d{2})`(?:\s+\*\((.*?)\)\*)?\s*$")
TRACK_NO_TIME = re.compile(r"^(\d+)\.\s+(.*?)\s+—\s+\*\((.*?)\)\*\s*$")  # 沒有時長的曲目（未發行音源），durationSec 記為 0
ALBUM_NOTE = re.compile(r"^\*\((.+)\)\*$")
FEAT = re.compile(r"\s*\((?:Prod\. & Feat\.|Feat\.|With(?! Pianist))[^)]*\)")


def slugify(s: str) -> str:
    s = s.lower().replace("+", " plus ")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def english_slug(title: str) -> str:
    """純英文標題直接用；否則取第一個純英文的括號內容"""
    if not re.search(r"[\uac00-\ud7a3\u4e00-\u9fff]", title):
        return slugify(title)
    for p in re.findall(r"\(([^()]*)\)", title):
        p = p.split("/")[0].strip()  # 「(Hold My Hand / 牽起我的手)」只取斜線前面的英文
        if p.isascii() and re.search(r"[A-Za-z]", p):
            return slugify(p)
    return ""


def unique(slug: str, used: set, *suffixes: str) -> str:
    cand = slug
    for suf in suffixes:
        if cand and cand not in used:
            break
        cand = f"{slug}-{suf}" if slug else suf
    n = 2
    base = cand
    while cand in used:
        cand = f"{base}-{n}"
        n += 1
    used.add(cand)
    return cand


# 應援歌單（依序，1 號在最前面）。填的是歌曲 slug，找不到會直接報錯
CHANT_ORDER = [
    "shopper", "holssi", "i-stan-u", "lilac", "blueming", "bbibbi", "palette", "dlwlrma",
    "twenty-three", "the-red-shoes", "every-end-of-the-day", "you-i", "good-day",
    "marshmallow", "love-attack", "boo", "rock-ver",
]

albums, used_album, used_song = [], set(), set()
excluded = 0
cur = None

for raw in open(src, encoding="utf-8"):
    line = raw.rstrip("\n").strip()

    m = HEAD.match(line)
    if m:
        label, title, y, mo, d = m.groups()
        if label.strip() == "OST":
            typ = "ost"
        elif "翻唱" in label:
            typ = "remake"
        elif "正規" in label and "改版" in label:
            typ = "repackage"
        elif "正規" in label:
            typ = "studio"
        elif "迷你" in label:
            typ = "mini"
        else:
            typ = "single"
        slug = unique(english_slug(title), used_album, f"{y}")
        cur = {
            "slug": slug,
            "title": title,
            "typeLabel": label,
            "type": typ,
            "releaseDate": f"{y}-{mo}-{d}",
            "songs": [],
        }
        albums.append(cur)
        continue

    if cur is None:
        continue

    m = ALBUM_NOTE.match(line)
    if m:
        cur["note"] = m.group(1)
        continue

    m = TRACK.match(line)
    if m:
        no, text, mm, ss, note = m.groups()
    else:
        m = TRACK_NO_TIME.match(line)
        if not m:
            continue
        no, text, note = m.groups()
        mm, ss = "0", "0"
    if "(Inst.)" in text:
        excluded += 1
        continue

    title_track = "**" in text
    text = text.replace("**", "").strip()
    featuring = None
    fm = FEAT.search(text)
    if fm:
        featuring = fm.group(0).strip()[1:-1]
        text = (text[: fm.start()] + text[fm.end():]).strip()

    base = english_slug(text) or f'{cur["slug"]}-track-{no}'
    slug = unique(base, used_song, cur["slug"], f"track-{no}")
    song = {
        "slug": slug,
        "trackNo": int(no),
        "title": text,
        "durationSec": int(mm) * 60 + int(ss),
    }
    if title_track:
        song["titleTrack"] = True
    if featuring:
        song["featuring"] = featuring
    if note:
        song["note"] = note
    cur["songs"].append(song)

all_songs = {sg["slug"]: sg for a in albums for sg in a["songs"]}
missing = [x for x in CHANT_ORDER if x not in all_songs]
if missing:
    sys.exit(f"CHANT_ORDER 找不到這些歌曲 slug：{missing}")
for n, slug in enumerate(CHANT_ORDER, start=1):
    all_songs[slug]["chantOrder"] = n

with open(out, "w", encoding="utf-8") as f:
    json.dump(albums, f, ensure_ascii=False, indent=2)
    f.write("\n")

total = sum(len(a["songs"]) for a in albums)
for a in albums:
    print(f'{a["releaseDate"]}  {a["type"]:<9} {a["slug"]:<42} {len(a["songs"])} 首')
print("\n應援歌單：")
for slug in CHANT_ORDER:
    sg = all_songs[slug]
    print(f'  {sg["chantOrder"]:>2}. {slug:<22} {sg["title"]}')
print(f"\n共 {len(albums)} 張專輯／單曲、{total} 首歌（排除 Inst. {excluded} 首）")
