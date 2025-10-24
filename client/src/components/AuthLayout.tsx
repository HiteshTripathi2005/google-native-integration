'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const { fetchMessages } = useChatStore();
  const router = useRouter();
  const pathname = usePathname();
  const hasInitialized = useRef(false);
  const hasFetchedMessages = useRef(false);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  // Check if current path is auth-related
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Initialize auth check on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkAuth().then(() => {
        setAuthCheckCompleted(true);
      }).catch((error) => {
        setAuthCheckCompleted(true);
      });
    }
  }, []); // Only run once on mount

  // Fetch messages when user becomes authenticated (not on auth pages)
  useEffect(() => {
    if (isAuthenticated && !isAuthPage && !hasFetchedMessages.current && !isCheckingAuth) {
      hasFetchedMessages.current = true;
      fetchMessages();
    }
  }, [isAuthenticated, isAuthPage, isCheckingAuth, fetchMessages]);

  // Handle redirects based on auth state (only after auth check is completed)
  useEffect(() => {
    if (!authCheckCompleted) return;

    if (!isAuthenticated && !isAuthPage) {
      router.push('/login');
    } else if (isAuthenticated && isAuthPage) {
      router.push('/');
    }
  }, [isAuthenticated, isAuthPage, router, authCheckCompleted]);

  // Show loading state until auth check is completed
  if (!authCheckCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#212121]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render anything if redirecting to login
  if (!isAuthenticated && !isAuthPage) {
    return null;
  }

  return <>{children}</>;
}
