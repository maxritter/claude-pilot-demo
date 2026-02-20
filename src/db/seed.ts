import { db } from "./index";
import { tasks, labels, taskLabels } from "./schema";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function seed() {
  const seedTasks = [
    {
      title: "Set up CI/CD pipeline",
      description:
        "Configure GitHub Actions for automated testing and deployment",
      priority: "high" as const,
      status: "todo" as const,
      position: 0,
      dueDate: daysFromNow(-3),
    },
    {
      title: "Write API documentation",
      description:
        "Document all REST API endpoints with examples and authentication details",
      priority: "medium" as const,
      status: "todo" as const,
      position: 1,
      dueDate: daysFromNow(0),
    },
    {
      title: "Add error tracking",
      description: "Integrate Sentry for production error monitoring",
      priority: "medium" as const,
      status: "todo" as const,
      position: 2,
      dueDate: daysFromNow(2),
    },
    {
      title: "Optimize database queries",
      description:
        "Add indexes and optimize slow queries identified in performance testing",
      priority: "low" as const,
      status: "todo" as const,
      position: 3,
      dueDate: daysFromNow(7),
    },
    {
      title: "Update dependencies",
      description: "Upgrade all npm packages to latest stable versions",
      priority: "low" as const,
      status: "todo" as const,
      position: 4,
      dueDate: null,
    },
    {
      title: "Design mobile mockups",
      description:
        "Create responsive design mockups for mobile and tablet views",
      priority: "medium" as const,
      status: "todo" as const,
      position: 5,
      dueDate: null,
    },
    {
      title: "Implement user authentication",
      description:
        "Add JWT-based authentication with refresh tokens and secure session management",
      priority: "high" as const,
      status: "in-progress" as const,
      position: 0,
      dueDate: daysFromNow(-1),
    },
    {
      title: "Fix login page bug",
      description:
        "Resolve issue where form validation fails on Safari browsers",
      priority: "high" as const,
      status: "in-progress" as const,
      position: 1,
      dueDate: daysFromNow(1),
    },
    {
      title: "Add unit tests",
      description:
        "Write comprehensive unit tests for core business logic modules",
      priority: "medium" as const,
      status: "in-progress" as const,
      position: 2,
      dueDate: daysFromNow(3),
    },
    {
      title: "Refactor payment module",
      description:
        "Extract payment processing logic into reusable service layer",
      priority: "medium" as const,
      status: "in-progress" as const,
      position: 3,
      dueDate: daysFromNow(14),
    },
    {
      title: "Update user profile UI",
      description:
        "Redesign profile page with new brand guidelines and improved accessibility",
      priority: "low" as const,
      status: "in-progress" as const,
      position: 4,
      dueDate: null,
    },
    {
      title: "Deploy to staging",
      description:
        "Successfully deployed v2.1.0 to staging environment for QA testing",
      priority: "high" as const,
      status: "done" as const,
      position: 0,
      dueDate: daysFromNow(-7),
    },
    {
      title: "Database migration",
      description:
        "Migrated production database from PostgreSQL 13 to 15 with zero downtime",
      priority: "high" as const,
      status: "done" as const,
      position: 1,
      dueDate: null,
    },
    {
      title: "Security audit",
      description:
        "Completed third-party security audit and addressed all critical findings",
      priority: "medium" as const,
      status: "done" as const,
      position: 2,
      dueDate: null,
    },
    {
      title: "Setup project repository",
      description:
        "Initialized Git repository with proper .gitignore and branch protection rules",
      priority: "low" as const,
      status: "done" as const,
      position: 3,
      dueDate: null,
    },
  ];

  db.insert(tasks).values(seedTasks).run();
  console.log(`✓ Seeded ${seedTasks.length} tasks`);
}

export function seedLabels() {
  const seedLabelRows = [
    { name: "Bug", color: "red" as const },
    { name: "Feature", color: "blue" as const },
    { name: "Docs", color: "purple" as const },
    { name: "DevOps", color: "orange" as const },
  ];

  const inserted = db.insert(labels).values(seedLabelRows).returning().all();
  console.log(`✓ Seeded ${inserted.length} labels`);

  const allTasks = db.select().from(tasks).all();
  const findTask = (title: string) => allTasks.find((t) => t.title === title);
  const findLabel = (name: string) => inserted.find((l) => l.name === name);

  const assignments: Array<{ taskId: number; labelId: number }> = [];

  const bugLabel = findLabel("Bug");
  const featureLabel = findLabel("Feature");
  const docsLabel = findLabel("Docs");
  const devopsLabel = findLabel("DevOps");

  const assign = (taskTitle: string, label: typeof bugLabel) => {
    const t = findTask(taskTitle);
    if (t && label) assignments.push({ taskId: t.id, labelId: label.id });
  };

  assign("Fix login page bug", bugLabel);
  assign("Add error tracking", bugLabel);
  assign("Optimize database queries", bugLabel);

  assign("Implement user authentication", featureLabel);
  assign("Build dashboard widgets", featureLabel);
  assign("Refactor payment module", featureLabel);
  assign("Update user profile UI", featureLabel);
  assign("Add unit tests", featureLabel);

  assign("Write API documentation", docsLabel);
  assign("Design mobile mockups", docsLabel);

  assign("Set up CI/CD pipeline", devopsLabel);
  assign("Deploy to staging", devopsLabel);
  assign("Database migration", devopsLabel);

  if (assignments.length > 0) {
    db.insert(taskLabels).values(assignments).run();
    console.log(`✓ Seeded ${assignments.length} task-label assignments`);
  }
}
