from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "todos.db"
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Todo App")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


def todo_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "completed": bool(row["completed"]),
        "created_at": row["created_at"],
    }


initialize_database()


@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/todos")
def list_todos() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, completed, created_at FROM todos ORDER BY id DESC"
        ).fetchall()
    return [todo_from_row(row) for row in rows]


@app.post("/api/todos", status_code=201)
def create_todo(todo: TodoCreate) -> dict:
    title = todo.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    with get_connection() as connection:
        cursor = connection.execute("INSERT INTO todos (title) VALUES (?)", (title,))
        row = connection.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        connection.commit()

    return todo_from_row(row)


@app.put("/api/todos/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdate) -> dict:
    updates = {}
    if todo.title is not None:
        title = todo.title.strip()
        if not title:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
        updates["title"] = title
    if todo.completed is not None:
        updates["completed"] = int(todo.completed)
    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide a title or completed value to update",
        )

    assignments = ", ".join(f"{column} = ?" for column in updates)
    values = [*updates.values(), todo_id]
    with get_connection() as connection:
        cursor = connection.execute(
            f"UPDATE todos SET {assignments} WHERE id = ?",
            values,
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Todo not found")
        row = connection.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (todo_id,),
        ).fetchone()
        connection.commit()

    return todo_from_row(row)


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int) -> None:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Todo not found")
        connection.commit()