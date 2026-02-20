# Subtasks/Checklist System Implementation Plan

Created: 2026-02-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: Yes

> **Status Lifecycle:** PENDING → COMPLETE → VERIFIED
> **Iterations:** Tracks implement→verify cycles (incremented by verify phase)
>
> - PENDING: Initial state, awaiting implementation
> - COMPLETE: All tasks implemented
> - VERIFIED: All checks passed
>
> **Approval Gate:** Implementation CANNOT proceed until `Approved: Yes`
> **Worktree:** Set at plan creation (from dispatcher). `Yes` uses git worktree isolation; `No` works directly on current branch (default)

## Summary

**Goal:** Add a subtasks/checklist system where each task can have multiple sub-items (title + completed boolean), manageable via the edit dialog with add/toggle/delete/reorder, and displayed as a compact color-coded progress bar on task cards.

**Architecture:** New `subtasks` table with foreign key to `tasks`. Independent server actions for each subtask operation (create, toggle, delete, reorder). Subtasks fetched at page level alongside tasks, passed through component chain as a `Record<number, Subtask[]>` map. Progress indicator rendered on TaskCard when subtasks exist. Checklist UI with DnD reordering embedded in the edit task dialog using a nested `DragDropContext`.

**Tech Stack:** Drizzle ORM (subtasks table), @hello-pangea/dnd (subtask reordering in dialog), shadcn/ui Checkbox (toggle UI), Tailwind CSS (progress bar styling), Vitest (server action tests), playwright-cli (E2E verification).

## Scope

### In Scope

- New `subtasks` database table (id, taskId, title, completed, position)
- Server actions: createSubtask, toggleSubtask, deleteSubtask, moveSubtask
- Cascade deletion of subtasks when parent task is deleted
- Subtask data fetching at page level, passed through component chain
- Compact progress bar on TaskCard (shown only when subtasks exist)
- "3/5" label format showing completed/total count
- Color-coded progress: gray (0%), blue (partial), green (100%)
- Checklist section in EditTaskDialog: add, toggle, delete, drag-to-reorder
- shadcn/ui Checkbox component added to project
- Unit tests for all subtask server actions (including cascade delete)
- E2E tests verifying full workflow with playwright-cli

### Out of Scope

- Subtask management from the CreateTaskDialog (only in edit)
- Nested subtasks (subtasks of subtasks)
- Subtask descriptions or priorities (subtasks are simple text + boolean)
- Subtask due dates or assignees
- Filtering/sorting by subtask progress

## Prerequisites

- `@radix-ui/react-checkbox` must be installed (`yarn add @radix-ui/react-checkbox`) — not currently in package.json
- shadcn/ui Checkbox component needs to be created (not currently in project)
- @hello-pangea/dnd is already installed (used for board DnD)
- If an existing `sqlite.db` file is present, it must be deleted before starting the dev server after schema changes (the `globalThis.__db` singleton guard in `initDb()` skips CREATE TABLE statements on subsequent calls)

## Context for Implementer

> This section is critical for cross-session continuity.

- **Patterns to follow:**
  - Server actions pattern: `src/app/actions.ts:9-42` (createTask) — "use server", try/catch, revalidatePath("/")
  - Transaction pattern: `src/app/actions.ts:73-97` (deleteTask) — `db.transaction()` for multi-step ops
  - Position management: `src/app/actions.ts:109-177` (moveTask) — sequential position reassignment
  - Test setup: `src/app/actions.test.ts:1-40` — in-memory SQLite, mock next/cache and @/db
  - Dialog pattern: `src/components/edit-task-dialog.tsx` — useState for form fields, useEffect to sync on open, handleSubmit with toast

- **Conventions:**
  - All mutations go through Server Actions in `src/app/actions.ts`
  - Drizzle schema types exported from `src/db/schema.ts`, re-exported from `src/lib/types.ts`
  - DB singleton uses `globalThis.__db` pattern with Proxy in `src/db/index.ts`
  - Components in `src/components/`, UI primitives in `src/components/ui/`
  - DnD IDs must be strings (`String(id)`)

- **Key files:**
  - `src/db/schema.ts` — Table definitions and inferred types
  - `src/db/index.ts` — DB singleton with inline CREATE TABLE statements
  - `src/app/actions.ts` — All server actions
  - `src/app/actions.test.ts` — Server action tests with in-memory SQLite
  - `src/app/page.tsx` — Server component that fetches data and passes to Board
  - `src/components/task-card.tsx` — Card component (progress bar goes here)
  - `src/components/edit-task-dialog.tsx` — Edit dialog (checklist section goes here)
  - `src/components/board.tsx` — Board managing drag state (must pass subtasks through)
  - `src/components/column.tsx` — Column rendering TaskCards (must pass subtasks)
  - `src/components/board-wrapper.tsx` — Dynamic import wrapper (must pass subtasks)

