# 🗄️ SQL vs NoSQL Database Performance Comparison

[![GitHub](https://img.shields.io/badge/GitHub-database--comparison-blue?logo=github)](https://github.com/Vaibhav-Singh2/database-comparison)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-4DB33D?logo=mongodb)](https://www.mongodb.com/)

**System Design Series - Part 4**: Comprehensive performance comparison of PostgreSQL (SQL) vs MongoDB (NoSQL) with real benchmarks and data modeling analysis.

> 🔗 **Repository**: [https://github.com/Vaibhav-Singh2/database-comparison](https://github.com/Vaibhav-Singh2/database-comparison)

## 🎯 Key Results

### Basic CRUD Operations (Very Heavy Load - 2000 operations)

| Operation         | PostgreSQL | MongoDB | Winner         | Improvement       |
| ----------------- | ---------- | ------- | -------------- | ----------------- |
| **Read**          | 2.38ms     | 3.01ms  | **PostgreSQL** | **21% faster** ✅ |
| **Write**         | 5.43ms     | 4.45ms  | **MongoDB**    | **18% faster** ✅ |
| **Complex Query** | 3.58ms     | 3.36ms  | **MongoDB**    | **6% faster** ✅  |
| **Product Query** | 2.70ms     | 3.73ms  | **PostgreSQL** | **28% faster** ✅ |

### Advanced Performance Tests

**Bulk Operations (2000 records):**

- PostgreSQL: 64ms (31,250 rec/s)
- MongoDB: 88ms (22,727 rec/s)
- Winner: **PostgreSQL 27% faster**

**Concurrent Connections (100 users):**

- PostgreSQL: **822 req/s** ✅
- MongoDB: 703 req/s
- Winner: **PostgreSQL 14% faster**

**Aggregation Pipelines:**

- PostgreSQL: 1.80ms (avg order total)
- MongoDB: 2.22ms
- Winner: **PostgreSQL 19% faster** (normalized schema advantage)

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Node.js 18+
- PowerShell (Windows) or Bash (Linux/Mac)

### Installation

```powershell
# Clone repository
git clone https://github.com/Vaibhav-Singh2/database-comparison
cd database-comparison

# Install dependencies
npm install

# Start databases
docker-compose up -d

# Seed data (1000 users, 500 products, ~2000 orders)
npm run seed-all
```

### Run Complete Test Suite

```powershell
# Run all tests (15-20 minutes)
.\run-all-tests.ps1

# Generate interactive dashboard
npm run dashboard
```

### Individual Tests

```powershell
# Basic CRUD tests
npm run test-crud-pg
npm run test-crud-mongo

# Advanced tests
npm run test-advanced

# Compare results
npm run compare
```

## 📊 Data Model Comparison

### PostgreSQL (Normalized - 5 Tables)

```sql
users (id, name, email, created_at)
  ↓ 1:N
orders (id, user_id, total, status, created_at)
  ↓ 1:N
order_items (id, order_id, product_id, quantity, price)
  ↓ N:1
products (id, name, category, price, stock)
  ↑ 1:N
reviews (id, user_id, product_id, rating, comment)
```

**Advantages:**

- No data duplication
- Strong ACID guarantees
- Easy to update (single source of truth)
- Referential integrity

**Disadvantages:**

- Requires JOINs for related data
- More complex queries
- Slower for read-heavy workloads

### MongoDB (Denormalized - 2 Collections)

```javascript
users: {
  _id, name, email, created_at,
  orders: [                    // Embedded
    { order_id, total, status, created_at,
      items: [                 // Nested
        { product_id, product_name, quantity, price }
      ]
    }
  ]
}

products: {
  _id, name, category, price, stock,
  reviews: [                   // Embedded
    { user_id, user_name, rating, comment, created_at }
  ]
}
```

**Advantages:**

- Fast reads (no joins)
- Flexible schema
- Better for aggregations on embedded data
- Rapid development

**Disadvantages:**

- Data duplication
- Eventual consistency
- Updates affect multiple documents
- Larger storage footprint

## 🔬 Detailed Performance Analysis

### Read Operations

**PostgreSQL wins at scale:**

- Light load: 2.4ms vs 2.8ms
- Very heavy load: **2.38ms vs 3.01ms (21% faster)**
- Consistent performance under increasing load
- Better connection pooling

**MongoDB advantages:**

- Faster at very light loads
- Better for simple document retrieval
- No join overhead for embedded data

### Write Operations

**MongoDB wins:**

- Very heavy load: **4.45ms vs 5.43ms (18% faster)**
- Better for write-heavy workloads
- Faster bulk inserts (at smaller sizes)
- Simpler write operations

**PostgreSQL advantages:**

- ACID transactions
- Better for complex writes with constraints
- Referential integrity enforcement

### Complex Queries

**MongoDB wins with embedded data:**

- Very heavy load: **3.36ms vs 3.58ms (6% faster)**
- No joins needed for user orders
- Aggregation framework optimized for documents

**PostgreSQL advantages:**

- Better for multi-table joins
- SQL flexibility
- Query optimizer handles complex scenarios

### Concurrent Connections

**PostgreSQL dominates:**

- 10 users: 160 req/s vs **394 req/s (MongoDB)**
- 50 users: **1029 req/s** vs 494 req/s (PostgreSQL)
- 100 users: **822 req/s** vs 703 req/s (PostgreSQL)
- Superior connection pooling at scale
- Better multi-user performance

### Bulk Operations

**Results vary by size:**

- 100 records: MongoDB 63% faster
- 500 records: PostgreSQL 16% faster
- 2000 records: **PostgreSQL 27% faster**
- PostgreSQL scales better with larger batches

### Aggregation Pipelines

**PostgreSQL surprisingly faster:**

- Average order total: **1.80ms vs 2.22ms (19% faster)**
- Category stats: **2.67ms vs 3.03ms (12% faster)**
- Normalized schema + query optimizer very efficient

## 💡 When to Use Each Database

### Choose PostgreSQL When:

✅ **Data Integrity is Critical**

- Financial transactions
- Order processing
- Inventory management
- Banking systems

✅ **Complex Relationships**

- Multiple many-to-many relationships
- Frequent JOINs across tables
- Referential integrity required

✅ **High Concurrency**

- 50+ concurrent users
- Multi-user applications
- Enterprise systems

✅ **ACID Compliance Required**

- Transactions with rollback
- Strong consistency needed
- Audit trails

### Choose MongoDB When:

✅ **Flexible Schema Needed**

- Rapid development
- Evolving data models
- Heterogeneous data

✅ **Denormalized Data**

- Product catalogs
- User profiles with nested data
- Content management systems

✅ **Write-Heavy Workloads**

- Logging systems
- Real-time analytics
- Activity feeds

✅ **Simple Document Access**

- No complex joins
- Embedded data retrieval
- Fast reads for single entities

### Hybrid Approach (Best of Both)

Consider using **both** databases:

- **PostgreSQL**: Transactional data (orders, payments, inventory)
- **MongoDB**: Catalog data (products, reviews, user profiles)

This leverages the strengths of each database for optimal performance.

## 📁 Project Structure

```
database-comparison/
├── server/
│   ├── app.js              # Express server
│   ├── db/
│   │   ├── postgres.js     # PostgreSQL client
│   │   └── mongodb.js      # MongoDB client
│   └── routes/
│       ├── postgres.js     # PostgreSQL endpoints
│       └── mongodb.js      # MongoDB endpoints
├── benchmarks/
│   ├── test-crud-postgres.js
│   ├── test-crud-mongodb.js
│   ├── test-advanced.js    # Bulk, aggregation, concurrent
│   ├── compare-all.js
│   └── generate-dashboard.js
├── data/
│   ├── seed-postgres.js    # Generate test data
│   └── seed-mongodb.js     # Generate test data
├── init-postgres.sql       # PostgreSQL schema
├── docker-compose.yml
├── run-all-tests.ps1       # Automated testing
├── cleanup.ps1             # Cleanup script
├── ANALYSIS.md             # Detailed analysis
└── README.md
```

## 🛠️ Available Scripts

```powershell
# Data seeding
npm run seed-postgres       # Seed PostgreSQL
npm run seed-mongodb        # Seed MongoDB
npm run seed-all            # Seed both databases

# Basic tests
npm run test-crud-pg        # PostgreSQL CRUD
npm run test-crud-mongo     # MongoDB CRUD

# Advanced tests
npm run test-advanced       # Bulk, aggregation, concurrent

# Analysis
npm run compare             # Compare all results
npm run dashboard           # Generate visualization

# Automation
.\run-all-tests.ps1         # Run complete test suite
.\cleanup.ps1 -Results      # Remove test results
.\cleanup.ps1 -Docker       # Stop Docker containers
.\cleanup.ps1 -All          # Full cleanup
```

## 📈 Test Environment

- **PostgreSQL**: 16-alpine, 2 CPU, 2GB RAM
- **MongoDB**: 7, 2 CPU, 2GB RAM
- **Dataset**: 1000 users, 500 products, ~2000 orders, ~1500 reviews
- **Hardware**: Equal resources for fair comparison
- **Test Duration**: ~20 minutes for complete suite

## 🎓 Key Learnings

### Performance Characteristics

1. **PostgreSQL excels at:**

   - Read operations at scale (21% faster)
   - Concurrent connections (822 req/s at 100 users)
   - Product queries (28% faster)
   - Large bulk operations (27% faster at 2000 records)

2. **MongoDB excels at:**
   - Write operations (18% faster)
   - Complex queries with embedded data (6% faster)
   - Small bulk inserts (63% faster at 100 records)
   - Low concurrent connections (59% faster at 10 users)

### Data Modeling Impact

- **Normalized (PostgreSQL)**: Better for updates, data integrity, complex relationships
- **Denormalized (MongoDB)**: Better for reads, flexible schemas, rapid development

### Consistency Models

- **PostgreSQL**: ACID, strong consistency, immediate consistency
- **MongoDB**: BASE, eventual consistency, configurable consistency levels

## 📊 Dashboard Features

The interactive dashboard includes:

- 6 metric cards (basic + advanced test winners)
- Response time comparison charts
- Performance across load scenarios
- Bulk operations performance
- Concurrent connections throughput
- Detailed metrics tables
- Use case recommendations

## 🔍 Detailed Analysis

See [ANALYSIS.md](./ANALYSIS.md) for:

- Executive summary
- Complete test results
- Performance characteristics
- Data modeling impact
- Cost efficiency analysis
- Hybrid approach recommendations

## 📝 License

MIT

## 🤝 Contributing

This is a demonstration project for learning system design concepts. Feel free to fork and adapt for your own testing needs!

## 📧 Contact

Built as part of a System Design learning series.

---

**Key Takeaway**: Both databases excel in different scenarios. PostgreSQL is better for complex relationships, high concurrency, and data integrity. MongoDB is better for flexible schemas, write-heavy workloads, and denormalized data. Choose based on your specific use case, not on popularity or hype.

**Overall Winner**: It depends! 🎯

- **Enterprise apps with complex data**: PostgreSQL
- **Rapid development with flexible schemas**: MongoDB
- **Best approach**: Use both where each excels
