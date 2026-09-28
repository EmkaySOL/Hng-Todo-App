const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const statusMessage = document.querySelector("#status-message");
const completedCount = document.querySelector("#completed-count");

let todos = [];

function setStatus(message = "") {
  statusMessage.textContent = message;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the default message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function renderTodos() {
  todoList.innerHTML = "";
  completedCount.textContent = todos.filter((todo) => todo.completed).length;
  emptyState.hidden = todos.length > 0;

  todos.forEach((todo) => {
    const item = document.createElement("article");
    item.className = `todo-item${todo.completed ? " completed" : ""}`;
    item.dataset.todoId = todo.id;

    const checkButton = document.createElement("button");
    checkButton.className = "check-button";
    checkButton.type = "button";
    checkButton.dataset.action = "toggle";
    checkButton.setAttribute(
      "aria-label",
      todo.completed ? `Mark "${todo.title}" as active` : `Complete "${todo.title}"`,
    );
    checkButton.textContent = todo.completed ? "✓" : "";

    const content = document.createElement("div");
    content.className = "todo-content";

    const title = document.createElement("p");
    title.className = "todo-title";
    title.textContent = todo.title;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editButton = document.createElement("button");
    editButton.className = "secondary-button";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.className = "danger-button";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "Delete";

    actions.append(editButton, deleteButton);
    content.append(title, actions);
    item.append(checkButton, content);
    todoList.append(item);
  });
}

async function loadTodos() {
  setStatus("");
  try {
    todos = await requestJson("/api/todos");
    renderTodos();
  } catch (error) {
    setStatus(error.message);
  }
}

async function addTodo(event) {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title) {
    setStatus("Enter a task before adding it.");
    todoInput.focus();
    return;
  }

  const button = todoForm.querySelector("button");
  button.disabled = true;
  setStatus("");
  try {
    const todo = await requestJson("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    todos.unshift(todo);
    todoInput.value = "";
    renderTodos();
    todoInput.focus();
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
}

async function updateTodo(todoId, updates) {
  const updatedTodo = await requestJson(`/api/todos/${todoId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  todos = todos.map((todo) => (todo.id === todoId ? updatedTodo : todo));
  renderTodos();
}

function startEditing(item, todo) {
  const content = item.querySelector(".todo-content");
  content.innerHTML = "";

  const editForm = document.createElement("form");
  editForm.className = "todo-form";

  const input = document.createElement("input");
  input.className = "edit-input";
  input.type = "text";
  input.maxLength = 200;
  input.value = todo.title;
  input.setAttribute("aria-label", "Edit task");
  input.required = true;

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const saveButton = document.createElement("button");
  saveButton.className = "primary-button";
  saveButton.type = "submit";
  saveButton.textContent = "Save";

  const cancelButton = document.createElement("button");
  cancelButton.className = "secondary-button";
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";

  actions.append(saveButton, cancelButton);
  editForm.append(input, actions);
  content.append(editForm);
  input.focus();
  input.select();

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) {
      setStatus("Task title cannot be empty.");
      input.focus();
      return;
    }

    saveButton.disabled = true;
    setStatus("");
    try {
      await updateTodo(todo.id, { title });
    } catch (error) {
      setStatus(error.message);
      saveButton.disabled = false;
    }
  });

  cancelButton.addEventListener("click", renderTodos);
}

async function handleTodoAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const item = button.closest("[data-todo-id]");
  const todoId = Number(item.dataset.todoId);
  const todo = todos.find((entry) => entry.id === todoId);
  if (!todo) {
    return;
  }

  if (button.dataset.action === "edit") {
    startEditing(item, todo);
    return;
  }

  button.disabled = true;
  setStatus("");
  try {
    if (button.dataset.action === "toggle") {
      await updateTodo(todoId, { completed: !todo.completed });
    } else if (button.dataset.action === "delete") {
      await requestJson(`/api/todos/${todoId}`, { method: "DELETE" });
      todos = todos.filter((entry) => entry.id !== todoId);
      renderTodos();
    }
  } catch (error) {
    setStatus(error.message);
    button.disabled = false;
  }
}

todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", handleTodoAction);
loadTodos();