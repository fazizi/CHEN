# Exam Schedule Coordinator — AUB CHEN

Shared scheduling tool for the Department of Chemical Engineering at the American University of Beirut. All users see and edit the same exam schedule in real time via Firebase.

**Live URL:** `https://fazizi.github.io/CHEN/`

## Features

- Add, edit, and delete exam entries (professor, course, year group, date/time, duration)
- Filter schedule by year of study and month
- Automatic conflict detection (overlapping exams for the same year group)
- Close-scheduling warnings (exams within 2 hours for the same year group)
- Real-time shared data — all users see updates instantly

## Firebase Setup (one-time, admin only)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `chen-exam-scheduler`)
2. In the project, go to **Build > Realtime Database** and click **Create Database**
   - Choose any region, start in **test mode** (you can lock it down later)
3. Go to **Project Settings > General**, scroll to "Your apps", click the **Web** icon (`</>`)
   - Register an app (any nickname), **skip** hosting
   - Copy the `firebaseConfig` values shown
4. In your GitHub repo (`fazizi/CHEN`), go to **Settings > Secrets and variables > Actions** and add these **Repository secrets**:

   | Secret name | Value from Firebase config |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_DATABASE_URL` | `databaseURL` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

5. In the repo, go to **Settings > Pages** and set Source to **GitHub Actions**
6. Push any commit (or re-run the workflow) — the site will deploy automatically

## Local Development

```bash
git clone https://github.com/fazizi/CHEN.git
cd CHEN
npm install
```

Create a `.env` file with your Firebase config:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

Then run:

```bash
npm run dev
```
