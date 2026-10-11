import { useEffect, useState } from 'react';
import {
  Building2, Users, Recycle, Leaf, TrendingUp, QrCode,
  RefreshCw, Trophy, MapPin, Calendar,
  DollarSign, ChevronRight, BarChart3, Target,
  Sparkles, Trash2, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getWasteIcon } from '../lib/wasteIcons';
import type { Institution, Bin, SponsoredCampaign, Subscription } from '../types';

const WASTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#f97316', '#10b981', '#94a3b8'];

const darkTooltip = {
  borderRadius: '12px', fontSize: '12px', backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
};

const PLAN_LABELS: Record<string, string> = { pilot: 'Pilot', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const STATUS_LABELS: Record<string, string> = { trial: 'Trial', active: 'Active', past_due: 'Past Due', cancelled: 'Cancelled' };

type Tab = 'overview' | 'analytics' | 'sustainability' | 'engagement' | 'bins' | 'sponsorships' | 'subscription';

export default function InstitutionDashboard() {
  const { profile } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<SponsoredCampaign[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stats, setStats] = useState({ totalDisposals: 0, totalParticipants: 0, co2Saved: 0, wasteDiverted: 0, activeBins: 0, thisWeek: 0 });
  const [dailyData, setDailyData] = useState<{ date: string; disposals: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [locationData, setLocationData] = useState<{ name: string; disposals: number }[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile?.institution_id) load(); else { setLoading(false); } }, [profile?.institution_id]);

  async function load() {
    if (!profile?.institution_id) { setLoading(false); return; }
    setLoading(true);
    const [instRes, binsRes, subRes, campRes] = await Promise.all([
      supabase.from('institutions').select('*').eq('id', profile.institution_id).maybeSingle(),
      supabase.from('bins').select('*, waste_categories(name, color), collection_partners(name)').eq('institution_id', profile.institution_id),
      supabase.from('subscriptions').select('*').eq('institution_id', profile.institution_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sponsored_campaigns').select('*').eq('institution_id', profile.institution_id).order('created_at', { ascending: false }),
    ]);
    if (instRes.data) setInstitution(instRes.data as Institution);
    const binsData = (binsRes.data ?? []) as Bin[];
    setBins(binsData);
    if (subRes.data) setSubscription(subRes.data as Subscription);
    setCampaigns(campRes.data as SponsoredCampaign[] ?? []);
    if (binsData.length > 0) {
      const binIds = binsData.map(b => b.id);
      const [dispRes, usersRes] = await Promise.all([
        supabase.from('disposals').select('id, points_earned, created_at, waste_category_id, user_id, bins(location_name), waste_categories(name, color), profiles(full_name, username)').in('bin_id', binIds).order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('id, full_name, username, total_points, lifetime_points, current_streak').eq('institution_id', profile.institution_id).order('lifetime_points', { ascending: false }).limit(20),
      ]);
      const dispData = dispRes.data ?? [];
      setDisposals(dispData);
      setParticipants(usersRes.data ?? []);
      setTopUsers((usersRes.data ?? []).slice(0, 10));
      const co2 = dispData.reduce((s, d) => s + (d.points_earned * 0.085), 0);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      setStats({ totalDisposals: dispData.length, totalParticipants: (usersRes.data ?? []).length, co2Saved: Number(co2.toFixed(1)), wasteDiverted: dispData.length, activeBins: binsData.filter(b => b.is_active).length, thisWeek: dispData.filter((d: any) => new Date(d.created_at) > weekAgo).length });
      const daily: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); daily[d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })] = 0; }
      dispData.forEach((d: any) => { const key = new Date(d.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }); if (daily[key] !== undefined) daily[key]++; });
      setDailyData(Object.entries(daily).map(([date, disposals]) => ({ date, disposals })));
      const catMap: Record<string, { value: number; color: string }> = {};
      dispData.forEach((d: any) => { const name = d.waste_categories?.name ?? 'Other'; const color = d.waste_categories?.color ?? '#22c55e'; if (!catMap[name]) catMap[name] = { value: 0, color }; catMap[name].value++; });
      setCategoryData(Object.entries(catMap).map(([name, v]) => ({ name, value: v.value, color: v.color })));
      const locMap: Record<string, number> = {};
      dispData.forEach((d: any) => { const name = d.bins?.location_name ?? 'Unknown'; locMap[name] = (locMap[name] ?? 0) + 1; });
      setLocationData(Object.entries(locMap).map(([name, disposals]) => ({ name, disposals })).sort((a, b) => b.disposals - a.disposals).slice(0, 8));
    }
    setLoading(false);
  }

  if (!profile?.institution_id && !loading) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-20">
        <Building2 size={48} className="text-white/15 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white/80 mb-2">No Institution Linked</h2>
        <p className="text-white/40 text-sm">Contact the SmartWaste admin to link your account to an institution.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'analytics', label: 'Waste Analytics', icon: TrendingUp },
    { key: 'sustainability', label: 'Sustainability Report', icon: Leaf },
    { key: 'engagement', label: 'Engagement', icon: Trophy },
    { key: 'bins', label: 'Bins & Collections', icon: QrCode },
    { key: 'sponsorships', label: 'Sponsorships', icon: Sparkles },
    { key: 'subscription', label: 'Subscription', icon: DollarSign },
  ];

  const overviewStats = [
    { label: 'Total Disposals', value: stats.totalDisposals.toLocaleString(), icon: Recycle, color: '#22c55e' },
    { label: 'Participants', value: stats.totalParticipants, icon: Users, color: '#3b82f6' },
    { label: 'CO₂ Saved (kg)', value: stats.co2Saved.toFixed(1), icon: Leaf, color: '#10b981' },
    { label: 'Waste Diverted', value: stats.wasteDiverted, icon: Trash2, color: '#f59e0b' },
    { label: 'Active Bins', value: stats.activeBins, icon: QrCode, color: '#a855f7' },
    { label: 'This Week', value: stats.thisWeek, icon: TrendingUp, color: '#f97316' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0"><Building2 size={26} className="text-primary-400" /></div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{institution?.name ?? 'Institution Dashboard'}</h1>
          <p className="text-white/40 mt-1 text-sm capitalize">{institution?.type ?? ''} · {institution?.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {institution && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${institution.subscription_status === 'active' ? 'bg-primary-500/15 text-primary-400' : institution.subscription_status === 'trial' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                {STATUS_LABELS[institution.subscription_status] ?? institution.subscription_status} · {PLAN_LABELS[institution.subscription_plan] ?? institution.subscription_plan}
              </span>
            )}
            {institution?.contact_email && <span className="text-xs text-white/30">{institution.contact_email}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit overflow-x-auto max-w-full border border-white/5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === key ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={28} className="animate-spin text-primary-500" /></div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {overviewStats.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}30` }}><Icon size={16} style={{ color }} /></div>
                    <p className="text-2xl font-extrabold text-white">{value}</p>
                    <p className="text-xs text-white/40 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Disposal Trends (14 Days)</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs><linearGradient id="dispGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                      <Tooltip contentStyle={darkTooltip} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                      <Area type="monotone" dataKey="disposals" name="Disposals" stroke="#22c55e" strokeWidth={2} fill="url(#dispGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Waste by Category</h2>
                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={55} dataKey="value" paddingAngle={2}>{categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} />)}</Pie><Tooltip contentStyle={darkTooltip} /></PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {categoryData.slice(0, 5).map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} /><span className="text-white/50 truncate max-w-[120px]">{c.name}</span></div><span className="font-bold text-white/70">{c.value}</span></div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-sm text-white/30 text-center py-8">No disposal data yet</p>}
                </div>
              </div>
              {campaigns.filter(c => c.is_active).length > 0 && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-white text-lg">Active Sponsored Campaigns</h2>
                    <button onClick={() => setTab('sponsorships')} className="text-xs text-primary-400 font-semibold flex items-center gap-1">View all <ChevronRight size={12} /></button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {campaigns.filter(c => c.is_active).slice(0, 2).map(c => (
                      <div key={c.id} className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                        <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-primary-400" /><span className="text-xs font-bold text-primary-400">{c.sponsor_name}</span></div>
                        <p className="font-bold text-white text-sm">{c.campaign_title}</p>
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">{c.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs"><span className="font-bold text-primary-400">{c.reward_pool_points.toLocaleString()} pts pool</span><span className="text-white/30">Ends {new Date(c.end_date).toLocaleDateString()}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h2 className="font-bold text-white mb-5">Daily Disposals (14 Days)</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                    <Tooltip contentStyle={darkTooltip} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                    <Bar dataKey="disposals" name="Disposals" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Waste Category Breakdown</h2>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={2} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelStyle={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} />)}</Pie><Tooltip contentStyle={darkTooltip} /></PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-white/30 text-center py-8">No data yet</p>}
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Disposals by Location</h2>
                  {locationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={locationData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} width={100} />
                        <Tooltip contentStyle={darkTooltip} cursor={{ fill: 'rgba(59,130,236,0.05)' }} />
                        <Bar dataKey="disposals" name="Disposals" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-white/30 text-center py-8">No location data yet</p>}
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h2 className="font-bold text-white mb-5">Recent Disposals</h2>
                {disposals.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {disposals.slice(0, 20).map(d => {
                      const wConfig = getWasteIcon(d.waste_categories?.name);
                      const WIcon = wConfig.icon;
                      return (
                        <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${wConfig.color}20`, border: `1px solid ${wConfig.color}25` }}><WIcon size={15} style={{ color: wConfig.color }} /></div>
                          <div className="flex-1 min-w-0"><p className="font-semibold text-white text-sm truncate">{d.waste_categories?.name ?? 'Waste'}</p><div className="flex items-center gap-2 text-xs text-white/40"><MapPin size={11} /><span className="truncate">{d.bins?.location_name ?? 'Unknown'}</span><span>·</span><span>{d.profiles?.full_name || d.profiles?.username || 'User'}</span></div></div>
                          <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-primary-400">+{d.points_earned} pts</p><p className="text-xs text-white/30">{new Date(d.created_at).toLocaleDateString()}</p></div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-white/30 text-center py-8">No disposals recorded yet.</p>}
              </div>
            </div>
          )}

          {tab === 'sustainability' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-primary-500/5 border border-emerald-500/20 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><Leaf size={24} className="text-emerald-400" /></div>
                  <div><h2 className="font-extrabold text-white text-xl">Sustainability Impact Report</h2><p className="text-sm text-white/40">{institution?.name} · Generated {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">This report summarizes waste management performance, environmental impact, and community participation for {institution?.name}. Data is sourced from SmartWaste's real-time disposal tracking system.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Waste Tracked', value: `${stats.totalDisposals} items`, icon: Recycle, color: '#22c55e' },
                  { label: 'CO₂ Emissions Saved', value: `${stats.co2Saved.toFixed(1)} kg`, icon: Leaf, color: '#10b981' },
                  { label: 'Active Participants', value: stats.totalParticipants, icon: Users, color: '#3b82f6' },
                  { label: 'Collection Points', value: stats.activeBins, icon: QrCode, color: '#a855f7' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}20`, border: `1px solid ${color}30` }}><Icon size={20} style={{ color }} /></div>
                    <p className="text-2xl font-extrabold text-white">{value}</p><p className="text-xs text-white/40 font-medium mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {categoryData.length > 0 && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h3 className="font-bold text-white mb-4">Waste Diversion by Category</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                      <Tooltip contentStyle={darkTooltip} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                      <Bar dataKey="value" name="Items" radius={[4, 4, 0, 0]}>{categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h3 className="font-bold text-white mb-4">Environmental Impact Summary</h3>
                <div className="space-y-3">
                  {[{ icon: Leaf, color: '#10b981', label: 'CO₂ Reduction', value: `${stats.co2Saved.toFixed(1)} kg CO₂` }, { icon: Recycle, color: '#22c55e', label: 'Waste Diverted from Landfill', value: `${stats.wasteDiverted} items` }, { icon: Users, color: '#3b82f6', label: 'Community Participation', value: `${stats.totalParticipants} active members` }, { icon: Target, color: '#f59e0b', label: 'Engagement Rate (This Week)', value: `${stats.thisWeek} disposals` }].map(({ icon: Icon, color, label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={16} style={{ color }} /></div><span className="text-sm font-semibold text-white/70">{label}</span></div>
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h3 className="font-bold text-white mb-4">UN SDG Alignment</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[{ num: '11', label: 'Sustainable Cities & Communities', desc: 'Organized waste management infrastructure' }, { num: '12', label: 'Responsible Consumption & Production', desc: 'Waste tracking, sorting, and recovery' }, { num: '13', label: 'Climate Action', desc: `${stats.co2Saved.toFixed(1)} kg CO₂ reduction` }].map(sdg => (
                    <div key={sdg.num} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">{sdg.num}</div><span className="text-xs font-bold text-white/70">{sdg.label}</span></div>
                      <p className="text-xs text-white/40">{sdg.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'engagement' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h2 className="font-bold text-white mb-5">Top Contributors Leaderboard</h2>
                {topUsers.length > 0 ? (
                  <div className="space-y-2">
                    {topUsers.map((u, i) => (
                      <div key={u.id} className={`flex items-center gap-4 p-3 rounded-xl ${i < 3 ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : 'hover:bg-white/[0.02]'} transition-colors`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : i === 1 ? 'bg-slate-500/20 text-slate-300 border border-slate-400/20' : i === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-white text-sm truncate">{u.full_name || u.username || 'User'}</p><p className="text-xs text-white/40">Streak: {u.current_streak} days</p></div>
                        <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-primary-400">{(u.lifetime_points ?? 0).toLocaleString()} pts</p><p className="text-xs text-white/30">{(u.total_points ?? 0).toLocaleString()} current</p></div>
                        {i < 3 && <Trophy size={18} className={i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : 'text-orange-400'} />}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-white/30 text-center py-8">No participants yet.</p>}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Participants', value: stats.totalParticipants, icon: Users, color: '#3b82f6' },
                  { label: 'Avg Disposals per User', value: stats.totalParticipants > 0 ? Math.round(stats.totalDisposals / stats.totalParticipants) : 0, icon: Recycle, color: '#22c55e' },
                  { label: 'Weekly Engagement', value: stats.thisWeek, icon: TrendingUp, color: '#f97316' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}30` }}><Icon size={18} style={{ color }} /></div>
                    <p className="text-2xl font-extrabold text-white">{value}</p><p className="text-xs text-white/40 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'bins' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">Campus Bins & Collection Points</h2>
              {bins.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-12"><QrCode size={40} className="text-white/15 mx-auto mb-3" /><p className="text-white/40 text-sm">No bins assigned to your institution yet.</p><p className="text-white/30 text-xs mt-1">Contact SmartWaste admin to set up collection points.</p></div>
              ) : (
                <div className="space-y-3">
                  {bins.map(bin => {
                    const lastCollect = bin.last_collection_at ? new Date(bin.last_collection_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : 'Never';
                    const daysSince = bin.last_collection_at ? Math.floor((Date.now() - new Date(bin.last_collection_at).getTime()) / 86400000) : 999;
                    return (
                      <div key={bin.id} className={`rounded-2xl border p-4 flex items-center gap-4 ${daysSince > 7 ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/5 bg-white/[0.03]'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bin.is_active ? 'bg-primary-500/15' : 'bg-white/5'}`}><QrCode size={18} className={bin.is_active ? 'text-primary-400' : 'text-white/30'} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-white text-sm truncate">{bin.location_name}</p><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${bin.is_active ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{bin.is_active ? 'Active' : 'Inactive'}</span>{(bin as any).waste_categories?.name && <span className="text-xs text-white/40">{(bin as any).waste_categories.name}</span>}</div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap"><span className="text-xs font-mono text-white/40">{bin.qr_code}</span><span className={`text-xs font-medium flex items-center gap-1 ${daysSince > 7 ? 'text-orange-400' : 'text-white/30'}`}><Clock size={11} />Last: {lastCollect}</span><span className="text-xs text-primary-400 font-semibold">{bin.total_collections} items</span>{(bin as any).collection_partners?.name && <span className="text-xs text-blue-400">{(bin as any).collection_partners.name}</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'sponsorships' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">Sponsored Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-12"><Sparkles size={40} className="text-white/15 mx-auto mb-3" /><p className="text-white/40 text-sm">No sponsored campaigns yet.</p><p className="text-white/30 text-xs mt-1">Sponsors can fund environmental challenges and reward pools for your institution.</p></div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`rounded-2xl bg-white/[0.03] border p-4 ${c.is_active ? 'border-primary-500/20' : 'border-white/5 opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0"><Sparkles size={22} className="text-primary-400" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1"><span className="text-xs font-bold text-primary-400">{c.sponsor_name}</span><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${c.is_active ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{c.is_active ? 'Active' : 'Ended'}</span></div>
                          <p className="font-bold text-white text-sm">{c.campaign_title}</p><p className="text-xs text-white/40 mt-1">{c.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs"><span className="font-bold text-primary-400">{c.reward_pool_points.toLocaleString()} pts reward pool</span><span className="text-white/30">Funding: KES {c.funding_amount_kes.toLocaleString()}</span><span className="text-white/30 flex items-center gap-1"><Calendar size={11} />{new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'subscription' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-primary-500/10 to-blue-500/5 border border-primary-500/20 p-5">
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center"><DollarSign size={22} className="text-primary-400" /></div><h2 className="font-extrabold text-white text-xl">Subscription Plan</h2></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-white/40 font-semibold uppercase">Current Plan</p><p className="text-2xl font-extrabold text-primary-400 mt-1">{PLAN_LABELS[institution?.subscription_plan ?? 'pilot']}</p></div>
                  <div><p className="text-xs text-white/40 font-semibold uppercase">Status</p><div className="mt-1"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${institution?.subscription_status === 'active' ? 'bg-primary-500/15 text-primary-400' : institution?.subscription_status === 'trial' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-white/40'}`}>{STATUS_LABELS[institution?.subscription_status ?? 'trial']}</span></div></div>
                  <div><p className="text-xs text-white/40 font-semibold uppercase">Started</p><p className="text-sm font-bold text-white/70 mt-1">{institution?.subscription_started_at ? new Date(institution.subscription_started_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p></div>
                  <div><p className="text-xs text-white/40 font-semibold uppercase">Renews</p><p className="text-sm font-bold text-white/70 mt-1">{institution?.subscription_renews_at ? new Date(institution.subscription_renews_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No renewal scheduled'}</p></div>
                </div>
              </div>
              {subscription && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h3 className="font-bold text-white mb-4">Billing History</h3>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center"><DollarSign size={18} className="text-primary-400" /></div><div><p className="text-sm font-bold text-white">{PLAN_LABELS[subscription.plan]} · {subscription.billing_cycle}</p><p className="text-xs text-white/40">Started {new Date(subscription.started_at).toLocaleDateString()}</p></div></div>
                    <span className="text-sm font-bold text-primary-400">KES {subscription.amount_kes.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h3 className="font-bold text-white mb-4">Available Plans</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'pilot', label: 'Pilot', price: 'Free', features: ['Up to 5 bins', 'Basic analytics', 'Community leaderboard', '3-month trial'] },
                    { key: 'starter', label: 'Starter', price: 'KES 15,000/mo', features: ['Up to 20 bins', 'Full analytics', 'Sustainability reports', 'Email support'] },
                    { key: 'pro', label: 'Pro', price: 'KES 45,000/mo', features: ['Unlimited bins', 'Advanced analytics', 'Sponsored campaigns', 'Priority support', 'API access'] },
                    { key: 'enterprise', label: 'Enterprise', price: 'Custom', features: ['Multi-campus', 'Custom integrations', 'Dedicated manager', 'SLA guarantee', 'White-label option'] },
                  ].map(plan => (
                    <div key={plan.key} className={`p-4 rounded-xl border-2 ${institution?.subscription_plan === plan.key ? 'border-primary-500/40 bg-primary-500/5' : 'border-white/5'}`}>
                      <p className="font-bold text-white text-sm">{plan.label}</p><p className="text-lg font-extrabold text-primary-400 mt-1">{plan.price}</p>
                      <ul className="mt-3 space-y-1">{plan.features.map((f, i) => (<li key={i} className="text-xs text-white/40 flex items-start gap-1.5"><ChevronRight size={12} className="text-primary-500 mt-0.5 flex-shrink-0" /> {f}</li>))}</ul>
                      {institution?.subscription_plan === plan.key && <p className="text-xs font-bold text-primary-400 mt-3">Current Plan</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/30 mt-4">To upgrade or change your plan, contact SmartWaste support.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
