import { MongoClient, ServerApiVersion, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient, db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!cachedClient) {
    cachedClient = await client.connect();
  }
  
  const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
  const dbName = dbNameFromUri || 'kommander_ai_prototype';
  cachedDb = cachedClient.db(dbName);
  
  return { client: cachedClient, db: cachedDb };
}

// Optional: If you need to perform operations that require knowledge of all DBs or administrative tasks
export function getMongoClient(): MongoClient {
    return client;
}
