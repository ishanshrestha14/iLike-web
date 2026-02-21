import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { LoginCredentials } from '@/services/userService';
import { authService } from '@/services/userService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthHeader from './AuthHeader';
import AuthForm from './AuthForm';
import AuthToggle from './AuthToggle';

type FormData = LoginCredentials & {
  name: string;
};

const AuthApp: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Prevent multiple submissions
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { email, password } = formData;
        const { user } = await login({ email, password });
        toast.success('Logged in successfully!');
        let redirectPath = '/';
        if (user?.isAdmin) {
          redirectPath = '/admin/dashboard';
        } else {
          redirectPath = from === '/' ? '/home' : from;
        }
        navigate(redirectPath, { replace: true });
      } else {
        const { name, email, password } = formData;
        await register({ name, email, password });
        toast.success('Account created successfully!');
        navigate('/home', { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await authService.forgotPassword(forgotEmail);
      toast.success('If that email exists, a reset link has been sent');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-red-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-md">
        <AuthHeader />
        
        {/* Auth form card */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]">
          <AuthForm
            isLogin={isLogin}
            formData={formData}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />

          {isLogin && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-white/70 hover:text-white underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <AuthToggle
            isLogin={isLogin}
            onToggle={toggleAuthMode}
          />
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Reset your password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotEmail(''); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 px-4 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Send link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthApp;