import { useEffect, useState } from 'react';
import {
  Gift, Tag, Package, Zap, CheckCircle, AlertCircle,
  RefreshCw, Star, Clock, Search, Diamond, Ticket,
  Sparkles, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Reward, RewardRedemption, SponsoredCampaign } from '../types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  coupon: <Tag size={16} />,
  discount: <Zap size={16} />,
  merchandise: <Package size={16} />,
  cash: <Star size={16} />,
  partner: <Gift size={16} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  coupon: 'Coupons',
  discount: 'Discounts',
  merchandise: 'Merch',
  cash: 'Cash/Airtime',
  partner: 'Partner',
};

const CATEGORY_COLORS: Record<string, string> = {
  coupon: 'from-blue-500 to-blue-600',
  discount: 'from-gold-500 to-amber-600',
  merchandise: 'from-purple-500 to-purple-600',
  cash: 'from-emerald-500 to-emerald-600',
  partner: 'from-primary-500 to-primary-600',
};

export default function RewardsPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [activeTab, setActiveTab] = useState<'store' | 'myrewards'>('store');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<SponsoredCampaign[]>([]);

  useEffect(() => { loadData(); loadCampaigns(); }, [profile?.id]);

  async function loadCampaigns() {
    try {
      const { data, error: err } = await supabase.from('sponsored_campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (err) { console.error('Campaigns load error:', err); return; }
      if (data) setCampaigns(data as SponsoredCampaign[]);
    } catch (e) { console.error('Campaigns load failed:', e); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        supabase.from('rewards').select('*, collection_partners(name)').eq('is_active', true).order('points_cost'),
        profile ? supabase.from('reward_redemptions').select('*, rewards(title, category, points_cost)').eq('user_id', profile.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (rewardsRes.error) console.error('Rewards load error:', rewardsRes.error);
      if (redemptionsRes.error) console.error('Redemptions load error:', redemptionsRes.error);
      setRewards((rewardsRes.data ?? []) as Reward[]);
      setRedemptions(((redemptionsRes.data as RewardRedemption[]) ?? []));
    } catch (e) {
      console.error('Rewards data load failed:', e);
      setRewards([]);
      setRedemptions([]);
    }
    setLoading(false);
  }

  async function redeemReward(reward: Reward) {
    if (!profile) return;
    if ((profile.total_points ?? 0) < reward.points_cost) {
      setError(`You need ${reward.points_cost - (profile.total_points ?? 0)} more points to redeem this reward.`);
      return;
    }
    setRedeeming(reward.id);
    setError('');

    const { data: result, error: rpcErr } = await supabase.rpc('redeem_reward', {
      p_reward_id: reward.id,
    });

    if (rpcErr) {
      setError('Could not redeem this reward. Please try again.');
      setRedeeming(null);
      return;
    }

    await refreshProfile();
    await loadData();
    setSuccess(`Successfully redeemed "${reward.title}"! Your code: ${(result as any)?.redemption_code}`);
    setRedeeming(null);
    setActiveTab('myrewards');
  }

  const filtered = (rewards ?? []).filter(r => {
    if (!r) return false;
    const matchCat = filter === 'all' || r.category === filter;
    const matchSearch = (r.title ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const canAfford = (pts: number) => (profile?.total_points ?? 0) >= pts;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sponsored Campaigns */}
      {campaigns.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-primary-500/10 via-blue-500/5 to-transparent border border-primary-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-primary-400" />
            <h2 className="font-bold text-white text-sm">Sponsored Campaigns</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {campaigns.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary-400">{c.sponsor_name}</span>
                </div>
                <p className="font-bold text-white text-sm">{c.campaign_title}</p>
                <p className="text-xs text-white/40 mt-1">{c.description ?? ''}</p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="font-bold text-primary-400">{(c.reward_pool_points ?? 0).toLocaleString()} pts pool</span>
                  {c.end_date && (
                    <span className="text-white/30 flex items-center gap-1"><Calendar size={11} />Ends {new Date(c.end_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t('rewards.title')}</h1>
          <p className="text-white/40 mt-1 text-sm">Redeem your points for real rewards.</p>
        </div>
        {/* Points Balance Card */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-500/10 to-primary-600/10 border border-primary-500/20 px-5 py-3.5 self-start shadow-lg shadow-primary-500/5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Available Points</p>
            <p className="text-xl font-extrabold text-primary-400">{(profile?.total_points ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-300 text-sm font-medium">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 w-fit border border-white/5">
        {(['store', 'myrewards'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab === 'store' ? 'Rewards Store' : `${t('rewards.myrewards')} (${redemptions.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'store' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                placeholder="Search rewards..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    filter === key ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 border border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rewards Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-primary-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-16">
              <Gift size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-bold text-sm">No rewards available</p>
              <p className="text-white/20 text-sm mt-1">Check back later for new rewards.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(reward => {
                const affordable = canAfford(reward.points_cost);
                const colorGrad = CATEGORY_COLORS[reward.category] || 'from-primary-500 to-primary-600';
                return (
                  <div
                    key={reward.id}
                    className={`rounded-3xl p-5 border transition-all duration-300 group ${
                      affordable
                        ? 'bg-white/[0.03] border-white/5 hover:border-primary-500/20 hover:bg-white/[0.05]'
                        : 'bg-white/[0.02] border-white/5 opacity-60'
                    }`}
                  >
                    {/* Category badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${colorGrad} text-white`}>
                        {CATEGORY_ICONS[reward.category]}
                        {CATEGORY_LABELS[reward.category]}
                      </span>
                      {reward.expires_at && (
                        <div className="flex items-center gap-1 text-[10px] text-white/20">
                          <Clock size={11} />
                          <span>Expires {new Date(reward.expires_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-[15px] mb-1.5 leading-snug">{reward.title}</h3>
                    <p className="text-sm text-white/30 mb-4 leading-relaxed">{reward.description ?? ''}</p>

                    {(reward as any).collection_partners?.name && (
                      <p className="text-[11px] text-white/20 mb-3 flex items-center gap-1">
                        <Diamond size={10} /> Partner: {(reward as any).collection_partners.name}
                      </p>
                    )}

                    {/* Points & Redeem */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div>
                        <p className="text-xl font-black text-primary-400">{(reward.points_cost ?? 0).toLocaleString()}</p>
                        <p className="text-[10px] text-white/20 font-bold">{t('rewards.points')}</p>
                      </div>
                      <button
                        onClick={() => redeemReward(reward)}
                        disabled={!affordable || redeeming === reward.id}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          affordable
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white shadow-lg shadow-primary-500/20'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {redeeming === reward.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Gift size={14} />
                        )}
                        {affordable ? t('rewards.redeem') : 'Need more'}
                      </button>
                    </div>

                    {reward.stock_count != null && reward.stock_count !== -1 && reward.stock_count > 0 && (
                      <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
                        <Ticket size={10} /> {Math.max(reward.stock_count - (reward.redemption_count ?? 0), 0)} left
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'myrewards' && (
        <div className="space-y-3">
          {redemptions.length === 0 ? (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-16">
              <Gift size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-bold text-sm">No redemptions yet</p>
              <p className="text-white/20 text-sm mt-1">Earn points by disposing waste and redeem them here.</p>
            </div>
          ) : (
            redemptions.map(r => (
              <div key={r.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:border-white/10 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 flex items-center justify-center flex-shrink-0 border border-primary-500/10">
                  <Gift size={22} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{(r as any).rewards?.title ?? 'Reward'}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Code: <span className="font-mono font-bold text-primary-400">{r.redemption_code ?? 'N/A'}</span>
                  </p>
                  <p className="text-[10px] text-white/15">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-400">-{r.points_spent ?? 0} pts</p>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold mt-1 ${
                    r.status === 'fulfilled' ? 'bg-green-500/10 text-green-400' :
                    r.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                    r.status === 'expired' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/30'
                  }`}>
                    {(r.status ?? 'pending').charAt(0).toUpperCase() + (r.status ?? 'pending').slice(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
