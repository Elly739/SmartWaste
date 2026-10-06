import { useState } from 'react';
import {
  User, Mail, Phone, Globe, Flame, Zap,
  Leaf, Recycle, Calendar, Edit3, Check, X, RefreshCw,
  ShieldCheck, Building2, ChevronRight, LogOut, History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Page } from '../types';

interface Props { onNavigate?: (page: Page) => void; }

export default function ProfilePage({ onNavigate }: Props) {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username, phone, language, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) {
      setError('Could not save your profile. Please try again.');
    } else {
      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  const memberSince = profile ? new Date(profile.created_at).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : '';

  const co2Saved = ((profile?.lifetime_points ?? 0) * 0.085).toFixed(1);
  const estimatedDisposals = profile?.lifetime_points ? Math.round(profile.lifetime_points / 15) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">My Profile</h1>
        <p className="text-white/40 mt-1 text-sm">Manage your account and preferences.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm font-medium">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-brand-800 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-primary-500/20">
              {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {profile?.full_name || profile?.username || 'User'}
              </h2>
              <p className="text-sm text-white/40">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  profile?.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                  profile?.role === 'partner' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-primary-500/10 text-primary-400'
                }`}>
                  {profile?.role?.charAt(0).toUpperCase() + (profile?.role?.slice(1) ?? '')}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-white/20">
                  <Calendar size={11} />
                  {memberSince}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setEditing(!editing); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-sm font-semibold transition-all border border-white/5"
          >
            <Edit3 size={14} />
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            {[
              { label: 'Full Name', type: 'text', value: fullName, onChange: setFullName },
              { label: 'Username', type: 'text', value: username, onChange: setUsername },
              { label: 'Phone', type: 'tel', value: phone, onChange: setPhone, placeholder: '+254 7XX XXX XXX' },
            ].map(({ label, type, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/15 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-wider mb-1.5">Language</label>
              <div className="flex gap-3">
                {(['en', 'sw'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      language === lang
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-white/10 text-white/30 hover:border-white/20'
                    }`}
                  >
                    {lang === 'en' ? '🇬🇧 English' : '🇰🇪 Kiswahili'}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <X size={16} /> Cancel
              </button>
              <button onClick={saveProfile} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {[
              { icon: User, label: 'Full Name', value: profile?.full_name ?? '—' },
              { icon: Mail, label: 'Email', value: user?.email ?? '—' },
              { icon: Phone, label: 'Phone', value: profile?.phone ?? 'Not set' },
              { icon: Globe, label: 'Language', value: language === 'en' ? 'English' : 'Kiswahili' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Impact Stats */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-6">
        <h2 className="font-bold text-white text-base mb-5">Environmental Impact</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Zap, label: 'Lifetime Points', value: (profile?.lifetime_points ?? 0).toLocaleString(), color: 'bg-primary-500/10 text-primary-400' },
            { icon: Recycle, label: 'Total Disposals', value: estimatedDisposals, color: 'bg-blue-500/10 text-blue-400' },
            { icon: Leaf, label: 'CO₂ Saved (kg)', value: co2Saved, color: 'bg-emerald-500/10 text-emerald-400' },
            { icon: Flame, label: 'Best Streak', value: `${profile?.longest_streak ?? 0} days`, color: 'bg-orange-500/10 text-orange-400' },
          ].map(({ icon: Icon, label, value, color }) => {
            const [bgClass, textClass] = color.split(' ');
            return (
              <div key={label} className={`p-4 rounded-2xl ${bgClass}`}>
                <Icon size={18} className={textClass} />
                <p className={`text-xl font-extrabold ${textClass} mt-2`}>{value}</p>
                <p className="text-[10px] text-white/20 font-bold mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak Banner */}
      {(profile?.current_streak ?? 0) > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <Flame size={28} className="text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400/70 text-sm font-bold">Current Streak</p>
              <p className="text-3xl font-extrabold text-amber-400">{profile?.current_streak} days</p>
              <p className="text-amber-400/40 text-xs mt-0.5">Keep it up! Dispose today to maintain your streak.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Quick Links */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5 lg:hidden">
        <h2 className="font-bold text-white text-sm mb-3">Quick Links</h2>
        <div className="space-y-1">
          {onNavigate && (
            <button onClick={() => onNavigate('history')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <History size={17} className="text-white/30" /><span className="text-sm font-medium text-white/60 flex-1">History</span><ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          {profile?.role === 'admin' && onNavigate && (
            <button onClick={() => onNavigate('admin')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <ShieldCheck size={17} className="text-red-400" /><span className="text-sm font-medium text-white/60 flex-1">Admin Dashboard</span><ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          {profile?.role === 'partner' && onNavigate && (
            <button onClick={() => onNavigate('partner')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <Building2 size={17} className="text-blue-400" /><span className="text-sm font-medium text-white/60 flex-1">Partner Dashboard</span><ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          <button onClick={async () => { await signOut(); onNavigate?.('landing'); }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/5 transition-colors text-left">
            <LogOut size={17} className="text-red-400" /><span className="text-sm font-medium text-red-400 flex-1">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
