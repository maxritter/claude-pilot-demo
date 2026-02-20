# Labels/Tags System Implementation Plan

Created: 2026-02-20
Status: COMPLETE
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

**Goal:** Add a colorful labels/tags system to the task board. Users can create labels with a name and color (from a predefined palette of 8 colors), assign multiple labels to tasks, filter the board by labels, and manage labels from the header.

**Architecture:** Two new database tables (`labels` and `task_labels`) added to the existing SQLite/Drizzle schema. New server actions for label CRUD and task-label assignment follow the existing pattern in `actions.ts`. A new `LabelManagerDialog` in the header handles label creation/editing/deletion. Labels render as colored pills on `TaskCard`. A `LabelFilter` bar above the board columns provides client-side filtering. All label data flows through the same server component → client component pattern as tasks.

**Tech Stack:** Same as existing — TypeScript, Next.js 16, SQLite/Drizzle, Tailwind CSS, shadcn/ui, Vitest, playwright-cli for E2E.

## Scope

### In Scope

- `labels` table (id, name, color) and `task_labels` junction table (taskId, labelId) in schema
- CREATE TABLE statements added to `db/index.ts` initialization
- Server actions: createLabel, updateLabel, deleteLabel, addLabelToTask, removeLabelFromTask, getLabels
- Label management dialog accessible from header (create, edit, delete labels)
- Color palette of 8 predefined colors for label creation
- Label pills displayed on task cards
- Label assignment UI in edit-task-dialog (toggle labels on/off)
- Filter bar above board columns for filtering by label
- Client-side filtering in Board component (when label filter active, only matching tasks shown)
- Unit tests for all new server actions
- E2E tests with playwright-cli verifying the full workflow
- Seed data: a few sample labels assigned to existing seed tasks

### Out of Scope

- Label assignment during task creation — labels are assigned after creation via the edit task dialog (keeps create dialog simple; user flow: create task → edit to add labels)
- Label reordering / drag-and-drop of labels
- Multi-label filter logic (AND vs OR) — will use OR logic (show tasks with ANY selected label)
- Label search / autocomplete
- Label color custom input (only predefined palette)

## Prerequisites

- Existing project runs with `yarn dev` on port 3000
- No new npm dependencies required — all UI built with existing shadcn/ui + Tailwind
- Color palette picker uses plain button elements styled with Tailwind (no Popover needed)

## Context for Implementer

> This section is critical for cross-session continuity.

- **Patterns to follow:**
  - Server actions pattern: `src/app/actions.ts` — "use server" directive, try/catch with specific error re-throw, `revalidatePath("/")` after mutations
  - Dialog pattern: `src/components/create-task-dialog.tsx` — controlled open state, form with useState, async submit handler with isPending, toast feedback
  - DB singleton: `src/db/index.ts` — inline CREATE TABLE IF NOT EXISTS, must add new tables here
  - Test pattern: `src/app/actions.test.ts` — in-memory SQLite with vi.mock for `@/db` and `next/cache`

- **Conventions:**
  - Components in `src/components/`, one per file, kebab-case filenames
  - Types exported from `src/lib/types.ts` (re-exports from schema)
  - All shadcn/ui components in `src/components/ui/`
  - "use client" directive on all interactive components

- **Key files to read first:**
  - `src/db/schema.ts` — existing table definition pattern
  - `src/db/index.ts:21-31` — inline CREATE TABLE pattern (must add labels + task_labels here)
  - `src/app/actions.ts` — server action error handling pattern
  - `src/components/board.tsx` — where filtering state will live
  - `src/components/task-card.tsx` — where label pills will render
  - `src/app/page.tsx` — server component data fetching (must fetch labels too)

- **Gotchas:**
  - DB init uses raw SQL `CREATE TABLE IF NOT EXISTS` (not Drizzle migrations) — new tables must follow same pattern
  - Board component is client-only (wrapped in `next/dynamic` with `ssr: false` via board-wrapper.tsx)
  - `draggableId` must be a string — already handled with `String(task.id)`
  - Task type comes from Drizzle's `$inferSelect` — label data will be passed separately, not embedded in Task type
  - **Tailwind v4 static scanning:** Project uses Tailwind v4 with no tailwind.config.ts. Class names must appear as complete literal strings in source — never constructed via template literals. `"bg-red-100"` works; `` `bg-${color}-100` `` produces invisible styling.
  - **Naming collision:** The domain type `Label` conflicts with shadcn/ui's `Label` form component. Use aliased imports: `import type { Label as LabelType } from '@/lib/types'` in files that also use the UI Label component.

