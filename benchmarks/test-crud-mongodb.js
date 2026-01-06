const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3000';
const TEST_SCENARIOS = [
  { name: 'Light', operations: 100 },
  { name: 'Medium', operations: 500 },
  { name: 'Heavy', operations: 1000 },
  { name: 'Very Heavy', operations: 2000 }
];

async function measureOperation(operation) {
  const start = Date.now();
  try {
    await operation();
    return { success: true, time: Date.now() - start };
  } catch (error) {
    return { success: false, time: Date.now() - start, error: error.message };
  }
}

function calculateStats(results) {
  const times = results.filter(r => r.success).map(r => r.time).sort((a, b) => a - b);
  const successful = results.filter(r => r.success).length;
  
  if (times.length === 0) return null;
  
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  
  return {
    totalOperations: results.length,
    successful,
    failed: results.length - successful,
    avgTime: Math.round(avg * 100) / 100,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    p50: Math.round(p50),
    p95: Math.round(p95),
    p99: Math.round(p99),
    successRate: ((successful / results.length) * 100).toFixed(2)
  };
}

async function testRead(count) {
  console.log(chalk.cyan(`\n  Testing READ operations (${count} requests)...`));
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const userId = Math.floor(Math.random() * 1000) + 1;
    const result = await measureOperation(() => 
      axios.get(`${BASE_URL}/api/mongo/users/${userId}`)
    );
    results.push(result);
    
    if ((i + 1) % 200 === 0) {
      process.stdout.write(`\r    Progress: ${i + 1}/${count}`);
    }
  }
  console.log('');
  
  return calculateStats(results);
}

async function testWrite(count) {
  console.log(chalk.cyan(`\n  Testing WRITE operations (${count} requests)...`));
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const result = await measureOperation(() =>
      axios.post(`${BASE_URL}/api/mongo/users`, {
        name: `Test User ${Date.now()}-${i}`,
        email: `test${Date.now()}-${i}@example.com`
      })
    );
    results.push(result);
    
    if ((i + 1) % 200 === 0) {
      process.stdout.write(`\r    Progress: ${i + 1}/${count}`);
    }
  }
  console.log('');
  
  return calculateStats(results);
}

async function testComplexQuery(count) {
  console.log(chalk.cyan(`\n  Testing COMPLEX QUERY (joins) (${count} requests)...`));
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const userId = Math.floor(Math.random() * 1000) + 1;
    const result = await measureOperation(() =>
      axios.get(`${BASE_URL}/api/mongo/users/${userId}/orders`)
    );
    results.push(result);
    
    if ((i + 1) % 200 === 0) {
      process.stdout.write(`\r    Progress: ${i + 1}/${count}`);
    }
  }
  console.log('');
  
  return calculateStats(results);
}

async function testProductQuery(count) {
  console.log(chalk.cyan(`\n  Testing PRODUCT QUERY (${count} requests)...`));
  const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const result = await measureOperation(() =>
      axios.get(`${BASE_URL}/api/mongo/products?category=${category}&limit=20`)
    );
    results.push(result);
    
    if ((i + 1) % 200 === 0) {
      process.stdout.write(`\r    Progress: ${i + 1}/${count}`);
    }
  }
  console.log('');
  
  return calculateStats(results);
}

async function runTests() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║     MongoDB Performance Benchmarks                  ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════╝\n'));
  
  // Wait for server and database
  console.log('Waiting for server and database...');
  let serverReady = false;
  
  for (let i = 0; i < 60; i++) {
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
      // Also test database connection
      const testQuery = await axios.get(`${BASE_URL}/api/mongo/users/1`, { timeout: 2000 });
      console.log(chalk.green('✓ Server and database ready\n'));
      serverReady = true;
      break;
    } catch (error) {
      if (i % 5 === 0 && i > 0) {
        process.stdout.write(`\r  Waiting... ${i}s`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (!serverReady) {
    console.log(chalk.red('\n✗ Server/database not ready after 60s'));
    console.log(chalk.yellow('  Make sure databases are seeded: npm run seed-all\n'));
    process.exit(1);
  }
  console.log('');
  
  const allResults = {};
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(chalk.yellow(`\n${'='.repeat(60)}`));
    console.log(chalk.yellow(`  ${scenario.name} Load (${scenario.operations} operations)`));
    console.log(chalk.yellow('='.repeat(60)));
    
    const readStats = await testRead(scenario.operations);
    const writeStats = await testWrite(Math.floor(scenario.operations * 0.2)); // 20% writes
    const complexStats = await testComplexQuery(Math.floor(scenario.operations * 0.3)); // 30% complex
    const productStats = await testProductQuery(Math.floor(scenario.operations * 0.5)); // 50% product queries
    
    allResults[scenario.name] = {
      read: readStats,
      write: writeStats,
      complexQuery: complexStats,
      productQuery: productStats
    };
    
    if (readStats) {
      console.log(chalk.green(`\n  ✓ READ: Avg ${readStats.avgTime}ms | P99 ${readStats.p99}ms`));
    } else {
      console.log(chalk.red(`\n  ✗ READ: All operations failed`));
    }
    
    if (writeStats) {
      console.log(chalk.green(`  ✓ WRITE: Avg ${writeStats.avgTime}ms | P99 ${writeStats.p99}ms`));
    } else {
      console.log(chalk.red(`  ✗ WRITE: All operations failed`));
    }
    
    if (complexStats) {
      console.log(chalk.green(`  ✓ COMPLEX: Avg ${complexStats.avgTime}ms | P99 ${complexStats.p99}ms`));
    } else {
      console.log(chalk.red(`  ✗ COMPLEX: All operations failed`));
    }
    
    if (productStats) {
      console.log(chalk.green(`  ✓ PRODUCT: Avg ${productStats.avgTime}ms | P99 ${productStats.p99}ms`));
    } else {
      console.log(chalk.red(`  ✗ PRODUCT: All operations failed`));
    }
  }
  
  // Save results
  const fs = require('fs');
  const output = {
    database: 'MongoDB',
    timestamp: new Date().toISOString(),
    results: allResults
  };
  
  fs.writeFileSync('benchmarks/mongodb-results.json', JSON.stringify(output, null, 2));
  
  console.log(chalk.green('\n✅ MongoDB benchmarks complete!'));
  console.log(chalk.cyan(`   Results saved to: benchmarks/mongodb-results.json\n`));
}

runTests().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
