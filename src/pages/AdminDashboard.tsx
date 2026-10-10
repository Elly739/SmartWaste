import { useEffect, useState } from 'react';
import {
  Users, Recycle, AlertTriangle, ShieldCheck,
  QrCode, Building2, RefreshCw, Check, X,
  Plus, Leaf, Zap, AlertCircle, Eye, Ban, Unlock,
  DollarSign, Sparkles, TrendingUp, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { Bin, FraudFlag, WasteCategory, CollectionPartner, Profile, Institution, RoleRequest, SponsoredCampaign } from '../types';

const WASTE_COLORS = ['#3b82f6', '#f59e0b', '#94a3b8', '#10b981', '#22c55e', '#a855f7', '#f97316', '#ef4444'];

const darkTooltipStyle = {
  borderRadius: '12px', fontSize: '12px', backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDisposals: 0, totalPoints: 0, co2Saved: 0, activeBins: 0, fraudAlerts: 0 });
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [categories, setCategories] = useState<WasteCategory[]>([]);
  const [partners, setPartners] = useState<CollectionPartner[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; disposals: number; points: number }[]>([]);
  const [tab, setTab] = useState<'overview' | 'fraud' | 'bins' | 'partners' | 'users' | 'requests' | 'institutions' | 'sponsorships' | 'revenue'>('overview');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showAddBin, setShowAddBin] = useState(false);
  const [newBin, setNewBin] = useState({ qr_code: '', location_name: '', location_description: '', waste_category_id: '', partner_id: '', area_type: '', area_name: '' });
  const [addingBin, setAddingBin] = useState(false);
  const [binError, setBinError] = useState('');
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewedUserDisposals, setViewedUserDisposals] = useState<any[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [campaigns, setCampaigns] = useState<SponsoredCampaign[]>([]);
  const [revenueData, setRevenueData] = useState({ subscriptions: 0, sponsorships: 0, fees: 0, activeSubs: 0 });
  const [showAddInstitution, setShowAddInstitution] = useState(false);
  const [newInstitution, setNewInstitution] = useState({ name: '', type: 'university', contact_email: '', contact_phone: '', description: '', plan: 'pilot' });
  const [addingInstitution, setAddingInstitution] = useState(false);
  const [instError, setInstError] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [profilesRes, disposalsRes, fraudRes, binsRes, catsRes, partnersRes, reqRes, instRes, campRes, subRes, feeRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('disposals').select('id, points_earned, waste_category_id, created_at, waste_categories(name)', { count: 'exact' }),
      supabase.from('fraud_flags').select('*, profiles(full_name, username)').order('created_at', { ascending: false }).limit(50),
      supabase.from('bins').select('*, waste_categories(name, color), collection_partners(name)').order('created_at', { ascending: false }),
      supabase.from('waste_categories').select('*'),
      supabase.from('collection_partners').select('*'),
      supabase.from('role_requests').select('*, profiles(full_name, username, email), institutions(name)').order('created_at', { ascending: false }),
      supabase.from('institutions').select('*').order('created_at', { ascending: false }),
      supabase.from('sponsored_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('amount_kes, status').eq('status', 'active'),
      supabase.from('recovery_reports').select('facilitation_fee_kes, fee_status').eq('fee_status', 'paid'),
    ]);

    const disposals = disposalsRes.data ?? [];
    const totalPoints = (profilesRes.data ?? []).reduce((s, p) => s + (p.total_points ?? 0), 0);
    const openFraud = (fraudRes.data ?? []).filter(f => f.status === 'open').length;

    setStats({
      totalUsers: (profilesRes.data ?? []).length,
      totalDisposals: disposalsRes.count ?? 0,
      totalPoints,
      co2Saved: disposals.length * 0.085,
      activeBins: (binsRes.data ?? []).filter(b => b.is_active).length,
      fraudAlerts: openFraud,
    });

    setAllUsers(profilesRes.data as Profile[] ?? []);
    setFraudFlags(fraudRes.data as FraudFlag[] ?? []);
    setBins(binsRes.data as Bin[] ?? []);
    setCategories(catsRes.data as WasteCategory[] ?? []);
    setPartners(partnersRes.data as CollectionPartner[] ?? []);
    setRoleRequests(reqRes.data as RoleRequest[] ?? []);
    setInstitutions(instRes.data as Institution[] ?? []);
    setCampaigns(campRes.data as SponsoredCampaign[] ?? []);

    const subRevenue = (subRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount_kes ?? 0), 0);
    const sponsorshipRevenue = (campRes.data ?? []).filter((c: any) => c.is_active).reduce((s: number, c: any) => s + Number(c.funding_amount_kes ?? 0), 0);
    const feeRevenue = (feeRes.data ?? []).reduce((s: number, r: any) => s + Number(r.facilitation_fee_kes ?? 0), 0);
    setRevenueData({ subscriptions: subRevenue, sponsorships: sponsorshipRevenue, fees: feeRevenue, activeSubs: (subRes.data ?? []).length });

    const catMap: Record<string, number> = {};
    disposals.forEach(d => { const name = (d as any).waste_categories?.name ?? 'Other'; catMap[name] = (catMap[name] ?? 0) + 1; });
    setCategoryData(Object.entries(catMap).map(([name, value], i) => ({ name, value, color: WASTE_COLORS[i % WASTE_COLORS.length] })));

    const daily: Record<string, { disposals: number; points: number }> = {};
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); daily[d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })] = { disposals: 0, points: 0 }; }
    disposals.forEach(d => { const key = new Date(d.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }); if (daily[key]) { daily[key].disposals++; daily[key].points += d.points_earned; } });
    setDailyData(Object.entries(daily).map(([date, vals]) => ({ date, ...vals })));

    setLoading(false);
  }

  async function resolveFlag(id: string, status: 'resolved' | 'dismissed') {
    setResolvingId(id);
    await supabase.from('fraud_flags').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    setFraudFlags(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    setResolvingId(null);
  }

  function generateQRCode() {
    const prefix = 'SW-BIN';
    const area = newBin.area_name?.replace(/\s+/g, '').substring(0, 3).toUpperCase() || 'GEN';
    const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const code = `${prefix}-${area}-${num}`;
    setNewBin(prev => ({ ...prev, qr_code: code }));
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(code, { width: 200, margin: 2, color: { dark: '#166534', light: '#ffffff' } })
        .then((url: string) => setGeneratedQR(url))
        .catch(() => setGeneratedQR(null));
    });
  }

  async function addBin() {
    if (!newBin.qr_code || !newBin.location_name) { setBinError('QR code and location name are required.'); return; }
    setAddingBin(true); setBinError('');
    const { error } = await supabase.from('bins').insert({
      qr_code: newBin.qr_code.trim().toUpperCase(),
      location_name: newBin.location_name,
      location_description: newBin.location_description || null,
      waste_category_id: newBin.waste_category_id || null,
      partner_id: newBin.partner_id || null,
      area_type: newBin.area_type || null,
      area_name: newBin.area_name || null,
    });
    if (error) { setBinError('Could not create the bin. Please try again.'); } else {
      setShowAddBin(false); setNewBin({ qr_code: '', location_name: '', location_description: '', waste_category_id: '', partner_id: '', area_type: '', area_name: '' }); setGeneratedQR(null); await loadAll();
    }
    setAddingBin(false);
  }

  async function toggleSuspend(userId: string, currentlySuspended: boolean) {
    setSuspendingId(userId);
    if (currentlySuspended) {
      await supabase.rpc('admin_update_profile', { p_target_user_id: userId, p_suspended: false });
    } else {
      const reason = prompt('Reason for suspension:') ?? 'Violation of terms';
      await supabase.rpc('admin_update_profile', { p_target_user_id: userId, p_suspended: true, p_suspended_reason: reason });
    }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: !currentlySuspended } : u));
    setSuspendingId(null);
  }

  async function viewUserActivity(userId: string) {
    if (viewingUserId === userId) { setViewingUserId(null); setViewedUserDisposals([]); return; }
    setViewingUserId(userId);
    const { data } = await supabase
      .from('disposals')
      .select('id, points_earned, is_flagged, created_at, bins(location_name), waste_categories(name, color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setViewedUserDisposals(data ?? []);
  }

  async function approveRequest(req: RoleRequest) {
    setApprovingId(req.id);
    const now = new Date().toISOString();
    const adminId = (await supabase.auth.getUser()).data.user?.id;

    if (req.requested_role === 'institution') {
      await supabase.rpc('admin_update_profile', {
        p_target_user_id: req.user_id, p_role: 'institution',
        p_institution_id: req.institution_id, p_role_request_status: 'approved',
      });
    } else if (req.requested_role === 'partner') {
      const { data: newPartner } = await supabase.from('collection_partners').insert({
        name: req.partner_name,
        description: req.partner_description,
        contact_email: req.partner_contact_email,
        contact_phone: req.partner_contact_phone,
        is_active: true,
      }).select().single();
      if (newPartner) {
        await supabase.rpc('admin_update_profile', {
          p_target_user_id: req.user_id, p_role: 'partner',
          p_partner_id: newPartner.id, p_role_request_status: 'approved',
        });
      }
    }

    await supabase.from('role_requests').update({ status: 'approved', reviewed_by: adminId ?? null, reviewed_at: now }).eq('id', req.id);
    setRoleRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', reviewed_at: now } : r));
    setApprovingId(null);
    await loadAll();
  }

  async function rejectRequest(reqId: string) {
    setApprovingId(reqId);
    const adminId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('role_requests').update({ status: 'rejected', reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() }).eq('id', reqId);
    await supabase.rpc('admin_update_profile', {
      p_target_user_id: roleRequests.find(r => r.id === reqId)?.user_id ?? '',
      p_role_request_status: 'rejected',
    });
    setRoleRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r));
    setApprovingId(null);
  }

  async function addInstitution() {
    if (!newInstitution.name) { setInstError('Institution name is required.'); return; }
    setAddingInstitution(true); setInstError('');
    const { error } = await supabase.from('institutions').insert({
      name: newInstitution.name,
      type: newInstitution.type,
      contact_email: newInstitution.contact_email || null,
      contact_phone: newInstitution.contact_phone || null,
      description: newInstitution.description || null,
      subscription_plan: newInstitution.plan,
      subscription_status: newInstitution.plan === 'pilot' ? 'trial' : 'active',
    });
    if (error) { setInstError('Could not add the institution. Please try again.'); } else {
      setShowAddInstitution(false);
      setNewInstitution({ name: '', type: 'university', contact_email: '', contact_phone: '', description: '', plan: 'pilot' });
      await loadAll();
    }
    setAddingInstitution(false);
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: '#3b82f6' },
    { label: 'Total Disposals', value: stats.totalDisposals.toLocaleString(), icon: Recycle, color: '#22c55e' },
    { label: 'Points Issued', value: stats.totalPoints.toLocaleString(), icon: Zap, color: '#f59e0b' },
    { label: 'CO₂ Saved (kg)', value: stats.co2Saved.toFixed(0), icon: Leaf, color: '#10b981' },
    { label: 'Active Bins', value: stats.activeBins, icon: QrCode, color: '#a855f7' },
    { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: AlertTriangle, color: '#ef4444' },
  ];

  const tabList = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'requests', label: `Requests (${roleRequests.filter(r => r.status === 'pending').length})` },
    { key: 'fraud', label: `Fraud (${stats.fraudAlerts})` },
    { key: 'bins', label: `Bins (${stats.activeBins})` },
    { key: 'partners', label: 'Partners' },
    { key: 'institutions', label: `Institutions (${institutions.length})` },
    { key: 'sponsorships', label: 'Sponsorships' },
    { key: 'revenue', label: 'Revenue' },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
          <ShieldCheck size={22} className="text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <p className="text-white/40 text-sm">Platform overview and management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit overflow-x-auto border border-white/5">
        {tabList.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === key ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {label}
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
                {statCards.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <p className="text-2xl font-extrabold text-white">{value}</p>
                    <p className="text-xs text-white/40 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Daily Activity (Last 7 Days)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                      <Tooltip contentStyle={darkTooltipStyle} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                      <Bar dataKey="disposals" name="Disposals" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <h2 className="font-bold text-white mb-5">Waste by Category</h2>
                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>{categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip contentStyle={darkTooltipStyle} /></PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {categoryData.slice(0, 5).map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} /><span className="text-white/50 truncate max-w-[120px]">{c.name}</span></div>
                            <span className="font-bold text-white/70">{c.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-sm text-white/30 text-center py-8">No disposal data</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">User Management</h2>
              <div className="space-y-3">
                {allUsers.map(u => (
                  <div key={u.id} className={`rounded-2xl border p-4 ${u.suspended ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.suspended ? 'bg-red-500/20 text-red-400 border border-red-500/30' : u.role === 'admin' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-white/10 text-white/60 border border-white/10'}`}>
                        {(u.full_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white text-sm truncate">{u.full_name || u.username || 'Unknown'}</p>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${u.role === 'admin' ? 'bg-red-500/15 text-red-400' : u.role === 'partner' ? 'bg-blue-500/15 text-blue-400' : 'bg-primary-500/15 text-primary-400'}`}>{u.role}</span>
                          {u.suspended && <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-xs font-bold flex items-center gap-1"><Ban size={10} /> Suspended</span>}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {(u.total_points ?? 0).toLocaleString()} pts · {(u.lifetime_points ?? 0).toLocaleString()} lifetime · Streak: {u.current_streak}
                        </p>
                        {u.suspended_reason && <p className="text-xs text-red-400/70 mt-0.5">Reason: {u.suspended_reason}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => viewUserActivity(u.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewingUserId === u.id ? 'bg-primary-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
                          <Eye size={12} /> {viewingUserId === u.id ? 'Hide' : 'Review'}
                        </button>
                        <button onClick={() => toggleSuspend(u.id, u.suspended)} disabled={suspendingId === u.id || u.role === 'admin'}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${u.suspended ? 'bg-primary-500/15 hover:bg-primary-500/25 text-primary-400' : 'bg-red-500/15 hover:bg-red-500/25 text-red-400'}`}>
                          {suspendingId === u.id ? <RefreshCw size={12} className="animate-spin" /> : u.suspended ? <><Unlock size={12} /> Unsuspend</> : <><Ban size={12} /> Suspend</>}
                        </button>
                      </div>
                    </div>

                    {viewingUserId === u.id && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs font-semibold text-white/40 mb-3">Recent Activity ({viewedUserDisposals.length} records)</p>
                        {viewedUserDisposals.length === 0 ? (
                          <p className="text-xs text-white/30">No disposals recorded.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {viewedUserDisposals.map((d: any) => (
                              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] text-xs">
                                <Recycle size={12} style={{ color: d.waste_categories?.color ?? '#22c55e' }} />
                                <span className="font-medium text-white/70">{d.waste_categories?.name ?? 'Waste'}</span>
                                <span className="text-white/30">@ {(d.bins as any)?.location_name ?? '?'}</span>
                                <span className="text-primary-400 font-bold ml-auto">+{d.points_earned} pts</span>
                                {d.is_flagged && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold">Flagged</span>}
                                <span className="text-white/30">{new Date(d.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'fraud' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-lg">Fraud Flags</h2>
                <span className="px-3 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold">{fraudFlags.filter(f => f.status === 'open').length} open</span>
              </div>
              {fraudFlags.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-16"><ShieldCheck size={40} className="text-white/15 mx-auto mb-4" /><p className="text-white/40 font-medium">No fraud flags</p></div>
              ) : (
                fraudFlags.map(flag => (
                  <div key={flag.id} className={`rounded-2xl border p-4 ${flag.status === 'open' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${flag.severity === 'high' ? 'bg-red-500/15' : flag.severity === 'medium' ? 'bg-orange-500/15' : 'bg-yellow-500/15'}`}>
                        <AlertTriangle size={18} className={flag.severity === 'high' ? 'text-red-400' : flag.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${flag.severity === 'high' ? 'bg-red-500/15 text-red-400' : flag.severity === 'medium' ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{flag.severity.toUpperCase()}</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-xs">{flag.flag_type.replace('_', ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${flag.status === 'open' ? 'bg-red-500/15 text-red-400' : flag.status === 'resolved' ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{flag.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-white">User: {(flag as any).profiles?.full_name || (flag as any).profiles?.username || flag.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-white/40 mt-0.5">{flag.description}</p>
                        <p className="text-xs text-white/30 mt-1">{new Date(flag.created_at).toLocaleString()}</p>
                      </div>
                      {flag.status === 'open' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => resolveFlag(flag.id, 'resolved')} disabled={resolvingId === flag.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-500 transition-colors">
                            {resolvingId === flag.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Resolve
                          </button>
                          <button onClick={() => resolveFlag(flag.id, 'dismissed')} disabled={resolvingId === flag.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-colors">
                            <X size={12} /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'bins' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-lg">Bin Management</h2>
                <button onClick={() => setShowAddBin(!showAddBin)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors"><Plus size={16} /> Add Bin</button>
              </div>

              {showAddBin && (
                <div className="rounded-2xl bg-white/[0.03] border border-primary-500/20 p-5">
                  <h3 className="font-bold text-white mb-4">New Collection Bin</h3>
                  {binError && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {binError}</div>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Location Name *</label>
                      <input type="text" value={newBin.location_name} onChange={e => setNewBin(p => ({ ...p, location_name: e.target.value }))} placeholder="e.g. University Library" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Waste Category</label>
                      <select value={newBin.waste_category_id} onChange={e => setNewBin(p => ({ ...p, waste_category_id: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all">
                        <option value="">Select category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Partner</label>
                      <select value={newBin.partner_id} onChange={e => setNewBin(p => ({ ...p, partner_id: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all">
                        <option value="">No partner</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Area Type</label>
                      <select value={newBin.area_type} onChange={e => setNewBin(p => ({ ...p, area_type: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all">
                        <option value="">Select type...</option>
                        {['campus', 'estate', 'community', 'commercial', 'institutional'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Area Name</label>
                      <input type="text" value={newBin.area_name} onChange={e => setNewBin(p => ({ ...p, area_name: e.target.value }))} placeholder="e.g. Zetech University" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Description</label>
                      <input type="text" value={newBin.location_description} onChange={e => setNewBin(p => ({ ...p, location_description: e.target.value }))} placeholder="Optional" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-white/50 mb-1">QR Code</label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input type="text" value={newBin.qr_code} onChange={e => setNewBin(p => ({ ...p, qr_code: e.target.value }))} placeholder="Auto-generated or custom" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                        </div>
                        <button onClick={generateQRCode} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all">
                          <QrCode size={14} /> Generate QR
                        </button>
                      </div>
                      {generatedQR && (
                        <div className="mt-3 flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/10">
                          <img src={generatedQR} alt="QR Code" className="w-24 h-24" />
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{newBin.qr_code}</p>
                            <p className="text-xs text-white/40 mt-1">Print this QR code and attach to the bin</p>
                            <a href={generatedQR} download={`qr-${newBin.qr_code}.png`} className="text-xs text-primary-400 font-semibold mt-2 inline-block hover:underline">Download PNG</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => { setShowAddBin(false); setGeneratedQR(null); }} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-semibold transition-all">Cancel</button>
                    <button onClick={addBin} disabled={addingBin} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                      {addingBin ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Create Bin
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {bins.map(bin => (
                  <div key={bin.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bin.is_active ? 'bg-primary-500/15' : 'bg-white/5'}`}>
                      <QrCode size={18} className={bin.is_active ? 'text-primary-400' : 'text-white/30'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-sm truncate">{bin.location_name}</p>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${bin.is_active ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{bin.is_active ? 'Active' : 'Inactive'}</span>
                        {bin.area_name && <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-xs">{bin.area_name}</span>}
                      </div>
                      <p className="text-xs text-white/40 font-mono mt-0.5">{bin.qr_code}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-white/30">{(bin as any).waste_categories?.name ?? 'No category'}</span>
                        {(bin as any).collection_partners?.name && <span className="text-xs text-blue-400 font-medium">{(bin as any).collection_partners.name}</span>}
                        <span className="text-xs text-white/30">{bin.total_collections} collections</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'partners' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">Collection Partners</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map(partner => (
                  <div key={partner.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0"><Building2 size={22} className="text-primary-400" /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{partner.name}</p>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${partner.is_active ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{partner.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed mb-3">{partner.description}</p>
                    {partner.contact_email && <p className="text-xs text-white/30">{partner.contact_email}</p>}
                    {partner.contact_phone && <p className="text-xs text-white/30">{partner.contact_phone}</p>}
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white/30">Total Collections</span>
                      <span className="text-sm font-bold text-primary-400">{partner.total_collections.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'requests' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">Role Requests</h2>
              {roleRequests.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-12">
                  <UserCheck size={40} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No role requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roleRequests.map(req => (
                    <div key={req.id} className={`rounded-2xl border p-4 ${req.status === 'pending' ? 'bg-amber-500/5 border-amber-500/20' : req.status === 'approved' ? 'bg-primary-500/5 border-primary-500/20' : 'bg-white/[0.03] border-white/5 opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${req.requested_role === 'institution' ? 'bg-blue-500/15' : 'bg-violet-500/15'}`}>
                          {req.requested_role === 'institution' ? <Building2 size={22} className="text-blue-400" /> : <Recycle size={22} className="text-violet-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-white text-sm">{req.profiles?.full_name || req.profiles?.username || 'Unknown'}</p>
                            <span className="text-xs text-white/40">wants to be</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${req.requested_role === 'institution' ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400'}`}>{req.requested_role}</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${req.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : req.status === 'approved' ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{req.status}</span>
                          </div>
                          {req.requested_role === 'institution' && req.institutions?.name && (
                            <p className="text-xs text-white/50 mt-1">Institution: <span className="font-semibold text-white/70">{req.institutions.name}</span></p>
                          )}
                          {req.requested_role === 'partner' && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs text-white/50">Org: <span className="font-semibold text-white/70">{req.partner_name}</span></p>
                              {req.partner_description && <p className="text-xs text-white/40">{req.partner_description}</p>}
                              {req.partner_contact_email && <p className="text-xs text-white/30">{req.partner_contact_email}</p>}
                              {req.partner_contact_phone && <p className="text-xs text-white/30">{req.partner_contact_phone}</p>}
                            </div>
                          )}
                          <p className="text-xs text-white/30 mt-1">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => approveRequest(req)} disabled={approvingId === req.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-500 disabled:opacity-50 transition-colors">
                              {approvingId === req.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />} Approve
                            </button>
                            <button onClick={() => rejectRequest(req.id)} disabled={approvingId === req.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-colors">
                              <X size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'institutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-lg">Institutional Customers</h2>
                <button onClick={() => setShowAddInstitution(!showAddInstitution)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors"><Plus size={16} /> Add Institution</button>
              </div>

              {showAddInstitution && (
                <div className="rounded-2xl bg-white/[0.03] border border-primary-500/20 p-5">
                  <p className="text-sm font-semibold text-white mb-3">Register New Institution</p>
                  {instError && <p className="text-xs text-red-400 mb-2">{instError}</p>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Name</label>
                      <input type="text" value={newInstitution.name} onChange={e => setNewInstitution(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Zetech University" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Type</label>
                      <select value={newInstitution.type} onChange={e => setNewInstitution(p => ({ ...p, type: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all">
                        <option value="university">University</option>
                        <option value="school">School</option>
                        <option value="hospital">Hospital</option>
                        <option value="estate">Estate</option>
                        <option value="municipality">Municipality</option>
                        <option value="commercial">Commercial</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Contact Email</label>
                      <input type="email" value={newInstitution.contact_email} onChange={e => setNewInstitution(p => ({ ...p, contact_email: e.target.value }))} placeholder="admin@institution.ac.ke" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Contact Phone</label>
                      <input type="text" value={newInstitution.contact_phone} onChange={e => setNewInstitution(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+254..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-white/50 mb-1">Description</label>
                      <input type="text" value={newInstitution.description} onChange={e => setNewInstitution(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">Subscription Plan</label>
                      <select value={newInstitution.plan} onChange={e => setNewInstitution(p => ({ ...p, plan: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all">
                        <option value="pilot">Pilot (Trial)</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowAddInstitution(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-semibold transition-all">Cancel</button>
                    <button onClick={addInstitution} disabled={addingInstitution} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                      {addingInstitution ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Add Institution
                    </button>
                  </div>
                </div>
              )}

              {institutions.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-12">
                  <Building2 size={40} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No institutions registered yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {institutions.map(inst => (
                    <div key={inst.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:border-white/10 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0"><Building2 size={22} className="text-blue-400" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{inst.name}</p>
                          <span className="text-xs text-white/40 capitalize">{inst.type}</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">{inst.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${inst.subscription_status === 'active' ? 'bg-primary-500/15 text-primary-400' : inst.subscription_status === 'trial' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-white/40'}`}>{inst.subscription_status}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold">{inst.subscription_plan}</span>
                      </div>
                      {inst.contact_email && <p className="text-xs text-white/30">{inst.contact_email}</p>}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-white/30">Joined</span>
                        <span className="text-xs font-semibold text-white/60">{new Date(inst.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'sponsorships' && (
            <div className="space-y-4">
              <h2 className="font-bold text-white text-lg">Sponsored Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-12">
                  <Sparkles size={40} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No sponsored campaigns yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`rounded-2xl bg-white/[0.03] border border-white/5 p-4 ${c.is_active ? '' : 'opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0"><Sparkles size={22} className="text-primary-400" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-primary-400">{c.sponsor_name}</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${c.is_active ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-white/40'}`}>{c.is_active ? 'Active' : 'Ended'}</span>
                          </div>
                          <p className="font-bold text-white text-sm">{c.campaign_title}</p>
                          <p className="text-xs text-white/40 mt-1">{c.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="font-bold text-primary-400">{c.reward_pool_points.toLocaleString()} pts</span>
                            <span className="text-white/30">KES {c.funding_amount_kes.toLocaleString()}</span>
                            <span className="text-white/30">Ends {new Date(c.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'revenue' && (
            <div className="space-y-6">
              <h2 className="font-bold text-white text-lg">Revenue Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Subscription Revenue', value: `KES ${revenueData.subscriptions.toLocaleString()}`, icon: DollarSign, color: '#22c55e' },
                  { label: 'Sponsorship Value', value: `KES ${revenueData.sponsorships.toLocaleString()}`, icon: Sparkles, color: '#3b82f6' },
                  { label: 'Partner Fees', value: `KES ${revenueData.fees.toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
                  { label: 'Active Subscriptions', value: revenueData.activeSubs, icon: Building2, color: '#f59e0b' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <p className="text-xl font-extrabold text-white">{value}</p>
                    <p className="text-xs text-white/40 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <h3 className="font-bold text-white mb-4">Revenue Model Summary</h3>
                <div className="space-y-3">
                  {[
                    { source: 'Institutional Subscriptions', desc: 'Monthly/yearly SaaS fees from universities, schools, hospitals, estates', amount: revenueData.subscriptions },
                    { source: 'Sponsored Campaigns', desc: 'Brand sponsorships for environmental challenges and reward pools', amount: revenueData.sponsorships },
                    { source: 'Recovery Partner Fees', desc: 'Facilitation fees from verified waste stream coordination', amount: revenueData.fees },
                  ].map(r => (
                    <div key={r.source} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                      <div>
                        <p className="text-sm font-bold text-white">{r.source}</p>
                        <p className="text-xs text-white/40">{r.desc}</p>
                      </div>
                      <span className="text-sm font-bold text-primary-400">KES {r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