- **Domain context:**
  - Labels are project-wide (not per-task-status). Any label can be on any task regardless of column.
  - The color palette is fixed — users pick from predefined options, not arbitrary hex values.
  - Filtering is additive (OR): selecting labels A and B shows tasks that have A OR B.

## Runtime Environment

- **Start command:** `yarn dev`
- **Port:** 3000
- **Health check:** `curl http://localhost:3000`
- **Restart procedure:** Stop and re-run `yarn dev` (hot reload handles most changes)

## Color Palette

The 8 predefined label colors (name → Tailwind bg/text classes):

| Name | Background | Text | Hex (for reference) |
|------|-----------|------|---------------------|
| red | bg-red-100 | text-red-700 | #fee2e2 |
| orange | bg-orange-100 | text-orange-700 | #ffedd5 |
| yellow | bg-yellow-100 | text-yellow-700 | #fef9c3 |
| green | bg-green-100 | text-green-700 | #dcfce7 |
| blue | bg-blue-100 | text-blue-700 | #dbeafe |
| purple | bg-purple-100 | text-purple-700 | #f3e8ff |
| pink | bg-pink-100 | text-pink-700 | #fce7f3 |
| gray | bg-gray-100 | text-gray-700 | #f3f4f6 |

Colors are stored as the name string (e.g., "red", "blue") in the database. The mapping to Tailwind classes happens in a shared utility (`src/lib/label-colors.ts`).

**CRITICAL: Tailwind v4 Static Class Scanning** — The `label-colors.ts` file MUST use a complete static object mapping where full Tailwind class strings appear as literal strings in source code. Never construct class names with template literals (e.g., `` `bg-${color}-100` ``). Tailwind v4's scanner only generates CSS for class strings it can statically detect in source files. Write `"bg-red-100"` as a complete literal string.

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [x] Task 1: Database schema and initialization
- [x] Task 2: Label server actions and tests
- [x] Task 3: Task-label server actions and tests
- [x] Task 4: Label management dialog (header UI)
- [x] Task 5: Label pills on task cards
- [x] Task 6: Label assignment in edit-task dialog
- [x] Task 7: Filter bar and board filtering
- [x] Task 8: Seed data and E2E tests

**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Database Schema and Initialization

**Objective:** Add `labels` and `task_labels` tables to the Drizzle schema and the SQLite initialization.

**Dependencies:** None

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `src/db/index.ts`
- Modify: `src/lib/types.ts`

**Key Decisions / Notes:**

- Add `labels` table: `id` (integer PK autoincrement), `name` (text not null), `color` (text not null with enum constraint for the 8 colors)
- Add `task_labels` table: `taskId` (integer not null, FK to tasks.id), `labelId` (integer not null, FK to labels.id), composite primary key on (taskId, labelId)
- Follow the existing pattern in `schema.ts` using `sqliteTable()`
- Add CREATE TABLE IF NOT EXISTS statements to `db/index.ts:initDb()` after the tasks table creation (lines 21-31)
- Export `Label`, `NewLabel`, `LabelColor` types from `schema.ts`
- Re-export new types from `src/lib/types.ts`
- The `task_labels` junction table does NOT need a separate auto-increment id — use composite primary key of (taskId, labelId)

**Definition of Done:**

- [ ] `labels` table defined in schema.ts with id, name, color columns
- [ ] `task_labels` table defined in schema.ts with taskId, labelId columns and composite primary key
- [ ] CREATE TABLE IF NOT EXISTS statements for both tables in db/index.ts
- [ ] Label and LabelColor types exported from types.ts
- [ ] `yarn build` succeeds with no type errors

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn build` — builds without errors

### Task 2: Label Server Actions and Tests

**Objective:** Implement createLabel, updateLabel, deleteLabel, and getLabels server actions with full test coverage.

**Dependencies:** Task 1

**Files:**

- Modify: `src/app/actions.ts`
- Modify: `src/app/actions.test.ts`

**Key Decisions / Notes:**

- `createLabel(data: { name: string; color: LabelColor })`: validates name is non-empty, inserts into labels table, calls revalidatePath("/")
- `updateLabel(id: number, data: { name?: string; color?: LabelColor })`: validates label exists, updates provided fields, calls revalidatePath("/")
- `deleteLabel(id: number)`: deletes label AND all associated task_labels rows (cascade), calls revalidatePath("/"). Use a transaction to ensure atomicity.
- `getLabels()`: returns all labels ordered by id. This is a read query — define it as a plain async function (not a server action), following the existing pattern where page.tsx queries db directly. Can be placed in actions.ts for convenience but note it does not need revalidatePath.
- `getAllTaskLabels()`: similar — plain read query, returns all task-label associations for bulk loading.
- Follow the same error handling pattern as existing actions for mutation functions (try/catch, specific error messages re-thrown, generic fallback)
- Tests: Create both labels and task_labels tables in beforeEach. Test CRUD operations, validation, cascade delete, not-found errors.

**Definition of Done:**

- [ ] createLabel validates name is non-empty and color is one of the 8 valid palette colors
- [ ] createLabel throws error for invalid color value not in the palette
- [ ] updateLabel updates only provided fields
- [ ] deleteLabel removes label and all task_labels associations in a transaction
- [ ] getLabels returns all labels ordered by id
- [ ] Tests cover: create, update, delete, getLabels, empty-name validation, invalid-color validation, not-found errors, cascade delete removes task_labels
- [ ] `yarn test` passes with all new tests green

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn test` — all tests pass

