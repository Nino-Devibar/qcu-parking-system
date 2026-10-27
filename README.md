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

### 1.1 Get the repository link

---

### 1.2 Download it into VS Code

1. In VS Code press `Ctrl+Shift+P`, type **Git: Clone**, and press Enter.
2. Paste the link you copied (`Ctrl+V`) and press Enter.
3. Choose a folder on your computer (for example `C:\Projects`). Do **not** use a OneDrive folder.
4. When VS Code asks "Would you like to open the cloned repository?", click **Open**.

---

## 2. Set up Python for this project (one time)

Open a new terminal in VS Code. 
Run `cd qcu-parking-system`
Then run the commands below **one at a time**, and wait for each to finish.

**Step 2.1 IMPORTANT**  Allow PowerShell to run the setup script:

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Press `Y` if prompted to confirm.

**Step 2.2** Create the project's private Python environment:

```
python -m venv .venv
```

**Step 2.3** Turn it on:

```
.venv\Scripts\activate
```

You should now see **(.venv)** at the start of the terminal line.

**Step 2.4** Install the required packages:

```
pip install -r requirements.txt
```

---

## 3. Run the system
```
python app.py
```

## PS: Every time you want to run it:

1. Open a terminal in the project folder.
2. Make sure `(.venv)` shows at the start of the line. If not, run `.venv\Scripts\activate`.
3. Run:

```
python app.py
```

4. **Output** The first time, it downloads the plate-reading model, so it can take a few minutes. When it is ready, the terminal shows `Running on http://127.0.0.1:5000`.
5. Open your browser (Chrome or Edge) and go to exactly:
6. 
```
http://127.0.0.1:5000
```

6. Sign in
   
To **stop** the system: click the terminal and press `Ctrl+C`.

> The system starts **empty**. Before it can recognize any vehicle, add people first (**Manage users → Add user**), then their plates (**Vehicles → Add vehicle**).

---

# IMPORTANT!

**Before you start working, always pull** (get everyone else's changes):

1. Click the **sync icon** in of VS Code. Or run `git pull`.

**After you finish a change, commit and push** (share your changes):

1. Press `Ctrl+K` then `S` to save all files.
2. **Commit**. If it asks to stage changes, click **Yes**.

Rules:
- **Pull first, push often.** Do not work for days without syncing.
- **Never upload `parking.db`.** It holds the real users and vehicles. Each person has their own copy, created automatically.
- If two people edit `static/app.js` at the same time, conflicts are likely. Tell the team which part you are changing.

---
