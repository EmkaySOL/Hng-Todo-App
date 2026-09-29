---
name: GitHub connector access
description: How to work with GitHub when the local HTTPS remote lacks usable shell credentials.
---

When GitHub is connected to the workspace, use the authenticated `github` connector through the sandbox connection client for repository operations and verification instead of requesting a token in chat.

**Why:** The local HTTPS remote can reject `git push` authentication even when the Replit-managed GitHub connection has valid repository permissions.

**How to apply:** Resolve the connected GitHub integration, then use `listConnections("github")` inside an impure CodeExecution function and call `proxyFetch` for the GitHub REST API. Keep credentials inside the connector client.