### Task 3: Task-Label Server Actions and Tests

**Objective:** Implement addLabelToTask, removeLabelFromTask, and getTaskLabels server actions with tests.

**Dependencies:** Task 2

**Files:**

- Modify: `src/app/actions.ts`
- Modify: `src/app/actions.test.ts`

**Key Decisions / Notes:**

- `addLabelToTask(taskId: number, labelId: number)`: validates both task and label exist, inserts into task_labels. If the association already exists, silently succeed (idempotent). Calls revalidatePath("/").
- `removeLabelFromTask(taskId: number, labelId: number)`: deletes from task_labels where both match. If association doesn't exist, silently succeed. Calls revalidatePath("/").
- `getTaskLabels(taskId: number)`: returns all labels for a given task by joining task_labels and labels tables.
- Also add a utility `getAllTaskLabels()` that returns all task-label associations (for efficient bulk loading on page.tsx).
- Tests: verify add/remove associations, idempotency, that deleting a task cleans up task_labels (modify deleteTask to also delete from task_labels in its transaction).
- **Test setup:** The beforeEach in actions.test.ts must add CREATE TABLE statements for BOTH `labels` AND `task_labels` alongside the existing `tasks` table. All three tables must be created in every test setup block, since deleteTask now touches task_labels. Consider extracting a shared `createTestSchema(sqlite)` helper that creates all tables to prevent forgetting one.

**Definition of Done:**

- [ ] addLabelToTask creates task-label association (idempotent)
- [ ] removeLabelFromTask removes task-label association (idempotent)
- [ ] getTaskLabels returns labels for a specific task
- [ ] getAllTaskLabels returns all task-label mappings
- [ ] deleteTask updated to also remove task_labels for the deleted task
- [ ] Tests cover: add, remove, idempotency, get by task, get all, cascade on task delete
- [ ] `yarn test` passes with all tests green

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn test` — all tests pass

### Task 4: Label Management Dialog (Header UI)

**Objective:** Build a LabelManagerDialog component accessible from the header that lets users create, edit, and delete labels.

**Dependencies:** Task 2

**Files:**

- Create: `src/components/label-manager-dialog.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/lib/label-colors.ts`

**Key Decisions / Notes:**

- Create `src/lib/label-colors.ts` — shared constant mapping color names to Tailwind classes (must use full literal class strings, never template literals). Both the label manager and task card will import from here.
- `LabelManagerDialog` is a Dialog triggered by a "Labels" button in the header (next to "New Task")
- Inside the dialog: a list of existing labels (colored pill + name + edit/delete buttons), and a "New Label" form at the bottom
- New label form: text input for name + color palette picker (8 colored circle buttons styled with Tailwind, click to select — no Popover needed, just a flex row of buttons)
- Edit mode: clicking edit on a label shows inline editing (name input + color picker replace the label display)
- Delete: confirmation via AlertDialog (reuse existing pattern from delete-task-dialog)
- Pass `labels` data from page.tsx as a prop (fetched server-side alongside tasks)
- The dialog is a client component ("use client")

**Definition of Done:**

- [ ] label-colors.ts exports LABEL_COLORS constant mapping color names to { bg, text } Tailwind classes using full literal class strings (never template literals)
- [ ] LabelManagerDialog renders in header next to "New Task" button
- [ ] Users can create a new label with name and color
- [ ] Users can edit an existing label's name and color
- [ ] Users can delete a label with confirmation
- [ ] page.tsx fetches labels from DB and passes to components
- [ ] No type errors, `yarn build` succeeds

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn build` — builds without errors

