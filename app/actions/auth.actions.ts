
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { RegisterSchema } from '@/frontend/lib/schemas/auth.schemas'; // Updated import
import type { UserDocument } from '@/backend/schemas/user';

export async function registerUser(values: unknown) {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Invalid fields.', details: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password, name } = validatedFields.data;

  try {
    const { db } = await connectToDatabase();

    const existingUser = await db.collection<UserDocument>('users').findOne({ email });
    if (existingUser) {
      return { error: 'An account with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: Omit<UserDocument, '_id'> = {
      email,
      name: name || undefined, // Store name if provided
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser as UserDocument); // Type assertion to satisfy MongoDB

    if (result.insertedId) {
      return { success: 'Account created successfully! You can now log in.' };
    } else {
      return { error: 'Failed to create account. Please try again.' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'An unexpected error occurred during registration.' };
  }
}
