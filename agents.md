# agents.md

## Goal
Build a todo web app. Add, edit, complete, delete tasks. Data persists.

## Stack
- Backend: Python 3.11+, FastAPI, Uvicorn
- Storage: SQLite (sqlite3 module, no ORM)
- Frontend: plain HTML, CSS, vanilla JavaScript (no frameworks)
- Deploy: Render (web service from GitHub)

## Structure
/main.py           FastAPI app + routes
/static/index.html
/static/style.css
/static/app.js
/requirements.txt
/agents.md
/README.md

## API
GET /api/todos
POST /api/todos
PUT /api/todos/{id}
DELETE /api/todos/{id}
GET / serves static/index.html

## Rules
- Keep it simple. No extra dependencies beyond fastapi and uvicorn.
- Mobile-first, responsive layout.
- Validate input; return proper status codes.
- Small, working commits. Commit after each step.

## Workflow
1. Plan briefly before coding.
2. Build backend, then frontend.
3. Test each endpoint before moving on.
4. Summarize what changed after each step.
5. Never skip the README run/deploy instructions.

## Definition of done
App runs locally, is live on Render, code is pushed to the private repo.

## Features v2

### Data model (tasks table)
Add columns, never drop the table. Migrate safely on startup with ALTER TABLE if a column is missing.
- id, title, completed (existing)
- notes TEXT (optional description)
- due_date TEXT (ISO date, optional)
- priority TEXT: "low" | "medium" | "high" (default "medium")
- category TEXT: "Work" | "School" | "Personal" | "Other" (default "Personal")
- created_at TEXT (ISO timestamp)

### API changes
- POST /api/todos and PUT /api/todos/{id} accept all fields above.
- GET /api/todos accepts optional query params:
  - status=all|active|completed
  - category=<name>
  - q=<search text> (matches title and notes)
  - sort=due|priority|created
- DELETE /api/todos/completed clears all completed tasks.
- Validate inputs; return proper status codes.

### Frontend features
1. Due dates with an "Overdue" highlight (red) for past-due active tasks
2. Priority levels with color tags (low = green, medium = orange, high = red)
3. Categories, selectable when adding or editing a task
4. Filter tabs: All, Active, Completed
5. Search bar, filters live as the user types
6. Sort dropdown: due date, priority, date created
7. Counter ("3 tasks left") and a "Clear completed" button
8. Optional notes field per task, expandable
9. Dark mode toggle, remembered via localStorage

### Constraints
- Keep the existing stack: FastAPI, SQLite, vanilla HTML/CSS/JS. No new dependencies.
- Do not break existing add, edit, complete, and delete behavior.
- Mobile-first, responsive, touch-friendly buttons.
- No sub-tasks, drag-and-drop, or reminders (out of scope).

### Workflow for this upgrade
1. Plan briefly, then update the schema with a safe migration.
2. Update the backend and test each endpoint.
3. Update the frontend one feature at a time.
4. Commit after each step and summarize what changed.
5. Update README.md with any new behavior.