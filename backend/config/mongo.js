const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB_NAME || 'cms_nosql_showcase';

let client;
let database;

const getMongoDb = async () => {
  if (database) return database;

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 1500,
  });

  await client.connect();
  database = client.db(dbName);
  return database;
};

const closeMongo = async () => {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
};

module.exports = { getMongoDb, closeMongo };
