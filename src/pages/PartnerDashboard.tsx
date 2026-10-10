import { useEffect, useState } from 'react';
import {
  Building2, QrCode, Recycle, TrendingUp, MapPin,
  RefreshCw, CheckCircle, Clock, Leaf, Plus,
  FileText, Package, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getWasteIcon } from '../lib/wasteIcons';
import type { Bin, CollectionPartner, CollectionRequest, RecoveryReport } from '../types';

const darkTooltipStyle = {
  borderRadius: '12px', fontSize: '12px', backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
};

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const [partner, setPartner] = useState<CollectionPartner | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [recentDisposals, setRecentDisposals] = useState<any[]>([]);
  const [collectionRequests, setCollectionRequests] = useState<CollectionRequest[]>([]);
  const [recoveryReports, setRecoveryReports] = useState<RecoveryReport[]>([]);
  const [stats, setStats] = useState({ totalBins: 0, totalCollections: 0, lastWeek: 0, co2: 0 });
  const [weeklyData, setWeeklyData] = useState<{ date: string; collections: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBin, setUpdatingBin] = useState<string | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequestBin, setNewRequestBin] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [showNewReport, setShowNewReport] = useState(false);
  const [newReport, setNewReport] = useState({ waste_category_id: '', quantity: '', weight_kg: '', items_recovered: '', items_recycled: '', notes: '' });
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => { loadData(); }, [profile?.id]);

  async function loadData() {
    if (!profile?.partner_id) { setLoading(false); return; }
    setLoading(true);

    const [partnerRes, binsRes] = await Promise.all([
      supabase.from('collection_partners').select('*').eq('id', profile.partner_id).maybeSingle(),
      supabase.from('bins').select('*, waste_categories(name, color)').eq('partner_id', profile.partner_id),
    ]);

    if (partnerRes.data) setPartner(partnerRes.data as CollectionPartner);
    const binsData = (binsRes.data ?? []) as Bin[];
    setBins(binsData);

    if (binsData.length > 0) {
      const binIds = binsData.map(b => b.id);
      const [disposalsRes, collReqRes, reportsRes] = await Promise.all([
        supabase.from('disposals').select('id, created_at, points_earned, bins(location_name, qr_code), waste_categories(name, color), profiles(full_name, username)').in('bin_id', binIds).order('created_at', { ascending: false }).limit(50),
        supabase.from('collection_requests').select('*, bins(location_name, qr_code)').eq('partner_id', profile.partner_id!).order('requested_at', { ascending: false }).limit(20),
        supabase.from('recovery_reports').select('*').eq('partner_id', profile.partner_id!).order('created_at', { ascending: false }).limit(20),
      ]);

      const disposals = disposalsRes.data ?? [];
      setRecentDisposals(disposals);
      setCollectionRequests(collReqRes.data as CollectionRequest[] ?? []);
      setRecoveryReports(reportsRes.data as RecoveryReport[] ?? []);

      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const lastWeek = disposals.filter((d: any) => new Date(d.created_at) > weekAgo).length;
      const totalCollections = binsData.reduce((s, b) => s + (b.total_collections ?? 0), 0);
      setStats({ totalBins: binsData.length, totalCollections, lastWeek, co2: disposals.length * 0.21 });

      const daily: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); daily[d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })] = 0; }
      disposals.forEach((d: any) => { const key = new Date(d.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }); if (daily[key] !== undefined) daily[key]++; });
      setWeeklyData(Object.entries(daily).map(([date, collections]) => ({ date, collections })));
    }
    setLoading(false);
  }

  async function markCollected(binId: string) {
    setUpdatingBin(binId);
    await supabase.from('bins').update({ last_collection_at: new Date().toISOString() }).eq('id', binId);
    setBins(prev => prev.map(b => b.id === binId ? { ...b, last_collection_at: new Date().toISOString() } : b));
    setUpdatingBin(null);
  }

  async function updateRequestStatus(id: string, status: 'accepted' | 'in_progress' | 'completed' | 'cancelled') {
    const updates: any = { status };
    if (status === 'accepted') updates.accepted_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('collection_requests').update(updates).eq('id', id);
    setCollectionRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  async function submitCollectionRequest() {
    if (!newRequestBin || !profile?.partner_id) return;
    setSubmittingRequest(true);
    await supabase.from('collection_requests').insert({ bin_id: newRequestBin, partner_id: profile.partner_id, requested_by: profile.id, status: 'pending' });
    setShowNewRequest(false); setNewRequestBin(''); await loadData(); setSubmittingRequest(false);
  }

  async function submitRecoveryReport() {
    if (!profile?.partner_id) return;
    setSubmittingReport(true);
    await supabase.from('recovery_reports').insert({
      partner_id: profile.partner_id,
      waste_category_id: newReport.waste_category_id || null,
      quantity: parseInt(newReport.quantity) || 0,
      weight_kg: parseFloat(newReport.weight_kg) || null,
      items_recovered: parseInt(newReport.items_recovered) || 0,
      items_recycled: parseInt(newReport.items_recycled) || 0,
      co2_saved_kg: (parseInt(newReport.items_recycled) || 0) * 0.21,
      notes: newReport.notes || null,
    });
    setShowNewReport(false);
    setNewReport({ waste_category_id: '', quantity: '', weight_kg: '', items_recovered: '', items_recycled: '', notes: '' });
    await loadData(); setSubmittingReport(false);
  }

  if (!profile?.partner_id && !loading) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-20">
        <Building2 size={48} className="text-white/15 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white/80 mb-2">No Partner Account Linked</h2>
        <p className="text-white/40 text-sm">Contact admin to link your account to a partner organization.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Bins', value: stats.totalBins, icon: QrCode, color: '#3b82f6' },
    { label: 'Total Collections', value: stats.totalCollections.toLocaleString(), icon: Recycle, color: '#22c55e' },
    { label: 'This Week', value: stats.lastWeek, icon: TrendingUp, color: '#f97316' },
    { label: 'CO₂ Impact (kg)', value: stats.co2.toFixed(1), icon: Leaf, color: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0"><Building2 size={26} className="text-primary-400" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{partner?.name ?? 'Partner Portal'}</h1>
          <p className="text-white/40 mt-1 text-sm">{partner?.description}</p>
          {partner?.contact_email && <p className="text-xs text-white/30 mt-1">{partner.contact_email} · {partner.contact_phone}</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={28} className="animate-spin text-primary-500" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}30` }}><Icon size={18} style={{ color }} /></div>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-white/40 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Weekly Chart */}
          {weeklyData.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
              <h2 className="font-bold text-white mb-5">Weekly Collection Activity</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                  <Tooltip contentStyle={darkTooltipStyle} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                  <Bar dataKey="collections" name="Collections" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Collection Requests */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Collection Requests</h2>
              <button onClick={() => setShowNewRequest(!showNewRequest)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors"><Plus size={16} /> New Request</button>
            </div>

            {showNewRequest && (
              <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-primary-500/20">
                <p className="text-sm font-semibold text-white mb-3">Request Collection</p>
                <select value={newRequestBin} onChange={e => setNewRequestBin(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-all mb-3">
                  <option value="">Select bin...</option>
                  {bins.map(b => <option key={b.id} value={b.id}>{b.location_name} ({b.qr_code})</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewRequest(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-semibold transition-all">Cancel</button>
                  <button onClick={submitCollectionRequest} disabled={submittingRequest || !newRequestBin} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                    {submittingRequest ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Submit
                  </button>
                </div>
              </div>
            )}

            {collectionRequests.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">No collection requests yet.</p>
            ) : (
              <div className="space-y-3">
                {collectionRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${req.status === 'completed' ? 'bg-primary-500/15' : req.status === 'in_progress' ? 'bg-blue-500/15' : req.status === 'pending' ? 'bg-amber-500/15' : 'bg-white/5'}`}>
                      <Package size={18} className={req.status === 'completed' ? 'text-primary-400' : req.status === 'in_progress' ? 'text-blue-400' : 'text-amber-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{(req as any).bins?.location_name ?? 'Bin'}</p>
                      <p className="text-xs text-white/40 mt-0.5">{(req as any).bins?.qr_code} · Requested {new Date(req.requested_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${req.status === 'completed' ? 'bg-primary-500/15 text-primary-400' : req.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' : req.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-white/40'}`}>{req.status.replace('_', ' ')}</span>
                      {req.status === 'pending' && <button onClick={() => updateRequestStatus(req.id, 'accepted')} className="px-2 py-1 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-500 transition-colors">Accept</button>}
                      {req.status === 'accepted' && <button onClick={() => updateRequestStatus(req.id, 'in_progress')} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors">Start</button>}
                      {req.status === 'in_progress' && <button onClick={() => updateRequestStatus(req.id, 'completed')} className="px-2 py-1 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-500 transition-colors">Complete</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recovery Reports */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Recovery Reports</h2>
              <button onClick={() => setShowNewReport(!showNewReport)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-semibold transition-all"><FileText size={16} /> New Report</button>
            </div>

            {showNewReport && (
              <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-blue-500/20">
                <p className="text-sm font-semibold text-white mb-3">Submit Recovery Report</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1">Quantity</label>
                    <input type="number" value={newReport.quantity} onChange={e => setNewReport(p => ({ ...p, quantity: e.target.value }))} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1">Weight (kg)</label>
                    <input type="number" step="0.1" value={newReport.weight_kg} onChange={e => setNewReport(p => ({ ...p, weight_kg: e.target.value }))} placeholder="0.0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1">Items Recovered</label>
                    <input type="number" value={newReport.items_recovered} onChange={e => setNewReport(p => ({ ...p, items_recovered: e.target.value }))} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1">Items Recycled</label>
                    <input type="number" value={newReport.items_recycled} onChange={e => setNewReport(p => ({ ...p, items_recycled: e.target.value }))} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-white/50 mb-1">Notes</label>
                    <input type="text" value={newReport.notes} onChange={e => setNewReport(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 transition-all" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowNewReport(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm font-semibold transition-all">Cancel</button>
                  <button onClick={submitRecoveryReport} disabled={submittingReport} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                    {submittingReport ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />} Submit Report
                  </button>
                </div>
              </div>
            )}

            {recoveryReports.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">No recovery reports yet.</p>
            ) : (
              <div className="space-y-3">
                {recoveryReports.map(report => (
                  <div key={report.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Leaf size={16} className="text-emerald-400" /></div>
                        <div>
                          <p className="text-sm font-semibold text-white">Report — {new Date(report.report_date).toLocaleDateString()}</p>
                          <p className="text-xs text-white/40">{report.quantity} items · {report.weight_kg ?? '—'} kg</p>
                        </div>
                      </div>
                      {expandedReport === report.id ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                    </div>
                    {expandedReport === report.id && (
                      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><p className="text-xs text-white/30">Recovered</p><p className="text-sm font-bold text-white">{report.items_recovered}</p></div>
                        <div><p className="text-xs text-white/30">Recycled</p><p className="text-sm font-bold text-white">{report.items_recycled}</p></div>
                        <div><p className="text-xs text-white/30">CO₂ Saved</p><p className="text-sm font-bold text-emerald-400">{report.co2_saved_kg} kg</p></div>
                        <div><p className="text-xs text-white/30">Weight</p><p className="text-sm font-bold text-white">{report.weight_kg ?? '—'} kg</p></div>
                        {report.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-white/30">Notes</p><p className="text-sm text-white/60">{report.notes}</p></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bins */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <h2 className="font-bold text-white text-lg mb-5">My Assigned Bins</h2>
            {bins.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No bins assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {bins.map(bin => {
                  const lastCollect = bin.last_collection_at ? new Date(bin.last_collection_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : 'Never';
                  const daysSince = bin.last_collection_at ? Math.floor((Date.now() - new Date(bin.last_collection_at).getTime()) / 86400000) : 999;
                  return (
                    <div key={bin.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${daysSince > 7 ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                      <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0"><QrCode size={18} className="text-primary-400" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{bin.location_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs font-mono text-white/40">{bin.qr_code}</span>
                          <span className="text-xs text-white/30">{(bin as any).waste_categories?.name ?? 'General'}</span>
                          <span className={`text-xs font-medium flex items-center gap-1 ${daysSince > 7 ? 'text-orange-400' : 'text-white/30'}`}><Clock size={11} />Last: {lastCollect}</span>
                          <span className="text-xs text-primary-400 font-semibold">{bin.total_collections} items</span>
                        </div>
                      </div>
                      <button onClick={() => markCollected(bin.id)} disabled={updatingBin === bin.id} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors flex-shrink-0 disabled:opacity-60">
                        {updatingBin === bin.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />} Collected
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Collections */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <h2 className="font-bold text-white text-lg mb-5">Recent Collections</h2>
            {recentDisposals.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No collection events recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentDisposals.slice(0, 10).map(d => {
                  const wConfig = getWasteIcon(d.waste_categories?.name);
                  const WIcon = wConfig.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${wConfig.color}20`, border: `1px solid ${wConfig.color}25` }}>
                        <WIcon size={16} style={{ color: wConfig.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{d.waste_categories?.name ?? 'Waste'}</p>
                        <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                          <MapPin size={11} /><span className="truncate">{d.bins?.location_name ?? 'Unknown'}</span>
                          <span>·</span><span>{d.profiles?.full_name || d.profiles?.username || 'User'}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-primary-400">+{d.points_earned} pts</p>
                        <p className="text-xs text-white/30">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
