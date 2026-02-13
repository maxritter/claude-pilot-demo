# Kanban Task Board Implementation Plan

Created: 2026-02-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No

> **Status Lifecycle:** PENDING → COMPLETE → VERIFIED
> **Iterations:** Tracks implement→verify cycles (incremented by verify phase)
>
> - PENDING: Initial state, awaiting implementation
> - COMPLETE: All tasks implemented
> - VERIFIED: All checks passed
>
> **Approval Gate:** Implementation CANNOT proceed until `Approved: Yes`
> **Worktree:** Set at plan creation (from dispatcher). `Yes` uses git worktree isolation; `No` works directly on current branch

## Summary

**Goal:** Build a single-page Kanban task board with three columns (To Do, In Progress, Done) featuring drag-and-drop task movement, full CRUD operations, and SQLite persistence.

**Architecture:** Next.js App Router with a single server-rendered page that fetches tasks from SQLite. Client-side board component uses `@hello-pangea/dnd` for drag-and-drop with optimistic UI updates. All mutations go through Next.js Server Actions that write to SQLite via Drizzle ORM, then `revalidatePath("/")` to sync server state.

**Tech Stack:** Next.js 15 (App Router), TypeScript, SQLite (better-sqlite3 + Drizzle ORM), Tailwind CSS v4, shadcn/ui, @hello-pangea/dnd, Sonner (toast notifications)

## Scope

### In Scope

- Next.js project scaffolding with App Router, TypeScript, Tailwind CSS
- SQLite database with Drizzle ORM schema and connection
- Single "tasks" table (id, title, description, priority, status, position, created_at)
- Seed script generating ~15 sample tasks on first run
- Server Actions for all CRUD: create, update, delete, move (reorder/change status)
- Board UI with three fixed columns: To Do, In Progress, Done
- Drag-and-drop between columns with optimistic UI (no flicker)
- Task cards showing title, truncated description (2 lines), color-coded priority badge
- Task count badges on column headers
- Create task dialog (title, description, priority selection)
- Edit task modal dialog
- Delete task with AlertDialog confirmation
- Toast notifications via Sonner for success/error feedback
- shadcn/ui components: Card, Dialog, AlertDialog, Button, Badge, Input, Select, Label, Textarea

### Out of Scope

- Authentication / multi-user support
- Column reordering or custom columns
- Task due dates, assignees, or labels beyond priority
- Search, filter, or sort functionality
- Responsive/mobile-optimized layout
- Deployment configuration

## Prerequisites

- Node.js 22+ (verified available)
- npm 10+ (verified available)
- Empty git repository (verified — fresh repo with no existing code)

## Context for Implementer

- **Patterns to follow:** Standard Next.js App Router patterns — `app/page.tsx` as server component that fetches data, client components in `components/` directory with `"use client"` directive. Server Actions in `app/actions.ts` with `"use server"` directive.
- **Conventions:** File-based routing, collocated components. Drizzle schema in `src/db/schema.ts`, DB connection singleton in `src/db/index.ts`. shadcn/ui components installed to `src/components/ui/`.
- **Key files:** `src/app/page.tsx` (server entry), `src/components/board.tsx` (client board with DnD), `src/app/actions.ts` (server actions), `src/db/schema.ts` (Drizzle schema), `src/db/index.ts` (DB singleton)
- **Gotchas:**
  - `@hello-pangea/dnd` uses render props pattern — `Droppable` and `Draggable` children must be functions receiving `provided` and `snapshot` params
  - `draggableId` must be a string (not number) — convert task IDs to strings
  - `better-sqlite3` is synchronous — Drizzle wraps it but the driver is sync under the hood
  - Optimistic UI: update React state immediately in `onDragEnd`, then fire server action in background. If server action fails, revert state and show error toast.
  - `revalidatePath("/")` in server actions ensures the server component re-fetches fresh data

## Runtime Environment

- **Start command:** `npm run dev` (development), `npm run build && npm start` (production)
- **Port:** 3000 (default Next.js)
- **Health check:** `curl http://localhost:3000`
- **Database:** `sqlite.db` file in project root (auto-created on first run)

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [x] Task 1: Project scaffolding and database setup
- [x] Task 2: Server Actions for CRUD operations
- [x] Task 3: Board layout with columns and task cards
- [x] Task 4: Drag-and-drop with optimistic UI
- [x] Task 5: Create, Edit, and Delete task dialogs
- [x] Task 6: Seed data and final polish

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Project Scaffolding and Database Setup

**Objective:** Scaffold the Next.js project with all dependencies, configure Drizzle ORM with better-sqlite3, define the tasks table schema, and set up the database connection singleton.

**Dependencies:** None

**Files:**

