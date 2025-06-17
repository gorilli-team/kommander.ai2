
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
    // Optional: Ping to check if connection is still alive
    try {
        await cachedDb.command({ ping: 1 });
        // console.log("[backend/lib/mongodb.ts] Using cached MongoDB client and DB connection (ping successful).");
        return { client: cachedClient, db: cachedDb };
    } catch (pingError: any) {
        console.warn("[backend/lib/mongodb.ts] Cached MongoDB connection failed ping. Reconnecting...", pingError.message);
        cachedClient = null;
        cachedDb = null;
        // Fall through to reconnect
    }
  }

  try {
    if (!cachedClient) {
      console.log("[backend/lib/mongodb.ts] No valid cached client, attempting to connect to MongoDB client...");
      cachedClient = await client.connect();
      console.log("[backend/lib/mongodb.ts] Successfully connected to MongoDB client instance.");
    } else {
       console.log("[backend/lib/mongodb.ts] Reusing existing MongoDB client instance (was already connected).");
    }
    
    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype';
    if (!dbNameFromUri) {
      console.warn(`[backend/lib/mongodb.ts] Database name not found in MONGODB_URI, defaulting to '${dbName}'. It's recommended to specify the database name in the URI.`);
    }
    cachedDb = cachedClient.db(dbName);
    console.log(`[backend/lib/mongodb.ts] Using database: ${dbName}`);
    
    // Ping the database to confirm connection
    await cachedDb.command({ ping: 1 });
    console.log("[backend/lib/mongodb.ts] Pinged your deployment. You successfully connected to MongoDB!");
    
    return { client: cachedClient, db: cachedDb };
  } catch (error: any) {
    console.error('[backend/lib/mongodb.ts] CRITICAL: Failed to connect to MongoDB or ping failed.');
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Name:', error.name);
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Message:', error.message);
    console.error('[backend/lib/mongodb.ts] MongoDB Connection Error Stack:', error.stack);
    cachedClient = null; // Reset cache on failure
    cachedDb = null;
    throw new Error(`Failed to connect to the database: ${error.message}`);
  }
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (cachedBucket) {
    // Consider if a "ping" or check is needed for the bucket's DB connection if it could go stale
    console.log("[backend/lib/mongodb.ts] Using cached GridFSBucket.");
    return cachedBucket;
  }
  const { db } = await connectToDatabase(); 
  cachedBucket = new GridFSBucket(db, { bucketName: 'file_uploads' });
  console.log("[backend/lib/mongodb.ts] GridFSBucket initialized for 'file_uploads'.");
  return cachedBucket;
}

export function getMongoClient(): MongoClient {
    console.log("[backend/lib/mongodb.ts] getMongoClient called.");
    return client;
}
