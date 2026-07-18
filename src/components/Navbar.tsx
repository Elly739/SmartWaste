import { useState } from 'react';
import {
  LayoutDashboard, QrCode, Gift, Trophy, History, User,
  ShieldCheck, Building2, LogOut, Globe, ChevronDown,
  Zap, Flame
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Page } from '../types';

interface Props { currentPage: Page; onNavigate: (page: Page) => void; }

const sideNav = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'dispose', icon: QrCode, label: 'Dispose' },
  { key: 'rewards', icon: Gift, label: 'Rewards' },
  { key: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  { key: 'history', icon: History, label: 'History' },
  { key: 'profile', icon: User, label: 'Profile' },
] as const;

const bottomTabs = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { key: 'dispose', icon: QrCode, label: 'Scan' },
  { key: 'rewards', icon: Gift, label: 'Rewards' },
  { key: 'leaderboard', icon: Trophy, label: 'Rank' },
  { key: 'profile', icon: User, label: 'Me' },
] as const;

export default function Navbar({ currentPage, onNavigate }: Props) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  function nav(p: Page) { onNavigate(p); }

  return (
    <>
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[260px] bg-gray-950 border-r border-white/5 z-40">
        {/* Logo */}
        <div className="flex items-center px-5 h-16 border-b border-white/5">
          <img src="/Logo.png" alt="SmartWaste" className="h-8 w-auto" />
        </div>

        {/* Profile snippet */}
        {profile && (
          <div className="mx-4 mt-4 mb-2 p-3.5 rounded-2xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-brand-800 flex items-center justify-center text-white font-black text-sm shadow-lg">
                {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm truncate">{profile.full_name || profile.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap size={11} className="text-primary-500" />
                  <span className="text-xs font-black text-primary-400">{(profile.total_points ?? 0).toLocaleString()} pts</span>
                </div>
              </div>
              {(profile.current_streak ?? 0) > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/10 rounded-lg px-2 py-1">
                  <Flame size={11} className="text-orange-500" />
                  <span className="text-orange-400 text-[11px] font-black">{profile.current_streak}d</span>
                </div>
              )}
            </div>
            {(profile.current_streak ?? 0) > 0 && (
              <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all" style={{ width: `${Math.min(((profile.current_streak ?? 0) / 30) * 100, 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-1.5 text-[9px] font-black text-white/20 uppercase tracking-widest">Main</p>
          {sideNav.map(({ key, icon: Icon, label }) => {
            const active = currentPage === key;
            return (
              <button key={key} onClick={() => nav(key as Page)} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                <Icon size={16} className={active ? 'text-primary-400' : ''} />
                <span>{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
              </button>
            );
          })}

          {(profile?.role === 'admin' || profile?.role === 'partner' || profile?.role === 'institution') && (
            <p className="px-3 py-1.5 mt-2 text-[9px] font-black text-white/20 uppercase tracking-widest">Management</p>
          )}
          {profile?.role === 'admin' && (
            <button onClick={() => nav('admin')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentPage === 'admin' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
              <ShieldCheck size={16} /><span>Admin</span>
            </button>
          )}
          {profile?.role === 'partner' && (
            <button onClick={() => nav('partner')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentPage === 'partner' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
              <Building2 size={16} /><span>Partner</span>
            </button>
          )}
          {profile?.role === 'institution' && (
            <button onClick={() => nav('institution')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentPage === 'institution' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
              <Building2 size={16} /><span>Institution</span>
            </button>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <Globe size={16} /><span>{language === 'en' ? 'English' : 'Kiswahili'}</span>
              <ChevronDown size={13} className={`ml-auto transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 w-full bg-gray-900 border border-white/10 rounded-xl shadow-xl mb-1 overflow-hidden z-50">
                <button onClick={() => { setLanguage('en'); setLangOpen(false); }} className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${language === 'en' ? 'text-primary-400 bg-primary-500/10' : 'text-white/50 hover:bg-white/5'}`}>English</button>
                <button onClick={() => { setLanguage('sw'); setLangOpen(false); }} className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${language === 'sw' ? 'text-primary-400 bg-primary-500/10' : 'text-white/50 hover:bg-white/5'}`}>Kiswahili</button>
              </div>
            )}
          </div>
          <button onClick={async () => { await signOut(); onNavigate('landing'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut size={16} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ===== Mobile: Top header ===== */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-gray-950/95 backdrop-blur-xl border-b border-white/5 z-40">
        <div className="flex items-center justify-between px-4 h-12">
          <img src="/Logo.png" alt="SmartWaste" className="h-6 w-auto" />
          {profile && (
            <div className="flex items-center gap-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full px-2.5 py-1">
              <Zap size={11} className="text-primary-500" />
              <span className="text-[11px] font-black text-primary-400">{(profile.total_points ?? 0).toLocaleString()}</span>
              {(profile.current_streak ?? 0) > 0 && (
                <><span className="text-white/20">·</span><Flame size={11} className="text-orange-500" /><span className="text-[11px] font-black text-orange-400">{profile.current_streak}d</span></>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== Mobile: Bottom Tab Bar ===== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-950/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-stretch h-14">
          {bottomTabs.map(({ key, icon: Icon, label }) => {
            const active = currentPage === key;
            return (
              <button key={key} onClick={() => nav(key as Page)} className="flex flex-col items-center justify-center gap-0.5 flex-1 relative">
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />}
                <Icon size={19} className={active ? 'text-primary-400' : 'text-white/25'} />
                <span className={`text-[9px] font-bold ${active ? 'text-primary-400' : 'text-white/20'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
