const { connect, getDb, close } = require('../server/db/mongodb');
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

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function seedDatabase() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║   Seeding MongoDB Database             ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════╝\n'));

  try {
    const db = await connect();

    // Clear existing data
    console.log(chalk.yellow('Clearing existing data...'));
    await db.collection('users').deleteMany({});
    await db.collection('products').deleteMany({});
    console.log(chalk.green('  ✓ Cleared existing data'));

    // Generate Products with embedded reviews
    console.log(chalk.cyan('Inserting products with reviews...'));
    const productCount = 500;
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      const category = randomElement(categories);
      const price = parseFloat((Math.random() * 1000 + 10).toFixed(2));
      const stock = randomInt(0, 1000);
      
      // Generate 0-5 reviews per product
      const reviewCount = randomInt(0, 5);
      const reviews = [];
      for (let j = 0; j < reviewCount; j++) {
        reviews.push({
          user_id: randomInt(1, 1000),
          user_name: `User ${randomInt(1, 1000)}`,
          rating: randomInt(1, 5),
          comment: `This is a review comment. Rating: ${randomInt(1, 5)}/5`,
          created_at: randomDate(randomInt(1, 60))
        });
      }

      products.push({
        _id: i,
        name: `Product ${i}`,
        category,
        price,
        stock,
        reviews,
        created_at: randomDate(randomInt(1, 180))
      });

      if (i % 100 === 0) {
        console.log(chalk.gray(`  Progress: ${i}/${productCount} products`));
      }
    }
    
    await db.collection('products').insertMany(products);
    console.log(chalk.green(`  ✓ Inserted ${productCount} products with embedded reviews`));

    // Generate Users with embedded orders
    console.log(chalk.cyan('Inserting users with orders...'));
    const userCount = 1000;
    const users = [];
    let totalOrders = 0;
    let totalOrderItems = 0;

    for (let i = 1; i <= userCount; i++) {
      const user = {
        _id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        created_at: randomDate(randomInt(1, 365)),
        orders: []
      };

      // Generate 0-5 orders per user
      const orderCount = randomInt(0, 5);
      for (let j = 0; j < orderCount; j++) {
        const order = {
          order_id: totalOrders + 1,
          status: randomElement(statuses),
          created_at: randomDate(randomInt(1, 90)),
          items: []
        };

        // Generate 1-5 items per order
        const itemCount = randomInt(1, 5);
        let orderTotal = 0;

        for (let k = 0; k < itemCount; k++) {
          const productId = randomInt(1, productCount);
          const product = products.find(p => p._id === productId);
          const quantity = randomInt(1, 5);
          const itemTotal = product.price * quantity;
          orderTotal += itemTotal;

          order.items.push({
            product_id: productId,
            product_name: product.name,
            quantity,
            price: product.price
          });
          totalOrderItems++;
        }

        order.total = parseFloat(orderTotal.toFixed(2));
        user.orders.push(order);
        totalOrders++;
      }

      users.push(user);

      if (i % 200 === 0) {
        console.log(chalk.gray(`  Progress: ${i}/${userCount} users`));
      }
    }

    await db.collection('users').insertMany(users);
    console.log(chalk.green(`  ✓ Inserted ${userCount} users with ${totalOrders} embedded orders`));

    // Show statistics
    console.log(chalk.yellow('\n📊 Database Statistics:'));
    const userStats = await db.collection('users').countDocuments();
    const productStats = await db.collection('products').countDocuments();
    
    // Count total reviews
    const reviewStats = await db.collection('products').aggregate([
      { $project: { reviewCount: { $size: '$reviews' } } },
      { $group: { _id: null, total: { $sum: '$reviewCount' } } }
    ]).toArray();
    const totalReviews = reviewStats[0]?.total || 0;

    console.log(chalk.white(`  Users: ${userStats}`));
    console.log(chalk.white(`  Products: ${productStats}`));
    console.log(chalk.white(`  Orders: ${totalOrders}`));
    console.log(chalk.white(`  Order Items: ${totalOrderItems}`));
    console.log(chalk.white(`  Reviews: ${totalReviews}`));

    console.log(chalk.green('\n✅ MongoDB database seeded successfully!\n'));

  } catch (error) {
    console.error(chalk.red('Error seeding database:'), error);
    throw error;
  } finally {
    await close();
  }
}

seedDatabase().catch(error => {
  console.error(error);
  process.exit(1);
});
