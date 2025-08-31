
# MuseSlice

MuseSlice is a full‑stack audio separation app using signal analysis methods. Upload a song and it detects instrument groups (Vocals, Drums, Bass, Other), choose the groups you want, and download each separated track individually or as a single ZIP. The site includes authentication and a per‑user processing history so you can access results on any signed‑in device.

## Coding Languages
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Python Flask audio service (librosa‑based detection and simple separation filters)
- Database: SQLite via Prisma (users, sessions, per‑user processing history)
- Auth: NextAuth (credentials provider)




## Overview and Features
- Upload: WAV, MP3, FLAC, M4A, OGG
- Detect instruments: Vocals, Drums, Bass, Other with confidence scores
- Selective separation: Only process the groups you select
- Playback: In‑browser preview for each separated track
- Download: Per‑track download and a “Download All” ZIP (one click)
- Accounts: Register/sign in, view your per‑user history and download counts
- Cleanup: Backend cleanup of session files


## How It Works
- Detection (audio_service/app.py):
  - Loads the audio file with librosa
  - Computes spectral features (centroid, rolloff, bandwidth), tempo, and applies HPSS (harmonic/percussive source separation)
  - Derives confidences for broad groups:
    - Vocals: stronger harmonic energy
    - Drums: stronger percussive energy
    - Bass: energy in low‑frequency mel bands
    - Other: remaining harmonic energy
- Separation (audio_service/app.py):
  - Vocals: pre‑emphasis + harmonic isolation
  - Drums: percussive isolation
  - Bass: low‑frequency masking in the Short Time Fourier Transform domain
  - Other: harmonic isolation with different margins
- Data flow:
  - Frontend uploads to Flask for detection; Flask returns a session_id and detected instruments
  - Frontend posts the selected instruments back to Flask for separation; Flask writes WAVs and returns download URLs
  - Frontend records processing data to the Next.js API; the API saves per‑user records in SQLite via Prisma
  - Dashboard fetches per‑user records from the Next.js API to show history and stats



To run locally, there are some prerequisites for the environment
- Python 3.9+
- Node.js 18+
- npm

And follow the instructions below
1. Backend setup

run these comands on terminal:
```
cd audio_service
```
```
python3 -m venv .venv
```
```
Source .venv/bin/activate
```
```
python -m pip install --upgrade pip
```
```
pip install -r requirements.txt
```

2. Frontend setup

After having the backend running, type these commands on your terminal:
```
cd ..
```
```
npm install
```

3. Create database tables

Run:
```
npx prisma db push
```


4. Then you should be able to start the service

Backend:

```
cd audio_service
```
```
python3 app.py
```
then open http://localhost:5002/app-check for app check

Frontend:
```
npm run dev
```
The website should be launched in  http://localhost:3000

After running the first time, you can use the ```start_service.sh``` script which automaticallicaly launches both front and backend. Type the commands below in your terminal:
```
chmod +x start_services.sh
```
```
./start_services.sh
```
Note that this script assumes you’ve already installed backend dependencies once so its normal if you cannot run using the script for the first time


## Troubleshooting
If you run into errors, try the following fixes:
- *Audio service is not available. Please ensure the backend is running on port 5002.*
  - Start backend: 
  ```
  cd audio_service && source .venv/bin/activate && python3 app.py
  ```
  - App check: curl http://localhost:5002/app-check
  - Or use the helper: ./start_services.sh (assumes deps already installed)

- *Invalid prisma.user.findUnique() … The table main.User does not exist*
  - Create tables: 
  ```
  npx prisma db push
  ```
  - Restart the dev server 
  ```
  npm run dev
  ```

- *Ports already in use (3000/5002)*
  - Run these in the terminal
  ```
  lsof -ti:3000 | xargs kill -9
  ```
  ```
  lsof -ti:5002 | xargs kill -9
  ```

## Acknowledgments
- Librosa for audio analysis and utilities
- Next.js for the application framework
- Prisma for database access
- Inspiration from Spleeter (Deezer) for multi‑stem separation


## License
MIT License
