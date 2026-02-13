import { seed } from "../src/db/seed";

try {
  seed();
  process.exit(0);
} catch (error) {
  console.error("Failed to seed:", error);
  process.exit(1);
}
