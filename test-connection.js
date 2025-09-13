const mongoose = require('mongoose');

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vinay:oRR1TJfyJq2mMH9t@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';
    console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password
    
    await mongoose.connect(uri);
    console.log('✅ Successfully connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();