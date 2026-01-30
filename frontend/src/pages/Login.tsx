import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid identification sequence');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden">
      {/* Abstract Design Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-100 rounded-full blur-[120px] opacity-60"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-[48px] shadow-2xl shadow-blue-200/20 overflow-hidden relative z-10 mx-4">

        {/* Left Side: Brand Experience */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-blue-600 text-white relative">
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-10 shadow-lg p-4">
              <img src="/logo.png" alt="Apextime" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-5xl font-extrabold tracking-tighter leading-tight mb-6">
              Apextime<br />
              Attendance.
            </h2>
            <p className="text-blue-100 text-lg font-bold opacity-80 max-w-sm">
              Manage your workforce efficiently with our advanced attendance system.
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest opacity-80">Real-time Sync</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest opacity-80">Instant Reports</span>
            </div>
          </div>

          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[60px] border-white rounded-full"></div>
          </div>
        </div>

        {/* Right Side: Logic */}
        <div className="p-12 lg:p-20 flex flex-col justify-center">
          <div className="mb-12">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Sign In</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Enter your credentials</p>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 border border-red-100 text-red-600 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center justify-center space-x-3 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none translate-y-0 active:translate-y-1"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-16 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter italic">
              Apextime v4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
