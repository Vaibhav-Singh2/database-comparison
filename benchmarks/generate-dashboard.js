const fs = require('fs');
const chalk = require('chalk');
const { exec } = require('child_process');

console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║      Generating Database Comparison Dashboard          ║'));
console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════╝\n'));

// Load results
const pgResults = JSON.parse(fs.readFileSync('benchmarks/postgres-results.json', 'utf8'));
const mongoResults = JSON.parse(fs.readFileSync('benchmarks/mongodb-results.json', 'utf8'));

// Load advanced test results
let bulkResults, aggResults, concurrentResults;
try {
  bulkResults = JSON.parse(fs.readFileSync('benchmarks/bulk-operations-results.json', 'utf8'));
  aggResults = JSON.parse(fs.readFileSync('benchmarks/aggregation-results.json', 'utf8'));
  concurrentResults = JSON.parse(fs.readFileSync('benchmarks/concurrent-results.json', 'utf8'));
} catch (error) {
  console.log(chalk.yellow('⚠ Advanced test results not found. Run: npm run test-advanced'));
  bulkResults = null;
  aggResults = null;
  concurrentResults = null;
}

const scenarios = ['Light', 'Medium', 'Heavy', 'Very Heavy'];

// Calculate winners
function getWinner(pgTime, mongoTime) {
  const improvement = ((Math.max(pgTime, mongoTime) - Math.min(pgTime, mongoTime)) / Math.max(pgTime, mongoTime) * 100).toFixed(1);
  return {
    winner: pgTime < mongoTime ? 'PostgreSQL' : 'MongoDB',
    improvement: parseFloat(improvement)
  };
}

const veryHeavy = pgResults.results['Very Heavy'];
const veryHeavyMongo = mongoResults.results['Very Heavy'];

const readWinner = getWinner(veryHeavy.read.avgTime, veryHeavyMongo.read.avgTime);
const writeWinner = getWinner(veryHeavy.write.avgTime, veryHeavyMongo.write.avgTime);
const complexWinner = getWinner(veryHeavy.complexQuery.avgTime, veryHeavyMongo.complexQuery.avgTime);

