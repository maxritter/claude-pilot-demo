# Add Due Dates Implementation Plan

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

**Goal:** Add optional due dates to tasks with smart visual urgency indicators — date picker in create/edit dialogs, relative time labels on cards, color-coded urgency badges (green/amber/red with pulse animation for overdue), and a per-column sort-by-due-date toggle.

**Architecture:** Add a nullable `due_date` TEXT column to the SQLite tasks table. Install `react-day-picker` + `@radix-ui/react-popover` for the shadcn/ui Calendar and Popover components. Build a pure `getRelativeDate()` utility (no external date library) for relative time labels, using local-timezone date parsing to avoid UTC off-by-one bugs. Add a client-side sort toggle to each column header that reorders tasks by due date (soonest first, null dates last) and disables drag-and-drop while sort is active.

**Tech Stack:** react-day-picker, @radix-ui/react-popover (new deps), date-fns (peer dep of react-day-picker), Tailwind CSS `@utility` + `@keyframes` for overdue pulse animation.

## Scope

### In Scope

- Add `due_date` column (nullable TEXT, ISO date format) to tasks table schema
- Update `CREATE TABLE` in `db/index.ts` and test setup
- Update `createTask` and `updateTask` server actions to accept optional `dueDate`
- Add server-side date format validation (ISO `YYYY-MM-DD` regex)
- Install and add shadcn/ui Calendar and Popover components
- Build a DatePicker composite component (Popover + Calendar + clear button)
- Add DatePicker to CreateTaskDialog and EditTaskDialog
- Build a DueDateBadge component with relative time labels and urgency color coding
- Add CSS pulse animation for overdue badges (using Tailwind v4 `@utility` directive)
- Add sort-by-due-date toggle button to each column header (disables DnD when active)
- Client-side sort state management in Board component
- Unit tests for all server action changes (dueDate in create, update)
- Unit tests for `getRelativeDate()` utility with explicit boundary conditions
- E2E tests with playwright-cli
- Update seed data with sample due dates

### Out of Scope

- Server-side sorting / new API endpoint for sorted queries
- Due date notifications or reminders
- Recurring due dates
- Time-of-day precision (dates only, no timestamps)
- Due date filtering

## Prerequisites

- `react-day-picker` and `date-fns` packages (react-day-picker peer dep)
- `@radix-ui/react-popover` package
- shadcn/ui Calendar and Popover component files

## Context for Implementer

> This section is critical for cross-session continuity. Write it for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Server actions pattern in `src/app/actions.ts:9-42` — each action validates input, performs DB operation, calls `revalidatePath("/")`
  - Dialog pattern in `src/components/create-task-dialog.tsx` — useState for each field, handleSubmit calls server action, toast on success/error
  - Badge pattern in `src/components/task-card.tsx:12-16` — `priorityColors` map with Tailwind classes
  - Test pattern in `src/app/actions.test.ts:21-36` — in-memory SQLite with inline CREATE TABLE, vi.mock for next/cache and @/db

- **Conventions:**
  - All components in `src/components/`, UI primitives in `src/components/ui/`
  - Types exported from `src/lib/types.ts` which re-exports from `src/db/schema.ts`
  - SQLite stores dates as TEXT in ISO format (see `created_at` column)
  - Tailwind v4 with CSS variables for theming (see `globals.css`); custom utility classes require `@utility` directive

- **Key files the implementer must read first:**
  - `src/db/schema.ts` — table definition, add `dueDate` column here
  - `src/db/index.ts` — inline CREATE TABLE (lines 21-31), must add `due_date` column
  - `src/app/actions.ts` — server actions to update
  - `src/components/task-card.tsx` — where DueDateBadge will be rendered
  - `src/components/column.tsx` — where sort toggle will be added
  - `src/components/board.tsx` — sort state management lives here
  - `src/app/actions.test.ts` — test setup with in-memory SQLite

