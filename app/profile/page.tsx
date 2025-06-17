
"use client";

// This page is temporarily removed to simplify the authentication flow.
// It can be re-added once login/registration is stable.

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function ProfilePage_TEMP_DISABLED() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/login?callbackUrl=/profile');
    },
  });

  if (status === "loading") {
    return <div className="container mx-auto py-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Profile Page (Temporarily Disabled Content)</h1>
      <p>This page will show user profile information once re-enabled.</p>
      <p>Authentication is working if you can see this and are logged in.</p>
    </div>
  );
}
