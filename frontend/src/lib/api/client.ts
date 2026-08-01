import axios from 'axios';

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			const path = window.location.pathname;
			if (!path.startsWith('/login') && !path.startsWith('/r/')) {
				window.location.assign('/login');
			}
		}
		return Promise.reject(error);
	}
);

export { axios as apiClient };