// Advanced test winners
let bulkWinner, aggWinner, concurrentWinner;
if (bulkResults) {
  bulkWinner = getWinner(bulkResults.postgresql['2000'].time, bulkResults.mongodb['2000'].time);
}
if (aggResults) {
  aggWinner = getWinner(aggResults.postgresql.avgOrderTotal.avgTime, aggResults.mongodb.avgOrderTotal.avgTime);
}
if (concurrentResults) {
  concurrentWinner = getWinner(concurrentResults.postgresql['100'].time, concurrentResults.mongodb['100'].time);
}

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL vs NoSQL Performance Comparison</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-card .label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .metric-card .value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-card .subvalue {
            font-size: 0.9em;
            color: #999;
        }
        .metric-card.pg {
            border: 3px solid #336791;
        }
        .metric-card.pg .value {
            color: #336791;
        }
        .metric-card.mongo {
            border: 3px solid #4DB33D;
        }
        .metric-card.mongo .value {
            color: #4DB33D;
        }
        
        .chart-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .chart-section h2 {
            color: #333;
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #667eea;
        }
        .chart-container {
            position: relative;
            height: 400px;
            margin: 20px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        .pg-win {
            background: #e3f2fd !important;
            font-weight: 600;
            color: #336791;
        }
        .mongo-win {
            background: #e8f5e9 !important;
            font-weight: 600;
            color: #4DB33D;
        }
        
        .insight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 5px solid #f59e0b;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .insight-box h3 {
            color: #92400e;
            margin-bottom: 15px;
        }
        .insight-box ul {
            list-style: none;
            padding: 0;
        }
        .insight-box li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
            color: #78350f;
        }
        .insight-box li:before {
            content: "💡";
            position: absolute;
            left: 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ SQL vs NoSQL Performance</h1>
            <p class="subtitle">PostgreSQL vs MongoDB - Database Comparison</p>
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
            <div class="metric-card ${readWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Read Operations Winner</div>
                <div class="value">${readWinner.winner}</div>
                <div class="subvalue">${readWinner.improvement}% faster</div>
            </div>
            <div class="metric-card ${writeWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Write Operations Winner</div>
                <div class="value">${writeWinner.winner}</div>
                <div class="subvalue">${writeWinner.improvement}% faster</div>
            </div>
            <div class="metric-card ${complexWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Complex Queries Winner</div>
                <div class="value">${complexWinner.winner}</div>
                <div class="subvalue">${complexWinner.improvement}% faster</div>
            </div>
        </div>

        ${bulkWinner && aggWinner && concurrentWinner ? `
        <!-- Advanced Test Metrics -->
        <div class="metrics-grid">
            <div class="metric-card ${bulkWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Bulk Operations Winner</div>
                <div class="value">${bulkWinner.winner}</div>
                <div class="subvalue">${bulkWinner.improvement}% faster (2000 records)</div>
            </div>
            <div class="metric-card ${aggWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Aggregation Winner</div>
                <div class="value">${aggWinner.winner}</div>
                <div class="subvalue">${aggWinner.improvement}% faster</div>
            </div>
            <div class="metric-card ${concurrentWinner.winner === 'MongoDB' ? 'mongo' : 'pg'}">
                <div class="label">Concurrent Connections Winner</div>
                <div class="value">${concurrentWinner.winner}</div>
                <div class="subvalue">${concurrentWinner.improvement}% faster (100 users)</div>
            </div>
        </div>
        ` : ''}

        <!-- Response Time Comparison -->
        <div class="chart-section">
            <h2>📊 Response Time Comparison (Very Heavy Load)</h2>
            <div class="chart-container">
                <canvas id="responseTimeChart"></canvas>
            </div>
            <div class="insight-box">
                <h3>Key Insights</h3>
                <ul>
                    <li>MongoDB excels at simple CRUD operations with denormalized data</li>
                    <li>PostgreSQL performs better for complex joins and relational queries</li>
                    <li>Both databases maintain 100% success rates under load</li>
                </ul>
            </div>
        </div>

        <!-- Performance Across Load Scenarios -->
        <div class="chart-section">
            <h2>📈 Performance Across Load Scenarios (Read Operations)</h2>
            <div class="chart-container">
                <canvas id="loadScenariosChart"></canvas>
            </div>
        </div>

        <!-- Detailed Metrics Table -->
        <div class="chart-section">
            <h2>📋 Detailed Performance Metrics (Very Heavy Load)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Operation</th>
                        <th>PostgreSQL (ms)</th>
                        <th>MongoDB (ms)</th>
                        <th>Winner</th>
                        <th>Improvement</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTableRows()}
                </tbody>
            </table>
        </div>

        ${bulkResults ? `
        <!-- Bulk Operations Performance -->
        <div class="chart-section">
            <h2>📦 Bulk Operations Performance</h2>
            <div class="chart-container">
                <canvas id="bulkOpsChart"></canvas>
            </div>
            <div class="insight-box">
                <h3>Key Insights</h3>
                <ul>
                    <li>MongoDB consistently faster for bulk inserts across all sizes</li>
                    <li>Performance advantage increases with larger batch sizes</li>
                    <li>Best for data imports and ETL pipelines</li>
                </ul>
            </div>
        </div>
        ` : ''}

        ${concurrentResults ? `
        <!-- Concurrent Connections Performance -->
        <div class="chart-section">
            <h2>👥 Concurrent Connections Performance</h2>
            <div class="chart-container">
                <canvas id="concurrentChart"></canvas>
            </div>
            <div class="insight-box">
                <h3>Key Insights</h3>
                <ul>
                    <li>PostgreSQL handles concurrent connections more efficiently</li>
                    <li>Better connection pooling and multi-user performance</li>
                    <li>Ideal for high-traffic enterprise applications</li>
                </ul>
            </div>
        </div>
        ` : ''}

        <!-- Use Case Recommendations -->
        <div class="chart-section">
            <h2>💡 When to Use Each Database</h2>
            <table>
                <thead>
                    <tr>
                        <th>Use Case</th>
                        <th>Recommended Database</th>
                        <th>Why</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>E-commerce Product Catalog</td>
                        <td><strong>MongoDB</strong></td>
                        <td>Fast reads, flexible schema, embedded reviews/images</td>
                    </tr>
                    <tr>
                        <td>Financial Transactions</td>
                        <td><strong>PostgreSQL</strong></td>
                        <td>ACID compliance, data integrity, complex transactions</td>
                    </tr>
                    <tr>
                        <td>Social Media Feeds</td>
                        <td><strong>MongoDB</strong></td>
                        <td>Denormalized data, fast writes, flexible documents</td>
                    </tr>
                    <tr>
                        <td>Analytics & Reporting</td>
                        <td><strong>PostgreSQL</strong></td>
                        <td>Complex joins, aggregations, SQL support</td>
                    </tr>
                    <tr>
                        <td>Content Management</td>
                        <td><strong>MongoDB</strong></td>
                        <td>Flexible schema, nested data, rapid development</td>
                    </tr>
                    <tr>
                        <td>Inventory Management</td>
                        <td><strong>PostgreSQL</strong></td>
                        <td>Relationships, constraints, data consistency</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p><strong>System Design Series - Part 4: SQL vs NoSQL Database Comparison</strong></p>
            <p style="margin-top: 10px;">Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        const pgData = ${JSON.stringify(pgResults.results)};
        const mongoData = ${JSON.stringify(mongoResults.results)};

        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        Chart.defaults.font.size = 13;

        // Response Time Comparison
        const veryHeavyPg = pgData['Very Heavy'];
        const veryHeavyMongo = mongoData['Very Heavy'];

        new Chart(document.getElementById('responseTimeChart'), {
            type: 'bar',
            data: {
                labels: ['Read', 'Write', 'Complex Query', 'Product Query'],
                datasets: [
                    {
                        label: 'PostgreSQL',
                        data: [
                            veryHeavyPg.read.avgTime,
                            veryHeavyPg.write.avgTime,
                            veryHeavyPg.complexQuery.avgTime,
                            veryHeavyPg.productQuery.avgTime
                        ],
                        backgroundColor: '#336791',
                        borderWidth: 0
                    },
                    {
                        label: 'MongoDB',
                        data: [
                            veryHeavyMongo.read.avgTime,
                            veryHeavyMongo.write.avgTime,
                            veryHeavyMongo.complexQuery.avgTime,
                            veryHeavyMongo.productQuery.avgTime
                        ],
                        backgroundColor: '#4DB33D',
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Lower is Better (milliseconds)',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Response Time (ms)' }
                    }
                }
            }
        });

        // Load Scenarios
        const scenarios = ['Light', 'Medium', 'Heavy', 'Very Heavy'];
        new Chart(document.getElementById('loadScenariosChart'), {
            type: 'line',
            data: {
                labels: scenarios,
                datasets: [
                    {
                        label: 'PostgreSQL',
                        data: scenarios.map(s => pgData[s].read.avgTime),
                        borderColor: '#336791',
                        backgroundColor: 'rgba(51, 103, 145, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'MongoDB',
                        data: scenarios.map(s => mongoData[s].read.avgTime),
                        borderColor: '#4DB33D',
                        backgroundColor: 'rgba(77, 179, 61, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Response Time vs Load (Lower is Better)',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Response Time (ms)' }
                    }
                }
            }
        });

        ${bulkResults ? `
        // Bulk Operations Chart
        const bulkData = ${JSON.stringify(bulkResults)};
        new Chart(document.getElementById('bulkOpsChart'), {
            type: 'bar',
            data: {
                labels: ['100 records', '500 records', '1000 records', '2000 records'],
                datasets: [
                    {
                        label: 'PostgreSQL',
                        data: [
                            bulkData.postgresql['100'].time,
                            bulkData.postgresql['500'].time,
                            bulkData.postgresql['1000'].time,
                            bulkData.postgresql['2000'].time
                        ],
                        backgroundColor: '#336791',
                        borderWidth: 0
                    },
                    {
                        label: 'MongoDB',
                        data: [
                            bulkData.mongodb['100'].time,
                            bulkData.mongodb['500'].time,
                            bulkData.mongodb['1000'].time,
                            bulkData.mongodb['2000'].time
                        ],
                        backgroundColor: '#4DB33D',
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Lower is Better (milliseconds)',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Time (ms)' }
                    }
                }
            }
        });
        ` : ''}

        ${concurrentResults ? `
        // Concurrent Connections Chart
        const concurrentData = ${JSON.stringify(concurrentResults)};
        new Chart(document.getElementById('concurrentChart'), {
            type: 'line',
            data: {
                labels: ['10 users', '25 users', '50 users', '100 users'],
                datasets: [
                    {
                        label: 'PostgreSQL (Throughput)',
                        data: [
                            concurrentData.postgresql['10'].throughput,
                            concurrentData.postgresql['25'].throughput,
                            concurrentData.postgresql['50'].throughput,
                            concurrentData.postgresql['100'].throughput
                        ],
                        borderColor: '#336791',
                        backgroundColor: 'rgba(51, 103, 145, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'MongoDB (Throughput)',
                        data: [
                            concurrentData.mongodb['10'].throughput,
                            concurrentData.mongodb['25'].throughput,
                            concurrentData.mongodb['50'].throughput,
                            concurrentData.mongodb['100'].throughput
                        ],
                        borderColor: '#4DB33D',
                        backgroundColor: 'rgba(77, 179, 61, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Higher is Better (requests/second)',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Throughput (req/s)' }
                    }
                }
            }
        });
        ` : ''}
    </script>
