import { useEffect, useState } from 'react';
import {
  Users, Recycle, AlertTriangle, ShieldCheck,
  QrCode, Building2, RefreshCw, Check, X,
  Plus, Leaf, Zap, AlertCircle, Eye, Ban, Unlock,
  DollarSign, Sparkles, TrendingUp, Clock, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { Bin, FraudFlag, WasteCategory, CollectionPartner, Profile, Institution, RoleRequest, SponsoredCampaign } from '../types';

const WASTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#f97316', '#10b981', '#6b7280'];

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
    // Generate QR as data URL
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
    if (error) { setBinError(error.message); } else {
      setShowAddBin(false); setNewBin({ qr_code: '', location_name: '', location_description: '', waste_category_id: '', partner_id: '', area_type: '', area_name: '' }); setGeneratedQR(null); await loadAll();
    }
    setAddingBin(false);
  }

  async function toggleSuspend(userId: string, currentlySuspended: boolean) {
    setSuspendingId(userId);
    if (currentlySuspended) {
      await supabase.from('profiles').update({ suspended: false, suspended_reason: null }).eq('id', userId);
    } else {
      const reason = prompt('Reason for suspension:') ?? 'Violation of terms';
      await supabase.from('profiles').update({ suspended: true, suspended_reason: reason }).eq('id', userId);
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
      await supabase.from('profiles').update({ role: 'institution', institution_id: req.institution_id, role_request_status: 'approved' }).eq('id', req.user_id);
    } else if (req.requested_role === 'partner') {
      const { data: newPartner } = await supabase.from('collection_partners').insert({
        name: req.partner_name,
        description: req.partner_description,
        contact_email: req.partner_contact_email,
        contact_phone: req.partner_contact_phone,
        is_active: true,
      }).select().single();
      if (newPartner) {
        await supabase.from('profiles').update({ role: 'partner', partner_id: newPartner.id, role_request_status: 'approved' }).eq('id', req.user_id);
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
    await supabase.from('profiles').update({ role_request_status: 'rejected' }).eq('id', roleRequests.find(r => r.id === reqId)?.user_id ?? '');
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
    if (error) { setInstError(error.message); } else {
      setShowAddInstitution(false);
      setNewInstitution({ name: '', type: 'university', contact_email: '', contact_phone: '', description: '', plan: 'pilot' });
      await loadAll();
    }
    setAddingInstitution(false);
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'bg-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    { label: 'Total Disposals', value: stats.totalDisposals.toLocaleString(), icon: Recycle, color: 'bg-primary-600', bg: 'bg-primary-50', text: 'text-primary-700' },
    { label: 'Points Issued', value: stats.totalPoints.toLocaleString(), icon: Zap, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    { label: 'CO₂ Saved (kg)', value: stats.co2Saved.toFixed(0), icon: Leaf, color: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { label: 'Active Bins', value: stats.activeBins, icon: QrCode, color: 'bg-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' },
    { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: AlertTriangle, color: 'bg-red-600', bg: 'bg-red-50', text: 'text-red-700' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ShieldCheck size={28} className="text-primary-700" />
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Platform overview and management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users' },
          { key: 'requests', label: `Requests (${roleRequests.filter(r => r.status === 'pending').length})` },
          { key: 'fraud', label: `Fraud (${stats.fraudAlerts})` },
          { key: 'bins', label: `Bins (${stats.activeBins})` },
          { key: 'partners', label: 'Partners' },
          { key: 'institutions', label: `Institutions (${institutions.length})` },
          { key: 'sponsorships', label: 'Sponsorships' },
          { key: 'revenue', label: 'Revenue' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={28} className="animate-spin text-primary-600" /></div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, bg, text }) => (
                  <div key={label} className={`card ${bg} border-0`}>
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon size={16} className="text-white" /></div>
                    <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2">
                  <h2 className="font-bold text-gray-900 mb-5">Daily Activity (Last 7 Days)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Bar dataKey="disposals" name="Disposals" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h2 className="font-bold text-gray-900 mb-5">Waste by Category</h2>
                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>{categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} /></PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {categoryData.slice(0, 5).map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} /><span className="text-gray-600 truncate max-w-[120px]">{c.name}</span></div>
                            <span className="font-bold text-gray-800">{c.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-sm text-gray-400 text-center py-8">No disposal data</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">User Management</h2>
              <div className="space-y-3">
                {allUsers.map(u => (
                  <div key={u.id} className={`card ${u.suspended ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.suspended ? 'bg-red-200 text-red-700' : u.role === 'admin' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {(u.full_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm truncate">{u.full_name || u.username || 'Unknown'}</p>
                          <span className={`badge text-xs ${u.role === 'admin' ? 'badge-red' : u.role === 'partner' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span>
                          {u.suspended && <span className="badge-red text-xs flex items-center gap-1"><Ban size={10} /> Suspended</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(u.total_points ?? 0).toLocaleString()} pts · {(u.lifetime_points ?? 0).toLocaleString()} lifetime · Streak: {u.current_streak}
                        </p>
                        {u.suspended_reason && <p className="text-xs text-red-600 mt-0.5">Reason: {u.suspended_reason}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => viewUserActivity(u.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewingUserId === u.id ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                          <Eye size={12} /> {viewingUserId === u.id ? 'Hide' : 'Review'}
                        </button>
                        <button
                          onClick={() => toggleSuspend(u.id, u.suspended)}
                          disabled={suspendingId === u.id || u.role === 'admin'}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                            u.suspended ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                        >
                          {suspendingId === u.id ? <RefreshCw size={12} className="animate-spin" /> : u.suspended ? <><Unlock size={12} /> Unsuspend</> : <><Ban size={12} /> Suspend</>}
                        </button>
                      </div>
                    </div>

                    {/* Expanded activity view */}
                    {viewingUserId === u.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-3">Recent Activity ({viewedUserDisposals.length} records)</p>
                        {viewedUserDisposals.length === 0 ? (
                          <p className="text-xs text-gray-400">No disposals recorded.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {viewedUserDisposals.map((d: any) => (
                              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-white text-xs">
                                <Recycle size={12} style={{ color: d.waste_categories?.color ?? '#22c55e' }} />
                                <span className="font-medium text-gray-700">{d.waste_categories?.name ?? 'Waste'}</span>
                                <span className="text-gray-400">@ {(d.bins as any)?.location_name ?? '?'}</span>
                                <span className="text-primary-700 font-bold ml-auto">+{d.points_earned} pts</span>
                                {d.is_flagged && <span className="badge-red text-xs">Flagged</span>}
                                <span className="text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
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
                <h2 className="font-bold text-gray-900 text-lg">Fraud Flags</h2>
                <span className="badge-red">{fraudFlags.filter(f => f.status === 'open').length} open</span>
              </div>
              {fraudFlags.length === 0 ? (
                <div className="card text-center py-16"><ShieldCheck size={40} className="text-green-300 mx-auto mb-4" /><p className="text-gray-500 font-medium">No fraud flags</p></div>
              ) : (
                fraudFlags.map(flag => (
                  <div key={flag.id} className={`card border ${flag.status === 'open' ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${flag.severity === 'high' ? 'bg-red-100' : flag.severity === 'medium' ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                        <AlertTriangle size={18} className={flag.severity === 'high' ? 'text-red-600' : flag.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`badge text-xs font-bold ${flag.severity === 'high' ? 'badge-red' : flag.severity === 'medium' ? 'badge-orange' : 'bg-yellow-100 text-yellow-800'}`}>{flag.severity.toUpperCase()}</span>
                          <span className="badge bg-gray-100 text-gray-700 text-xs">{flag.flag_type.replace('_', ' ')}</span>
                          <span className={`badge text-xs ${flag.status === 'open' ? 'badge-red' : flag.status === 'resolved' ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>{flag.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">User: {(flag as any).profiles?.full_name || (flag as any).profiles?.username || flag.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(flag.created_at).toLocaleString()}</p>
                      </div>
                      {flag.status === 'open' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => resolveFlag(flag.id, 'resolved')} disabled={resolvingId === flag.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
                            {resolvingId === flag.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Resolve
                          </button>
                          <button onClick={() => resolveFlag(flag.id, 'dismissed')} disabled={resolvingId === flag.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors">
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
                <h2 className="font-bold text-gray-900 text-lg">Bin Management</h2>
                <button onClick={() => setShowAddBin(!showAddBin)} className="btn-primary !py-2 !px-4 flex items-center gap-2 text-sm"><Plus size={16} /> Add Bin</button>
              </div>

              {showAddBin && (
                <div className="card border border-primary-200 bg-primary-50">
                  <h3 className="font-bold text-gray-900 mb-4">New Collection Bin</h3>
                  {binError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {binError}</div>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Location Name *</label>
                      <input type="text" value={newBin.location_name} onChange={e => setNewBin(p => ({ ...p, location_name: e.target.value }))} placeholder="e.g. University Library" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Waste Category</label>
                      <select value={newBin.waste_category_id} onChange={e => setNewBin(p => ({ ...p, waste_category_id: e.target.value }))} className="input-field text-sm">
                        <option value="">Select category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Partner</label>
                      <select value={newBin.partner_id} onChange={e => setNewBin(p => ({ ...p, partner_id: e.target.value }))} className="input-field text-sm">
                        <option value="">No partner</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Area Type</label>
                      <select value={newBin.area_type} onChange={e => setNewBin(p => ({ ...p, area_type: e.target.value }))} className="input-field text-sm">
                        <option value="">Select type...</option>
                        {['campus', 'estate', 'community', 'commercial', 'institutional'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Area Name</label>
                      <input type="text" value={newBin.area_name} onChange={e => setNewBin(p => ({ ...p, area_name: e.target.value }))} placeholder="e.g. Zetech University" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                      <input type="text" value={newBin.location_description} onChange={e => setNewBin(p => ({ ...p, location_description: e.target.value }))} placeholder="Optional" className="input-field text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">QR Code</label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input type="text" value={newBin.qr_code} onChange={e => setNewBin(p => ({ ...p, qr_code: e.target.value }))} placeholder="Auto-generated or custom" className="input-field text-sm font-mono" />
                        </div>
                        <button onClick={generateQRCode} className="btn-secondary !py-2.5 !px-4 text-sm flex items-center gap-1.5 whitespace-nowrap">
                          <QrCode size={14} /> Generate QR
                        </button>
                      </div>
                      {generatedQR && (
                        <div className="mt-3 flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200">
                          <img src={generatedQR} alt="QR Code" className="w-24 h-24" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 font-mono">{newBin.qr_code}</p>
                            <p className="text-xs text-gray-500 mt-1">Print this QR code and attach to the bin</p>
                            <a href={generatedQR} download={`qr-${newBin.qr_code}.png`} className="text-xs text-primary-600 font-semibold mt-2 inline-block hover:underline">Download PNG</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => { setShowAddBin(false); setGeneratedQR(null); }} className="btn-secondary flex-1 text-sm">Cancel</button>
                    <button onClick={addBin} disabled={addingBin} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                      {addingBin ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Create Bin
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {bins.map(bin => (
                  <div key={bin.id} className="card flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bin.is_active ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <QrCode size={18} className={bin.is_active ? 'text-primary-700' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm truncate">{bin.location_name}</p>
                        <span className={`badge text-xs ${bin.is_active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>{bin.is_active ? 'Active' : 'Inactive'}</span>
                        {bin.area_name && <span className="badge-blue text-xs">{bin.area_name}</span>}
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{bin.qr_code}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{(bin as any).waste_categories?.name ?? 'No category'}</span>
                        {(bin as any).collection_partners?.name && <span className="text-xs text-blue-600 font-medium">{(bin as any).collection_partners.name}</span>}
                        <span className="text-xs text-gray-400">{bin.total_collections} collections</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'partners' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Collection Partners</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map(partner => (
                  <div key={partner.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0"><Building2 size={22} className="text-primary-700" /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{partner.name}</p>
                        <span className={`badge text-xs ${partner.is_active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>{partner.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{partner.description}</p>
                    {partner.contact_email && <p className="text-xs text-gray-400">{partner.contact_email}</p>}
                    {partner.contact_phone && <p className="text-xs text-gray-400">{partner.contact_phone}</p>}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total Collections</span>
                      <span className="text-sm font-bold text-primary-700">{partner.total_collections.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROLE REQUESTS TAB */}
          {tab === 'requests' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Role Requests</h2>
              {roleRequests.length === 0 ? (
                <div className="card text-center py-12">
                  <UserCheck size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No role requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roleRequests.map(req => (
                    <div key={req.id} className={`card ${req.status === 'pending' ? 'border-amber-200 bg-amber-50' : req.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${req.requested_role === 'institution' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                          {req.requested_role === 'institution' ? <Building2 size={22} className="text-blue-700" /> : <Recycle size={22} className="text-purple-700" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-gray-900 text-sm">{req.profiles?.full_name || req.profiles?.username || 'Unknown'}</p>
                            <span className="text-xs text-gray-500">wants to be</span>
                            <span className={`badge text-xs ${req.requested_role === 'institution' ? 'badge-blue' : 'bg-purple-100 text-purple-700'}`}>{req.requested_role}</span>
                            <span className={`badge text-xs ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>{req.status}</span>
                          </div>
                          {req.requested_role === 'institution' && req.institutions?.name && (
                            <p className="text-xs text-gray-600 mt-1">Institution: <span className="font-semibold">{req.institutions.name}</span></p>
                          )}
                          {req.requested_role === 'partner' && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs text-gray-600">Org: <span className="font-semibold">{req.partner_name}</span></p>
                              {req.partner_description && <p className="text-xs text-gray-500">{req.partner_description}</p>}
                              {req.partner_contact_email && <p className="text-xs text-gray-400">{req.partner_contact_email}</p>}
                              {req.partner_contact_phone && <p className="text-xs text-gray-400">{req.partner_contact_phone}</p>}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => approveRequest(req)} disabled={approvingId === req.id} className="btn-primary !py-2 !px-3 text-xs flex items-center gap-1 disabled:opacity-50">
                              {approvingId === req.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />} Approve
                            </button>
                            <button onClick={() => rejectRequest(req.id)} disabled={approvingId === req.id} className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1">
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

          {/* INSTITUTIONS TAB */}
          {tab === 'institutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Institutional Customers</h2>
                <button onClick={() => setShowAddInstitution(!showAddInstitution)} className="btn-primary !py-2 !px-4 flex items-center gap-2 text-sm"><Plus size={16} /> Add Institution</button>
              </div>

              {showAddInstitution && (
                <div className="card bg-primary-50 border-primary-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Register New Institution</p>
                  {instError && <p className="text-xs text-red-600 mb-2">{instError}</p>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                      <input type="text" value={newInstitution.name} onChange={e => setNewInstitution(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Zetech University" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                      <select value={newInstitution.type} onChange={e => setNewInstitution(p => ({ ...p, type: e.target.value }))} className="input-field text-sm">
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
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Email</label>
                      <input type="email" value={newInstitution.contact_email} onChange={e => setNewInstitution(p => ({ ...p, contact_email: e.target.value }))} placeholder="admin@institution.ac.ke" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone</label>
                      <input type="text" value={newInstitution.contact_phone} onChange={e => setNewInstitution(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+254..." className="input-field text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                      <input type="text" value={newInstitution.description} onChange={e => setNewInstitution(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Subscription Plan</label>
                      <select value={newInstitution.plan} onChange={e => setNewInstitution(p => ({ ...p, plan: e.target.value }))} className="input-field text-sm">
                        <option value="pilot">Pilot (Trial)</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowAddInstitution(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                    <button onClick={addInstitution} disabled={addingInstitution} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                      {addingInstitution ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Add Institution
                    </button>
                  </div>
                </div>
              )}

              {institutions.length === 0 ? (
                <div className="card text-center py-12">
                  <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No institutions registered yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {institutions.map(inst => (
                    <div key={inst.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Building2 size={22} className="text-blue-700" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{inst.name}</p>
                          <span className="text-xs text-gray-500 capitalize">{inst.type}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{inst.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`badge text-xs ${inst.subscription_status === 'active' ? 'badge-green' : inst.subscription_status === 'trial' ? 'badge-blue' : 'bg-gray-100 text-gray-500'}`}>{inst.subscription_status}</span>
                        <span className="badge text-xs badge-blue">{inst.subscription_plan}</span>
                      </div>
                      {inst.contact_email && <p className="text-xs text-gray-400">{inst.contact_email}</p>}
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Joined</span>
                        <span className="text-xs font-semibold text-gray-700">{new Date(inst.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SPONSORSHIPS TAB */}
          {tab === 'sponsorships' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Sponsored Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="card text-center py-12">
                  <Sparkles size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No sponsored campaigns yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`card ${c.is_active ? '' : 'opacity-60'}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0"><Sparkles size={22} className="text-primary-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-primary-700">{c.sponsor_name}</span>
                            <span className={`badge text-xs ${c.is_active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Active' : 'Ended'}</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm">{c.campaign_title}</p>
                          <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="font-bold text-primary-700">{c.reward_pool_points.toLocaleString()} pts</span>
                            <span className="text-gray-400">KES {c.funding_amount_kes.toLocaleString()}</span>
                            <span className="text-gray-400">Ends {new Date(c.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVENUE TAB */}
          {tab === 'revenue' && (
            <div className="space-y-6">
              <h2 className="font-bold text-gray-900 text-lg">Revenue Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Subscription Revenue', value: `KES ${revenueData.subscriptions.toLocaleString()}`, icon: DollarSign, color: 'text-primary-700', bg: 'bg-primary-50' },
                  { label: 'Sponsorship Value', value: `KES ${revenueData.sponsorships.toLocaleString()}`, icon: Sparkles, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Partner Fees', value: `KES ${revenueData.fees.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Active Subscriptions', value: revenueData.activeSubs, icon: Building2, color: 'text-amber-700', bg: 'bg-amber-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`card ${bg} border-0`}>
                    <Icon size={20} className={`${color} mb-2`} />
                    <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-4">Revenue Model Summary</h3>
                <div className="space-y-3">
                  {[
                    { source: 'Institutional Subscriptions', desc: 'Monthly/yearly SaaS fees from universities, schools, hospitals, estates', amount: revenueData.subscriptions },
                    { source: 'Sponsored Campaigns', desc: 'Brand sponsorships for environmental challenges and reward pools', amount: revenueData.sponsorships },
                    { source: 'Recovery Partner Fees', desc: 'Facilitation fees from verified waste stream coordination', amount: revenueData.fees },
                  ].map(r => (
                    <div key={r.source} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.source}</p>
                        <p className="text-xs text-gray-500">{r.desc}</p>
                      </div>
                      <span className="text-sm font-bold text-primary-700">KES {r.amount.toLocaleString()}</span>
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
