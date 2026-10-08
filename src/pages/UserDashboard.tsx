import { useEffect, useState } from 'react';
import {
  Zap, Leaf, Recycle, Flame, Trophy,
  Award, QrCode, ChevronRight, Gift, BarChart3, Star, TrendingUp,
  Sprout, Shield, Medal, Crown, Diamond, Rocket, Target, Atom, Brain, Globe2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getWasteIcon } from '../lib/wasteIcons';
import type { Disposal, UserAchievement, Challenge, Reward, Page } from '../types';

const COLORS: Record<string, string> = {
  'Plastic Bottles': '#3b82f6', 'Paper & Cardboard': '#f59e0b', 'Metal & Aluminum': '#94a3b8',
  'Glass': '#10b981', 'Organic Waste': '#22c55e', 'Electronic Waste': '#a855f7',
  'LED Bulbs': '#f97316', 'Batteries': '#ef4444',
};

const STREAK_TIERS = [
  { days: 3, label: '3-Day', color: '#f97316' },
  { days: 7, label: '7-Day', color: '#ef4444' },
  { days: 30, label: '30-Day', color: '#dc2626' },
];

import type { LucideIcon } from 'lucide-react';

// XP Level system: each level requires progressively more points
const LEVELS: { level: number; xp: number; title: string; icon: LucideIcon; color: string }[] = [
  { level: 1, xp: 0, title: 'Newcomer', icon: Sprout, color: '#22c55e' },
  { level: 2, xp: 100, title: 'Recycler', icon: Recycle, color: '#10b981' },
  { level: 3, xp: 300, title: 'Eco Warrior', icon: Leaf, color: '#84cc16' },
  { level: 4, xp: 600, title: 'Green Champion', icon: Shield, color: '#22c55e' },
  { level: 5, xp: 1000, title: 'Planet Saver', icon: Globe2, color: '#3b82f6' },
  { level: 6, xp: 2000, title: 'Eco Legend', icon: Medal, color: '#f59e0b' },
  { level: 7, xp: 4000, title: 'Waste Master', icon: Crown, color: '#f97316' },
  { level: 8, xp: 8000, title: 'Earth Guardian', icon: Rocket, color: '#a855f7' },
  { level: 9, xp: 15000, title: 'Sustainability Sage', icon: Brain, color: '#ec4899' },
  { level: 10, xp: 30000, title: 'Nature Deity', icon: Atom, color: '#fbbf24' },
];

function getLevel(points: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || LEVELS[LEVELS.length - 1];
      break;
    }
  }
  const progress = next ? Math.min(((points - current.xp) / (next.xp - current.xp)) * 100, 100) : 100;
  return { current, next, progress };
}

interface Props { onNavigate: (page: Page) => void; }

