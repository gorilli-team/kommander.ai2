
import { MongoClient, ServerApiVersion, Db, GridFSBucket } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('[backend/lib/mongodb.ts] CRITICAL: MONGODB_URI environment variable is not defined.');
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
console.log(`[backend/lib/mongodb.ts] Attempting to connect to MongoDB. URI starts with: ${uri.substring(0, uri.indexOf('@') > 0 ? uri.indexOf('@') : 30)}...`);


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let cachedBucket: GridFSBucket | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient, db: Db }> {
  if (cachedClient && cachedDb) {
    console.log("[backend/lib/mongodb.ts] Using cached MongoDB client and DB connection.");
    return { client: cachedClient, db: cachedDb };
  }

  try {
    if (!cachedClient) {
      console.log("[backend/lib/mongodb.ts] No cached client, attempting to connect...");
      cachedClient = await client.connect();
      console.log("[backend/lib/mongodb.ts] Successfully connected to MongoDB client.");
    } else {
      console.log("[backend/lib/mongodb.ts] Using existing cached client instance.");
    }
    
    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype';
    if (!dbNameFromUri) {
      console.warn(`[backend/lib/mongodb.ts] Database name not found in MONGODB_URI, defaulting to '${dbName}'. It's recommended to specify the database name in the URI.`);
    }
    cachedDb = cachedClient.db(dbName);
    console.log(`[backend/lib/mongodb.ts] Using database: ${cachedDb.databaseName}`); // Log the actual DB name being used
    
    return { client: cachedClient, db: cachedDb };
  } catch (error: any) {
    console.error('[backend/lib/mongodb.ts] CRITICAL: Failed to connect to MongoDB.', error);
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Name:', error.name);
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Message:', error.message);
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Stack:', error.stack);
    // Important: Invalidate cache on error to force re-attempt on next call
    cachedClient = null; 
    cachedDb = null;
    throw new Error(`Failed to connect to the database: ${error.message}`);
  }
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (cachedBucket) {
    console.log("[backend/lib/mongodb.ts] Using cached GridFSBucket.");
    return cachedBucket;
  }
  const { db } = await connectToDatabase(); 
  cachedBucket = new GridFSBucket(db, { bucketName: 'file_uploads' }); 
  console.log("[backend/lib/mongodb.ts] GridFSBucket initialized for 'file_uploads'.");
  return cachedBucket;
}

export function getMongoClient(): MongoClient {
    return client;
}
