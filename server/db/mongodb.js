const { MongoClient } = require('mongodb');

const url = `mongodb://${process.env.MONGO_HOST || 'localhost'}:${process.env.MONGO_PORT || 27017}`;
const dbName = process.env.MONGO_DATABASE || 'ecommerce';

let client;
let db;

async function connect() {
  if (db) return db;

  try {
    client = new MongoClient(url, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(dbName);
    
    console.log('✓ MongoDB connected');
    
    // Create indexes
    await createIndexes();
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Products collection indexes
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ 'reviews.user_id': 1 });
    
    console.log('✓ MongoDB indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

async function close() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connect,
  getDb,
  close
};
