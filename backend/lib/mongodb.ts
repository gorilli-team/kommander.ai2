
import { MongoClient, ServerApiVersion, Db, GridFSBucket } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('[backend/lib/mongodb.ts] CRITICAL: MONGODB_URI environment variable is not defined.');
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
console.log(`[backend/lib/mongodb.ts] MONGODB_URI found. Attempting to connect. URI starts with: ${uri.substring(0, uri.indexOf('@') > 0 ? uri.indexOf('@') : 30)}...`);


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
    try {
        // Ping the database to ensure the cached connection is still valid
        await cachedDb.command({ ping: 1 });
        // console.log("[backend/lib/mongodb.ts] Cached connection ping successful.");
        return { client: cachedClient, db: cachedDb };
    } catch (pingError: any) {
        console.warn("[backend/lib/mongodb.ts] Cached MongoDB connection failed ping. Reconnecting...", pingError.message);
        cachedClient = null;
        cachedDb = null;
        // Fall through to reconnect logic
    }
  }

  try {
    console.log("[backend/lib/mongodb.ts] No valid cached client/DB, attempting to connect...");
    cachedClient = await client.connect();
    console.log("[backend/lib/mongodb.ts] Successfully connected to MongoDB client.");
    
    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype'; // Default DB name if not in URI
    if (!dbNameFromUri) {
      console.warn(`[backend/lib/mongodb.ts] Database name not found in MONGODB_URI, defaulting to '${dbName}'. It is recommended to specify the database name in the URI like: ...mongodb.net/YOUR_DB_NAME?retryWrites=true`);
    }
    cachedDb = cachedClient.db(dbName);
    console.log(`[backend/lib/mongodb.ts] Using database: ${cachedDb.databaseName}`); // Log the actual DB name being used
    
    // Attempt a ping to confirm connection and auth
    await cachedDb.command({ ping: 1 });
    console.log("[backend/lib/mongodb.ts] Pinged your deployment. You successfully connected to MongoDB!");

    return { client: cachedClient, db: cachedDb };
  } catch (error: any) {
    console.error('[backend/lib/mongodb.ts] CRITICAL: Failed to connect to MongoDB or ping failed.', error);
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
