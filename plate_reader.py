"""Live license plate reading (EasyOCR). Format: 3 letters + 3 or 4 digits, e.g. NAB 1234."""
import re
import threading

_reader = None
_lock = threading.Lock()
_state = {"ready": False, "error": None}

ALLOW = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
# characters OCR often mixes up, depending on whether the slot should be a letter or a digit
TO_LETTER = {"0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "4": "A", "6": "G"}
TO_DIGIT = {"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "S": "5", "B": "8", "Z": "2", "G": "6"}


def _load():
    global _reader
    try:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        _state["ready"] = True
    except Exception as exc:  # missing package, no internet for the first model download, ...
        _state["error"] = f"Plate recognition is not available: {exc}"


def start_loading():
    """Load the OCR model in the background so the first camera frame is not slow."""
    threading.Thread(target=_load, daemon=True).start()


def status():
    return dict(_state)


def _fix(s):
    """Turn a 6-7 character string into 'ABC 1234' if it can be one, else None."""
    if len(s) not in (6, 7):
        return None
    letters = "".join(TO_LETTER.get(c, c) if c.isdigit() else c for c in s[:3])
    digits = "".join(TO_DIGIT.get(c, c) if c.isalpha() else c for c in s[3:])
    if re.fullmatch(r"[A-Z]{3}", letters) and re.fullmatch(r"\d{3,4}", digits):
        return f"{letters} {digits}"
    return None


def best_plate(results):
    """results: [(bbox_points, text, confidence)] from OCR. Returns (plate, conf, bbox) or None."""
    items = []
    for pts, text, conf in results:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        clean = re.sub(r"[^A-Z0-9]", "", text.upper())
        if clean:
            items.append({"t": clean, "c": float(conf), "x0": min(xs), "y0": min(ys),
                          "x1": max(xs), "y1": max(ys)})
    items.sort(key=lambda i: (round((i["y0"] + i["y1"]) / 2 / 40), i["x0"]))

    groups = [[i] for i in items]                      # single text pieces
    groups += [items[k:k + 2] for k in range(len(items) - 1)]   # "ABC" + "1234" read separately
    groups += [items[k:k + 3] for k in range(len(items) - 2)]

    best = None
    for grp in groups:
        joined = "".join(i["t"] for i in grp)
        conf = sum(i["c"] for i in grp) / len(grp)
        for size in (7, 6):
            for start in range(0, len(joined) - size + 1):
                plate = _fix(joined[start:start + size])
                if plate:
                    exact = 0.05 if len(joined) == size else 0   # prefer text that is only the plate
                    score = conf + exact
                    if not best or score > best[0]:
                        box = (min(i["x0"] for i in grp), min(i["y0"] for i in grp),
                               max(i["x1"] for i in grp), max(i["y1"] for i in grp))
                        best = (score, plate, conf, box)
    return None if not best else (best[1], best[2], best[3])


def read_plate(img):
    """img: BGR image (numpy). Returns a dict for the browser."""
    h, w = img.shape[:2]
    with _lock:
        results = _reader.readtext(img, allowlist=ALLOW)
    found = best_plate(results)
    if not found:
        return {"found": False}
    plate, conf, (x0, y0, x1, y1) = found
    return {"found": True, "plate": plate, "confidence": int(round(conf * 100)),
            "box": [x0 / w, y0 / h, (x1 - x0) / w, (y1 - y0) / h]}
