# Todo App

A small, mobile-first todo app built with FastAPI, SQLite, and plain HTML, CSS, and JavaScript.

## Run locally

1. Create and activate a Python 3.11+ virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the server:

   ```bash
   export PORT=8000
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. Open [http://localhost:8000](http://localhost:8000).

The SQLite database is created as `todos.db` in the project directory on first start.

## API

- `GET /api/todos` — list todos
- `POST /api/todos` — create a todo with `{ "title": "..." }`
- `PUT /api/todos/{id}` — update a todo title and/or completion state
- `DELETE /api/todos/{id}` — delete a todo

## Deploy to Render

1. Push the repository to GitHub.
2. In Render, create a new **Web Service** and connect the GitHub repository.
3. Select Python 3 as the runtime.
4. Set the build command to:

   ```bash
   pip install -r requirements.txt
   ```

5. Set the start command to:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

6. Deploy the service and open its generated URL.

SQLite writes to the local filesystem. For todo data to survive Render redeploys and restarts, attach a Render persistent disk and use its mount path for the database, or move the database to a managed persistent database service.
