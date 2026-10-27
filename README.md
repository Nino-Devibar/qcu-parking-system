# QCU Parking Management System (Flask + SQLite)

A web system that reads license plates from a live webcam, checks them against registered vehicles, and records entries, exits and parking history.

Follow the steps **in order**. Do not skip any step. Every command goes in the **VS Code terminal** (menu: **Terminal → New Terminal**).

---

## 0. What you need installed first (one time)

Install these, then **restart your computer** so Windows can find them.

| Program | Where to get it | Notes |
|---|---|---|
| **Python 3.13** | python.org/downloads | On the first installer screen, tick **"Add python.exe to PATH"**. Use 3.13, not 3.14 or newer. |
| **Git** | git-scm.com/download/win | Keep all default options. |
| **VS Code** | code.visualstudio.com | Then install the **Python** extension (Microsoft) from the Extensions tab. |

You also need a **webcam** and an **internet connection** (the first start downloads a model).

Check the installs. Open a terminal in VS Code and run these. Each must print a version number:

```
python --version
git --version
```

If either says "not recognized", the program is not installed correctly. Close VS Code, restart the computer, and try again.

---

## 1. Get the code (one time)

1. Accept the invitation to the repository (check your email, or github.com/notifications).
2. In VS Code press `Ctrl+Shift+P`, type **Git: Clone**, and press Enter.
3. Paste the repository link and press Enter.
4. Choose a folder on your computer (for example `C:\Projects`). Do **not** use a OneDrive folder.
5. When VS Code asks "Would you like to open the cloned repository?", click **Open**.
6. If a browser window asks you to sign in to GitHub, sign in and click **Authorize**.

You should now see the project files (`app.py`, `static`, `plate_reader.py`, and so on) in the left panel.

---

## 2. Set up Python for this project (one time)

Open a new terminal in VS Code (**Terminal → New Terminal**). The path shown must end with `qcu-parking-system`. Then run the commands below **one at a time**, and wait for each to finish.

**Step 2.1** Allow PowerShell to run the setup script (Windows only):

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Press `Y` and Enter if it asks.

**Step 2.2** Create the project's private Python environment:

```
python -m venv .venv
```

**Step 2.3** Turn it on:

```
.venv\Scripts\activate
```

You should now see **(.venv)** at the start of the terminal line. **If you do not see it, stop. Do not go on.**

**Step 2.4** Install the required packages:

```
pip install -r requirements.txt
```

This takes several minutes because it downloads the plate-reading software (a few hundred MB). Wait until you get the cursor back.

---

## 3. Run the system

Each time you want to run it:

1. Open a terminal in the project folder.
2. Make sure `(.venv)` shows at the start of the line. If not, run `.venv\Scripts\activate`.
3. Run:

```
python app.py
```

4. **Wait.** The first time, it downloads the plate-reading model, so it can take a few minutes. When it is ready, the terminal shows `Running on http://127.0.0.1:5000`.
5. Open your browser (Chrome or Edge) and go to exactly:

```
http://127.0.0.1:5000
```

6. Sign in with:
   - Username: `admin`
   - Password: `parking2026`

To **stop** the system: click the terminal and press `Ctrl+C`.

> The system starts **empty**. Before it can recognize any vehicle, add people first (**Manage users → Add user**), then their plates (**Vehicles → Add vehicle**).

---

## 4. Use the live camera

1. Sign in and open **Gate monitor**.
2. Click **Start camera** and click **Allow** when the browser asks for camera access.
3. Hold a plate in front of the webcam. It can be printed or shown on a phone.
4. The plate number and confidence appear over the video. When the same plate is read twice in a row, the system decides: authorized, not registered, unclear, or already inside.

Rules for the camera to work:
- Use the address `http://127.0.0.1:5000` or `localhost`. Do **not** use your network IP address, because the browser will block the camera.
- Plate format: 3 letters + 3 or 4 digits (example: `NAB 1234`).
- Use good light, little glare, and a steady camera. The plate should fill at least a third of the picture.
- Reading takes 1 to 3 seconds per picture on a normal laptop. This is normal.
- The first time you click Start camera, it may say "Loading the plate recognition model". Wait for it to finish.

