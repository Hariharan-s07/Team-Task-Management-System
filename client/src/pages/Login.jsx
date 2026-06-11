
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login, reset } from '../features/auth/authSlice';

function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { email, password } = formData;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    useEffect(() => {
        if (isSuccess || user) {
            if (isSuccess) dispatch(reset());
            navigate('/');
            return;
        }
        if (isError) {
            toast.error(message);
        }
        return () => {
            if (isSuccess) dispatch(reset());
        };
    }, [user, isError, isSuccess, message, navigate, dispatch]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(login({
            ...formData,
            email: formData.email.trim(),
        }));
    };

    return (
        <div className="auth-container">
            <div className="card fade-in" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-4">
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue your progress</p>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            name="email"
                            value={email}
                            onChange={onChange}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            name="password"
                            value={password}
                            onChange={onChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {isError && <div className="text-error mb-4 text-center">{message}</div>}

                    <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <span style={{ color: 'var(--text-secondary)' }}>New here? </span>
                    <Link to="/register" className="link">Create an account</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
