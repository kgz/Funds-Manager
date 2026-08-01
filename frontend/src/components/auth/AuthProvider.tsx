import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import {
	fetchMe,
	login as loginRequest,
	logout as logoutRequest,
	register as registerRequest,
	type UserPublic,
} from '@/types/auth';

type AuthContextValue = {
	loading: boolean;
	authenticated: boolean;
	canRegister: boolean;
	user: UserPublic | null;
	refresh: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [loading, setLoading] = useState(true);
	const [authenticated, setAuthenticated] = useState(false);
	const [canRegister, setCanRegister] = useState(false);
	const [user, setUser] = useState<UserPublic | null>(null);

	const refresh = useCallback(async () => {
		const me = await fetchMe();
		setAuthenticated(me.authenticated);
		setCanRegister(me.canRegister);
		setUser(me.user);
	}, []);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				await refresh();
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, [refresh]);

	const login = useCallback(async (email: string, password: string) => {
		const nextUser = await loginRequest({ email, password });
		setAuthenticated(true);
		setCanRegister(false);
		setUser(nextUser);
	}, []);

	const register = useCallback(async (email: string, password: string) => {
		const nextUser = await registerRequest({ email, password });
		setAuthenticated(true);
		setCanRegister(false);
		setUser(nextUser);
	}, []);

	const logout = useCallback(async () => {
		await logoutRequest();
		setAuthenticated(false);
		setUser(null);
		const me = await fetchMe();
		setCanRegister(me.canRegister);
	}, []);

	const value = useMemo(
		() => ({
			loading,
			authenticated,
			canRegister,
			user,
			refresh,
			login,
			register,
			logout,
		}),
		[loading, authenticated, canRegister, user, refresh, login, register, logout]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (context === null) {
		throw new Error('useAuth must be used within AuthProvider');
	}
	return context;
}
