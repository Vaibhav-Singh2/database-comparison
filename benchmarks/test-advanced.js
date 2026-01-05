const axios = require('axios');
const chalk = require('chalk');
const pgPool = require('../server/db/postgres');
const { connect, getDb, close } = require('../server/db/mongodb');

const BASE_URL = 'http://localhost:3000';

async function testBulkInsert() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║         Bulk Operations Performance Test              ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════╝\n'));

  const bulkSizes = [100, 500, 1000, 2000];
  const results = { postgresql: {}, mongodb: {} };

  for (const size of bulkSizes) {
    console.log(chalk.yellow(`\nTesting bulk insert of ${size} records...\n`));

    // PostgreSQL Bulk Insert
    console.log(chalk.cyan('  PostgreSQL:'));
    const pgStart = Date.now();
    const pgClient = await pgPool.connect();
    
    try {
      await pgClient.query('BEGIN');
      
      const values = [];
      for (let i = 0; i < size; i++) {
        values.push(`('Bulk User ${Date.now()}-${i}', 'bulk${Date.now()}-${i}@test.com')`);
      }
      
      await pgClient.query(`INSERT INTO users (name, email) VALUES ${values.join(',')}`);
      await pgClient.query('COMMIT');
      
      const pgTime = Date.now() - pgStart;
      results.postgresql[size] = {
        time: pgTime,
        recordsPerSecond: (size / (pgTime / 1000)).toFixed(2)
      };
      
      console.log(chalk.green(`    ✓ Inserted ${size} records in ${pgTime}ms (${results.postgresql[size].recordsPerSecond} rec/s)`));
    } catch (error) {
      await pgClient.query('ROLLBACK');
      console.error(chalk.red('    ✗ Error:', error.message));
    } finally {
      pgClient.release();
    }

    // MongoDB Bulk Insert
    console.log(chalk.cyan('  MongoDB:'));
    const mongoStart = Date.now();
    
    try {
      const db = getDb();
      const lastUser = await db.collection('users').find().sort({ _id: -1 }).limit(1).toArray();
      const startId = lastUser.length > 0 ? lastUser[0]._id + 1 : 10000;
      
      const docs = [];
      for (let i = 0; i < size; i++) {
        docs.push({
          _id: startId + i,
          name: `Bulk User ${Date.now()}-${i}`,
          email: `bulk${Date.now()}-${i}@test.com`,
          created_at: new Date(),
          orders: []
        });
      }
      
      await db.collection('users').insertMany(docs, { ordered: false });
      
      const mongoTime = Date.now() - mongoStart;
      results.mongodb[size] = {
        time: mongoTime,
        recordsPerSecond: (size / (mongoTime / 1000)).toFixed(2)
      };
      
      console.log(chalk.green(`    ✓ Inserted ${size} records in ${mongoTime}ms (${results.mongodb[size].recordsPerSecond} rec/s)`));
    } catch (error) {
      console.error(chalk.red('    ✗ Error:', error.message));
    }

    // Comparison
    const pgTime = results.postgresql[size].time;
    const mongoTime = results.mongodb[size].time;
    const faster = pgTime < mongoTime ? 'PostgreSQL' : 'MongoDB';
    const improvement = ((Math.max(pgTime, mongoTime) - Math.min(pgTime, mongoTime)) / Math.max(pgTime, mongoTime) * 100).toFixed(1);
    
    console.log(chalk.yellow(`    Winner: ${faster} (${improvement}% faster)`));
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync('benchmarks/bulk-operations-results.json', JSON.stringify(results, null, 2));
  
  console.log(chalk.green('\n✅ Bulk operations test complete!'));
  console.log(chalk.cyan('   Results saved to: benchmarks/bulk-operations-results.json\n'));
  
  return results;
}

