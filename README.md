# QCU Parking Management System (Flask + SQLite)

## BEFORE RUNNING, OPEN TERMINAL 
    cd qcu-parking-system
    then run Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    press Y if prompted to confirm
    
## Run it
    python -m venv .venv
    .venv\Scripts\activate          (Windows)   |   source .venv/bin/activate   (Mac/Linux)
    pip install -r requirements.txt
    python app.py
The first start downloads the plate-reading model (needs internet, one time only).
Open http://127.0.0.1:5000 and sign in with **admin / parking2026**.

## How it works
- `app.py` - Flask server: login (hashed password), `/api/state` (read/save), serves the pages.
- `parking.db` - SQLite database, created automatically on first run
  (tables: admins, users, vehicles, records, settings).
- `static/` - the original HTML/CSS/JS. `app.js` now loads and saves data through the API.

## Change the admin password
Delete `parking.db`, then run with `ADMIN_PASSWORD=yourpassword python app.py`
(on Windows PowerShell: `$env:ADMIN_PASSWORD="yourpassword"; python app.py`).

## Live plate recognition
1. Sign in, open **Gate monitor**, click **Start camera**, and allow camera access.
2. Hold a plate (printed or on a phone screen) in front of the webcam.
3. About once a second a frame is sent to `/api/recognize` (EasyOCR in `plate_reader.py`).
   When the same plate is read twice in a row, the normal gate decision runs
   (authorized / not registered / unclear / duplicate).
- Use the address `http://127.0.0.1:5000` or `localhost`, not your network IP: browsers only allow the camera there.
- Plate format expected: 3 letters + 3 or 4 digits (e.g. NAB 1234). Edit `plate_reader.py` for other formats.
- The first camera start shows "Loading the plate recognition model" until EasyOCR is ready.
- Tips: good light, plate filling a third of the frame or more, little glare, camera held steady.