- **Gotchas:**
  - `db/index.ts` has inline SQL for CREATE TABLE — the subtasks table must be added there too (Drizzle schema alone doesn't create tables in this project)
  - The Board component manages optimistic state via `useState`/`setColumns` for task DnD — subtasks are NOT part of this state (they don't change during board drags)
  - `@hello-pangea/dnd` needs `DragDropContext` — a separate one inside the EditTaskDialog for subtask reordering should be isolated via Radix portal DOM boundary, but @hello-pangea/dnd uses global event listeners that could theoretically interfere. Verify during E2E testing; if conflict is observed, escalate to user
  - Tests must create BOTH `tasks` and `subtasks` tables in `beforeEach` since subtasks reference tasks
  - The `deleteTask` action currently doesn't know about subtasks — it must be modified to delete subtasks first (or they'll become orphans)

- **Domain context:** Subtasks are simple checklist items belonging to a parent task. They have a title (text), completed status (boolean), and position (integer for ordering). They are managed exclusively through the edit task dialog.

## Runtime Environment

- **Start command:** `yarn dev`
- **Port:** 3000
- **Health check:** `curl http://localhost:3000`
- **Restart procedure:** Kill and re-run `yarn dev`

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [x] Task 1: Database schema, types, and initialization for subtasks
- [x] Task 2: Subtask server actions with TDD
- [x] Task 3: Data flow and progress indicator on task cards
- [x] Task 4: Checklist UI in edit task dialog
- [x] Task 5: E2E verification with playwright-cli

**Total Tasks:** 5 | **Completed:** 5 | **Remaining:** 0

## Implementation Tasks

### Task 1: Database Schema, Types, and Initialization

**Objective:** Add the `subtasks` table to the database schema, create the table in the DB initialization, and export the Subtask type.

**Dependencies:** None

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `src/db/index.ts`
- Modify: `src/lib/types.ts`

**Key Decisions / Notes:**

- Add `subtasks` table to schema.ts with columns: `id` (integer, autoincrement PK), `taskId` (integer, not null, references tasks.id), `title` (text, not null), `completed` (integer, not null, default 0 — SQLite uses 0/1 for booleans), `position` (integer, not null, default 0)
- In `db/index.ts`, add a second `CREATE TABLE IF NOT EXISTS subtasks (...)` statement after the tasks table creation. **Important:** Move ALL `CREATE TABLE IF NOT EXISTS` statements to run BEFORE the `global.__db` early-return check, OR restructure `initDb()` so that CREATE TABLE statements always execute even when the singleton exists. The current `if (global.__db) return global.__db` guard skips new CREATE TABLE statements when the DB handle is already cached. The simplest fix: extract the table creation into a separate function that runs the `exec()` calls on the underlying `sqlite` handle, and call it unconditionally.
- Export `Subtask` and `NewSubtask` types from schema.ts via types.ts
- Use Drizzle's `integer("completed", { mode: "boolean" })` for the completed column to get proper TypeScript boolean typing
- After schema changes, delete any existing `sqlite.db` before running the dev server to ensure the new table is created

**Definition of Done:**

- [ ] `subtasks` table defined in schema.ts with all columns (id, taskId, title, completed, position)
- [ ] `CREATE TABLE IF NOT EXISTS subtasks` added to db/index.ts initialization (runs regardless of singleton cache state)
- [ ] `Subtask` and `NewSubtask` types exported from types.ts
- [ ] Existing `sqlite.db` deleted and dev server restarted to confirm clean table creation
- [ ] `yarn build` succeeds with no type errors

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-subtasks-checklist-system-0a3202c && yarn build` — build succeeds

### Task 2: Subtask Server Actions with TDD

**Objective:** Implement all server actions for subtask CRUD operations and modify `deleteTask` to cascade delete subtasks. Write comprehensive unit tests.

**Dependencies:** Task 1

**Files:**

- Modify: `src/app/actions.ts`
- Modify: `src/app/actions.test.ts`

**Key Decisions / Notes:**

- **createSubtask(taskId: number, title: string):** Validate title non-empty, validate parent task exists, set position = max(position) + 1 for that taskId, insert row. Follow pattern from createTask at `actions.ts:9-42`.
- **toggleSubtask(id: number, completed: boolean):** Update completed field. Simple update, no position logic needed.
- **deleteSubtask(id: number):** Delete subtask, recompute positions for remaining subtasks of same parent task (transaction). Follow deleteTask pattern at `actions.ts:73-107`.
- **moveSubtask(id: number, newPosition: number):** Reorder subtasks within same parent task. Use transaction to atomically reassign positions. Follow moveTask's same-column reorder logic. **Bounds checking:** Clamp `newPosition` to `[0, totalSubtasks - 1]` range to handle stale indices from optimistic UI.
- **Modify deleteTask:** Before deleting the task, delete all subtasks with matching taskId. Must happen inside the existing transaction.
- All actions call `revalidatePath("/")` after mutation.
- **Test setup:** In `beforeEach`, create BOTH `tasks` and `subtasks` tables in the in-memory SQLite. **Critical:** The existing `beforeEach` block only creates the `tasks` table — it MUST be updated to also create the `subtasks` table, otherwise all existing `deleteTask` tests will break after the cascade delete modification.

**Definition of Done:**

- [ ] `createSubtask` action creates subtask with correct position and validates parent task exists
- [ ] `toggleSubtask` action updates completed status
- [ ] `deleteSubtask` action removes subtask and recomputes positions
- [ ] `moveSubtask` action reorders subtasks within parent task (with bounds validation)
- [ ] `deleteTask` cascade deletes all subtasks of the deleted task
- [ ] Existing `beforeEach` updated to create `subtasks` table (all pre-existing tests still pass)
- [ ] All server action tests pass: `yarn test`
- [ ] Tests cover: create, toggle, delete with reposition, move/reorder, cascade delete, error cases (invalid taskId, empty title, out-of-bounds position)

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-subtasks-checklist-system-0a3202c && yarn test` — all tests pass

### Task 3: Data Flow and Progress Indicator on Task Cards

**Objective:** Fetch subtasks at the page level, pass them through the component chain, and render a compact color-coded progress bar on task cards when subtasks exist.

**Dependencies:** Task 1

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/components/board-wrapper.tsx`
- Modify: `src/components/board.tsx`
- Modify: `src/components/column.tsx`
- Modify: `src/components/task-card.tsx`

**Key Decisions / Notes:**

- **page.tsx:** Add a second query to fetch all subtasks (`db.select().from(subtasks).orderBy(asc(subtasks.position))`). Group into `Record<number, Subtask[]>` by taskId. Pass `subtasksMap` as additional prop to BoardWrapper.
- **board-wrapper.tsx:** Accept and forward `subtasksMap` prop to Board.
- **board.tsx:** Accept `subtasksMap` prop. This is NOT part of the optimistic drag state — subtasks don't change during board DnD. Pass through to Column.
- **column.tsx:** Accept `subtasksMap`, extract subtasks per task when rendering TaskCard.
- **task-card.tsx:** Accept `subtasks: Subtask[]` prop. When `subtasks.length > 0`, render progress indicator below description:
  - A small progress bar (4px height, rounded, full width of card content area)
  - Label showing `"X/Y"` (completed / total)
  - Color logic: 0 completed = gray (`bg-gray-200`), partially complete = blue (`bg-blue-500`), 100% complete = green (`bg-green-500`)
  - Progress bar track: `bg-gray-200`, fill: colored portion
- Pass subtasks to EditTaskDialog (needed for Task 4).
- **Type safety:** Use `subtasksMap[task.id] ?? []` (default empty array) when accessing the map in Column/TaskCard to avoid undefined access. Define a shared `SubtasksMap` type alias (`Record<number, Subtask[]>`) used consistently across all components.

**Definition of Done:**

- [ ] Subtasks are fetched at page level and grouped by taskId
- [ ] subtasksMap prop flows through BoardWrapper → Board → Column → TaskCard (with safe default empty array access)
- [ ] Progress bar renders on task cards only when subtasks exist
- [ ] Progress label shows "completed/total" format (e.g., "3/5")
- [ ] Progress bar is gray when 0% complete, blue when partially complete, green when 100%
- [ ] `yarn build` succeeds with no type errors

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-subtasks-checklist-system-0a3202c && yarn build` — build succeeds

### Task 4: Checklist UI in Edit Task Dialog

**Objective:** Add a checklist section to the edit task dialog where users can add new subtask items, toggle completion, delete subtasks, and reorder via drag-and-drop.

**Dependencies:** Task 2, Task 3

**Files:**

- Create: `src/components/ui/checkbox.tsx` (shadcn/ui Checkbox component)
- Modify: `src/components/edit-task-dialog.tsx`

**Key Decisions / Notes:**

- **Checkbox component:** Generate shadcn/ui Checkbox using `npx shadcn@latest add checkbox` or manually create it from the shadcn/ui source. Requires `@radix-ui/react-checkbox` dependency — install it.
- **Checklist section layout:** Placed below the Priority select field, above the dialog footer. Separated by a label "Checklist" or "Subtasks".
- **Add subtask:** Input field with an "Add" button (or Enter key). Calls `createSubtask` server action. Optimistic: add to local list immediately, revert on error.
- **Toggle subtask:** Checkbox next to each subtask title. Calls `toggleSubtask` server action. Optimistic toggle with revert.
- **Delete subtask:** Small "X" button on each subtask row. Calls `deleteSubtask` server action. Optimistic remove with revert.
- **Reorder subtasks:** Use `@hello-pangea/dnd` with a new `DragDropContext` inside the dialog. Since the dialog renders in a Radix portal, it won't interfere with the board's DragDropContext. Each subtask is a `Draggable`, the list is a single `Droppable`. On drag end, call `moveSubtask` server action. Optimistic reorder with revert.
- **Subtask state management:** Initialize local subtask state from props when dialog opens (via useEffect, same pattern as title/description/priority at `edit-task-dialog.tsx:39-45`). Each operation fires a server action and optimistically updates local state. **Re-sync:** Also update local subtask state from props whenever the `subtasks` prop changes (via the same useEffect dependency array), so that after `revalidatePath` refetches data, the dialog reflects server truth rather than stale optimistic state.
- **Subtask item rendering:** Each row shows: drag handle (GripVertical icon) | checkbox | title text (strikethrough when completed) | delete button (X icon).

**Definition of Done:**

- [ ] `@radix-ui/react-checkbox` added to package.json dependencies and `yarn install` run successfully
- [ ] Checkbox shadcn/ui component exists at `src/components/ui/checkbox.tsx`
- [ ] Checklist section renders in edit task dialog below priority selector
- [ ] Users can add a new subtask by typing text and pressing Enter or clicking Add
- [ ] Users can toggle subtask completion via checkbox (visual strikethrough on completed)
- [ ] Users can delete individual subtasks via X button
- [ ] Users can drag-and-drop to reorder subtasks within the checklist
- [ ] All operations are optimistic with error toast on failure
- [ ] `yarn build` succeeds with no type errors

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-subtasks-checklist-system-0a3202c && yarn build` — build succeeds

### Task 5: E2E Verification with playwright-cli

**Objective:** Verify the complete subtasks feature works end-to-end using playwright-cli, covering creation, toggling, progress display, deletion, and reordering.

**Dependencies:** Task 3, Task 4

**Files:**

- No files created/modified (verification only)

**Key Decisions / Notes:**

- Delete `sqlite.db` before starting E2E tests to ensure fresh seed data with no pre-existing subtasks
- Start dev server with `yarn dev`
- Open the app in playwright-cli
- Test workflow:
  1. Click edit on an existing task → verify dialog opens
  2. Add 3 subtask items via the checklist input
  3. Verify subtask items appear in the checklist
  4. Toggle 1 subtask as complete → verify checkbox state and strikethrough
  5. Close dialog → verify progress bar appears on the task card showing "1/3"
  6. Verify progress bar color is blue (partially complete)
  7. Reopen dialog → toggle all remaining subtasks complete
  8. Close dialog → verify progress bar shows "3/3" and is green
  9. Reopen dialog → delete one subtask → close → verify "2/2" still green
  10. Verify a task with no subtasks shows no progress bar

**Definition of Done:**

- [ ] Dev server starts and app loads successfully
- [ ] Adding subtasks via the edit dialog works
- [ ] Toggling subtask completion works (checkbox state + visual strikethrough)
- [ ] Progress bar appears on task card with correct count and color
- [ ] Deleting subtasks updates the count correctly
- [ ] Drag-and-drop reordering of subtasks works within the edit dialog (subtask order persists after dialog close and reopen)
- [ ] Tasks without subtasks show no progress bar

**Verify:**

- Visual verification via playwright-cli snapshots at each step

## Testing Strategy

- **Unit tests:** All subtask server actions tested with in-memory SQLite (createSubtask, toggleSubtask, deleteSubtask, moveSubtask, cascade delete). Tests in `src/app/actions.test.ts`.
- **Build verification:** `yarn build` after each frontend task to ensure no type errors.
- **E2E tests:** Full workflow verification with playwright-cli covering add/toggle/delete/progress display.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Nested DragDropContext conflict (board + dialog) | Low | High | The dialog renders in a Radix portal (separate DOM tree), so DragDropContexts are isolated. Verify DnD isolation during E2E testing by dragging subtasks while the board is rendered. If a runtime conflict is observed, stop implementation and request user approval before deviating from the drag-and-drop requirement. |
| Subtask operations causing board re-render flicker | Medium | Low | Subtask changes trigger `revalidatePath("/")` which refetches all data. The Board's `useEffect` on `initialTasks` will update, but since task positions haven't changed, columns won't visually shift. Rapid toggling of multiple checkboxes may cause brief UI jitter — accepted as a known limitation since optimistic updates mask the latency in practice. |
| Orphaned subtasks if deleteTask is not updated | High | Medium | Task 2 explicitly modifies `deleteTask` to cascade delete subtasks inside its transaction. Tests verify this behavior. |
| Performance with many subtasks per task | Low | Low | SQLite with WAL mode handles this scale easily. The UI only shows subtasks in the edit dialog (one task at a time). |

## Open Questions

- None — requirements are clearly specified.
