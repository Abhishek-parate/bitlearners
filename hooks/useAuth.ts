// hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthProvider';

// Make sure this matches the context type in AuthProvider.tsx
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}