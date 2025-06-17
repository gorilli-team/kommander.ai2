
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// NOTA: Il console.log di process.env.AUTH_SECRET è stato rimosso per sicurezza.
// È stato utile per il debug, ma non dovrebbe mai essere presente in codice committed.
console.log('[auth.config.ts] NEXTAUTH_URL:', process.env.NEXTAUTH_URL); // Può rimanere per debug se necessario

export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Puoi definire una pagina di errore personalizzata
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        console.log('[auth.config.ts] Authorize function called. Validating credentials...');

        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          console.error('[auth.config.ts] Zod validation failed for credentials:', validatedFields.error.flatten().fieldErrors);
          return null; // Zod validation failed
        }
        console.log('[auth.config.ts] Credentials validated by Zod successfully.');

        const { email, password } = validatedFields.data;
        console.log('[auth.config.ts] Attempting to authenticate user:', email);

        let db;
        try {
          console.log('[auth.config.ts] Attempting to connect to database...');
          const connection = await connectToDatabase();
          db = connection.db;
          console.log('[auth.config.ts] Successfully connected to database. DB Name:', db.databaseName);
        } catch (dbConnectError: any) {
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message);
          console.error('[auth.config.ts] DB Connect Error Stack:', dbConnectError.stack);
          return null; // Cannot connect to DB
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message);
          console.error('[auth.config.ts] DB Find Error Stack:', dbFindError.stack);
          return null; // Error during DB query
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email, '. Authentication failed.');
          return null; // User not found
        }
        console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString());

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
          return null; // User document is malformed (missing hashedPassword)
        }
        console.log('[auth.config.ts] User has a hashed password. Comparing passwords...');

        let passwordsMatch = false;
        try {
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
          console.log('[auth.config.ts] Password comparison result for user', email, ':', passwordsMatch);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message);
          console.error('[auth.config.ts] Bcrypt Error Stack:', bcryptError.stack);
          return null; // Error during password comparison
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication SUCCESS.');
          // Return the user object expected by NextAuth.js
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null, // Ensure name is null if undefined
            // image: userDoc.image || null, // If you add images later
          };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
          return null; // Passwords don't match
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt', // Using JWT strategy
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // console.log('[auth.config.ts] JWT callback invoked. Token:', token, 'User:', user);
      if (user) { // `user` is only passed on first sign-in or when account is linked
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // token.picture = user.image; // if you have images
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback invoked. Session:', session, 'Token:', token);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        // name and email should be populated by default if in token
        // if (token.name) session.user.name = token.name;
        // if (token.email) session.user.email = token.email;
        // if (token.picture) session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Ensures AUTH_SECRET is used
  trustHost: true, // Recommended for development, review for production
  // cookies: {}, // Relying on NextAuth.js defaults for cookie names and attributes.
                   // These defaults are generally secure (HttpOnly, SameSite=Lax, Secure if NEXTAUTH_URL uses https)
  debug: process.env.NODE_ENV === 'development', // Enables more verbose logging from NextAuth.js in development
} satisfies NextAuthConfig;