async function testAggregation() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║         Aggregation Pipeline Performance Test         ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════╝\n'));

  const iterations = 100;
  const results = { postgresql: {}, mongodb: {} };

  // Test 1: Average order total per user
  console.log(chalk.yellow('Test 1: Average order total per user\n'));
  
  // PostgreSQL
  console.log(chalk.cyan('  PostgreSQL:'));
  let pgTimes = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await pgPool.query(`
      SELECT u.id, u.name, AVG(o.total) as avg_order_total, COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id, u.name
      HAVING COUNT(o.id) > 0
      LIMIT 10
    `);
    pgTimes.push(Date.now() - start);
  }
  const pgAvg = (pgTimes.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  results.postgresql.avgOrderTotal = { avgTime: parseFloat(pgAvg), iterations };
  console.log(chalk.green(`    ✓ Average: ${pgAvg}ms over ${iterations} iterations`));

  // MongoDB
  console.log(chalk.cyan('  MongoDB:'));
  const db = getDb();
  let mongoTimes = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await db.collection('users').aggregate([
      { $match: { 'orders.0': { $exists: true } } },
      { $project: {
        name: 1,
        avg_order_total: { $avg: '$orders.total' },
        order_count: { $size: '$orders' }
      }},
      { $limit: 10 }
    ]).toArray();
    mongoTimes.push(Date.now() - start);
  }
  const mongoAvg = (mongoTimes.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  results.mongodb.avgOrderTotal = { avgTime: parseFloat(mongoAvg), iterations };
  console.log(chalk.green(`    ✓ Average: ${mongoAvg}ms over ${iterations} iterations`));

  const faster = pgAvg < mongoAvg ? 'PostgreSQL' : 'MongoDB';
  const improvement = ((Math.max(pgAvg, mongoAvg) - Math.min(pgAvg, mongoAvg)) / Math.max(pgAvg, mongoAvg) * 100).toFixed(1);
  console.log(chalk.yellow(`    Winner: ${faster} (${improvement}% faster)\n`));

  // Test 2: Products by category with review count
  console.log(chalk.yellow('Test 2: Products by category with review count\n'));
  
  // PostgreSQL
  console.log(chalk.cyan('  PostgreSQL:'));
  pgTimes = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await pgPool.query(`
      SELECT p.category, COUNT(p.id) as product_count, COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      GROUP BY p.category
      ORDER BY product_count DESC
    `);
    pgTimes.push(Date.now() - start);
  }
  const pgAvg2 = (pgTimes.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  results.postgresql.categoryStats = { avgTime: parseFloat(pgAvg2), iterations };
  console.log(chalk.green(`    ✓ Average: ${pgAvg2}ms over ${iterations} iterations`));

  // MongoDB
  console.log(chalk.cyan('  MongoDB:'));
  mongoTimes = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await db.collection('products').aggregate([
      { $group: {
        _id: '$category',
        product_count: { $sum: 1 },
        review_count: { $sum: { $size: '$reviews' } }
      }},
      { $sort: { product_count: -1 } }
    ]).toArray();
    mongoTimes.push(Date.now() - start);
  }
  const mongoAvg2 = (mongoTimes.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  results.mongodb.categoryStats = { avgTime: parseFloat(mongoAvg2), iterations };
  console.log(chalk.green(`    ✓ Average: ${mongoAvg2}ms over ${iterations} iterations`));

  const faster2 = pgAvg2 < mongoAvg2 ? 'PostgreSQL' : 'MongoDB';
  const improvement2 = ((Math.max(pgAvg2, mongoAvg2) - Math.min(pgAvg2, mongoAvg2)) / Math.max(pgAvg2, mongoAvg2) * 100).toFixed(1);
  console.log(chalk.yellow(`    Winner: ${faster2} (${improvement2}% faster)\n`));

  // Save results
  const fs = require('fs');
  fs.writeFileSync('benchmarks/aggregation-results.json', JSON.stringify(results, null, 2));
  
  console.log(chalk.green('✅ Aggregation test complete!'));
  console.log(chalk.cyan('   Results saved to: benchmarks/aggregation-results.json\n'));
  
  return results;
}

