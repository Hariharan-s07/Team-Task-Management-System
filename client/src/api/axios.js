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
            // console.log('User from localStorage:', userStr);

            if (userStr) {
                const user = JSON.parse(userStr);
                // console.log('Parsed user:', user);

                if (user && user.token) {
                    config.headers['Authorization'] = `Bearer ${user.token}`;
                    // console.log('Token attached to request');
                } else {
                    console.warn('User object exists but no token found');
                }
            } else {
                // console.warn('No user in localStorage');
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
        if (error.response && error.response.status === 403 && error.response.data.message === 'Forbidden' && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await api.get('/auth/refresh');
                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (err) {
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