- **Gotchas:**
  - `db/index.ts` has an inline `CREATE TABLE` separate from the Drizzle schema — both must be updated in sync
  - The test file also has its own inline `CREATE TABLE` in `beforeEach` — must be updated too
  - `Board` component uses `groupTasksByStatus()` which sorts by position — sort toggle must integrate here
  - **DnD + sort conflict:** When sort is active, `handleDragEnd` passes visual array indices to `moveTask`, but the server computes positions using DB-ordered arrays. This causes position corruption. Solution: disable DnD when sort is active.
  - The `Task` type is inferred from the Drizzle schema (`$inferSelect`) — adding `dueDate` to schema automatically updates the type
  - **Date conversion pitfall:** `Date.toISOString()` converts to UTC. For users west of UTC, a date selected as March 15 at midnight local becomes March 14 in UTC. Always use local date components: `date.getFullYear()`, `date.getMonth()`, `date.getDate()`.
  - **Date parsing pitfall:** `new Date("2026-03-15")` parses as UTC midnight, not local midnight. Always parse ISO date strings manually: `const [y, m, d] = str.split("-").map(Number); new Date(y, m-1, d);`
  - **Tailwind v4 custom utilities:** In Tailwind v4, custom class names like `animate-pulse-urgency` require an explicit `@utility` block in CSS to be recognized. Plain `@keyframes` alone is insufficient.
  - **Drizzle `.set()` with undefined:** Drizzle may treat `undefined` as `NULL` in SET clauses. Explicitly filter out undefined keys before passing to `.set()` to prevent accidentally clearing fields.

- **Domain context:**
  - Due dates are stored as ISO date strings (e.g., `"2026-03-15"`) — date only, no time component
  - Urgency thresholds: green (>3 days), amber (1-3 days), red (overdue/today), with "today" being red since it's the deadline day
  - Sort toggle is purely client-side — reorders the already-fetched task array without new DB queries
  - Sort mode disables drag-and-drop to prevent position corruption

## Runtime Environment

- **Start command:** `yarn dev` (Next.js dev server)
- **Port:** 3000
- **Health check:** `curl http://localhost:3000`
- **Restart procedure:** Kill and re-run `yarn dev` after schema changes

## Progress Tracking

**MANDATORY: Update this checklist as tasks complete. Change `[ ]` to `[x]`.**

- [x] Task 1: Add dueDate to database schema and initialization
- [x] Task 2: Update server actions to handle dueDate
- [x] Task 3: Add shadcn/ui Calendar, Popover, and DatePicker components
- [x] Task 4: Add DatePicker to create and edit task dialogs
- [x] Task 5: Build DueDateBadge with relative time and urgency colors
- [x] Task 6: Add sort-by-due-date toggle to columns
- [x] Task 7: Server action and utility unit tests
- [x] Task 8: E2E verification with playwright-cli

**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Add dueDate to Database Schema and Initialization

**Objective:** Add optional `due_date` column to the tasks table in both the Drizzle schema and the inline CREATE TABLE statement, and update seed data with sample due dates.

**Dependencies:** None

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `src/db/index.ts`
- Modify: `src/db/seed.ts`

**Key Decisions / Notes:**

