
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { RegisterSchema } from '@/frontend/lib/schemas/auth.schemas';
import type { UserDocument } from '@/backend/schemas/user';

export async function registerUser(values: unknown): Promise<{ success?: string; error?: string; details?: any }> {
  console.log('[frontend/app/actions/auth.actions.ts] registerUser called with values:', values);
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[frontend/app/actions/auth.actions.ts] Registration validation failed:', fieldErrors);
    return { error: 'Invalid fields.', details: fieldErrors };
  }

  const { email, password, name } = validatedFields.data;
  console.log('[frontend/app/actions/auth.actions.ts] Registration fields validated for email:', email);

  try {
    console.log('[frontend/app/actions/auth.actions.ts] Attempting to connect to database for registration...');
    const { db } = await connectToDatabase();
    console.log('[frontend/app/actions/auth.actions.ts] Connected to database. Checking for existing user:', email);

    const existingUser = await db.collection<UserDocument>('users').findOne({ email });
    if (existingUser) {
      console.warn('[frontend/app/actions/auth.actions.ts] Email already exists:', email);
      return { error: 'An account with this email already exists.' };
    }
    console.log('[frontend/app/actions/auth.actions.ts] Email available. Hashing password...');

    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10
    console.log('[frontend/app/actions/auth.actions.ts] Password hashed.');

    const newUser: Omit<UserDocument, '_id'> = {
      email,
      name: name || undefined, // Store name if provided, otherwise undefined (MongoDB will omit it)
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser as UserDocument); // Type assertion needed for MongoDB driver

    if (result.insertedId) {
      console.log('[frontend/app/actions/auth.actions.ts] User created successfully with ID:', result.insertedId);
      return { success: 'Account created successfully! You can now log in.' };
    } else {
      console.error('[frontend/app/actions/auth.actions.ts] Failed to insert user into database, no insertedId returned.');
      return { error: 'Failed to create account. Please try again.' };
    }
  } catch (error) {
    console.error('[frontend/app/actions/auth.actions.ts] Registration error:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Registration failed: ${errorMessage}` };
  }
}
