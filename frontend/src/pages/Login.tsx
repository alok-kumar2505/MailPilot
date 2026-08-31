import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function Login() {
  const { user, isLoading, refetchUser } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState(''); // Only used for registration

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isRegistering) {
        await api.post('/api/auth/register', { name, email, password });
        toast.success('Registration successful!');
      } else {
        await api.post('/api/auth/login', { email, password });
        toast.success('Login successful!');
      }
      
      // Refresh user context to redirect to dashboard
      await refetchUser();
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)] px-4">
      <div className="w-full max-w-[440px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 flex flex-col items-center">
        
        <h1 className="text-[28px] font-bold text-gray-900 mb-8">
          {isRegistering ? 'Sign Up' : 'Login'}
        </h1>

        <button 
          onClick={handleGoogleLogin} 
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-[#f3f9f5] text-[#333] border border-[#e2ece5] rounded-lg py-2.5 font-medium hover:bg-[#eaf4ec] transition-colors"
        >
          {/* Google G icon inline SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
          {isRegistering ? 'Sign up with Google' : 'Login with Google'}
        </button>

        <div className="flex items-center w-full my-6 text-gray-400">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-xs font-medium tracking-wide">
            {isRegistering ? 'or sign up through email' : 'or login through email'}
          </span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <form className="w-full flex flex-col gap-4" onSubmit={handleEmailSubmit}>
          {isRegistering && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#f8f9fa] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow text-gray-800 placeholder-gray-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isRegistering}
            />
          )}

          <input
            type="email"
            placeholder="Email ID"
            className="w-full bg-[#f8f9fa] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow text-gray-800 placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full bg-[#f8f9fa] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow text-gray-800 placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#00A14B] hover:bg-[#008f42] text-white rounded-lg py-3 mt-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                Processing...
              </span>
            ) : (
              isRegistering ? 'Sign Up' : 'Login'
            )}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <button 
            type="button" 
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1 text-[#00A14B] hover:underline font-medium"
          >
            {isRegistering ? 'Login here' : 'Sign up here'}
          </button>
        </p>
      </div>
    </div>
  );
}