- Column name: `due_date` in SQLite (snake_case), `dueDate` in Drizzle schema (camelCase mapping)
- Type: `text("due_date")` — nullable, no `.notNull()`, stores ISO date strings like `"2026-03-15"` or `null`
- No default value — `null` means no due date
- Update the inline `CREATE TABLE` in `db/index.ts:21-31` to add `due_date TEXT` (no NOT NULL)
- Update seed data to include a mix of due dates: some past (overdue), some today, some near-future, some far-future, some null
- Seed dates should be computed relative to "now" so they remain meaningful regardless of when the seed runs (e.g., `new Date()` minus/plus N days)
- **IMPORTANT:** Delete the existing `sqlite.db` file before testing so the schema change takes effect (SQLite CREATE TABLE IF NOT EXISTS won't alter existing tables)

**Definition of Done:**

- [ ] `dueDate` column exists in Drizzle schema as optional text field
- [ ] `CREATE TABLE` in `db/index.ts` includes `due_date TEXT` column
- [ ] `Task` type (inferred from schema) includes `dueDate: string | null`
- [ ] Seed data includes tasks with varied due dates (past, today, near, far, null)
- [ ] `yarn build` succeeds with no type errors

**Verify:**

- `yarn build` — no type errors
- `rm -f sqlite.db && yarn dev` — dev server starts, seed data loads with due dates visible in DB

---

### Task 2: Update Server Actions to Handle dueDate

**Objective:** Update `createTask` and `updateTask` server actions to accept and persist an optional `dueDate` parameter, with server-side format validation.

**Dependencies:** Task 1

**Files:**

- Modify: `src/app/actions.ts`

**Key Decisions / Notes:**

- `createTask` data parameter gains `dueDate?: string | null` — pass through to `db.insert().values()`
- `updateTask` data parameter gains `dueDate?: string | null` — include in `.set()` call
- **Server-side validation:** If `dueDate` is a non-null string, validate it matches `/^\d{4}-\d{2}-\d{2}$/` before storing. Throw `new Error("Invalid due date format")` if invalid.
- **Explicit undefined filtering in updateTask:** Before calling `.set(data)`, filter out keys with `undefined` values to prevent Drizzle from treating them as NULL: `const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))`. This ensures updating title-only does not accidentally clear dueDate.
- When `dueDate` is explicitly `null`, it clears the due date. When `undefined`, it is omitted from the update.
- `deleteTask` and `moveTask` require no changes (they don't touch dueDate)

**Definition of Done:**

- [ ] `createTask` accepts optional `dueDate` and persists it to the database
- [ ] `updateTask` accepts optional `dueDate` and can set or clear it
- [ ] `updateTask` with `dueDate: undefined` preserves existing dueDate (not cleared)
- [ ] Server-side validation rejects malformed date strings
- [ ] Existing createTask/updateTask behavior unchanged when `dueDate` not provided
- [ ] No type errors in `yarn build`

**Verify:**

- `yarn build` — compiles clean
- `yarn test` — existing tests still pass (no regression)

---

### Task 3: Add shadcn/ui Calendar, Popover, and DatePicker Components

**Objective:** Install required dependencies and create the Calendar, Popover UI primitives and a composite DatePicker component.

**Dependencies:** None (can run in parallel with Tasks 1-2)

**Files:**

- Create: `src/components/ui/calendar.tsx`
- Create: `src/components/ui/popover.tsx`
- Create: `src/components/date-picker.tsx`

**Key Decisions / Notes:**

- Install packages: `react-day-picker`, `date-fns`, `@radix-ui/react-popover`
- Calendar component: Standard shadcn/ui Calendar wrapping react-day-picker with Tailwind styling
- Popover component: Standard shadcn/ui Popover wrapping @radix-ui/react-popover
- DatePicker composite: Popover trigger (Button showing selected date or "Pick a date"), Calendar inside popover, X button to clear selection
- DatePicker props: `value: Date | undefined`, `onChange: (date: Date | undefined) => void`, `disabled?: boolean`
- Use `format()` from date-fns to display selected date in the trigger button (e.g., "Mar 15, 2026")
- Clear button: small X icon button next to the date text inside the trigger, calls `onChange(undefined)`

**Definition of Done:**

- [ ] `react-day-picker`, `date-fns`, and `@radix-ui/react-popover` installed
- [ ] Calendar component renders a month view with selectable days
- [ ] Popover component opens/closes correctly
- [ ] DatePicker shows selected date, allows picking a new date, and has a clear button
- [ ] `yarn build` succeeds

**Verify:**

- `yarn build` — compiles clean with new components

---

### Task 4: Add DatePicker to Create and Edit Task Dialogs

**Objective:** Integrate the DatePicker component into both the CreateTaskDialog and EditTaskDialog, using local-timezone date conversion.

**Dependencies:** Task 2, Task 3

**Files:**

- Modify: `src/components/create-task-dialog.tsx`
- Modify: `src/components/edit-task-dialog.tsx`

**Key Decisions / Notes:**

- Add `dueDate` state: `useState<Date | undefined>(undefined)` in CreateTaskDialog
- In EditTaskDialog, initialize from `task.dueDate`: parse ISO string to local Date using `const [y, m, d] = str.split("-").map(Number); new Date(y, m-1, d)`, or undefined if null
- Place DatePicker after the Priority select, with label "Due Date (optional)"
- **Date to ISO string conversion (local timezone):** Do NOT use `date.toISOString().split('T')[0]` — this converts to UTC and causes off-by-one day errors for users west of UTC. Instead use local components:
  ```
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  ```
- Pass `null` when date is undefined (no due date selected)
- Reset dueDate state when dialog closes (CreateTaskDialog) or opens (EditTaskDialog syncs from task prop)
- Pass `dueDate` to the `createTask`/`updateTask` server action calls

**Definition of Done:**

- [ ] CreateTaskDialog has a DatePicker field that sends dueDate to createTask
- [ ] EditTaskDialog has a DatePicker pre-filled with existing task dueDate
- [ ] Clear button in DatePicker removes the due date
- [ ] Creating a task without a due date works (null in DB)
- [ ] Editing a task to add, change, or remove due date works
- [ ] Date conversion uses local timezone components (not toISOString)

**Verify:**

- `yarn build` — compiles clean
- Manual: create task with/without due date, edit task to add/remove due date

---

### Task 5: Build DueDateBadge with Relative Time and Urgency Colors

**Objective:** Create a DueDateBadge component that displays relative time labels with color-coded urgency, and a `getRelativeDate()` utility function. Add a CSS pulse animation for overdue badges using Tailwind v4's `@utility` directive.

**Dependencies:** Task 1 (needs Task type with dueDate)

**Files:**

- Create: `src/lib/date-utils.ts`
- Create: `src/components/due-date-badge.tsx`
- Modify: `src/components/task-card.tsx`
- Modify: `src/app/globals.css`

**Key Decisions / Notes:**

- `getRelativeDate(dateStr: string)` utility returns `{ label: string, urgency: "overdue" | "today" | "soon" | "normal" }`:
  - Overdue (past): "yesterday", "2 days ago", "3 days ago", etc.
  - Today: "today"
  - Soon (1-3 days away, inclusive): "tomorrow", "in 2 days", "in 3 days"
  - Normal (>3 days away): "in 5 days", "in 8 days", etc.
  - For >14 days, show "in X weeks" (rounded down). Never show formatted calendar dates as labels.
- **Boundary definitions:**
  - 3 days from now → urgency "soon" (amber)
  - 4 days from now → urgency "normal" (green)
  - Today → urgency "today" (red, no pulse)
  - Yesterday → urgency "overdue" (red + pulse)
- **Local timezone date parsing:** Parse ISO date strings using `const [y, m, d] = dateStr.split("-").map(Number); const due = new Date(y, m-1, d);` — NOT `new Date(dateStr)` which parses as UTC midnight. Construct "today" similarly: `const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());`.
- Color mapping (Tailwind classes):
  - `overdue`: red — `bg-red-100 text-red-800 border-red-300` + `animate-pulse-urgency` class
  - `today`: red — `bg-red-100 text-red-800 border-red-300` (same red, no pulse)
  - `soon`: amber — `bg-amber-100 text-amber-800 border-amber-300`
  - `normal`: green — `bg-green-100 text-green-800 border-green-300`
- **Pulse animation (Tailwind v4):** In `globals.css`, add BOTH a `@keyframes pulse-urgency` block AND a `@utility animate-pulse-urgency` block:
  ```css
  @keyframes pulse-urgency {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @utility animate-pulse-urgency {
    animation: pulse-urgency 2s ease-in-out infinite;
  }
  ```
  Without the `@utility` directive, Tailwind v4 will not recognize the `animate-pulse-urgency` class.
- DueDateBadge renders nothing when `dueDate` is null/undefined
- **DueDateBadge root element must include `data-testid="due-date-badge"` for E2E testability**
- Place DueDateBadge in task-card.tsx below the description area (in CardContent, or after CardHeader if no description)
- Use lucide-react `Clock` icon (small, 12px) beside the label
- `getRelativeDate` should include a try/catch that returns a safe fallback (the raw date string) if parsing fails

**Definition of Done:**

- [ ] `getRelativeDate()` returns correct labels for all urgency categories
- [ ] `getRelativeDate(today)` returns `{ label: "today", urgency: "today" }`
- [ ] `getRelativeDate(tomorrow)` returns `{ urgency: "soon" }` (amber boundary)
- [ ] `getRelativeDate(3 days from now)` returns `{ urgency: "soon" }` (amber boundary)
- [ ] `getRelativeDate(4 days from now)` returns `{ urgency: "normal" }` (green boundary)
- [ ] `getRelativeDate(yesterday)` returns `{ label: "yesterday", urgency: "overdue" }`
- [ ] Due dates falling on today display red badge without pulse animation
- [ ] DueDateBadge renders correct label and color for overdue, today, soon, and normal dates
- [ ] DueDateBadge renders nothing for null due dates
- [ ] DueDateBadge root element has `data-testid="due-date-badge"` attribute
- [ ] Overdue badges have a subtle pulsing animation via `animate-pulse-urgency` CSS class
- [ ] Badge displays on task cards with correct urgency coloring
- [ ] Visual appearance matches urgency spec (green > amber > red > red+pulse)

**Verify:**

- `yarn build` — compiles clean
- Visual: seed data should show a mix of colored badges on task cards

---

### Task 6: Add Sort-by-Due-Date Toggle to Columns

**Objective:** Add a toggle button to each column header that switches between position order (default) and due-date order (soonest first, nulls last). Disable drag-and-drop when sort is active to prevent position corruption.

**Dependencies:** Task 1, Task 5

**Files:**

- Modify: `src/components/board.tsx`
- Modify: `src/components/column.tsx`

**Key Decisions / Notes:**

- Add `sortByDueDate` state to Board: `Record<Status, boolean>` defaulting all to `false`
- Pass `sortByDueDate` flag and `onToggleSort` callback to each Column
- In Board, when `sortByDueDate[status]` is true, sort the column's tasks: tasks with dueDate sorted by date ascending, tasks without dueDate at the bottom (preserving their position order)
- Sort toggle button: small icon button in column header next to the task count badge, using `ArrowUpDown` or `Clock` icon from lucide-react
- Active state: highlighted/filled icon or different background color when sort is active
- **Critical: Disable DnD when sort is active.** When sort is active, the visual array indices don't match DB position order, so `moveTask(taskId, destStatus, destination.index)` would store the wrong position. Set `isDragDisabled={sortByDueDate[status]}` on each `Draggable` in column.tsx, OR in `handleDragEnd` check if sort is active for source/dest column and return early with a toast like "Disable due date sort to reorder tasks."
- **useEffect re-sync with sort:** When `initialTasks` change (from server revalidation), the `useEffect` in Board must apply the sort transformation if sort is active: `setColumns(applySort(groupTasksByStatus(initialTasks), sortByDueDate))`. This prevents a flicker where position-ordered data briefly appears when sort toggle is on.
- The sort is purely a client-side view transformation. Toggling off restores position order.

**Definition of Done:**

- [ ] Each column has a sort toggle button in the header
- [ ] Clicking toggle sorts tasks by due date (soonest first, nulls at bottom)
- [ ] Clicking again reverts to position order (default)
- [ ] Toggle state is visually indicated (button appearance changes)
- [ ] Drag-and-drop is disabled when sort is active (prevents position corruption)
- [ ] Tasks without due dates appear at the bottom when sorting by due date
- [ ] Server revalidation (useEffect) preserves sort state — no flicker

**Verify:**

- `yarn build` — compiles clean
- Visual: toggle sorts tasks, toggle again restores order, dragging disabled when sorted

---

### Task 7: Server Action and Utility Unit Tests

**Objective:** Write comprehensive unit tests for all dueDate-related server action changes and the `getRelativeDate()` utility function with explicit boundary condition tests.

**Dependencies:** Task 2, Task 5

**Files:**

- Modify: `src/app/actions.test.ts`
- Create: `src/lib/date-utils.test.ts`

**Key Decisions / Notes:**

- Update test `beforeEach` CREATE TABLE to include `due_date TEXT` column
- Server action tests to add:
  - `createTask` with dueDate — verify stored in DB
  - `createTask` without dueDate — verify null in DB
  - `updateTask` setting dueDate — verify updated
  - `updateTask` clearing dueDate (set to null) — verify cleared
  - `updateTask` without dueDate field — verify existing dueDate preserved (NOT cleared)
  - `createTask` with malformed dueDate — verify rejection
- `getRelativeDate()` tests with `vi.useFakeTimers()`:
  - `getRelativeDate("today's date")` → `{ label: "today", urgency: "today" }`
  - `getRelativeDate("tomorrow")` → `{ label: "tomorrow", urgency: "soon" }`
  - `getRelativeDate("3 days from now")` → `{ urgency: "soon" }` (amber boundary — 3 days is still "soon")
  - `getRelativeDate("4 days from now")` → `{ urgency: "normal" }` (green boundary — 4 days is "normal")
  - `getRelativeDate("yesterday")` → `{ label: "yesterday", urgency: "overdue" }`
  - `getRelativeDate("7 days ago")` → `{ label: "7 days ago", urgency: "overdue" }`
  - `getRelativeDate("14+ days from now")` → label uses "in X weeks" format
  - `getRelativeDate("invalid-string")` → returns safe fallback, does not throw

**Definition of Done:**

- [ ] All existing tests still pass (no regression)
- [ ] createTask with/without dueDate tested
- [ ] createTask with malformed dueDate rejects with error
- [ ] updateTask set/clear/preserve dueDate tested (preserving existing when undefined)
- [ ] `getRelativeDate("today")` returns `{ label: "today", urgency: "today" }`
- [ ] `getRelativeDate("1 day from now")` returns `{ label: "tomorrow", urgency: "soon" }`
- [ ] `getRelativeDate("3 days from now")` returns `{ urgency: "soon" }` (amber boundary)
- [ ] `getRelativeDate("4 days from now")` returns `{ urgency: "normal" }` (green boundary)
- [ ] `getRelativeDate("yesterday")` returns `{ label: "yesterday", urgency: "overdue" }`
- [ ] getRelativeDate handles invalid input gracefully
- [ ] All tests pass with `yarn test`

**Verify:**

- `yarn test` — all tests pass, 0 failures

---

### Task 8: E2E Verification with playwright-cli

**Objective:** Verify the complete due dates feature works end-to-end by testing the UI with playwright-cli.

**Dependencies:** Task 4, Task 5, Task 6

**Files:**

- No new files (uses playwright-cli interactively)

**Key Decisions / Notes:**

- Start dev server, open browser with playwright-cli
- Test flow:
  1. Verify seed data shows due date badges on cards
  2. Create a new task with a due date → verify badge appears on card
  3. Create a new task without a due date → verify no badge
  4. Edit a task to add a due date → verify badge appears
  5. Edit a task to remove a due date → verify badge disappears
  6. Click sort toggle → verify tasks reorder by due date
  7. Click sort toggle again → verify tasks return to position order
  8. Verify urgency colors: check that overdue tasks show red badge, near-future shows amber, far-future shows green
  9. Verify overdue badge has `animate-pulse-urgency` CSS class (pulse animation check)
- Use `playwright-cli -s="${PILOT_SESSION_ID:-default}"` for session isolation
- Use `data-testid="due-date-badge"` selectors for badge element queries

**Definition of Done:**

- [ ] Seed data displays due date badges with correct urgency colors
- [ ] Create task with due date shows badge on new card
- [ ] Create task without due date shows no badge
- [ ] Edit task to add/remove due date updates badge correctly
- [ ] Sort toggle reorders tasks by due date (soonest first)
- [ ] Sort toggle reverts to position order
- [ ] Overdue badge element has the `animate-pulse-urgency` CSS class applied (verified via `playwright-cli eval "document.querySelector('[data-testid=due-date-badge].animate-pulse-urgency') !== null"`)
- [ ] All interactions work without console errors

**Verify:**

- `playwright-cli snapshot` after each interaction — verify UI state
- `playwright-cli eval "document.querySelectorAll('[data-testid=due-date-badge]').length"` — count visible badges
- `playwright-cli eval "document.querySelector('[data-testid=due-date-badge].animate-pulse-urgency') !== null"` — verify pulse animation class on overdue badges

## Testing Strategy

- **Unit tests:** Server actions (createTask/updateTask with dueDate, validation), getRelativeDate utility (all urgency categories + boundary conditions with mocked time)
- **Integration tests:** Full create/edit flow persists dueDate to in-memory SQLite; updateTask preserves existing dueDate when not provided
- **E2E verification:** playwright-cli walks through create, edit, sort, urgency coloring, and animation class checking

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing SQLite DB doesn't have due_date column | High | High | Delete sqlite.db on first run after schema change; document in task notes |
| react-day-picker CSS conflicts with Tailwind v4 | Low | Medium | Use shadcn/ui's proven Calendar component styling that handles this |
| Sort toggle + DnD position corruption | High | High | Disable drag-and-drop when sort is active (isDragDisabled on Draggable or early return in handleDragEnd with toast) |
| Date.toISOString() UTC off-by-one | High | High | Use local timezone date components (getFullYear/getMonth/getDate) for Date→string conversion; parse ISO strings with manual split, not new Date(str) |
| getRelativeDate timezone boundary | Medium | Medium | Parse ISO strings with `new Date(y, m-1, d)` constructor (local timezone), not `new Date(str)` (UTC); construct "today" similarly from `new Date()` local components |
| Tailwind v4 custom animation not rendering | Medium | Medium | Use `@utility animate-pulse-urgency { ... }` directive alongside `@keyframes`; verify with E2E class presence check |
| Drizzle .set() treats undefined as NULL | Medium | High | Explicitly filter out undefined keys before passing to .set(); test that updateTask without dueDate preserves existing value |
| Malformed dueDate stored in DB | Low | Medium | Server-side regex validation `/^\d{4}-\d{2}-\d{2}$/`; try/catch in getRelativeDate with safe fallback |

## Open Questions

- None — requirements are fully specified.

### Deferred Ideas

- Due date notifications/reminders
- Overdue task counts in column headers
- Calendar view of all tasks
- Bulk set due dates