- Create: `src/db/schema.ts` — Drizzle table definition for tasks
- Create: `src/db/index.ts` — Database connection singleton (using `globalThis` to survive hot reload)
- Create: `drizzle.config.ts` — Drizzle Kit configuration
- Modify: `package.json` — Add dependencies (drizzle-orm, better-sqlite3, drizzle-kit, @hello-pangea/dnd, sonner)
- Modify: `src/app/layout.tsx` — Add Toaster provider: `import { Toaster } from "sonner"`
- Modify: `src/app/page.tsx` — Minimal placeholder confirming app works
- Create: `src/app/error.tsx` — Error boundary for the app (client component with reset button)

**Key Decisions / Notes:**

- Use `npx create-next-app@latest . --yes` to scaffold into the current directory (already a git repo). This gives us App Router, TypeScript, Tailwind CSS v4, ESLint out of the box.
- Install shadcn/ui via `npx shadcn@latest init` with default config (New York style, neutral colors).
- Tasks table schema:
  ```
  id: integer, primary key, autoincrement
  title: text, not null
  description: text, not null, default ""
  priority: text, not null, default "medium" (enum: "low", "medium", "high")
  status: text, not null, default "todo" (enum: "todo", "in-progress", "done")
  position: integer, not null, default 0
  createdAt: text, not null, default sql`(datetime('now'))`
  ```
- Database singleton: use `globalThis` pattern to persist the DB instance across Next.js hot reloads in dev mode. Create `better-sqlite3` instance once, wrap with `drizzle()`, export `db`.
- Drizzle config uses `dialect: "sqlite"` with `dbCredentials: { url: "sqlite.db" }`.
- Verify `tsconfig.json` has `strict: true` after scaffolding (create-next-app enables it by default).
- Sonner import: `import { Toaster } from "sonner"` — add to `layout.tsx` body.

**Definition of Done:**

- [ ] `npm run dev` starts without errors on port 3000
- [ ] Visiting http://localhost:3000 shows the placeholder page
- [ ] Database file `sqlite.db` is created when the app starts
- [ ] `npx drizzle-kit push` successfully creates the tasks table
- [ ] Sonner `<Toaster />` renders in root layout without import errors
- [ ] `tsconfig.json` has `strict: true`
- [ ] `src/app/error.tsx` error boundary exists and exports a client component

**Verify:**

- `npm run build` — build succeeds with no errors
- `npx drizzle-kit push` — schema pushes to SQLite without errors

---

### Task 2: Server Actions for CRUD Operations

**Objective:** Implement all Server Actions for task CRUD: create, update, delete, and move (change status + reorder positions). All actions write to SQLite via Drizzle and call `revalidatePath("/")`.

**Dependencies:** Task 1

**Files:**

- Create: `src/app/actions.ts` — All server actions
- Create: `src/lib/types.ts` — Shared TypeScript types for Task, Priority, Status
- Test: `src/app/actions.test.ts` — Unit tests for server actions

**Key Decisions / Notes:**

- Server actions file uses `"use server"` directive at top.
- Actions:
  - `createTask(data: { title: string; description?: string; priority: Priority })` — Inserts task with status "todo", position = max position in "todo" column + 1
  - `updateTask(id: number, data: { title?: string; description?: string; priority?: Priority })` — Updates specified fields
  - `deleteTask(id: number)` — Deletes task by ID
  - `moveTask(id: number, newStatus: Status, newPosition: number)` — Updates task status and recalculates positions for affected columns
- `moveTask` algorithm (inside a transaction):
  1. Get the task's current status (source column).
  2. Remove the task from its source column (conceptually).
  3. Get all other tasks in the source column, ordered by position. Reassign sequential positions 0, 1, 2, ... to fill the gap.
  4. Get all tasks in the destination column, ordered by position. Insert the moved task at `newPosition` by shifting tasks at that index and above up by 1.
  5. Update the moved task's status to `newStatus` and position to `newPosition`.
  6. This handles same-column reordering (source === destination) and cross-column moves.
- All actions wrap logic in try/catch. Catch Drizzle/SQLite errors, log server-side, re-throw as plain `Error` with a user-friendly message for client serialization.
- All actions call `revalidatePath("/")` to invalidate the server component cache.
- Types: `Priority = "low" | "medium" | "high"`, `Status = "todo" | "in-progress" | "done"`, `Task` mirrors the DB schema.

**Definition of Done:**

- [ ] All four server actions are implemented and exported
- [ ] `moveTask` uses a database transaction for atomic position updates
- [ ] Position recalculation handles: same-column reorder (up/down), cross-column move, move to empty column, move to position 0, move to end
- [ ] Each action calls `revalidatePath("/")` after mutation
- [ ] Server actions catch errors and return serialized error messages
- [ ] TypeScript types for Task, Priority, Status are defined and used
- [ ] Tests verify create, update, delete, and move operations (including edge cases)

