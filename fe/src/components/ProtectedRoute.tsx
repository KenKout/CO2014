// @/components/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Make sure this is imported
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter(); // Initialize the router hook

  useEffect(() => {
    // Check if we're on the client-side
    if (typeof window !== 'undefined') {
      // If not authenticated and no token in localStorage, redirect to login
      if (!isAuthenticated && !localStorage.getItem('auth_token')) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router]); // Add router to dependency array

  // Show loading state while checking authentication
  if (isAuthenticated === undefined) {
    return <div>Loading...</div>;
  }

  // If authenticated, render children
  return isAuthenticated ? <>{children}</> : null;
}