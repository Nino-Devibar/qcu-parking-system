"""QCU Parking Management System - Flask + SQLite backend.

Run:  python app.py   then open http://127.0.0.1:5000
Default admin login: admin / parking2026  (change it below or via ADMIN_PASSWORD)
"""
import os
import sqlite3
from functools import wraps

import numpy as np
from flask import Flask, g, jsonify, request, send_from_directory, session
import plate_reader
from werkzeug.security import check_password_hash, generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "parking.db")

app = Flask(__name__, static_folder="static", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "change-this-secret-before-deploying")

SCHEMA = """
CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Student','Faculty','Staff')),
  status TEXT NOT NULL CHECK (status IN ('Active','Inactive')));
CREATE TABLE IF NOT EXISTS vehicles (
  plate TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active','Inactive')));
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY, plate TEXT NOT NULL, owner TEXT, type TEXT,
  entry TEXT, exit TEXT, result TEXT NOT NULL, note TEXT DEFAULT '', reviewed INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""

SEED_USERS = []
SEED_VEHICLES = []
DEFAULT_SETTINGS = {"autoOpen": True, "autoClose": 8, "threshold": 85, "retention": "1 year"}


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    if not conn.execute("SELECT 1 FROM admins").fetchone():
        pw = os.environ.get("ADMIN_PASSWORD", "parking2026")
        conn.execute("INSERT INTO admins VALUES (?,?)", ("admin", generate_password_hash(pw)))
        conn.executemany("INSERT INTO users VALUES (?,?,?,?)", SEED_USERS)
        conn.executemany("INSERT INTO vehicles VALUES (?,?,?)", SEED_VEHICLES)
        import json
        conn.executemany("INSERT INTO settings VALUES (?,?)",
                         [(k, json.dumps(v)) for k, v in DEFAULT_SETTINGS.items()])
    conn.commit()
    conn.close()


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("admin"):
            return jsonify(error="Not logged in"), 401
        return fn(*a, **kw)
    return wrapper


@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    row = db().execute("SELECT * FROM admins WHERE username=?",
                       (str(data.get("username", "")).strip(),)).fetchone()
    if not row or not check_password_hash(row["password_hash"], str(data.get("password", ""))):
        return jsonify(error="Incorrect username or password."), 401
    session["admin"] = row["username"]
    return jsonify(ok=True)


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/state")
@login_required
def get_state():
    import json
    c = db()
    return jsonify(
        users=[dict(r) for r in c.execute("SELECT id,name,role,status FROM users ORDER BY rowid")],
        vehicles=[{"plate": r["plate"], "userId": r["user_id"], "status": r["status"]}
                  for r in c.execute("SELECT * FROM vehicles ORDER BY rowid")],
        records=[{**dict(r), "reviewed": bool(r["reviewed"])}
                 for r in c.execute("SELECT * FROM records ORDER BY id")],
        settings={r["key"]: json.loads(r["value"]) for r in c.execute("SELECT * FROM settings")},
    )


@app.put("/api/state")
@login_required
def put_state():
    import json
    d = request.get_json(silent=True) or {}
    try:
        users = [(u["id"], u["name"], u["role"], u["status"]) for u in d["users"]]
        vehicles = [(v["plate"], v["userId"], v["status"]) for v in d["vehicles"]]
        records = [(r["id"], r["plate"], r.get("owner"), r.get("type"), r.get("entry"),
                    r.get("exit"), r["result"], r.get("note", ""), int(bool(r.get("reviewed"))))
                   for r in d["records"]]
        settings = [(k, json.dumps(v)) for k, v in d["settings"].items()]
    except (KeyError, TypeError):
        return jsonify(error="Invalid data"), 400
    c = db()
    try:
        with c:  # one transaction: all or nothing
            for t in ("users", "vehicles", "records", "settings"):
                c.execute(f"DELETE FROM {t}")
            c.executemany("INSERT INTO users VALUES (?,?,?,?)", users)
            c.executemany("INSERT INTO vehicles VALUES (?,?,?)", vehicles)
            c.executemany("INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?)", records)
            c.executemany("INSERT INTO settings VALUES (?,?)", settings)
    except sqlite3.IntegrityError as e:
        return jsonify(error=str(e)), 400
    return jsonify(ok=True)


@app.post("/api/recognize")
@login_required
def recognize():
    """Receive one camera frame (JPEG bytes) and return the plate it contains, if any."""
    st = plate_reader.status()
    if st["error"]:
        return jsonify(error=st["error"]), 503
    if not st["ready"]:
        return jsonify(loading=True)
    import cv2
    img = cv2.imdecode(np.frombuffer(request.get_data(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return jsonify(error="Bad image"), 400
    return jsonify(plate_reader.read_plate(img))


init_db()
plate_reader.start_loading()

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
