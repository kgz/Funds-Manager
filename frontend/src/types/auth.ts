import { apiClient } from '@/lib/api/client';

export type UserPublic = {
	id: number;
	email: string;
};

export type MeResponse = {
	authenticated: boolean;
	canRegister: boolean;
	user: UserPublic | null;
};

export type AuthSuccessResponse = {
	user: UserPublic;
};

export type AuthCredentials = {
	email: string;
	password: string;
};

function authErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === 'object' &&
		error !== null &&
		'response' in error &&
		typeof error.response === 'object' &&
		error.response !== null &&
		'data' in error.response
	) {
		const data = error.response.data;
		if (typeof data === 'string' && data.length > 0) {
			return data;
		}
		if (
			typeof data === 'object' &&
			data !== null &&
			'error' in data &&
			typeof data.error === 'string'
		) {
			return data.error;
		}
	}
	return fallback;
}

export async function fetchMe(): Promise<MeResponse> {
	const { data } = await apiClient.get<MeResponse>('/api/me');
	return data;
}

export async function login(credentials: AuthCredentials): Promise<UserPublic> {
	try {
		const { data } = await apiClient.post<AuthSuccessResponse>('/api/login', credentials);
		return data.user;
	} catch (error) {
		throw new Error(authErrorMessage(error, 'Invalid email or password.'));
	}
}

export async function register(credentials: AuthCredentials): Promise<UserPublic> {
	try {
		const { data } = await apiClient.post<AuthSuccessResponse>('/api/register', credentials);
		return data.user;
	} catch (error) {
		throw new Error(authErrorMessage(error, 'Could not create account.'));
	}
}

export async function logout(): Promise<void> {
	await apiClient.post('/api/logout');
}