### Task 5: Label Pills on Task Cards

**Objective:** Display assigned labels as small colored pills on each task card.

**Dependencies:** Task 3, Task 4

**Files:**

- Modify: `src/components/task-card.tsx`
- Modify: `src/components/column.tsx`
- Modify: `src/components/board.tsx`
- Modify: `src/components/board-wrapper.tsx`
- Modify: `src/app/page.tsx`

**Key Decisions / Notes:**

- page.tsx fetches all task-label mappings via `getAllTaskLabels()` and all labels via `getLabels()`, passes them down
- Board component receives `labels` and `taskLabels` as props alongside `tasks`
- BoardWrapper updated to accept and pass these new props through (update its props type and the dynamic import call)
- TaskCard receives its labels as a prop (filtered from the full taskLabels map by the Column or Board component)
- Label pills render below the title in CardHeader, as a flex-wrap row of small badges using the color classes from `label-colors.ts`
- Each pill shows the label name with its background/text color
- Keep pills small: `text-xs px-2 py-0.5 rounded-full`

**Definition of Done:**

- [ ] page.tsx passes labels and taskLabels data to BoardWrapper
- [ ] BoardWrapper accepts and passes labels and taskLabels props to Board with correct TypeScript types
- [ ] Board passes per-task labels to Column, Column passes to TaskCard
- [ ] TaskCard displays label pills below the title
- [ ] Pills use correct colors from label-colors.ts
- [ ] Labels display correctly on tasks that have them; no pills on tasks without labels
- [ ] `yarn build` succeeds

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn build` — builds without errors

### Task 6: Label Assignment in Edit Task Dialog

**Objective:** Add label toggle UI to the edit-task-dialog so users can assign/remove labels from a task.

**Dependencies:** Task 5

**Files:**

- Modify: `src/components/edit-task-dialog.tsx`

**Key Decisions / Notes:**

- Add a "Labels" section below the Priority select in the edit dialog
- Show all available labels as toggleable pills (click to add, click again to remove)
- Active (assigned) labels have full color styling; unassigned labels are outlined/dimmed
- On toggle, immediately call `addLabelToTask` or `removeLabelFromTask` server action
- Show toast on error
- The edit dialog needs to receive `labels` (all available) and `taskLabelIds` (IDs of labels currently on this task) as props
- Update EditTaskDialog props and all call sites (task-card.tsx)
- **Naming collision:** The domain type `Label` (from types.ts) collides with the shadcn/ui `Label` component (from `@/components/ui/label`) already imported in edit-task-dialog.tsx. Import the domain type with an alias: `import type { Label as LabelType } from '@/lib/types'`

**Definition of Done:**

- [ ] Edit dialog shows "Labels" section with all available labels
- [ ] Clicking a label toggles its assignment (add/remove via server action)
- [ ] Assigned labels visually distinct from unassigned (filled vs outlined)
- [ ] Toast feedback on errors
- [ ] Props correctly threaded from Board → Column → TaskCard → EditTaskDialog
- [ ] `yarn build` succeeds

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn build` — builds without errors

### Task 7: Filter Bar and Board Filtering

**Objective:** Add a filter bar above the board columns that shows all labels as clickable pills. Clicking a label filters the board to only show tasks with that label.

**Dependencies:** Task 5

**Files:**

- Create: `src/components/label-filter.tsx`
- Modify: `src/components/board.tsx`

**Key Decisions / Notes:**

- `LabelFilter` component renders above the columns grid in Board
- Shows all labels as clickable colored pills, plus a "Clear filters" button when any filter is active
- Multiple labels can be selected (OR logic): show tasks that have ANY of the selected labels
- Filter state lives in Board component as `Set<number>` (selected label IDs)
- When filters are active, `groupTasksByStatus` receives only the filtered task list
- Active filter pills have full color; inactive are outlined/dimmed (similar to label assignment toggle)
- When no filters active, all tasks shown (default behavior)
- The filter is purely client-side — no server action needed
- **DnD + filter interaction:** Disable drag-and-drop when any label filter is active. The visible DnD indices would not match the true position indices in the database, causing position corruption. When filters are active, set `isDragDisabled={true}` on Draggable components and show a subtle "Clear filters to reorder" hint.
- **Label data and DnD snapshots:** taskLabels does not need to be included in the DnD optimistic snapshot since label assignments do not change during drag operations. The filtering derived view is computed inline from the current columns + taskLabels state, so reverts work correctly.

**Definition of Done:**

