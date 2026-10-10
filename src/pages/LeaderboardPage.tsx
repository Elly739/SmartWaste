import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Flame, Users, RefreshCw, MapPin, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface LeaderEntry {
  id: string;
  full_name: string | null;
  username: string | null;
  total_points: number;
  lifetime_points: number;
  current_streak: number;
}

interface AreaOption {
  type: string;
  name: string;
  label: string;
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortTab, setSortTab] = useState<'points' | 'streak' | 'lifetime'>('points');
  const [scopeTab, setScopeTab] = useState<'global' | 'area'>('global');
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [userArea, setUserArea] = useState<string>('');

  useEffect(() => { loadAreas(); }, []);
  useEffect(() => { loadLeaderboard(); }, [sortTab, scopeTab, selectedArea]);

  async function loadAreas() {
    const { data } = await supabase
      .from('bins')
      .select('area_type, area_name')
      .not('area_type', 'is', null)
      .not('area_name', 'is', null);
    if (data) {
      const unique = Array.from(new Map(data.map(d => [`${d.area_type}:${d.area_name}`, d])).values());
      const opts = unique.map(d => ({ type: d.area_type, name: d.area_name, label: `${d.area_name} (${d.area_type})` }));
      setAreas(opts);
      if (opts.length > 0) setSelectedArea(opts[0].name);
    }
  }

  async function loadLeaderboard() {
    setLoading(true);
    if (scopeTab === 'area' && selectedArea) {
      const { data: areaBins } = await supabase.from('bins').select('id').eq('area_name', selectedArea);
      if (areaBins && areaBins.length > 0) {
        const binIds = areaBins.map(b => b.id);
        const { data: areaDisposals } = await supabase.from('disposals').select('user_id').in('bin_id', binIds);
        if (areaDisposals && areaDisposals.length > 0) {
          const userIds = [...new Set(areaDisposals.map(d => d.user_id))];
          const sortField = sortTab === 'points' ? 'total_points' : sortTab === 'streak' ? 'current_streak' : 'lifetime_points';
          const { data } = await supabase.from('profiles').select('id, full_name, username, total_points, lifetime_points, current_streak').in('id', userIds).order(sortField, { ascending: false }).limit(50);
          setLeaders(data as LeaderEntry[] ?? []);
        } else { setLeaders([]); }
      } else { setLeaders([]); }
    } else {
      const sortField = sortTab === 'points' ? 'total_points' : sortTab === 'streak' ? 'current_streak' : 'lifetime_points';
      const { data } = await supabase.from('profiles').select('id, full_name, username, total_points, lifetime_points, current_streak').order(sortField, { ascending: false }).limit(50);
      setLeaders(data as LeaderEntry[] ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function detectUserArea() {
      if (!profile) return;
      const { data: recentDisp } = await supabase.from('disposals').select('bin_id').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1);
      if (recentDisp && recentDisp.length > 0) {
        const { data: bin } = await supabase.from('bins').select('area_name').eq('id', recentDisp[0].bin_id).maybeSingle();
        if (bin?.area_name) setUserArea(bin.area_name);
      }
    }
    detectUserArea();
  }, [profile?.id]);

  const myRank = leaders.findIndex(l => l.id === profile?.id) + 1;

  function getMedal(rank: number) {
    if (rank === 1) return <Crown size={18} className="text-amber-400" />;
    if (rank === 2) return <Medal size={18} className="text-slate-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return null;
  }

  function getRowStyle(rank: number, isMe: boolean) {
    if (isMe) return 'bg-primary-500/10 border-2 border-primary-500/30';
    if (rank === 1) return 'bg-amber-500/5 border border-amber-500/20';
    if (rank === 2) return 'bg-slate-500/5 border border-white/5';
    if (rank === 3) return 'bg-orange-500/5 border border-orange-500/20';
    return 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t('leaderboard.title')}</h1>
        <p className="text-white/40 mt-1 text-sm">Top performers in the SmartWaste community.</p>
      </div>

      {/* My rank card */}
      {profile && myRank > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-primary-500/10 to-brand-800/10 border border-primary-500/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xl font-extrabold text-primary-400">#{myRank}</div>
            <div className="flex-1">
              <p className="text-white/50 text-sm font-medium">Your Rank{scopeTab === 'area' && selectedArea ? ` in ${selectedArea}` : ''}</p>
              <p className="text-xl font-extrabold text-white">{profile.full_name || profile.username || 'You'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white">{(profile.total_points ?? 0).toLocaleString()}</p>
              <p className="text-white/50 text-sm">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-4">
          {/* #2 */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-500/20 border-2 border-slate-400/40 flex items-center justify-center text-sm font-bold text-slate-300">
              {(leaders[1]?.full_name || leaders[1]?.username || '?')[0].toUpperCase()}
            </div>
            <div className="bg-slate-500/10 rounded-t-xl w-20 h-20 flex flex-col items-center justify-center border border-slate-400/20">
              <Medal size={20} className="text-slate-300" />
              <span className="text-xs font-bold text-slate-400 mt-1">#2</span>
              <span className="text-xs font-semibold text-slate-200">{(leaders[1]?.total_points ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs font-semibold text-white/60 text-center max-w-[80px] truncate">{leaders[1]?.full_name || leaders[1]?.username}</p>
          </div>

          {/* #1 */}
          <div className="flex flex-col items-center gap-2">
            <Crown size={24} className="text-amber-400" />
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-base font-bold text-amber-300">
              {(leaders[0]?.full_name || leaders[0]?.username || '?')[0].toUpperCase()}
            </div>
            <div className="bg-gradient-to-b from-amber-500/15 to-amber-600/5 rounded-t-xl w-24 h-28 flex flex-col items-center justify-center border border-amber-500/30">
              <Trophy size={24} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 mt-1">#1</span>
              <span className="text-sm font-extrabold text-amber-300">{(leaders[0]?.total_points ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs font-bold text-white text-center max-w-[96px] truncate">{leaders[0]?.full_name || leaders[0]?.username}</p>
          </div>

          {/* #3 */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-400/40 flex items-center justify-center text-sm font-bold text-orange-300">
              {(leaders[2]?.full_name || leaders[2]?.username || '?')[0].toUpperCase()}
            </div>
            <div className="bg-orange-500/10 rounded-t-xl w-20 h-16 flex flex-col items-center justify-center border border-orange-500/20">
              <Medal size={20} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400 mt-1">#3</span>
              <span className="text-xs font-semibold text-orange-300">{(leaders[2]?.total_points ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs font-semibold text-white/60 text-center max-w-[80px] truncate">{leaders[2]?.full_name || leaders[2]?.username}</p>
          </div>
        </div>
      )}

      {/* Scope tabs */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['global', 'area'] as const).map(s => (
            <button key={s} onClick={() => setScopeTab(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                scopeTab === s ? 'bg-primary-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
              }`}>
              {s === 'global' ? <><Globe size={14} /> Global</> : <><MapPin size={14} />By Area</>}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {([
            { key: 'points', label: 'Points' },
            { key: 'lifetime', label: 'All-Time' },
            { key: 'streak', label: 'Streak' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setSortTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                sortTab === key ? 'bg-primary-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Area selector */}
      {scopeTab === 'area' && (
        <div className="flex flex-wrap gap-2">
          {areas.map(a => (
            <button key={a.name} onClick={() => setSelectedArea(a.name)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                selectedArea === a.name ? 'bg-primary-600 text-white shadow-sm' : 'bg-white/5 border border-white/10 text-white/50 hover:border-primary-500/30 hover:text-white/70'
              }`}>
              <MapPin size={14} />
              {a.name}
              {a.name === userArea && <span className="text-xs opacity-70">(yours)</span>}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-primary-500" /></div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-white/30 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Name</div>
            <div className="col-span-3 text-right">{sortTab === 'streak' ? 'Streak' : 'Points'}</div>
            <div className="col-span-3 text-right hidden sm:block">{sortTab === 'streak' ? 'Current Pts' : 'Lifetime'}</div>
          </div>

          {leaders.map((leader, i) => {
            const isMe = leader.id === profile?.id;
            const rank = i + 1;
            return (
              <div key={leader.id} className={`grid grid-cols-12 items-center px-4 py-3 rounded-xl transition-colors ${getRowStyle(rank, isMe)}`}>
                <div className="col-span-1 flex items-center">
                  {getMedal(rank) ?? <span className="text-sm font-bold text-white/30">{rank}</span>}
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isMe ? 'bg-primary-500/30 text-primary-300 border border-primary-500/40' : 'bg-white/10 text-white/60 border border-white/10'}`}>
                    {(leader.full_name || leader.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary-300' : 'text-white'}`}>
                      {leader.full_name || leader.username || 'User'}
                      {isMe && <span className="text-primary-400 text-xs ml-1">(you)</span>}
                    </p>
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  {sortTab === 'streak' ? (
                    <div className="flex items-center justify-end gap-1">
                      <Flame size={14} className="text-orange-400" />
                      <span className="text-sm font-extrabold text-orange-400">{leader.current_streak}</span>
                    </div>
                  ) : sortTab === 'lifetime' ? (
                    <span className="text-sm font-extrabold text-white">{(leader.lifetime_points ?? 0).toLocaleString()}</span>
                  ) : (
                    <span className="text-sm font-extrabold text-primary-400">{(leader.total_points ?? 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="col-span-3 text-right hidden sm:block">
                  {sortTab === 'streak' ? (
                    <span className="text-xs text-white/30">{(leader.total_points ?? 0).toLocaleString()} pts</span>
                  ) : (
                    <span className="text-xs text-white/30">{(leader.lifetime_points ?? 0).toLocaleString()} total</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leaders.length === 0 && !loading && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 text-center py-16">
          <Users size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40">No data yet for this area. Be the first on the board!</p>
        </div>
      )}
    </div>
  );
}
