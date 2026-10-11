import { useState, useRef, useEffect } from 'react';
import {
  User, Mail, Phone, Globe, Flame, Zap,
  Leaf, Recycle, Calendar, Edit3, Check, X, RefreshCw,
  ShieldCheck, Building2, ChevronRight, LogOut, History,
  Camera, Award, TrendingUp, MapPin, Sprout, Crown,
  Rocket, Target, Atom, Brain, Star, Medal, Diamond
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Page, UserAchievement } from '../types';

const LEVELS: { level: number; xp: number; title: string; icon: LucideIcon; color: string }[] = [
  { level: 1, xp: 0, title: 'Newcomer', icon: Sprout, color: '#22c55e' },
  { level: 2, xp: 100, title: 'Recycler', icon: Recycle, color: '#10b981' },
  { level: 3, xp: 300, title: 'Eco Warrior', icon: Leaf, color: '#84cc16' },
  { level: 4, xp: 600, title: 'Green Champion', icon: ShieldCheck, color: '#22c55e' },
  { level: 5, xp: 1000, title: 'Planet Saver', icon: Globe, color: '#3b82f6' },
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

const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  'recycle': Recycle, 'leaf': Leaf, 'flame': Flame, 'zap': Zap,
  'trophy': Award, 'star': Star, 'medal': Medal, 'crown': Crown,
  'target': Target, 'rocket': Rocket, 'diamond': Diamond, 'sprout': Sprout,
  'award': Award, 'atom': Atom, 'brain': Brain,
};

interface Props { onNavigate?: (page: Page) => void; }

