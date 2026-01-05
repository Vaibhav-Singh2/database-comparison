const express = require('express');
const pgPool = require('./db/postgres');
const { connect: connectMongo, getDb } = require('./db/mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ===== PostgreSQL Endpoints =====

// Get user by ID
app.get('/api/pg/users/:id', async (req, res) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    const result = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      data: result.rows[0],
      _meta: { database: 'PostgreSQL', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders (complex join query)
app.get('/api/pg/users/:id/orders', async (req, res) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    const result = await pgPool.query(`
      SELECT 
        u.name as user_name,
        o.id as order_id,
        o.total,
        o.status,
        o.created_at,
        json_agg(
          json_build_object(
            'product_id', p.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM users u
      JOIN orders o ON u.id = o.user_id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE u.id = $1
      GROUP BY u.name, o.id, o.total, o.status, o.created_at
      ORDER BY o.created_at DESC
    `, [id]);

    res.json({
      data: result.rows,
      count: result.rows.length,
      _meta: { database: 'PostgreSQL', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
app.get('/api/pg/products', async (req, res) => {
  const start = Date.now();
  try {
    const { category, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ` LIMIT ${parseInt(limit)}`;
    
    const result = await pgPool.query(query, params);

    res.json({
      data: result.rows,
      count: result.rows.length,
      _meta: { database: 'PostgreSQL', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/pg/users', async (req, res) => {
  const start = Date.now();
  try {
    const { name, email } = req.body;
    const result = await pgPool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );

    res.status(201).json({
      data: result.rows[0],
      _meta: { database: 'PostgreSQL', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MongoDB Endpoints =====

// Get user by ID
app.get('/api/mongo/users/:id', async (req, res) => {
  const start = Date.now();
  try {
    const db = getDb();
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: parseInt(id) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      data: user,
      _meta: { database: 'MongoDB', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders (embedded data)
app.get('/api/mongo/users/:id/orders', async (req, res) => {
  const start = Date.now();
  try {
    const db = getDb();
    const { id } = req.params;
    const user = await db.collection('users').findOne(
      { _id: parseInt(id) },
      { projection: { name: 1, orders: 1 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      data: user.orders || [],
      count: user.orders?.length || 0,
      _meta: { database: 'MongoDB', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
app.get('/api/mongo/products', async (req, res) => {
  const start = Date.now();
  try {
    const db = getDb();
    const { category, limit = 10 } = req.query;
    
    const query = category ? { category } : {};
    const products = await db.collection('products')
      .find(query)
      .limit(parseInt(limit))
      .toArray();

    res.json({
      data: products,
      count: products.length,
      _meta: { database: 'MongoDB', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/mongo/users', async (req, res) => {
  const start = Date.now();
  try {
    const db = getDb();
    const { name, email } = req.body;
    
    // Get next ID
    const lastUser = await db.collection('users').find().sort({ _id: -1 }).limit(1).toArray();
    const nextId = lastUser.length > 0 ? lastUser[0]._id + 1 : 1;
    
    const user = {
      _id: nextId,
      name,
      email,
      created_at: new Date(),
      orders: []
    };
    
    await db.collection('users').insertOne(user);

    res.status(201).json({
      data: user,
      _meta: { database: 'MongoDB', queryTime: Date.now() - start }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function start() {
  try {
    // Connect to MongoDB
    await connectMongo();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`\nEndpoints:`);
      console.log(`  PostgreSQL:`);
      console.log(`    GET  /api/pg/users/:id`);
      console.log(`    GET  /api/pg/users/:id/orders`);
      console.log(`    GET  /api/pg/products?category=:category`);
      console.log(`    POST /api/pg/users`);
      console.log(`  MongoDB:`);
      console.log(`    GET  /api/mongo/users/:id`);
      console.log(`    GET  /api/mongo/users/:id/orders`);
      console.log(`    GET  /api/mongo/products?category=:category`);
      console.log(`    POST /api/mongo/users`);
      console.log(`  Health:`);
      console.log(`    GET  /health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