**Verify:**

- `npm test -- --testPathPattern=actions` — all action tests pass

---

### Task 3: Board Layout with Columns and Task Cards

**Objective:** Build the board UI — a server component page that fetches tasks, and a client component that renders three columns with task cards. Install required shadcn/ui components.

**Dependencies:** Task 2

**Files:**

- Create: `src/components/board.tsx` — Client component: Board with three columns
- Create: `src/components/task-card.tsx` — Client component: Individual task card
- Create: `src/components/column.tsx` — Client component: Single column with header and card list
- Modify: `src/app/page.tsx` — Server component: fetch tasks from DB, pass to Board
- Install shadcn/ui: Card, Badge, Button (via `npx shadcn@latest add card badge button`)

**Key Decisions / Notes:**

- `page.tsx` (server component) queries all tasks ordered by position, groups them by status, passes to `<Board>` client component.
- Board component receives tasks grouped by column. Renders three `<Column>` components side by side.
- Column component shows: column title, task count badge, list of `<TaskCard>` components.
- TaskCard shows: title, description truncated to 2 lines (CSS `line-clamp-2`), priority badge (red for High, amber for Medium, green for Low) using shadcn Badge with `variant="outline"` and custom background colors.
- Column IDs map to status values: `"todo"`, `"in-progress"`, `"done"`.
- No DnD in this task — just static rendering. DnD is added in Task 4.

**Definition of Done:**

- [ ] Three columns render side by side with correct titles (To Do, In Progress, Done)
- [ ] Task count badges show on each column header
- [ ] Task cards display title, truncated description (2 lines max), and color-coded priority badge
- [ ] Priority badge colors: red = High, amber = Medium, green = Low
- [ ] Page fetches tasks from SQLite and renders them in correct columns

**Verify:**

- `npm run build` — builds without errors
- Manual: Insert a test row via `sqlite3 sqlite.db "INSERT INTO tasks (title, description, priority, status, position) VALUES ('Test Task', 'Test description', 'high', 'todo', 0);"`, start dev server, verify card renders in To Do column with title, description, and red High badge.

---

### Task 4: Drag-and-Drop with Optimistic UI

**Objective:** Add `@hello-pangea/dnd` to the board for dragging task cards between columns and reordering within columns. Implement optimistic UI updates.

**Dependencies:** Task 3

**Files:**

- Modify: `src/components/board.tsx` — Add DragDropContext, state management, optimistic updates
- Modify: `src/components/column.tsx` — Wrap with Droppable
- Modify: `src/components/task-card.tsx` — Wrap with Draggable
- Test: `src/components/board.test.tsx` — Tests for drag-and-drop state logic

**Key Decisions / Notes:**

- Board maintains local state mirroring server data: `useState` initialized from props.
- **Optimistic update with revert strategy:**
  1. Before updating state, capture a snapshot of the current columns state using `useRef`.
  2. Optimistically update local state (splice source, insert at destination).
  3. Call `moveTask` server action in background (non-blocking async).
  4. If server action throws, restore state from the ref snapshot and show error toast via `toast.error()`.
- `onDragEnd` handler:
  1. If no destination or same position, return early.
  2. Save snapshot → update state → fire server action → revert on error.
- Each column is a `<Droppable droppableId={status}>`. Each task card is a `<Draggable draggableId={String(task.id)} index={index}>`.
- `provided.placeholder` must be rendered inside each Droppable for correct spacing.
- Convert task ID to string for `draggableId` (required by the library).
- **Drop zone highlighting:** Use `snapshot.isDraggingOver` from Droppable render props to apply conditional CSS (e.g., `bg-accent/50` border color change) when a task is being dragged over the column.
- Use fire-and-forget async call for the server action to avoid blocking UI.

**Definition of Done:**

- [ ] Tasks can be dragged between all three columns
- [ ] Tasks can be reordered within the same column
- [ ] UI updates immediately on drop (no flicker or delay)
- [ ] If server action fails, state reverts and error toast appears
- [ ] Drop zones highlight when dragging over them

**Verify:**

- `npm run build` — builds without errors
- `npm test -- --testPathPattern=board` — board tests pass

---

### Task 5: Create, Edit, and Delete Task Dialogs

**Objective:** Add dialog-based UI for creating new tasks, editing existing tasks, and deleting tasks with confirmation. Wire to server actions with toast notifications.

**Dependencies:** Task 4

**Files:**

