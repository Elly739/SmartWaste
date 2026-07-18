import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, AlertCircle, Zap, Sparkles, Building2, Recycle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Page, Institution } from '../types';

interface Props { mode: 'login' | 'register'; onNavigate: (page: Page) => void; }

type RegisterRole = 'user' | 'institution' | 'partner';

export default function AuthPage({ mode, onNavigate }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [registerRole, setRegisterRole] = useState<RegisterRole>('user');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerDescription, setPartnerDescription] = useState('');
  const [partnerContactEmail, setPartnerContactEmail] = useState('');
  const [partnerContactPhone, setPartnerContactPhone] = useState('');

  useEffect(() => {
    supabase.from('institutions').select('*').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setInstitutions(data as Institution[]);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    if (mode === 'register') {
      if (registerRole === 'institution' && !selectedInstitution) {
        setError('Please select your institution from the list. If it is not listed, ask your institution to register with SmartWaste first.');
        setLoading(false);
        return;
      }
      if (registerRole === 'partner' && !partnerName) {
        setError('Please enter your organization name.');
        setLoading(false);
        return;
      }

      const roleRequest = registerRole !== 'user' ? {
        requested_role: registerRole as 'institution' | 'partner',
        institution_id: registerRole === 'institution' ? selectedInstitution : undefined,
        partner_name: registerRole === 'partner' ? partnerName : undefined,
        partner_description: registerRole === 'partner' ? partnerDescription : undefined,
        partner_contact_email: registerRole === 'partner' ? partnerContactEmail : undefined,
        partner_contact_phone: registerRole === 'partner' ? partnerContactPhone : undefined,
      } : undefined;

      const { error } = await signUp(email, password, fullName, roleRequest);
      if (error) {
        setError(error.message);
      } else if (registerRole !== 'user') {
        setSuccess('Account created! Your role request has been submitted. The SmartWaste admin will review and approve it shortly. You can sign in now, but management features will unlock after approval.');
        setTimeout(() => onNavigate('login'), 4000);
      } else {
        onNavigate('dashboard');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError('Wrong email or password. Try again.'); else onNavigate('dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-950">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 border-r border-white/5">
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-primary-500/8 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-32 right-0 w-72 h-72 rounded-full bg-brand-800/15 blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-primary-500/5 blur-[80px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative p-10 xl:p-14">
          <div className="mb-12">
            <img src="/Logo.png" alt="SmartWaste" className="h-14 w-auto mb-3" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Rewarding waste since 2024</span>
            </div>
          </div>
          <h2 className="text-4xl xl:text-[2.75rem] font-black text-white mb-4 leading-[1.1] tracking-tight">
            Your trash.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-brand-500">Your money.</span>
          </h2>
          <p className="text-white/40 text-[15px] leading-relaxed max-w-sm mb-10">
            Scan any SmartWaste bin, drop your waste, earn real points instantly. Airtime, vouchers, merch — zero effort.
          </p>
          <div className="space-y-3.5">
            {[
              { icon: '♻️', text: '8 waste categories, 8 ways to earn' },
              { icon: '⚡', text: 'Points in your wallet before you walk away' },
              { icon: '🏆', text: 'Compete on campus & community boards' },
              { icon: '🎁', text: 'Airtime, vouchers, merch — real value' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/50">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative p-10 xl:p-14 pt-0">
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Live Activity</span>
              <span className="ml-auto text-white/20 text-[10px] font-semibold">Now</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Akinyi J.', action: 'Plastic bottles', pts: '+15', time: '2s' },
                { name: 'Kamau D.', action: 'LED Bulbs', pts: '+25', time: '12s' },
                { name: 'Wanjiku G.', action: 'E-Waste', pts: '+50', time: '24s' },
              ].map(({ name, action, pts, time }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500/15 flex items-center justify-center text-[11px] font-bold text-primary-400">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-white text-[13px] font-semibold">{name}</p>
                      <p className="text-white/25 text-[11px]">{action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-primary-400 text-[13px] font-black">{pts} pts</span>
                    <p className="text-white/15 text-[10px]">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-5 sm:p-8 lg:p-12 bg-gray-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-brand-800/5 blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.015] lg:hidden" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="w-full max-w-[440px] relative">
          {/* Mobile logo + Back */}
          <div className="flex items-center justify-between mb-8 lg:mb-6">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm font-medium">
              <ArrowLeft size={16} /> Back
            </button>
            <img src="/Logo.png" alt="SmartWaste" className="h-8 w-auto lg:hidden" />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary-400" />
              <span className="text-primary-400 text-xs font-bold uppercase tracking-wider">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-white/40 text-sm">
              {mode === 'login' ? 'Pick up where you left off. Streak is waiting.' : 'Free forever. Real rewards from day one.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex items-start gap-3">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium flex items-start gap-3">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-2">I am a...</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'user' as RegisterRole, label: 'Individual', icon: User, desc: 'Earn rewards' },
                    { key: 'institution' as RegisterRole, label: 'Institution', icon: Building2, desc: 'Campus admin' },
                    { key: 'partner' as RegisterRole, label: 'Partner', icon: Recycle, desc: 'Collector' },
                  ].map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRegisterRole(key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        registerRole === key
                          ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                          : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[9px] text-white/30">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Name */}
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="text"
                    placeholder="e.g. Amina Ochieng"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Institution Selector */}
            {mode === 'register' && registerRole === 'institution' && (
              <div>
                <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Your Institution</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                  <select
                    value={selectedInstitution}
                    onChange={e => setSelectedInstitution(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all appearance-none"
                    required
                  >
                    <option value="" className="bg-gray-900">Select your institution...</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-gray-900">{inst.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-white/30 mt-1.5 flex items-center gap-1">
                  <Clock size={10} /> Admin approval required. You will get access after the SmartWaste admin approves.
                </p>
                {institutions.length === 0 && (
                  <p className="text-[11px] text-amber-400/60 mt-1.5">No institutions registered yet. Contact SmartWaste to register your institution first.</p>
                )}
              </div>
            )}

            {/* Partner Fields */}
            {mode === 'register' && registerRole === 'partner' && (
              <>
                <div>
                  <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Organization Name</label>
                  <div className="relative">
                    <Recycle size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      type="text"
                      placeholder="e.g. GreenCycle Kenya"
                      value={partnerName}
                      onChange={e => setPartnerName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Description</label>
                  <input
                    type="text"
                    placeholder="What waste types do you collect?"
                    value={partnerDescription}
                    onChange={e => setPartnerDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      placeholder="info@org.com"
                      value={partnerContactEmail}
                      onChange={e => setPartnerContactEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+254..."
                      value={partnerContactPhone}
                      onChange={e => setPartnerContactPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-white/30 flex items-center gap-1">
                  <Clock size={10} /> Admin approval required. You will get access after the SmartWaste admin approves.
                </p>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-black text-white/40 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Hang on...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-white/20 font-bold">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google */}
          <button
            onClick={async () => {
              const { error } = await signInWithGoogle();
              if (error) setError('Google sign-in failed. Try email & password.');
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/70 font-bold transition-all text-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Switch mode */}
          <div className="mt-7 text-center">
            <button
              onClick={() => onNavigate(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-primary-400 font-bold hover:text-primary-300 transition-colors"
            >
              {mode === 'login' ? "New here? Create account →" : "Already have an account? Sign in →"}
            </button>
          </div>

          {/* Admin hint */}
          {mode === 'login' && (
            <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[11px] text-white/25 font-semibold text-center flex items-center justify-center gap-1.5">
                <Zap size={11} className="text-primary-500" />
                Admin demo: admin@smartwaste.ke · Admin@2024
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
