import axios from 'axios';

// console.log('API_URL:', import.meta.env.VITE_API_URL || 'Fallback to Localhost');

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        try {
            const userStr = localStorage.getItem('user');

            if (userStr) {
                const user = JSON.parse(userStr);

                if (user && user.token) {
                    config.headers['Authorization'] = `Bearer ${user.token}`;
                } else {
                    console.warn('User object exists but no token found');
                }
            } else {
                console.debug('No user in localStorage - request will be unauthenticated');
            }
        } catch (error) {
            console.error('Error reading user from localStorage:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const requestUrl = originalRequest?.url || '';
        const isRefreshRequest = requestUrl.includes('/auth/refresh');
        const isAuthEntryRequest =
            requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
        const hasStoredToken = Boolean(JSON.parse(localStorage.getItem('user') || '{}')?.token);

        if ((status === 401 || status === 403) && isRefreshRequest) {
            localStorage.removeItem('user');
            return Promise.reject(error);
        }
        
        // Handle token expiration or invalid token (401)
        if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEntryRequest && hasStoredToken) {
            originalRequest._retry = true;
            try {
                const { data } = await api.get('/auth/refresh');
                
                // Store updated token
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...user, token: data.token }));
                
                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (err) {
                // Refresh failed, clear user and redirect to login
                localStorage.removeItem('user');
                return Promise.reject(err);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