export default function UserDashboard({ onNavigate }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [recentDisposals, setRecentDisposals] = useState<Disposal[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [topRewards, setTopRewards] = useState<Reward[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; points: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [communityStats, setCommunityStats] = useState({ users: 0, disposals: 0, co2: 0 });
  const [loading, setLoading] = useState(true);

  const lifetimePoints = profile?.lifetime_points ?? 0;
  const co2Saved = (lifetimePoints * 0.085).toFixed(1);
  const totalDisposals = lifetimePoints ? Math.round(lifetimePoints / 15) : 0;
  const levelInfo = getLevel(lifetimePoints);

  useEffect(() => { if (profile?.id) load(); }, [profile?.id]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const [dR, aR, cR, rR, pR] = await Promise.all([
      supabase.from('disposals').select('*, bins(location_name), waste_categories(name, color)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', profile.id),
      supabase.from('challenges').select('*, waste_categories(name)').eq('is_active', true).limit(3),
      supabase.from('rewards').select('*').eq('is_active', true).order('redemption_count', { ascending: false }).limit(4),
      supabase.from('profiles').select('id, lifetime_points', { count: 'exact' }),
    ]);
    if (dR.data) { setRecentDisposals(dR.data as Disposal[]); buildCharts(dR.data as Disposal[]); }
    if (aR.data) setUserAchievements(aR.data as UserAchievement[]);
    if (cR.data) setChallenges(cR.data as Challenge[]);
    if (rR.data) setTopRewards(rR.data as Reward[]);
    if (pR.data) {
      const allPts = pR.data.reduce((s: number, p: any) => s + (p.lifetime_points ?? 0), 0);
      setCommunityStats({ users: pR.count ?? 0, disposals: Math.round(allPts / 15), co2: Number((allPts * 0.085).toFixed(0)) });
    }
    setLoading(false);
  }

  function buildCharts(data: Disposal[]) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    setWeeklyData(days.map((day, i) => {
      const dd = data.filter(d => { const dt = new Date(d.created_at); const diff = (now.getDay() - 1 - i + 7) % 7; const t = new Date(now); t.setDate(now.getDate() - diff); return dt.toDateString() === t.toDateString(); });
      return { day, points: dd.reduce((s, d) => s + d.points_earned, 0) };
    }));
    const catMap: Record<string, number> = {};
    data.forEach(d => { const n = (d as any).waste_categories?.name ?? 'Other'; catMap[n] = (catMap[n] ?? 0) + 1; });
    setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value, color: COLORS[name] ?? '#22c55e' })));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  const statsCards = [
    { label: 'Points', value: (profile?.total_points ?? 0).toLocaleString(), icon: Zap, gradient: 'from-primary-500 to-primary-600' },
    { label: 'Streak', value: `${profile?.current_streak ?? 0}d`, icon: Flame, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Disposals', value: totalDisposals || '--', icon: Recycle, gradient: 'from-blue-500 to-blue-600' },
    { label: 'CO₂ Saved', value: `${co2Saved}kg`, icon: Leaf, gradient: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{profile?.full_name || profile?.username || 'User'}</h1>
        </div>
        <button onClick={() => onNavigate('dispose')} className="flex items-center gap-2 self-start px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all active:scale-95">
          <QrCode size={17} /> Quick Disposal
        </button>
      </div>

      {/* Level/XP Card */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-500/10 via-primary-600/5 to-brand-800/10 border border-primary-500/20 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
            {(() => { const LevelIcon = levelInfo.current.icon; return <LevelIcon size={28} className="text-white" />; })()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-black text-xs uppercase tracking-wider">Level {levelInfo.current.level}</span>
              <span className="text-white/40">·</span>
              <span className="text-white font-bold text-sm">{levelInfo.current.title}</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              <Zap size={12} className="text-primary-400" />
              <span className="text-sm font-bold text-primary-400">{lifetimePoints.toLocaleString()} XP</span>
              {levelInfo.next && levelInfo.next.level <= 10 && (
                <span className="text-white/30 text-xs ml-2">
                  <TrendingUp size={10} className="inline mr-1" />
                  {(levelInfo.next.xp - lifetimePoints).toLocaleString()} XP to Level {levelInfo.next.level}
                </span>
              )}
            </div>
            <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${levelInfo.progress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-all group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white mb-0.5">{value}</p>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Streak Progress */}
      {(profile?.current_streak ?? 0) > 0 && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
            <Flame size={18} className="text-amber-400" /> Streak Progress
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {STREAK_TIERS.map(tier => {
              const streak = profile?.current_streak ?? 0;
              const pct = Math.min(streak / tier.days, 1);
              const done = streak >= tier.days;
              return (
                <div key={tier.days} className={`p-4 rounded-xl text-center transition-all ${done ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-white/3'}`}>
                  <Flame size={22} className="mx-auto mb-2" style={{ color: done ? tier.color : '#4b5563' }} />
                  <p className={`text-sm font-bold ${done ? 'text-white' : 'text-white/40'}`}>{tier.label}</p>
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct * 100}%`, background: tier.color }} />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">{streak}/{tier.days}</p>
                  {done && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Star size={10} className="text-primary-400" />
                      <span className="text-[10px] font-bold text-primary-400">Achieved!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="font-bold text-white mb-5 text-sm">Weekly Activity</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#ffffff40' }} />
              <YAxis tick={{ fontSize: 11, fill: '#ffffff40' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', background: '#0f1d3d', border: '1px solid #ffffff10', color: '#fff' }} />
              <Area type="monotone" dataKey="points" stroke="#22c55e" strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="font-bold text-white mb-4 text-sm">Waste Breakdown</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', background: '#0f1d3d', border: '1px solid #ffffff10', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-white/50 truncate max-w-[100px]">{c.name}</span>
                    </div>
                    <span className="font-bold text-white">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32">
              <Recycle size={28} className="text-white/10 mb-2" />
              <p className="text-xs text-white/30">No disposals yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Rewards Preview */}
      {topRewards.length > 0 && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Rewards You Can Earn</h2>
            <button onClick={() => onNavigate('rewards')} className="text-xs text-primary-400 font-semibold hover:text-primary-300 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topRewards.map(r => {
              const can = (profile?.total_points ?? 0) >= r.points_cost;
              return (
                <div key={r.id} className={`p-4 rounded-xl border-2 transition-all ${can ? 'border-primary-500/30 bg-primary-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift size={14} className={can ? 'text-primary-400' : 'text-white/20'} />
                    <span className={`text-[10px] font-bold ${can ? 'text-primary-400' : 'text-white/30'}`}>{can ? 'Available' : 'Keep earning'}</span>
                  </div>
                  <p className="font-bold text-white text-sm truncate">{r.title}</p>
                  <p className="text-xs font-extrabold text-primary-400 mt-1">{r.points_cost.toLocaleString()} pts</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community Impact */}
      <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 border border-white/5 p-6 text-white shadow-2xl">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 size={18} className="text-primary-400" />
          <h2 className="font-bold text-sm">Community Impact</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Users', value: communityStats.users.toLocaleString() },
            { label: 'Waste Diverted', value: `${communityStats.disposals.toLocaleString()} items` },
            { label: 'CO₂ Saved', value: `${communityStats.co2.toLocaleString()} kg` },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold">{item.value}</p>
              <p className="text-white/30 text-[11px] font-semibold mt-1">{item.label}</p>
            </div>
          ))}
        </div>
        {categoryData.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <p className="text-white/20 text-[10px] font-semibold mb-2">Top categories</p>
            <div className="flex h-2.5 rounded-full overflow-hidden">
              {categoryData.map(c => (
                <div key={c.name} style={{ width: `${(c.value / categoryData.reduce((s, x) => s + x.value, 0)) * 100}%`, background: c.color }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievements + Challenges */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Achievements</h2>
            <span className="text-[10px] text-white/30 font-bold">{userAchievements.length} earned</span>
          </div>
          {userAchievements.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {userAchievements.slice(0, 6).map(ua => (
                <div key={ua.id} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors" title={ua.achievements?.description ?? undefined}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${ua.achievements?.color ?? '#22c55e'}20` }}>
                    <Award size={18} style={{ color: ua.achievements?.color ?? '#22c55e' }} />
                  </div>
                  <p className="text-[10px] font-semibold text-white/60 text-center leading-tight">
                    {language === 'sw' ? ua.achievements?.name_sw || ua.achievements?.name : ua.achievements?.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Trophy size={28} className="text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/30">Start disposing to earn badges!</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Active Challenges</h2>
            <span className="px-2 py-0.5 rounded-lg bg-primary-500/10 text-primary-400 text-[10px] font-bold">{challenges.length} live</span>
          </div>
          <div className="space-y-3">
            {challenges.map(ch => (
              <div key={ch.id} className="p-3 rounded-xl bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-white text-sm">{language === 'sw' ? ch.title_sw || ch.title : ch.title}</p>
                  <span className="px-2 py-0.5 rounded-lg bg-primary-500/10 text-primary-400 text-[10px] font-bold whitespace-nowrap">+{ch.reward_points}</span>
                </div>
                <p className="text-[11px] text-white/40 mb-2">{language === 'sw' ? ch.description_sw || ch.description : ch.description}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full">
                    <div className="h-1 bg-primary-500 rounded-full" style={{ width: '15%' }} />
                  </div>
                  <span className="text-[10px] text-white/30 font-semibold">0/{ch.target_count}</span>
                </div>
              </div>
            ))}
            {challenges.length === 0 && <p className="text-xs text-white/30 text-center py-4">No active challenges</p>}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-sm">Recent Activity</h2>
          <button onClick={() => onNavigate('history')} className="text-xs text-primary-400 font-semibold hover:text-primary-300 flex items-center gap-1">
            View all <ChevronRight size={12} />
          </button>
        </div>
        {recentDisposals.length > 0 ? (
          <div className="space-y-2">
            {recentDisposals.slice(0, 5).map(d => {
              const catName = (d as any).waste_categories?.name;
              const wConfig = getWasteIcon(catName);
              const WIcon = wConfig.icon;
              return (
              <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${wConfig.color}20`, border: `1px solid ${wConfig.color}25` }}>
                  <WIcon size={15} style={{ color: wConfig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-xs truncate">{catName ?? 'Waste'}</p>
                  <p className="text-[10px] text-white/30 truncate">{(d as any).bins?.location_name ?? 'Unknown'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-primary-400">+{d.points_earned}</p>
                  <p className="text-[10px] text-white/30">{new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                {d.is_flagged && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">Flag</span>}
              </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <QrCode size={36} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/50 font-semibold text-sm">No disposals yet</p>
            <p className="text-white/30 text-xs mt-1 mb-4">Scan a QR code at any SmartWaste bin to get started.</p>
            <button onClick={() => onNavigate('dispose')} className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-bold text-sm transition-all">
              Dispose Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
