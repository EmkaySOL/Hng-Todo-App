---
name: SQLite runtime files
description: Safe handling of the local SQLite file while the app is running.
---

Do not remove the active SQLite database file while the server is running. SQLite can recreate an empty file without the schema, and the app only initializes the table at process startup.

**Why:** Removing the file during a live smoke test caused later requests to fail with “no such table” until the workflow restarted.

**How to apply:** For a clean local test database, stop or restart the server before deleting the file; otherwise create and delete test rows through the API.