- [ ] LabelFilter component renders all labels as clickable pills above the columns
- [ ] Clicking a label pill toggles it as a filter
- [ ] Active filters have distinct visual styling (filled background)
- [ ] "Clear filters" button appears when filters active and clears all
- [ ] Board shows only tasks matching ANY selected label when filter is active
- [ ] Tasks with no labels are hidden when any filter is active
- [ ] All tasks shown when no filters active
- [ ] Drag-and-drop is disabled when any label filter is active (isDragDisabled={true})
- [ ] Subtle hint "Clear filters to reorder" shown when filters active
- [ ] `yarn build` succeeds

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn build` — builds without errors

### Task 8: Seed Data and E2E Tests

**Objective:** Add sample labels to seed data and write comprehensive E2E tests with playwright-cli.

**Dependencies:** Task 7

**Files:**

- Modify: `src/db/seed.ts`
- Modify: `src/db/index.ts` (seed condition may need update)

**Key Decisions / Notes:**

- Add 4-5 sample labels to seed: "Bug" (red), "Feature" (blue), "Documentation" (green), "Urgent" (orange), "Design" (purple)
- Assign labels to some existing seed tasks (e.g., "Fix login page bug" gets "Bug" + "Urgent", "Write API documentation" gets "Documentation")
- Seed function imports and inserts into both `labels` and `task_labels` tables
- **Seed idempotency:** Update `db/index.ts` to also check `count(labels) === 0` separately from the tasks check. Add a separate `seedLabels()` call so labels are seeded even if tasks already exist from a pre-labels version of the DB. This prevents the scenario where an existing sqlite.db has tasks but no labels after the schema update.
- **Dev tip:** Document in verify step: delete sqlite.db and restart to re-seed with fresh data including labels
- E2E tests with playwright-cli verify:
  1. Labels visible on task cards
  2. Label manager: create a new label, verify it appears
  3. Label manager: edit a label name, verify change
  4. Label manager: delete a label, verify removal
  5. Edit task: toggle labels on/off, verify pills update on card
  6. Filter bar: click a label to filter, verify only matching tasks shown
  7. Filter bar: clear filters, verify all tasks return

**Definition of Done:**

- [ ] Seed data includes 4-5 labels with distinct colors
- [ ] Seed data assigns labels to some tasks
- [ ] E2E: label pills visible on seeded task cards
- [ ] E2E: can create a new label via label manager
- [ ] E2E: can edit a label via label manager
- [ ] E2E: can delete a label via label manager
- [ ] E2E: can toggle labels on a task via edit dialog
- [ ] E2E: label filter shows/hides tasks correctly
- [ ] E2E: clear filter restores all tasks
- [ ] `yarn test` passes all unit tests
- [ ] All E2E playwright-cli tests pass

**Verify:**

- `cd /workspaces/awesome-task-board/.worktrees/spec-labels-tags-system-0a3202c && yarn test` — unit tests pass
- E2E tests executed as inline playwright-cli commands (open app, snapshot, interact, verify) — each of the 7 scenarios above verified interactively during implementation and documented with snapshot evidence

## Testing Strategy

- **Unit tests:** All label server actions (createLabel, updateLabel, deleteLabel, getLabels, addLabelToTask, removeLabelFromTask, getTaskLabels, getAllTaskLabels) tested with in-memory SQLite following existing pattern in actions.test.ts
- **Integration tests:** deleteTask cascade (deleting a task also removes its task_labels), deleteLabel cascade (deleting a label removes its task_labels)
- **E2E tests:** Full user workflow tested with playwright-cli — label CRUD, label assignment, filtering

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Large number of labels makes filter bar overflow | Low | Low | Use flex-wrap on filter bar so pills wrap to next line |
| Deleting a label that's being filtered on | Med | Med | When a label is deleted, remove it from active filters in Board state (via useEffect on labels prop change) |
| Task card becomes cluttered with many labels | Low | Med | Always use flex-wrap on the label pill container in TaskCard with no height cap — pills are always fully visible. Keep pills small (text-xs px-2 py-0.5) to minimize vertical space |
| DB init order matters for foreign keys | Med | High | Create tables in order: tasks → labels → task_labels in db/index.ts. Rely on application-level validation in server actions (verify task and label exist before inserting into task_labels). Do not add SQLite FK constraints |

## Open Questions

- None — requirements are fully specified.

### Deferred Ideas

- AND/OR toggle for multi-label filtering
- Label search/autocomplete for boards with many labels
- Drag labels to reorder them
- Custom color picker (arbitrary hex values)
