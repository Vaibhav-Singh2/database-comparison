const fs = require("fs");
const chalk = require("chalk");

console.log(
  chalk.blue.bold(
    "\n╔════════════════════════════════════════════════════════╗"
  )
);
console.log(
  chalk.blue.bold("║         Database Performance Comparison                ║")
);
console.log(
  chalk.blue.bold(
    "╚════════════════════════════════════════════════════════╝\n"
  )
);

// Check if result files exist
const pgPath = "benchmarks/postgres-results.json";
const mongoPath = "benchmarks/mongodb-results.json";

if (!fs.existsSync(pgPath)) {
  console.error(chalk.red("✗ PostgreSQL results not found."));
  console.log(
    chalk.yellow("  Run the PostgreSQL tests first: npm run test-crud-pg\n")
  );
  process.exit(1);
}

if (!fs.existsSync(mongoPath)) {
  console.error(chalk.red("✗ MongoDB results not found."));
  console.log(
    chalk.yellow("  Run the MongoDB tests first: npm run test-crud-mongo\n")
  );
  process.exit(1);
}

// Load results
const pgResults = JSON.parse(fs.readFileSync(pgPath, "utf8"));
const mongoResults = JSON.parse(fs.readFileSync(mongoPath, "utf8"));

const scenarios = ["Light", "Medium", "Heavy", "Very Heavy"];
const operations = ["read", "write", "complexQuery", "productQuery"];

console.log(chalk.yellow("\n📊 Performance Comparison Summary:\n"));

scenarios.forEach((scenario) => {
  console.log(chalk.cyan(`\n${scenario} Load:`));
  console.log("┌─────────────────┬──────────────┬──────────────┬────────────┐");
  console.log("│ Operation       │ PostgreSQL   │ MongoDB      │ Winner     │");
  console.log("├─────────────────┼──────────────┼──────────────┼────────────┤");

  operations.forEach((op) => {
    const pgStats = pgResults.results[scenario][op];
    const mongoStats = mongoResults.results[scenario][op];

    if (!pgStats || !mongoStats) return;

    const pgAvg = pgStats.avgTime;
    const mongoAvg = mongoStats.avgTime;
    const winner = pgAvg < mongoAvg ? "PostgreSQL" : "MongoDB";
    const improvement = Math.abs(
      ((pgAvg - mongoAvg) / Math.max(pgAvg, mongoAvg)) * 100
    ).toFixed(1);

    const opName = op.replace(/([A-Z])/g, " $1").trim();
    console.log(
      `│ ${opName.padEnd(15)} │ ${pgAvg.toString().padEnd(12)} │ ${mongoAvg
        .toString()
        .padEnd(12)} │ ${winner.padEnd(10)} │`
    );
  });

  console.log("└─────────────────┴──────────────┴──────────────┴────────────┘");
});

// Calculate overall winners
console.log(chalk.green("\n✨ Overall Performance Winners:\n"));

let pgWins = 0;
let mongoWins = 0;

scenarios.forEach((scenario) => {
  operations.forEach((op) => {
    const pgStats = pgResults.results[scenario][op];
    const mongoStats = mongoResults.results[scenario][op];

    if (!pgStats || !mongoStats) return;

    if (pgStats.avgTime < mongoStats.avgTime) {
      pgWins++;
    } else {
      mongoWins++;
    }
  });
});

console.log(`  PostgreSQL wins: ${pgWins} operations`);
console.log(`  MongoDB wins: ${mongoWins} operations`);

// Detailed comparison for Very Heavy load
const veryHeavy = "Very Heavy";
console.log(chalk.yellow(`\n📈 Detailed Metrics (${veryHeavy} Load):\n`));

operations.forEach((op) => {
  const pgStats = pgResults.results[veryHeavy][op];
  const mongoStats = mongoResults.results[veryHeavy][op];

  if (!pgStats || !mongoStats) return;

  const opName = op.replace(/([A-Z])/g, " $1").trim();
  const improvement = (
    ((Math.max(pgStats.avgTime, mongoStats.avgTime) -
      Math.min(pgStats.avgTime, mongoStats.avgTime)) /
      Math.max(pgStats.avgTime, mongoStats.avgTime)) *
    100
  ).toFixed(1);
  const faster =
    pgStats.avgTime < mongoStats.avgTime ? "PostgreSQL" : "MongoDB";

  console.log(chalk.cyan(`${opName.toUpperCase()}:`));
  console.log(
    `  PostgreSQL: Avg ${pgStats.avgTime}ms | P99 ${pgStats.p99}ms | Success ${pgStats.successRate}%`
  );
  console.log(
    `  MongoDB:    Avg ${mongoStats.avgTime}ms | P99 ${mongoStats.p99}ms | Success ${mongoStats.successRate}%`
  );
  console.log(chalk.green(`  Winner: ${faster} (${improvement}% faster)\n`));
});

console.log(chalk.green("\n✅ Comparison complete!\n"));