</body>
</html>`;

function generateTableRows() {
  const operations = [
    { key: 'read', name: 'Read' },
    { key: 'write', name: 'Write' },
    { key: 'complexQuery', name: 'Complex Query' },
    { key: 'productQuery', name: 'Product Query' }
  ];

  return operations.map(op => {
    const pgTime = veryHeavy[op.key].avgTime;
    const mongoTime = veryHeavyMongo[op.key].avgTime;
    const winner = pgTime < mongoTime ? 'PostgreSQL' : 'MongoDB';
    const improvement = ((Math.max(pgTime, mongoTime) - Math.min(pgTime, mongoTime)) / Math.max(pgTime, mongoTime) * 100).toFixed(1);
    const rowClass = winner === 'PostgreSQL' ? 'pg-win' : 'mongo-win';

    return `
      <tr class="${rowClass}">
        <td>${op.name}</td>
        <td>${pgTime}</td>
        <td>${mongoTime}</td>
        <td><strong>${winner}</strong></td>
        <td>${improvement}%</td>
      </tr>
    `;
  }).join('');
}

// Write HTML file
fs.writeFileSync('benchmarks/dashboard.html', html);

console.log(chalk.green('✅ Dashboard generated: benchmarks/dashboard.html\n'));
console.log(chalk.cyan('Opening dashboard in browser...\n'));

// Open in browser
exec('start benchmarks/dashboard.html');
