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