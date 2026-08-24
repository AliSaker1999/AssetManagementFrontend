import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageChunkFallback from '../components/PageChunkFallback';
import { parseApiError } from '../utils/errors';
import logoWhite from '../components/Gezairi - EN-V White.png';
function IconDiamond() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Soft glow behind the logo */}
      <div className="absolute inset-0 rounded-full bg-gold-400/10 blur-2xl scale-125" />
      <img
        src={logoWhite}
        alt="Gezairi"
        className="relative object-contain w-32 h-30 drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}

export default function LoginPage() {
  const { login, user, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Someone arriving here with a refresh cookie still in place has a session; asking them to
  // type a password again would be wrong, and the form would be replaced a moment later
  // anyway once the bootstrap resolves.
  if (isBootstrapping) return <PageChunkFallback />;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userName.trim() || !password) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      await login(userName.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(parseApiError(err, 'Invalid username or password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-800 relative overflow-hidden">
      {/* Decorative background rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-navy-700 opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-navy-600 opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-navy-500 opacity-20" />
        {/* Gold accent glow */}
        <div className="absolute top-1/4 right-1/3 w-64 h-64 rounded-full bg-gold-400/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <IconDiamond />
          <div className="text-white font-bold text-[22px] leading-none tracking-tight">
            Asset Management
          </div>
        </div>



        {/* Card */}
        <div className="bg-pearl-50 rounded-2xl border border-pearl-200 shadow-card-lg px-8 py-8">
          <h2 className="text-[20px] font-extrabold text-ink-800 mb-1">Welcome back</h2>
          <p className="text-[13px] text-ink-300 mb-7">Sign in to your account to continue</p>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-[#f5c2c7] bg-[#fff1f2] px-3 py-2 text-[13px] text-[#842029]" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Username</label>
              <input
                className="input-base"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Password</label>
              <input
                className="input-base"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            <button
              className="btn-primary w-full justify-center py-2.5 mt-1 text-[14px]"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-navy-400 mt-6">
          Asset Management System · Gezairi Group
        </p>
      </div>
    </div>
  );
}
