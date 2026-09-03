---
name: Honda local SQLite
description: Frontend-only pilot persistence and cross-tab synchronization decision for the Honda sales dashboard.
---

The pilot keeps sales data in a SQLite database running in the browser through WASM. The serialized database is stored in browser storage so the app remains backend-free, survives reloads, and can mirror changes between TV and operator tabs.

**Why:** The user explicitly required no backend and requested SQLite persistence for an isolated pilot, while the TV and control surfaces still need to share state.

**How to apply:** Keep storage concerns behind the sales store module; do not introduce server routes or a hosted database unless the product scope changes.