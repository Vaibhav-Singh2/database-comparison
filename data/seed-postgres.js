const pool = require('../server/db/postgres');
const chalk = require('chalk');

// Sample data generators
const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food & Beverage'];
const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║   Seeding PostgreSQL Database         ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════╝\n'));

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data
    console.log(chalk.yellow('Clearing existing data...'));
    await client.query('TRUNCATE users, products, orders, order_items, reviews CASCADE');

    // Insert Users
    console.log(chalk.cyan('Inserting users...'));
    const userCount = 1000;
    const userValues = [];
    for (let i = 1; i <= userCount; i++) {
      userValues.push(`('User ${i}', 'user${i}@example.com', NOW() - INTERVAL '${randomInt(1, 365)} days')`);
    }
    await client.query(`INSERT INTO users (name, email, created_at) VALUES ${userValues.join(',')}`);
    console.log(chalk.green(`  ✓ Inserted ${userCount} users`));

    // Insert Products
    console.log(chalk.cyan('Inserting products...'));
    const productCount = 500;
    const productValues = [];
    for (let i = 1; i <= productCount; i++) {
      const category = randomElement(categories);
      const price = (Math.random() * 1000 + 10).toFixed(2);
      const stock = randomInt(0, 1000);
      productValues.push(`('Product ${i}', '${category}', ${price}, ${stock}, NOW() - INTERVAL '${randomInt(1, 180)} days')`);
    }
    await client.query(`INSERT INTO products (name, category, price, stock, created_at) VALUES ${productValues.join(',')}`);
    console.log(chalk.green(`  ✓ Inserted ${productCount} products`));

    // Insert Orders and Order Items
    console.log(chalk.cyan('Inserting orders and order items...'));
    const orderCount = 2000;
    let orderItemCount = 0;

    for (let i = 1; i <= orderCount; i++) {
      const userId = randomInt(1, userCount);
      const status = randomElement(statuses);
      const createdDaysAgo = randomInt(1, 90);

      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total, status, created_at) 
         VALUES ($1, 0, $2, NOW() - INTERVAL '${createdDaysAgo} days') 
         RETURNING id`,
        [userId, status]
      );
      const orderId = orderResult.rows[0].id;

      // Insert order items (1-5 items per order)
      const itemCount = randomInt(1, 5);
      let orderTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const productId = randomInt(1, productCount);
        const quantity = randomInt(1, 5);
        
        // Get product price
        const priceResult = await client.query('SELECT price FROM products WHERE id = $1', [productId]);
        const price = parseFloat(priceResult.rows[0].price);
        const itemTotal = price * quantity;
        orderTotal += itemTotal;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) 
           VALUES ($1, $2, $3, $4)`,
          [orderId, productId, quantity, price]
        );
        orderItemCount++;
      }

      // Update order total
      await client.query('UPDATE orders SET total = $1 WHERE id = $2', [orderTotal.toFixed(2), orderId]);

      if (i % 500 === 0) {
        console.log(chalk.gray(`  Progress: ${i}/${orderCount} orders`));
      }
    }
    console.log(chalk.green(`  ✓ Inserted ${orderCount} orders with ${orderItemCount} items`));

    // Insert Reviews
    console.log(chalk.cyan('Inserting reviews...'));
    const reviewCount = 1500;
    const reviewValues = [];
    for (let i = 0; i < reviewCount; i++) {
      const userId = randomInt(1, userCount);
      const productId = randomInt(1, productCount);
      const rating = randomInt(1, 5);
      const comment = `This is a review comment for product ${productId}. Rating: ${rating}/5`;
      reviewValues.push(`(${userId}, ${productId}, ${rating}, '${comment}', NOW() - INTERVAL '${randomInt(1, 60)} days')`);
    }
    await client.query(`INSERT INTO reviews (user_id, product_id, rating, comment, created_at) VALUES ${reviewValues.join(',')}`);
    console.log(chalk.green(`  ✓ Inserted ${reviewCount} reviews`));

    await client.query('COMMIT');

    // Show statistics
    console.log(chalk.yellow('\n📊 Database Statistics:'));
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items,
        (SELECT COUNT(*) FROM reviews) as reviews
    `);
    console.log(chalk.white(`  Users: ${stats.rows[0].users}`));
    console.log(chalk.white(`  Products: ${stats.rows[0].products}`));
    console.log(chalk.white(`  Orders: ${stats.rows[0].orders}`));
    console.log(chalk.white(`  Order Items: ${stats.rows[0].order_items}`));
    console.log(chalk.white(`  Reviews: ${stats.rows[0].reviews}`));

    console.log(chalk.green('\n✅ PostgreSQL database seeded successfully!\n'));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(chalk.red('Error seeding database:'), error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(error => {
  console.error(error);
  process.exit(1);
});
