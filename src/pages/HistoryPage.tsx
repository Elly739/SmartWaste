import { useEffect, useState } from 'react';
import {
  Recycle, Leaf, Zap,
  MapPin, AlertTriangle, RefreshCw, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Disposal, PointsTransaction } from '../types';

export default function HistoryPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [tab, setTab] = useState<'disposals' | 'points'>('disposals');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; disposals: number; points: number }[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadHistory();
  }, [profile?.id]);

  async function loadHistory() {
    setLoading(true);
    const [dispRes, txRes] = await Promise.all([
      supabase
        .from('disposals')
        .select('*, bins(location_name, qr_code), waste_categories(name, color, name_sw)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (dispRes.data) {
      setDisposals(dispRes.data as Disposal[]);
      buildMonthly(dispRes.data as Disposal[]);
    }
    if (txRes.data) setTransactions(txRes.data as PointsTransaction[]);
    setLoading(false);
  }

  function buildMonthly(data: Disposal[]) {
    const map: Record<string, { disposals: number; points: number }> = {};
    data.forEach(d => {
      const month = new Date(d.created_at).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      if (!map[month]) map[month] = { disposals: 0, points: 0 };
      map[month].disposals += 1;
      map[month].points += d.points_earned;
    });
    setMonthlyData(
      Object.entries(map).slice(0, 6).reverse().map(([month, vals]) => ({ month, ...vals }))
    );
  }

  const totalCO2 = disposals.reduce((sum, d) => sum + ((d as any).waste_categories?.co2_saved_per_unit ?? 0.085), 0);
  const totalPtsEarned = transactions.filter(t => t.type === 'earn' || t.type === 'bonus').reduce((s, t) => s + t.amount, 0);
  const totalPtsSpent = Math.abs(transactions.filter(t => t.type === 'redeem').reduce((s, t) => s + t.amount, 0));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">My History</h1>
        <p className="text-white/40 mt-1 text-sm">Track every disposal and point transaction.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Disposals', value: disposals.length, icon: Recycle, color: 'bg-blue-500/10 text-blue-400' },
          { label: 'CO₂ Saved (kg)', value: totalCO2.toFixed(1), icon: Leaf, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Points Earned', value: totalPtsEarned.toLocaleString(), icon: Zap, color: 'bg-primary-500/10 text-primary-400' },
          { label: 'Points Redeemed', value: totalPtsSpent.toLocaleString(), icon: TrendingUp, color: 'bg-purple-500/10 text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => {
          const [bgClass, textClass] = color.split(' ');
          return (
            <div key={label} className={`rounded-2xl ${bgClass} p-4 border border-white/5`}>
              <Icon size={20} className={textClass} />
              <p className={`text-2xl font-extrabold ${textClass} mt-2`}>{value}</p>
              <p className="text-[10px] text-white/20 font-bold mt-0.5 uppercase tracking-wider">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="font-bold text-white mb-5 text-sm">Monthly Activity</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#ffffff40' }} />
              <YAxis tick={{ fontSize: 11, fill: '#ffffff40' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', background: '#0f1d3d', border: '1px solid #ffffff10', color: '#fff' }} />
              <Bar dataKey="disposals" name="Disposals" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 w-fit border border-white/5">
        {([
          { key: 'disposals', label: `Disposals (${disposals.length})` },
          { key: 'points', label: `Points Log (${transactions.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === key ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-primary-500" />
        </div>
      ) : tab === 'disposals' ? (
        <div className="space-y-3">
          {disposals.length === 0 && (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-16">
              <Recycle size={40} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40">No disposals recorded yet.</p>
            </div>
          )}
          {disposals.map(d => (
            <div key={d.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-all">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${(d as any).waste_categories?.color ?? '#22c55e'}15` }}
              >
                <Recycle size={18} style={{ color: (d as any).waste_categories?.color ?? '#22c55e' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white text-sm">
                    {language === 'sw'
                      ? (d as any).waste_categories?.name_sw || (d as any).waste_categories?.name
                      : (d as any).waste_categories?.name ?? 'Waste'}
                  </p>
                  {d.is_flagged && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">
                      <AlertTriangle size={10} /> Flagged
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-white/20">
                  <MapPin size={11} />
                  <span className="truncate">{(d as any).bins?.location_name ?? 'Unknown'}</span>
                </div>
                <p className="text-xs text-white/15 mt-0.5">
                  {new Date(d.created_at).toLocaleString('en-KE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${d.is_flagged ? 'text-red-400 line-through' : 'text-primary-400'}`}>
                  +{d.points_earned} pts
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.length === 0 && (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-16">
              <Zap size={40} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40">No transactions yet.</p>
            </div>
          )}
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tx.type === 'earn' || tx.type === 'bonus' ? 'bg-primary-500/10' :
                tx.type === 'redeem' ? 'bg-red-500/10' : 'bg-white/5'
              }`}>
                <Zap size={16} className={
                  tx.type === 'earn' || tx.type === 'bonus' ? 'text-primary-400' :
                  tx.type === 'redeem' ? 'text-red-400' : 'text-white/20'
                } />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{tx.description ?? tx.type}</p>
                <p className="text-xs text-white/20 mt-0.5">
                  Balance after: {tx.balance_after.toLocaleString()} pts · {new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className={`text-sm font-extrabold flex-shrink-0 ${
                tx.amount > 0 ? 'text-primary-400' : 'text-red-400'
              }`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