- Create: `src/components/create-task-dialog.tsx` — Dialog with form for new task
- Create: `src/components/edit-task-dialog.tsx` — Dialog with pre-filled form for editing
- Create: `src/components/delete-task-dialog.tsx` — AlertDialog for delete confirmation
- Modify: `src/components/board.tsx` — Add "New Task" button, pass handlers
- Modify: `src/components/task-card.tsx` — Add edit/delete buttons on cards
- Install shadcn/ui: Dialog, AlertDialog, Input, Select, Label, Textarea (via `npx shadcn@latest add dialog alert-dialog input select label textarea`)

**Key Decisions / Notes:**

- Create dialog: opens from "New Task" button in header area. Form has title (required), description (optional textarea), priority (Select: Low/Medium/High, default Medium). On submit → call `createTask` server action → show success toast → close dialog.
- Edit dialog: opens from edit button on task card. Pre-fills form with current task data. On submit → call `updateTask` server action → show success toast → close dialog.
- Delete dialog: opens from delete button on task card. Shows AlertDialog with task title. On confirm → call `deleteTask` server action → show success toast.
- After successful create/delete, the `revalidatePath` in server actions triggers re-fetch. Board component should refresh from server data.
- Use `useState` for `isPending` flag in each dialog. Disable submit button and show loading state while server action is in flight. This prevents double-submission.
- New tasks default to "To Do" column (standard Kanban convention).
- Toast via `toast.success("Task created")` and `toast.error("Failed to create task")` from sonner.

**Definition of Done:**

- [ ] "New Task" button opens create dialog with title, description, priority fields
- [ ] Creating a task adds it to the "To Do" column and shows success toast
- [ ] Edit button on card opens edit dialog pre-filled with task data
- [ ] Editing a task updates it in place and shows success toast
- [ ] Delete button on card opens confirmation AlertDialog
- [ ] Confirming delete removes the task and shows success toast
- [ ] All dialogs close on successful submission
- [ ] Form validates that title is non-empty before submission
- [ ] Submit buttons disable and show loading state during server action execution

**Verify:**

- `npm run build` — builds without errors

---

### Task 6: Seed Data and Final Polish

**Objective:** Create a seed script that inserts ~15 sample tasks across all three columns on first run. Add final UI polish.

**Dependencies:** Task 5

**Files:**

- Create: `src/db/seed.ts` — Seed script with ~15 sample tasks
- Modify: `src/db/index.ts` — Auto-run seed on first connection if table is empty
- Modify: `src/app/page.tsx` — Final layout polish (centered board, app title)

**Key Decisions / Notes:**

- Seed data: 15 tasks distributed across columns (~6 todo, ~5 in-progress, ~4 done) with varied priorities and realistic titles/descriptions (e.g., "Set up CI/CD pipeline", "Write API documentation", "Fix login page bug").
- Seed runs automatically: in `src/db/index.ts`, after creating the DB connection, check `SELECT COUNT(*) FROM tasks`. If count is 0, run the seed. The `globalThis` singleton pattern ensures this check only runs once per process start (not on every hot reload).
- Add the app title "Task Board" as a header above the board.
- Board layout: use `min-h-screen` and flexbox centering. Board container horizontally centered with appropriate max-width.
- Add `.gitignore` entry for `sqlite.db` (the database file).

**Definition of Done:**

- [ ] Starting the app with no existing database creates `sqlite.db` with ~15 seed tasks
- [ ] Seed tasks are distributed across all three columns with varied priorities
- [ ] App title "Task Board" appears above the board
- [ ] Board is horizontally centered with `min-h-screen` layout
- [ ] `sqlite.db` is in `.gitignore`
- [ ] Seed runs exactly once — restarting dev server does not insert duplicate tasks

**Verify:**

- `rm -f sqlite.db && npm run dev` — fresh start shows 15 seed tasks across three columns
- `npm run build` — production build succeeds

## Testing Strategy

- **Unit tests:** Server action logic (create, update, delete, move) tested against an in-memory or temporary SQLite database
- **Component tests:** Board drag-and-drop state management logic (optimistic update, revert on error)
- **Manual verification:** Full E2E flow via playwright-cli — drag tasks, create/edit/delete, verify toast notifications, verify persistence after refresh

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Position gaps after many moves | Medium | Low | Use transaction-based position recalculation in `moveTask` that assigns sequential positions to all tasks in affected columns |
| DnD flicker on slow server response | Medium | Medium | Optimistic UI: update local state instantly in `onDragEnd`, only revert if server action fails |
| better-sqlite3 native module build issues | Low | High | Use `npm install` (not yarn PnP) which handles native modules well; add `.node` to Next.js config `serverComponentsExternalPackages` |
| shadcn/ui component version conflicts | Low | Low | Install components individually via CLI; pin versions via package-lock.json |

## Open Questions

None — requirements are fully specified.

### Deferred Ideas

- Task filtering/search
- Mobile responsive layout
- Task due dates and assignees
- Custom columns
- Keyboard shortcuts for task management
