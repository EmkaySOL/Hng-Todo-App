from datetime import date, datetime, timezone
from pathlib import Path
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "todos.db"
STATIC_DIR = BASE_DIR / "static"

Priority = Literal["low", "medium", "high"]
Category = Literal["Work", "School", "Personal", "Other"]
Status = Literal["all", "active", "completed"]
SortOrder = Literal["due", "priority", "created"]

app = FastAPI(title="Todo App")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    completed: bool = False
    notes: str = Field(default="", max_length=2000)
    due_date: date | None = None
    priority: Priority = "medium"
    category: Category = "Personal"


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: Priority | None = None
    category: Category | None = None


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT ''
            )
            """
        )

        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(todos)").fetchall()
        }
        migrations = {
            "notes": "ALTER TABLE todos ADD COLUMN notes TEXT DEFAULT ''",
            "due_date": "ALTER TABLE todos ADD COLUMN due_date TEXT",
            "priority": (
                "ALTER TABLE todos ADD COLUMN priority "
                "TEXT NOT NULL DEFAULT 'medium'"
            ),
            "category": (
                "ALTER TABLE todos ADD COLUMN category "
                "TEXT NOT NULL DEFAULT 'Personal'"
            ),
            "created_at": (
                "ALTER TABLE todos ADD COLUMN created_at "
                "TEXT NOT NULL DEFAULT ''"
            ),
        }
        for column, statement in migrations.items():
            if column not in columns:
                connection.execute(statement)

        now = utc_timestamp()
        connection.execute(
            "UPDATE todos SET created_at = ? WHERE created_at IS NULL OR created_at = ''",
            (now,),
        )
        connection.execute(
            """
            UPDATE todos
            SET created_at = replace(created_at, ' ', 'T') || 'Z'
            WHERE created_at IS NOT NULL
              AND created_at != ''
              AND instr(created_at, 'T') = 0
            """
        )
        connection.execute("UPDATE todos SET notes = '' WHERE notes IS NULL")
        connection.execute(
            """
            UPDATE todos
            SET priority = 'medium'
            WHERE priority IS NULL OR priority NOT IN ('low', 'medium', 'high')
            """
        )
        connection.execute(
            """
            UPDATE todos
            SET category = 'Personal'
            WHERE category IS NULL
               OR category NOT IN ('Work', 'School', 'Personal', 'Other')
            """
        )
        connection.commit()


def todo_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "completed": bool(row["completed"]),
        "notes": row["notes"] or "",
        "due_date": row["due_date"],
        "priority": row["priority"] or "medium",
        "category": row["category"] or "Personal",
        "created_at": row["created_at"],
    }


initialize_database()


@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/todos")
def list_todos(
    status: Status = Query(default="all"),
    category: Category | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    sort: SortOrder = Query(default="created"),
) -> list[dict]:
    conditions = []
    parameters: list[str | int] = []

    if status == "active":
        conditions.append("completed = 0")
    elif status == "completed":
        conditions.append("completed = 1")
    if category is not None:
        conditions.append("category = ?")
        parameters.append(category)
    if q and q.strip():
        conditions.append(
            "(LOWER(title) LIKE ? OR LOWER(COALESCE(notes, '')) LIKE ?)"
        )
        search = f"%{q.strip().lower()}%"
        parameters.extend([search, search])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    order_by = {
        "due": (
            "CASE WHEN due_date IS NULL OR due_date = '' THEN 1 ELSE 0 END, "
            "due_date ASC, id DESC"
        ),
        "priority": (
            "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 "
            "WHEN 'low' THEN 3 ELSE 4 END, id DESC"
        ),
        "created": "created_at DESC, id DESC",
    }[sort]

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT id, title, completed, notes, due_date, priority, category, created_at
            FROM todos
            {where_clause}
            ORDER BY {order_by}
            """,
            parameters,
        ).fetchall()
    return [todo_from_row(row) for row in rows]


@app.post("/api/todos", status_code=201)
def create_todo(todo: TodoCreate) -> dict:
    title = todo.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    notes = todo.notes.strip()
    due_date = todo.due_date.isoformat() if todo.due_date else None
    created_at = utc_timestamp()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO todos
                (title, completed, notes, due_date, priority, category, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                int(todo.completed),
                notes,
                due_date,
                todo.priority,
                todo.category,
                created_at,
            ),
        )
        row = connection.execute(
            """
            SELECT id, title, completed, notes, due_date, priority, category, created_at
            FROM todos WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
        connection.commit()

    return todo_from_row(row)


@app.put("/api/todos/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdate) -> dict:
    payload = todo.model_dump(exclude_unset=True)
    updates: dict[str, str | int | None] = {}

    if "title" in payload:
        if payload["title"] is None:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
        title = payload["title"].strip()
        if not title:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
        updates["title"] = title
    if "completed" in payload:
        if payload["completed"] is None:
            raise HTTPException(status_code=422, detail="Completed must be a boolean")
        updates["completed"] = int(payload["completed"])
    if "notes" in payload:
        updates["notes"] = (payload["notes"] or "").strip()
    if "due_date" in payload:
        updates["due_date"] = (
            payload["due_date"].isoformat() if payload["due_date"] else None
        )
    if "priority" in payload:
        if payload["priority"] is None:
            raise HTTPException(status_code=422, detail="Priority is required")
        updates["priority"] = payload["priority"]
    if "category" in payload:
        if payload["category"] is None:
            raise HTTPException(status_code=422, detail="Category is required")
        updates["category"] = payload["category"]
    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide a field to update",
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
            """
            SELECT id, title, completed, notes, due_date, priority, category, created_at
            FROM todos WHERE id = ?
            """,
            (todo_id,),
        ).fetchone()
        connection.commit()

    return todo_from_row(row)


@app.delete("/api/todos/completed")
def clear_completed() -> dict:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM todos WHERE completed = 1")
        connection.commit()
    return {"deleted": cursor.rowcount}


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int) -> None:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Todo not found")
        connection.commit()