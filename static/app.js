const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoNotes = document.querySelector("#todo-notes");
const todoDueDate = document.querySelector("#todo-due-date");
const todoPriority = document.querySelector("#todo-priority");
const todoCategory = document.querySelector("#todo-category");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = emptyState.querySelector("h2");
const emptyText = emptyState.querySelector("p");
const statusMessage = document.querySelector("#status-message");
const remainingCount = document.querySelector("#remaining-count");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const themeToggle = document.querySelector("#theme-toggle");
const clearCompletedButton = document.querySelector("#clear-completed");
const filterTabs = [...document.querySelectorAll("[data-status]")];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const CATEGORIES = [
  { value: "Personal", label: "Personal" },
  { value: "Work", label: "Work" },
  { value: "School", label: "School" },
  { value: "Other", label: "Other" },
];

let todos = [];
let searchTimer;
const filters = { status: "all", q: "", sort: "created" };

function setStatus(message = "", kind = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message${kind ? ` ${kind}` : ""}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
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

function localDateString() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isOverdue(todo) {
  return Boolean(todo.due_date && !todo.completed && todo.due_date < localDateString());
}

function formatDueDate(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `task-badge ${className}`;
  badge.textContent = text;
  return badge;
}

function renderTodos() {
  todoList.innerHTML = "";
  remainingCount.textContent = todos.filter((todo) => !todo.completed).length;
  emptyState.hidden = todos.length > 0;

  filterTabs.forEach((tab) => {
    const selected = tab.dataset.status === filters.status;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  if (!todos.length) {
    if (filters.q) {
      emptyTitle.textContent = "No matching tasks";
      emptyText.textContent = "Try a different search term.";
    } else if (filters.status === "completed") {
      emptyTitle.textContent = "No completed tasks";
      emptyText.textContent = "Completed tasks will appear here.";
    } else if (filters.status === "active") {
      emptyTitle.textContent = "You are all caught up";
      emptyText.textContent = "There are no active tasks.";
    } else {
      emptyTitle.textContent = "Nothing on your list";
      emptyText.textContent = "Add a task above to get started.";
    }
  }

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

    const mainRow = document.createElement("div");
    mainRow.className = "todo-main-row";

    const title = document.createElement("p");
    title.className = "todo-title";
    title.textContent = todo.title;
    mainRow.append(title);

    const metadata = document.createElement("div");
    metadata.className = "task-meta";
    metadata.append(createBadge(todo.priority, `priority-${todo.priority}`));
    metadata.append(createBadge(todo.category, "category-badge"));
    if (todo.due_date) {
      metadata.append(
        createBadge(
          isOverdue(todo) ? `Overdue · ${formatDueDate(todo.due_date)}` : formatDueDate(todo.due_date),
          isOverdue(todo) ? "due-badge overdue" : "due-badge",
        ),
      );
    }
    mainRow.append(metadata);

    content.append(mainRow);
    if (todo.notes) {
      const notes = document.createElement("details");
      notes.className = "task-notes";
      const summary = document.createElement("summary");
      summary.textContent = "Notes";
      const notesText = document.createElement("p");
      notesText.textContent = todo.notes;
      notes.append(summary, notesText);
      content.append(notes);
    }

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
    content.append(actions);
    item.append(checkButton, content);
    todoList.append(item);
  });
}

async function loadTodos() {
  const params = new URLSearchParams({
    status: filters.status,
    sort: filters.sort,
  });
  if (filters.q) {
    params.set("q", filters.q);
  }

  try {
    todos = await requestJson(`/api/todos?${params.toString()}`);
    renderTodos();
  } catch (error) {
    setStatus(error.message);
  }
}

function resetNewTaskForm() {
  todoForm.reset();
  todoPriority.value = "medium";
  todoCategory.value = "Personal";
  todoForm.querySelector("details").open = false;
}

async function addTodo(event) {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title) {
    setStatus("Enter a task before adding it.");
    todoInput.focus();
    return;
  }

  const button = todoForm.querySelector(".primary-button");
  button.disabled = true;
  setStatus("");
  try {
    await requestJson("/api/todos", {
      method: "POST",
      body: JSON.stringify({
        title,
        notes: todoNotes.value.trim(),
        due_date: todoDueDate.value || null,
        priority: todoPriority.value,
        category: todoCategory.value,
      }),
    });
    resetNewTaskForm();
    await loadTodos();
    todoInput.focus();
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
}

async function updateTodo(todoId, updates) {
  await requestJson(`/api/todos/${todoId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  await loadTodos();
}

function createSelectControl(labelText, options, value) {
  const label = document.createElement("label");
  label.className = "control-label";
  label.textContent = labelText;
  const select = document.createElement("select");
  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  });
  select.value = value;
  label.append(select);
  return { label, select };
}

function startEditing(item, todo) {
  const content = item.querySelector(".todo-content");
  content.innerHTML = "";

  const editForm = document.createElement("form");
  editForm.className = "edit-form";

  const titleInput = document.createElement("input");
  titleInput.className = "edit-input";
  titleInput.type = "text";
  titleInput.maxLength = 200;
  titleInput.value = todo.title;
  titleInput.setAttribute("aria-label", "Edit task title");
  titleInput.required = true;

  const notesDetails = document.createElement("details");
  notesDetails.className = "notes-details edit-notes";
  notesDetails.open = Boolean(todo.notes);
  const notesSummary = document.createElement("summary");
  notesSummary.textContent = todo.notes ? "Edit notes" : "Add notes";
  const notesInput = document.createElement("textarea");
  notesInput.maxLength = 2000;
  notesInput.value = todo.notes;
  notesInput.placeholder = "Add an optional description";
  notesInput.setAttribute("aria-label", "Edit notes");
  notesDetails.append(notesSummary, notesInput);

  const options = document.createElement("div");
  options.className = "edit-options";
  const dueControl = createSelectControl("Due date", [], "");
  dueControl.select.remove();
  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.value = todo.due_date || "";
  dueControl.label.append(dueInput);
  const priorityControl = createSelectControl("Priority", PRIORITIES, todo.priority);
  const categoryControl = createSelectControl("Category", CATEGORIES, todo.category);
  options.append(dueControl.label, priorityControl.label, categoryControl.label);

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

  editForm.append(titleInput, notesDetails, options, actions);
  content.append(editForm);
  titleInput.focus();
  titleInput.select();

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) {
      setStatus("Task title cannot be empty.");
      titleInput.focus();
      return;
    }

    saveButton.disabled = true;
    setStatus("");
    try {
      await updateTodo(todo.id, {
        title,
        notes: notesInput.value.trim(),
        due_date: dueInput.value || null,
        priority: priorityControl.select.value,
        category: categoryControl.select.value,
      });
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
      await loadTodos();
    }
  } catch (error) {
    setStatus(error.message);
    button.disabled = false;
  }
}

async function clearCompleted() {
  clearCompletedButton.disabled = true;
  setStatus("");
  try {
    const result = await requestJson("/api/todos/completed", { method: "DELETE" });
    await loadTodos();
    setStatus(
      result.deleted
        ? `${result.deleted} completed task${result.deleted === 1 ? "" : "s"} cleared.`
        : "There are no completed tasks to clear.",
      "success",
    );
  } catch (error) {
    setStatus(error.message);
  } finally {
    clearCompletedButton.disabled = false;
  }
}

function setTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("todo-theme", isDark ? "dark" : "light");
  themeToggle.setAttribute("aria-label", isDark ? "Enable light mode" : "Enable dark mode");
  themeToggle.querySelector("span").textContent = isDark ? "☀" : "☾";
}

todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", handleTodoAction);
clearCompletedButton.addEventListener("click", clearCompleted);
themeToggle.addEventListener("click", () => {
  setTheme(!document.documentElement.classList.contains("dark"));
});
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filters.status = tab.dataset.status;
    loadTodos();
  });
});
sortSelect.addEventListener("change", () => {
  filters.sort = sortSelect.value;
  loadTodos();
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.q = searchInput.value.trim();
    loadTodos();
  }, 150);
});

setTheme(localStorage.getItem("todo-theme") === "dark");
loadTodos();