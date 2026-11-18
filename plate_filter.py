"""Pick the real plate number out of everything EasyOCR reads on a Philippine plate.

PH plates carry lots of small text (region, PILIPINAS, year, REGISTERED, DEALER...).
The plate number is always the LARGEST text, so we keep only text of about that height,
join pieces that sit on the same line, and check the result against PH formats.
"""
import re

TO_LETTER = {"0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B"}
TO_DIGIT = {"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "A": "4", "S": "5", "G": "6", "T": "7", "B": "8"}

# (letters, digits) layouts: car ABC 1234 / ABC 123, motorcycle 123 ABC, older AB 1234
LAYOUTS = [("LLLDDDD", "ABC 1234"), ("LLLDDD", "ABC 123"), ("DDDLLL", "123 ABC"), ("LLDDDD", "AB 1234"), ("LLDDD", "AB 123")]


def _box(b):
    xs = [p[0] for p in b]
    ys = [p[1] for p in b]
    return min(xs), min(ys), max(xs), max(ys)


def _fix(text, mask):
    out = []
    for ch, m in zip(text, mask):
        if m == "L" and ch.isdigit():
            out.append(TO_LETTER.get(ch, ch))
        elif m == "D" and ch.isalpha():
            out.append(TO_DIGIT.get(ch, ch))
        else:
            out.append(ch)
    return "".join(out)


def _as_plate(raw):
    t = re.sub(r"[^A-Z0-9]", "", raw.upper())
    for mask, _ in LAYOUTS:
        if len(t) == len(mask):
            f = _fix(t, mask)
            if all((c.isalpha() if m == "L" else c.isdigit()) for c, m in zip(f, mask)):
                if mask.startswith("LLL"):
                    return f[:3] + " " + f[3:]
                if mask.startswith("DDD"):
                    return f[:3] + " " + f[3:]
                return f[:2] + " " + f[2:]
    return None


def pick_plate(results):
    """results: EasyOCR readtext() output [(box, text, conf), ...].
    Returns (plate_text, confidence_0_to_1, (x1, y1, x2, y2)) or None."""
    items = []
    for b, text, conf in results:
        x1, y1, x2, y2 = _box(b)
        t = re.sub(r"[^A-Za-z0-9]", "", text)
        if t:
            items.append({"t": t.upper(), "c": float(conf), "x1": x1, "y1": y1, "x2": x2, "y2": y2, "h": y2 - y1})
    if not items:
        return None
    # the plate number is the tallest text; keep only text close to that height
    tall = max(i["h"] for i in items)
    big = [i for i in items if i["h"] >= 0.6 * tall]
    big.sort(key=lambda i: (i["y1"], i["x1"]))
    # group pieces on the same line (e.g. "123" and "ABC" read separately), then try each line
    lines = []
    for i in big:
        for ln in lines:
            cy = (ln[0]["y1"] + ln[0]["y2"]) / 2
            if abs((i["y1"] + i["y2"]) / 2 - cy) < 0.5 * tall:
                ln.append(i)
                break
        else:
            lines.append([i])
    best = None
    for ln in lines:
        ln.sort(key=lambda i: i["x1"])
        cand = [("".join(i["t"] for i in ln), ln)] + [(i["t"], [i]) for i in ln]
        for raw, parts in cand:
            p = _as_plate(raw)
            if p:
                conf = min(i["c"] for i in parts)
                box = (min(i["x1"] for i in parts), min(i["y1"] for i in parts), max(i["x2"] for i in parts), max(i["y2"] for i in parts))
                if best is None or conf > best[1]:
                    best = (p, conf, box)
    return best