---

## 5. Working together with Git

**Before you start working, always pull** (get everyone else's changes):

1. Click the **sync icon** (two circling arrows) in the bottom-left corner of VS Code. Or run `git pull`.

**After you finish a change, commit and push** (share your changes):

1. Press `Ctrl+K` then `S` to save all files.
2. Click the **Source Control** icon in the left bar (the branching icon).
3. Check the list of changed files. It must **not** include `parking.db` or anything from `.venv`.
4. Type a short message that says what you changed (example: `Fix plate confidence slider`).
5. Click **Commit**. If it asks to stage changes, click **Yes**.
6. Click **Sync Changes**.

Rules:
- **Pull first, push often.** Do not work for days without syncing.
- **Never upload `parking.db`.** It holds the real users and vehicles. Each person has their own copy, created automatically.
- If VS Code shows a **merge conflict** (it shows "Accept Current / Accept Incoming / Accept Both"), do not guess. Ask the team before choosing.
- If two people edit `static/app.js` at the same time, conflicts are likely. Tell the team which part you are changing.

---

## 6. Common problems

| What you see | What to do |
|---|---|
| `python` or `git` is "not recognized" | It is not installed, or VS Code was open during install. Close VS Code, restart the computer, and try again. For Python, reinstall and tick "Add python.exe to PATH". |
| "running scripts is disabled on this system" when you activate | Run the command from step 2.1, then try again. |
| No `(.venv)` at the start of the line | Run `.venv\Scripts\activate`. |
| `No module named flask` (or `easyocr`, `cv2`) | The packages are not installed, or `(.venv)` is off. Turn it on, then run `pip install -r requirements.txt`. |
| `pip install` fails with a very long red error | You may have a Python version newer than 3.13. Install Python 3.13 and repeat step 2 (delete the `.venv` folder first). |
| `Address already in use` / port 5000 busy | The system is already running in another terminal. Stop it with `Ctrl+C` there, or close that terminal. |
| The page does not open | Make sure `python app.py` is still running, and that you typed `http://127.0.0.1:5000`. |
| Cannot log in | Username `admin`, password `parking2026`. If someone changed it, see "Change the admin password" below. |
| Camera does not start | Click **Allow** when asked. Close other programs using the webcam (Zoom, Teams). Use Chrome or Edge, and the address `http://127.0.0.1:5000`. |
| "Loading the plate recognition model" never ends | You need internet for the first start. Stop with `Ctrl+C`, check your connection, and run `python app.py` again. |
| Camera runs but never reads the plate | Better light, less glare, bring the plate closer, hold it steady. |
| You changed `app.js` but the browser shows the old page | Press `Ctrl+F5` to force a full reload. |
| Users or vehicles you added are gone | You may have deleted `parking.db`. It is recreated empty on the next start. |

---

## 7. How it works (for developers)

- `app.py` - Flask server: login (hashed password), `/api/state` (read and save data), `/api/recognize` (receives one camera picture and returns the plate), and serves the pages.
- `plate_reader.py` - reads the plate from the picture with EasyOCR and fixes common mixups (such as `O`/`0` and `B`/`8`) by position.
- `parking.db` - SQLite database, created automatically on first run. Tables: `admins`, `users`, `vehicles`, `records`, `settings`. It is not stored in Git.
- `static/` - the web pages (`index.html`, `styles.css`, `app.js`, `assets/`). `app.js` loads and saves data through the API, and sends camera pictures to `/api/recognize`.

## Change the admin password

1. Stop the system (`Ctrl+C`).
2. Delete the `parking.db` file. **This also deletes all users, vehicles and records.**
3. Run (PowerShell):

```
$env:ADMIN_PASSWORD="your-new-password"; python app.py
```

Before using the system for real, also set your own `SECRET_KEY` the same way (`$env:SECRET_KEY="a-long-random-text"`).
