# Exam Schedule Coordinator — AUB CHEN

Scheduling tool for the Department of Chemical Engineering at the American University of Beirut. Manages exam dates/times, detects conflicts and close scheduling between shared year groups.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Install & Run

```bash
git clone https://github.com/fazizi/CHEN.git
cd CHEN
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

## Features

- Add, edit, and delete exam entries (professor, course, year group, date/time, duration)
- Filter schedule by year of study and month
- Automatic conflict detection (overlapping exams for the same year group)
- Close-scheduling warnings (exams within 2 hours for the same year group)
- Data persists in the browser via localStorage
