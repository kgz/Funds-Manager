import { PageLoadingState } from '@/components/layout/PageLoadingState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
	const { loading, authenticated } = useAuth();
	const location = useLocation();

	if (loading) {
		return <PageLoadingState />;
	}

	if (!authenticated) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return children;
}
