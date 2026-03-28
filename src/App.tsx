import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, KeyRound, ArrowRight, Send, LogOut, Plus, FolderGit2, MessageCircle, Server, User, Lock, Phone, Database, Copy, CheckCircle2 } from 'lucide-react';
import { Logo } from './components/Logo';

const WORKER_URL = 'https://worker-ts.jorabase.workers.dev';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [step, setStep] = useState<'details' | 'method' | 'otp' | 'forgot-confirm'>('details');
  
  // User Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+880');
  const [email, setEmail] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [foundAccount, setFoundAccount] = useState<any>(null);
  
  const [authMethod, setAuthMethod] = useState<'email' | 'telegram'>('email');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showTelegramInstructions, setShowTelegramInstructions] = useState(false);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      if (email.startsWith('+') || email.startsWith('@') || /^\d+$/.test(email)) {
        setAuthMethod('telegram');
        setTelegramId(email);
      } else {
        setAuthMethod('email');
      }
      setStep('method');
    } else if (authMode === 'forgot') {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${WORKER_URL}/api/lookup-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: email })
        });
        const data = await response.json();
        if (data.success) {
          setFoundAccount(data.account);
          setStep('forgot-confirm');
        } else {
          setError(data.error || 'Account not found.');
        }
      } catch (err) {
        setError('Network error. Could not lookup account.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep('method');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let contactInfo = '';
    if (authMode === 'register') {
      contactInfo = authMethod === 'email' ? email : countryCode + phone.replace(/^0+/, '');
      if (authMethod === 'telegram') setTelegramId(contactInfo);
    } else {
      contactInfo = authMethod === 'email' ? email : telegramId;
    }
    
    if (!contactInfo) return;
    
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    setShowTelegramInstructions(false);
    
    try {
      const endpoint = authMethod === 'email' ? '/api/send-otp' : '/api/telegram/send-otp';
      const payload = authMethod === 'email' ? { email: contactInfo, mode: authMode } : { telegramId: contactInfo, mode: authMode };

      const response = await fetch(`${WORKER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setStep('otp');
      } else {
        if (data.needsBotStart) {
          setShowTelegramInstructions(true);
          setError('Please connect to the Telegram bot first to use this number/username.');
        } else {
          setError(data.error || 'Failed to send OTP');
        }
      }
    } catch (err) {
      setError('Network error. Is your Cloudflare Worker running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsLoading(true);
    setError('');
    
    let contactInfo = '';
    if (authMode === 'register') {
      contactInfo = authMethod === 'email' ? email : countryCode + phone.replace(/^0+/, '');
    } else {
      contactInfo = authMethod === 'email' ? email : telegramId;
    }
    
    try {
      if (authMode === 'forgot') {
        // Reset Password Flow
        const response = await fetch(`${WORKER_URL}/api/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: contactInfo, otp, newPassword })
        });
        const data = await response.json();
        if (data.success) {
          setSuccessMsg('Password reset successfully! Please login.');
          setAuthMode('login');
          setStep('details');
          setOtp('');
          setPassword('');
          setNewPassword('');
        } else {
          setError(data.error || 'Invalid or Expired Verification Code!');
        }
      } else if (authMode === 'login') {
        // Login Flow via OTP
        const response = await fetch(`${WORKER_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: contactInfo, otp, password })
        });
        const data = await response.json();
        if (data.success) {
          setAccountId(data.accountId);
          setIsLoggedIn(true);
        } else {
          setError(data.error || 'Invalid or Expired Verification Code!');
        }
      } else {
        // Registration Flow
        const payload = { 
          contact: contactInfo, 
          otp,
          userData: { name, email, phone: countryCode + phone.replace(/^0+/, ''), password } 
        };

        const response = await fetch(`${WORKER_URL}/api/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
          setAccountId(data.accountId);
          setIsLoggedIn(true);
        } else {
          setError(data.error || 'Invalid or Expired Verification Code!');
        }
      }
    } catch (err) {
      setError('Network error. Could not verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={() => setIsLoggedIn(false)} contact={email || telegramId} accountId={accountId} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">JoraBase</h1>
          <p className="text-zinc-400 mt-2 text-center text-sm">Secure & Infinite Serverless Backend</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
              {showTelegramInstructions && (
                <a href="https://t.me/jorabase_cloud_bot" target="_blank" rel="noreferrer" className="block mt-2 text-blue-400 underline font-medium">
                  Click here to open @jorabase_cloud_bot
                </a>
              )}
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center">
              {successMsg}
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {step === 'details' ? (
              <motion.div key="details-step" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-xl font-semibold mb-6">
                  {authMode === 'register' ? 'Create your account' : authMode === 'forgot' ? 'Find your account' : 'Sign in to JoraBase'}
                </h2>

                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Phone Number</label>
                        <div className="flex gap-2">
                          <div className="relative w-1/3">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="w-full h-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 px-3 outline-none transition-all text-zinc-300 appearance-none cursor-pointer"
                            >
                              <option value="+880">🇧🇩 +880</option>
                              <option value="+91">🇮🇳 +91</option>
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+44">🇬🇧 +44</option>
                              <option value="+92">🇵🇰 +92</option>
                              <option value="+971">🇦🇪 +971</option>
                              <option value="+60">🇲🇾 +60</option>
                              <option value="+65">🇸🇬 +65</option>
                            </select>
                          </div>
                          <div className="relative w-2/3">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="1774077462"
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      {authMode === 'login' || authMode === 'forgot' ? 'Email or Telegram Number/Username' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type={authMode === 'login' || authMode === 'forgot' ? 'text' : 'email'}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={authMode === 'login' || authMode === 'forgot' ? 'developer@example.com or +8801...' : 'developer@example.com'}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {authMode !== 'forgot' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  )}

                  {authMode === 'login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setError(''); setSuccessMsg(''); }}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (authMode === 'register' && (!name || !phone || !email || !password)) || (authMode === 'login' && (!email || !password)) || (authMode === 'forgot' && !email)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                      <>{authMode === 'register' ? 'Continue to Verification' : 'Continue'} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className="text-center mt-6 text-sm text-zinc-500">
                  {authMode === 'register' ? 'Already have an account?' : authMode === 'forgot' ? 'Remembered password?' : "Don't have an account?"}{' '}
                  <button 
                    onClick={() => { setAuthMode(authMode === 'register' ? 'login' : authMode === 'forgot' ? 'login' : 'register'); setError(''); setSuccessMsg(''); }}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {authMode === 'register' ? 'Sign in' : authMode === 'forgot' ? 'Sign in' : 'Create one'}
                  </button>
                </p>
              </motion.div>
            ) : step === 'forgot-confirm' ? (
              <motion.div key="forgot-confirm-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-semibold mb-6">Account Found</h2>
                <p className="text-zinc-400 text-sm mb-6">We found an account associated with {email}. Please confirm the details below.</p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 space-y-2">
                  <p className="text-sm text-zinc-400">Name: <span className="text-white">{foundAccount.name}</span></p>
                  {foundAccount.rawEmail && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="otpMethod" value="email" checked={authMethod === 'email'} onChange={() => setAuthMethod('email')} className="accent-emerald-500" />
                      <span className="text-sm text-zinc-400">Email: <span className="text-white">{foundAccount.email}</span></span>
                    </label>
                  )}
                  {foundAccount.rawPhone && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="otpMethod" value="telegram" checked={authMethod === 'telegram'} onChange={() => setAuthMethod('telegram')} className="accent-emerald-500" />
                      <span className="text-sm text-zinc-400">Telegram/Phone: <span className="text-white">{foundAccount.phone}</span></span>
                    </label>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (authMethod === 'email') {
                      setEmail(foundAccount.rawEmail);
                    } else {
                      setTelegramId(foundAccount.rawPhone);
                    }
                    setStep('method');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Confirm & Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : step === 'method' ? (
              <motion.div key="method-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => { setStep('details'); if(authMode==='forgot') setAuthMode('login'); }} className="text-sm text-zinc-400 hover:text-zinc-200 mb-6 flex items-center gap-1 transition-colors">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to Login
                </button>

                <h2 className="text-xl font-semibold mb-2">
                  {authMode === 'forgot' ? 'Reset Password' : 'Verify your identity'}
                </h2>
                <p className="text-zinc-400 text-sm mb-6">
                  {authMode === 'register' ? 'Choose how you want to receive your 15-minute verification code.' : 'We will send a 15-minute verification code to your contact.'}
                </p>

                {authMode === 'register' && (
                  <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 mb-6">
                    <button
                      onClick={() => { setAuthMethod('email'); setError(''); setShowTelegramInstructions(false); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${authMethod === 'email' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      <Mail className="w-4 h-4" /> Email
                    </button>
                    <button
                      onClick={() => { setAuthMethod('telegram'); setError(''); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${authMethod === 'telegram' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      <Send className="w-4 h-4" /> Telegram
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center mb-4">
                    <p className="text-zinc-400 text-sm mb-1">
                      {authMethod === 'email' ? 'We will send a code to your email:' : 'We will send a code to your Telegram number:'}
                    </p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {authMethod === 'email' 
                        ? (email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*'))
                        : (telegramId.replace(/(?<=.{3}).(?=.{4})/g, '*'))
                      }
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || (authMode !== 'register' && authMethod === 'telegram' && !telegramId) || (authMode !== 'register' && authMethod === 'email' && !email)}
                    className={`w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${authMethod === 'telegram' ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'}`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('method')} className="text-sm text-zinc-400 hover:text-zinc-200 mb-6 flex items-center gap-1 transition-colors">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back
                </button>

                <h2 className="text-xl font-semibold mb-2">Check your {authMethod}</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  We sent a 6-digit code to <span className={authMethod === 'telegram' ? 'text-blue-400' : 'text-emerald-400'}>
                    {authMethod === 'email' 
                      ? email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*')
                      : telegramId.replace(/(?<=.{3}).(?=.{4})/g, '*')
                    }
                  </span>. It expires in 15 minutes.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Verification Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600 tracking-[0.5em] font-mono text-center text-lg"
                      />
                    </div>
                  </div>

                  {authMode === 'forgot' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || otp.length < 6 || (authMode === 'forgot' && newPassword.length < 6)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                      <>{authMode === 'forgot' ? 'Reset Password' : authMode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Dashboard({ onLogout, contact, accountId }: { onLogout: () => void, contact: string, accountId: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState('');
  
  // Modal state for showing newly created project credentials
  const [showCredentials, setShowCredentials] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    setIsCreating(true);
    setError('');
    
    try {
      const response = await fetch(`${WORKER_URL}/api/projects/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, projectName: newProjectName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProjects([...projects, { 
          id: data.project.projectId, 
          name: data.project.projectName, 
          createdAt: data.project.createdAt,
          files: 0,
          size: '0 MB',
          status: 'Active'
        }]);
        
        // Show the credentials modal
        setShowCredentials(data.project);
        setNewProjectName('');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Network error. Could not create project.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans relative">
      {/* Credentials Modal */}
      <AnimatePresence>
        {showCredentials && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Project Created!</h2>
              <p className="text-zinc-400 mb-8">
                Your new database <strong className="text-zinc-200">{showCredentials.projectName}</strong> is ready. 
                Please copy these credentials now. <span className="text-red-400">The Secret Key will not be shown again.</span>
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Project ID</label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 pl-4">
                    <code className="flex-1 text-emerald-400 font-mono text-sm">{showCredentials.projectId}</code>
                    <button 
                      onClick={() => copyToClipboard(showCredentials.projectId, 'id')}
                      className="p-2.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedId ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Secret Key</label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 pl-4">
                    <code className="flex-1 text-emerald-400 font-mono text-sm truncate">{showCredentials.secretKey}</code>
                    <button 
                      onClick={() => copyToClipboard(showCredentials.secretKey, 'key')}
                      className="p-2.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedKey ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowCredentials(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 px-4 rounded-xl transition-all"
              >
                I have saved my credentials
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight">JoraBase</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-zinc-200">{contact}</div>
              <div className="text-xs text-zinc-500 font-mono">ID: {accountId}</div>
            </div>
            <button onClick={onLogout} className="text-zinc-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-zinc-800/50">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-zinc-400">Infinite auto-sharding database architecture.</p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-zinc-900/20 mb-8">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6">
              <Server className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Create your first database</h3>
            <p className="text-zinc-400 max-w-md mb-8">
              JoraBase will automatically create a dedicated GitHub repository for this project. When files reach 95MB, it auto-shards to a new file. When the repo reaches 1GB, it auto-shards to a new repo.
            </p>
            
            <form onSubmit={handleCreateProject} className="flex gap-3 w-full max-w-md">
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., E-commerce App DB"
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 outline-none transition-all"
              />
              <button disabled={isCreating || !newProjectName} type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                {isCreating ? <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" /> : <><Plus className="w-5 h-5" /> Create</>}
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {projects.map(project => (
              <div key={project.id} className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl hover:border-emerald-500/50 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                    {project.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                <p className="text-xs text-zinc-500 font-mono mb-4 truncate" title={project.id}>{project.id}</p>
                
                <div className="flex items-center justify-between text-sm text-zinc-400 border-t border-zinc-800/50 pt-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4" /> {project.files} Shards
                  </div>
                  <div>{project.size}</div>
                </div>
              </div>
            ))}
            
            <div className="bg-zinc-900/20 border border-dashed border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px]">
              <form onSubmit={handleCreateProject} className="flex flex-col items-center gap-4 w-full">
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New Project Name"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-center outline-none transition-all"
                />
                <button disabled={isCreating || !newProjectName} type="submit" className="bg-white hover:bg-zinc-200 text-zinc-950 font-semibold py-2 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 w-full justify-center">
                  {isCreating ? <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" /> : <><Plus className="w-5 h-5" /> Add Project</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