async function testConcurrentConnections() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║      Concurrent Connections Performance Test          ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════╝\n'));

  const concurrentLevels = [10, 25, 50, 100];
  const requestsPerConnection = 10;
  const results = { postgresql: {}, mongodb: {} };

  for (const concurrent of concurrentLevels) {
    console.log(chalk.yellow(`\nTesting ${concurrent} concurrent connections (${concurrent * requestsPerConnection} total requests)...\n`));

    // PostgreSQL
    console.log(chalk.cyan('  PostgreSQL:'));
    const pgStart = Date.now();
    const pgPromises = [];
    
    for (let i = 0; i < concurrent; i++) {
      const promise = (async () => {
        for (let j = 0; j < requestsPerConnection; j++) {
          const userId = Math.floor(Math.random() * 1000) + 1;
          await axios.get(`${BASE_URL}/api/pg/users/${userId}`);
        }
      })();
      pgPromises.push(promise);
    }
    
    await Promise.all(pgPromises);
    const pgTime = Date.now() - pgStart;
    const pgThroughput = ((concurrent * requestsPerConnection) / (pgTime / 1000)).toFixed(2);
    
    results.postgresql[concurrent] = {
      time: pgTime,
      throughput: parseFloat(pgThroughput),
      totalRequests: concurrent * requestsPerConnection
    };
    
    console.log(chalk.green(`    ✓ Completed in ${pgTime}ms (${pgThroughput} req/s)`));

    // MongoDB
    console.log(chalk.cyan('  MongoDB:'));
    const mongoStart = Date.now();
    const mongoPromises = [];
    
    for (let i = 0; i < concurrent; i++) {
      const promise = (async () => {
        for (let j = 0; j < requestsPerConnection; j++) {
          const userId = Math.floor(Math.random() * 1000) + 1;
          await axios.get(`${BASE_URL}/api/mongo/users/${userId}`);
        }
      })();
      mongoPromises.push(promise);
    }
    
    await Promise.all(mongoPromises);
    const mongoTime = Date.now() - mongoStart;
    const mongoThroughput = ((concurrent * requestsPerConnection) / (mongoTime / 1000)).toFixed(2);
    
    results.mongodb[concurrent] = {
      time: mongoTime,
      throughput: parseFloat(mongoThroughput),
      totalRequests: concurrent * requestsPerConnection
    };
    
    console.log(chalk.green(`    ✓ Completed in ${mongoTime}ms (${mongoThroughput} req/s)`));

    // Comparison
    const faster = pgTime < mongoTime ? 'PostgreSQL' : 'MongoDB';
    const improvement = ((Math.max(pgTime, mongoTime) - Math.min(pgTime, mongoTime)) / Math.max(pgTime, mongoTime) * 100).toFixed(1);
    console.log(chalk.yellow(`    Winner: ${faster} (${improvement}% faster, ${faster === 'PostgreSQL' ? pgThroughput : mongoThroughput} req/s)`));
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync('benchmarks/concurrent-results.json', JSON.stringify(results, null, 2));
  
  console.log(chalk.green('\n✅ Concurrent connections test complete!'));
  console.log(chalk.cyan('   Results saved to: benchmarks/concurrent-results.json\n'));
  
  return results;
}

async function runAllAdvancedTests() {
  try {
    // Connect to MongoDB
    await connect();
    
    // Wait for server
    console.log('Waiting for server...');
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
        console.log(chalk.green('✓ Server ready\n'));
        break;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Run tests
    await testBulkInsert();
    await testAggregation();
    await testConcurrentConnections();

    console.log(chalk.green.bold('\n🎉 All advanced tests complete!\n'));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  } finally {
    await close();
    await pgPool.end();
  }
}

runAllAdvancedTests().catch(error => {
  console.error(error);
  process.exit(1);
});
