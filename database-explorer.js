// database-explorer.js - Find where your venue data actually is
require('dotenv').config();
const { connectMongoDB, mongoose } = require('./src/config/mongodb');

async function exploreDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongoDB();
    
    const client = mongoose.connection.getClient();
    const admin = client.db().admin();
    
    // List all databases
    console.log('\nAvailable databases:');
    const dbs = await admin.listDatabases();
    dbs.databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check current database
    const currentDb = mongoose.connection.db;
    console.log(`\nCurrently connected to: ${currentDb.databaseName}`);
    
    // Check collections in current database
    const collections = await currentDb.listCollections().toArray();
    console.log(`\nCollections in ${currentDb.databaseName}:`);
    
    for (const collection of collections) {
      const collectionObj = currentDb.collection(collection.name);
      const count = await collectionObj.countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await collectionObj.findOne();
        if (sample && sample.fullName) {
          console.log(`  Sample: ID=${sample._id}, Name="${sample.fullName}"`);
        }
      }
    }
    
    // Try searching in other databases for venue data
    console.log('\nSearching for venue data in other databases...');
    for (const db of dbs.databases) {
      if (db.name !== currentDb.databaseName && !['admin', 'local', 'config'].includes(db.name)) {
        const otherDb = client.db(db.name);
        const otherCollections = await otherDb.listCollections().toArray();
        
        for (const collection of otherCollections) {
          if (collection.name.toLowerCase().includes('venue')) {
            const collectionObj = otherDb.collection(collection.name);
            const count = await collectionObj.countDocuments();
            console.log(`Found in ${db.name}.${collection.name}: ${count} documents`);
            
            if (count > 0) {
              const samples = await collectionObj.find({}).limit(3).toArray();
              samples.forEach((doc, i) => {
                console.log(`  ${i + 1}. ID: ${doc._id}, Name: ${doc.fullName || doc.name || 'N/A'}`);
              });
            }
          }
        }
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Database exploration failed:', error);
    process.exit(1);
  }
}

console.log('Starting database exploration...\n');
exploreDatabase();