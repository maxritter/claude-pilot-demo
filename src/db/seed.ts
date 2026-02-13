import { db } from "./index";
import { tasks } from "./schema";

export function seed() {
  const seedTasks = [
    {
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment",
      priority: "high" as const,
      status: "todo" as const,
      position: 0,
    },
    {
      title: "Write API documentation",
      description: "Document all REST API endpoints with examples and authentication details",
      priority: "medium" as const,
      status: "todo" as const,
      position: 1,
    },
    {
      title: "Add error tracking",
      description: "Integrate Sentry for production error monitoring",
      priority: "medium" as const,
      status: "todo" as const,
      position: 2,
    },
    {
      title: "Optimize database queries",
      description: "Add indexes and optimize slow queries identified in performance testing",
      priority: "low" as const,
      status: "todo" as const,
      position: 3,
    },
    {
      title: "Update dependencies",
      description: "Upgrade all npm packages to latest stable versions",
      priority: "low" as const,
      status: "todo" as const,
      position: 4,
    },
    {
      title: "Design mobile mockups",
      description: "Create responsive design mockups for mobile and tablet views",
      priority: "medium" as const,
      status: "todo" as const,
      position: 5,
    },
    {
      title: "Implement user authentication",
      description: "Add JWT-based authentication with refresh tokens and secure session management",
      priority: "high" as const,
      status: "in-progress" as const,
      position: 0,
    },
    {
      title: "Fix login page bug",
      description: "Resolve issue where form validation fails on Safari browsers",
      priority: "high" as const,
      status: "in-progress" as const,
      position: 1,
    },
    {
      title: "Add unit tests",
      description: "Write comprehensive unit tests for core business logic modules",
      priority: "medium" as const,
      status: "in-progress" as const,
      position: 2,
    },
    {
      title: "Refactor payment module",
      description: "Extract payment processing logic into reusable service layer",
      priority: "medium" as const,
      status: "in-progress" as const,
      position: 3,
    },
    {
      title: "Update user profile UI",
      description: "Redesign profile page with new brand guidelines and improved accessibility",
      priority: "low" as const,
      status: "in-progress" as const,
      position: 4,
    },
    {
      title: "Deploy to staging",
      description: "Successfully deployed v2.1.0 to staging environment for QA testing",
      priority: "high" as const,
      status: "done" as const,
      position: 0,
    },
    {
      title: "Database migration",
      description: "Migrated production database from PostgreSQL 13 to 15 with zero downtime",
      priority: "high" as const,
      status: "done" as const,
      position: 1,
    },
    {
      title: "Security audit",
      description: "Completed third-party security audit and addressed all critical findings",
      priority: "medium" as const,
      status: "done" as const,
      position: 2,
    },
    {
      title: "Setup project repository",
      description: "Initialized Git repository with proper .gitignore and branch protection rules",
      priority: "low" as const,
      status: "done" as const,
      position: 3,
    },
  ];

  db.insert(tasks).values(seedTasks).run();
  console.log(`✓ Seeded ${seedTasks.length} tasks`);
}