export default function ProfilePage({ onNavigate }: Props) {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.id) loadAchievements();
  }, [profile?.id]);

  async function loadAchievements() {
    if (!profile) return;
    setLoadingAchievements(true);
    const { data } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', profile.id)
      .order('earned_at', { ascending: false });
    if (data) setAchievements(data as UserAchievement[]);
    setLoadingAchievements(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB.');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    const ext = file.name.split('.').pop();
    const filePath = `${profile.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (upErr) {
      setError('Could not upload photo. Please try again.');
      setUploadingPhoto(false);
      return;
    }

    const { data: pubData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = `${pubData.publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (dbErr) {
      setError('Photo uploaded but could not update profile.');
    } else {
      await refreshProfile();
      setSuccess('Profile photo updated!');
      setTimeout(() => setSuccess(''), 3000);
    }
    setUploadingPhoto(false);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setError('');

    if (bio.length > 160) {
      setError('Bio must be 160 characters or less.');
      setSaving(false);
      return;
    }

    const updateData: Record<string, string | null> = {
      full_name: fullName,
      username,
      phone,
      bio,
      language,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateErr) {
      if (updateErr.code === '23505') {
        setError('That username is already taken.');
      } else {
        setError('Could not save your profile. Please try again.');
      }
    } else {
      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  function startEditing() {
    setFullName(profile?.full_name ?? '');
    setUsername(profile?.username ?? '');
    setPhone(profile?.phone ?? '');
    setBio(profile?.bio ?? '');
    setEditing(true);
    setError('');
  }

  const memberSince = profile ? new Date(profile.created_at).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : '';

  const co2Saved = ((profile?.lifetime_points ?? 0) * 0.085).toFixed(1);
  const estimatedDisposals = profile?.lifetime_points ? Math.round(profile.lifetime_points / 15) : 0;
  const lifetimePoints = profile?.lifetime_points ?? 0;
  const levelInfo = getLevel(lifetimePoints);
  const LevelIcon = levelInfo.current.icon;

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || profile?.username || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  const stats = [
    { label: 'Points', value: (profile?.total_points ?? 0).toLocaleString() },
    { label: 'Disposals', value: estimatedDisposals.toLocaleString() },
    { label: 'CO₂ kg', value: co2Saved },
    { label: 'Streak', value: `${profile?.current_streak ?? 0}d` },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm font-medium animate-fade-in">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Profile Header — IG-style cover + avatar */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 overflow-hidden">
        {/* Cover Banner */}
        <div className="relative h-32 md:h-40 bg-gradient-to-br from-primary-600 via-brand-800 to-primary-900 overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
            }}
          />
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md ${
              profile?.role === 'admin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
              profile?.role === 'partner' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
              profile?.role === 'institution' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
              'bg-white/15 text-white border border-white/20'
            }`}>
              {profile?.role === 'admin' && <ShieldCheck size={11} />}
              {profile?.role === 'partner' && <Building2 size={11} />}
              {profile?.role?.charAt(0).toUpperCase() + (profile?.role?.slice(1) ?? '')}
            </span>
          </div>
        </div>

        {/* Avatar + Info */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-12 mb-3">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-[#0a1628] overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary-500 to-brand-800 shadow-xl shadow-primary-500/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-white">{initials}</span>
                )}
              </div>
              {uploadingPhoto ? (
                <div className="absolute inset-0 rounded-full border-4 border-[#0a1628] bg-black/50 flex items-center justify-center">
                  <RefreshCw size={20} className="text-white animate-spin" />
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-500 flex items-center justify-center shadow-lg transition-all active:scale-90 border-2 border-[#0a1628]"
                  title="Change photo"
                >
                  <Camera size={14} className="text-white" />
                </button>
              )}
            </div>

            {/* Edit Button */}
            {!editing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-all border border-white/5 mb-1"
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
          </div>

          {/* Name + Username */}
          <div className="space-y-0.5">
            <h2 className="text-xl font-extrabold text-white">{displayName}</h2>
            <p className="text-sm text-white/40">
              @{profile?.username || 'username'}
            </p>
          </div>

          {/* Bio */}
          {profile?.bio ? (
            <p className="text-sm text-white/60 mt-2 leading-relaxed">{profile.bio}</p>
          ) : (
            !editing && <p className="text-sm text-white/20 mt-2 italic">No bio yet. Tap edit to add one.</p>
          )}

          {/* Meta Row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <Calendar size={11} /> {memberSince}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <Mail size={11} /> {user?.email}
            </span>
          </div>
        </div>

        {/* Stats Bar — IG-style numbers row */}
        <div className="grid grid-cols-4 border-t border-white/5 divide-x divide-white/5">
          {stats.map(({ label, value }) => (
            <div key={label} className="text-center py-4 px-2 hover:bg-white/[0.02] transition-colors">
              <p className="text-lg md:text-xl font-extrabold text-white">{value}</p>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level / XP Progress Card */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-500/10 via-primary-600/5 to-brand-800/10 border border-primary-500/20 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${levelInfo.current.color}, ${levelInfo.current.color}dd)`, boxShadow: `0 8px 24px ${levelInfo.current.color}30` }}
          >
            <LevelIcon size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-black text-xs uppercase tracking-wider">Level {levelInfo.current.level}</span>
              <span className="text-white/40 text-xs">·</span>
              <span className="text-white font-bold text-sm truncate">{levelInfo.current.title}</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              <Zap size={12} className="text-primary-400" />
              <span className="text-sm font-bold text-primary-400">{lifetimePoints.toLocaleString()} XP</span>
              {levelInfo.next && levelInfo.next.level <= 10 && (
                <span className="text-white/30 text-xs ml-2 flex items-center gap-1">
                  <TrendingUp size={10} />
                  {(levelInfo.next.xp - lifetimePoints).toLocaleString()} to Lv {levelInfo.next.level}
                </span>
              )}
            </div>
            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Achievements — IG Highlights Style */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
        <h2 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
          <Award size={16} className="text-primary-400" />
          Achievements
        </h2>
        {loadingAchievements ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                <div className="w-12 h-2 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : achievements.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {achievements.map(ua => {
              const ach = ua.achievements;
              if (!ach) return null;
              const iconKey = ach.icon?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
              const Icon = ACHIEVEMENT_ICON_MAP[iconKey] ?? Award;
              const color = ach.color || '#22c55e';
              return (
                <div key={ua.id} className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-default">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-105"
                    style={{ borderColor: `${color}40`, background: `${color}15` }}
                  >
                    <Icon size={24} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-semibold text-white/50 text-center max-w-[64px] truncate">
                    {ach.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Award size={24} className="text-white/15" />
            </div>
            <p className="text-sm text-white/30">No achievements yet.</p>
            <p className="text-xs text-white/20 mt-1">Keep disposing to earn your first badge!</p>
          </div>
        )}
      </div>

      {/* Streak Banner */}
      {(profile?.current_streak ?? 0) > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Flame size={28} className="text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">Current Streak</p>
              <p className="text-2xl font-extrabold text-amber-400">{profile?.current_streak} days</p>
              <p className="text-amber-400/40 text-xs mt-0.5">Keep it up! Dispose today to maintain your streak.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Panel */}
      {editing && (
        <div className="rounded-3xl bg-white/[0.03] border border-primary-500/20 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-base">Edit Profile</h2>
            <button
              onClick={() => { setEditing(false); setError(''); }}
              className="text-white/30 hover:text-white/60 text-sm font-semibold"
            >
              <X size={18} />
            </button>
          </div>

          {/* Photo quick-change in edit mode */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 flex items-center justify-center bg-gradient-to-br from-primary-500 to-brand-800">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-white">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {uploadingPhoto ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>

          {[
            { label: 'Full Name', type: 'text', value: fullName, onChange: setFullName, placeholder: 'Your full name' },
            { label: 'Username', type: 'text', value: username, onChange: setUsername, placeholder: 'your_username' },
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

          {/* Bio Input */}
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-wider mb-1.5">
              Bio <span className="text-white/20 font-normal normal-case tracking-normal">({bio.length}/160)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell people about yourself..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/15 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all resize-none"
            />
          </div>

          {/* Language Toggle */}
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
                  {lang === 'en' ? 'English' : 'Kiswahili'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
              <X size={14} /> {error}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setEditing(false); setError(''); }}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Account Info (read-only when not editing) */}
      {!editing && (
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="font-bold text-white text-sm mb-3">Account Details</h2>
          <div className="space-y-1">
            {[
              { icon: User, label: 'Full Name', value: profile?.full_name ?? 'Not set' },
              { icon: Mail, label: 'Email', value: user?.email ?? '—' },
              { icon: Phone, label: 'Phone', value: profile?.phone ?? 'Not set' },
              { icon: Globe, label: 'Language', value: language === 'en' ? 'English' : 'Kiswahili' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-white truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links + Sign Out */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
        <h2 className="font-bold text-white text-sm mb-3">Quick Links</h2>
        <div className="space-y-1">
          {onNavigate && (
            <button onClick={() => onNavigate('history')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <History size={17} className="text-white/30" />
              <span className="text-sm font-medium text-white/60 flex-1">Disposal History</span>
              <ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          {profile?.role === 'admin' && onNavigate && (
            <button onClick={() => onNavigate('admin')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <ShieldCheck size={17} className="text-red-400" />
              <span className="text-sm font-medium text-white/60 flex-1">Admin Dashboard</span>
              <ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          {profile?.role === 'partner' && onNavigate && (
            <button onClick={() => onNavigate('partner')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <Building2 size={17} className="text-blue-400" />
              <span className="text-sm font-medium text-white/60 flex-1">Partner Dashboard</span>
              <ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          {profile?.role === 'institution' && onNavigate && (
            <button onClick={() => onNavigate('institution')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <Building2 size={17} className="text-purple-400" />
              <span className="text-sm font-medium text-white/60 flex-1">Institution Dashboard</span>
              <ChevronRight size={14} className="text-white/10" />
            </button>
          )}
          <button
            onClick={async () => { await signOut(); onNavigate?.('landing'); }}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/5 transition-colors text-left"
          >
            <LogOut size={17} className="text-red-400" />
            <span className="text-sm font-medium text-red-400 flex-1">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
