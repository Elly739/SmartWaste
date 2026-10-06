import { useState, useEffect, useRef } from 'react';
import {
  QrCode, MapPin, Check, ChevronRight,
  AlertCircle, RefreshCw, Recycle, Camera, CameraOff,
  Sparkles, Zap, Leaf, Target, PartyPopper, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Bin, WasteCategory, CategoryLimit, Page } from '../types';

// Confetti particle component
function Confetti({ count = 50 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
    size: Math.random() * 8 + 4,
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 6)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

interface DisposalPageProps {
  onNavigate: (page: Page) => void;
}

type Step = 'scan' | 'category' | 'confirm' | 'success';

const BIN_ICONS: Record<string, string> = {
  'Plastic Bottles': '♻️',
  'Paper & Cardboard': '📄',
  'Metal & Aluminum': '🔩',
  'Glass': '🫙',
  'Organic Waste': '🌿',
  'Electronic Waste': '💻',
  'LED Bulbs': '💡',
  'Batteries': '🔋',
};

export default function DisposalPage({ onNavigate }: DisposalPageProps) {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();

  const [step, setStep] = useState<Step>('scan');
  const [qrInput, setQrInput] = useState('');
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [categories, setCategories] = useState<WasteCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<WasteCategory | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [limits, setLimits] = useState<CategoryLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showBinList, setShowBinList] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'ok' | 'denied'>('idle');
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<any>(null);

  useEffect(() => { loadData(); requestLocation(); }, []);

  async function loadData() {
    const [binsRes, catsRes, limitsRes] = await Promise.all([
      supabase.from('bins').select('*, waste_categories(*), collection_partners(name)').eq('is_active', true),
      supabase.from('waste_categories').select('*').eq('is_active', true).order('name'),
      supabase.from('category_limits').select('*').eq('is_active', true),
    ]);
    if (binsRes.data) setBins(binsRes.data as Bin[]);
    if (catsRes.data) setCategories(catsRes.data as WasteCategory[]);
    if (limitsRes.data) setLimits(limitsRes.data as CategoryLimit[]);
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('getting');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('ok'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    if (step !== 'scan' || !cameraActive) {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
      return;
    }
    let cancelled = false;
    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled || !scannerRef.current) return;
        const scanner = new Html5Qrcode('qr-scanner-container');
        scannerInstanceRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => { setQrInput(decodedText); setCameraActive(false); scanner.stop().catch(() => {}); },
          () => {}
        );
      } catch {
        setError('Camera access denied. Use manual QR entry instead.');
        setCameraActive(false);
      }
    }
    startScanner();
    return () => { cancelled = true; if (scannerInstanceRef.current) { scannerInstanceRef.current.stop().catch(() => {}); scannerInstanceRef.current = null; } };
  }, [step, cameraActive]);

  function stopCamera() {
    if (scannerInstanceRef.current) { scannerInstanceRef.current.stop().catch(() => {}); scannerInstanceRef.current = null; }
    setCameraActive(false);
  }

  async function handleQRScan() {
    if (!qrInput.trim()) { setError('Please enter a QR code or scan using the camera.'); return; }
    setLoading(true); setError('');
    const { data, error } = await supabase.from('bins').select('*, waste_categories(*), collection_partners(name)').eq('qr_code', qrInput.trim()).eq('is_active', true).maybeSingle();
    if (error || !data) { setError('Bin not found. Please check the QR code and try again.'); setLoading(false); return; }
    setSelectedBin(data as Bin);
    if (data.waste_categories) setSelectedCategory(data.waste_categories as WasteCategory);
    setStep('category'); setLoading(false);
  }

  function checkLocationProximity(bin: Bin): { ok: boolean; distance: string } {
    if (!userLocation || !bin.latitude || !bin.longitude) return { ok: true, distance: 'N/A' };
    const R = 6371000;
    const dLat = ((bin.latitude - userLocation.lat) * Math.PI) / 180;
    const dLon = ((bin.longitude - userLocation.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation.lat * Math.PI) / 180) * Math.cos((bin.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ok: dist <= 500, distance: `${Math.round(dist)}m` };
  }

  async function handleConfirm() {
    if (!selectedBin || !selectedCategory || !profile) return;
    if (profile.suspended) { setError('Your account has been suspended. Please contact support.'); return; }
    setLoading(true); setError('');

    const locCheck = checkLocationProximity(selectedBin);
    if (!locCheck.ok) { setError(`You appear to be ${locCheck.distance} away from this bin. You must be within 500m to dispose waste here.`); setLoading(false); return; }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentSameBin } = await supabase.from('disposals').select('id').eq('user_id', profile.id).eq('bin_id', selectedBin.id).gte('created_at', fiveMinAgo);
    if (recentSameBin && recentSameBin.length >= 3) { setError('Too many disposals at this bin. Please wait 5 minutes before trying again.'); setLoading(false); return; }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const catLimit = limits.find(l => l.waste_category_id === selectedCategory.id);
    if (catLimit) {
      const { data: todayCatDisposals } = await supabase.from('disposals').select('id').eq('user_id', profile.id).eq('waste_category_id', selectedCategory.id).gte('created_at', todayStart.toISOString());
      if (todayCatDisposals && todayCatDisposals.length >= catLimit.max_per_day) { setError(`Daily limit reached for ${selectedCategory.name} (${catLimit.max_per_day}/day). Try again tomorrow.`); setLoading(false); return; }
    }

    const globalLimit = limits.find(l => l.waste_category_id === null);
    if (globalLimit) {
      const { data: todayDisposals } = await supabase.from('disposals').select('points_earned').eq('user_id', profile.id).gte('created_at', todayStart.toISOString());
      const todayPts = (todayDisposals || []).reduce((s, d) => s + d.points_earned, 0);
      if (todayPts + selectedCategory.points_per_unit > globalLimit.max_points_per_day) { setError(`Daily points cap reached (${globalLimit.max_points_per_day} pts/day). Try again tomorrow.`); setLoading(false); return; }
    }

    const { data: result, error: rpcErr } = await supabase.rpc('process_disposal', {
      p_bin_id: selectedBin.id,
      p_waste_category_id: selectedCategory.id,
      p_location_lat: userLocation?.lat ?? null,
      p_location_lng: userLocation?.lng ?? null,
    });
    if (rpcErr) { setError('Could not complete the disposal. Please try again.'); setLoading(false); return; }

    await refreshProfile();
    setEarnedPoints((result as any)?.points_earned ?? selectedCategory.points_per_unit);
    setStep('success'); setLoading(false);
  }

  function reset() { setStep('scan'); setQrInput(''); setSelectedBin(null); setSelectedCategory(null); setError(''); setEarnedPoints(0); }

  const steps = ['scan', 'category', 'confirm', 'success'] as Step[];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t('dispose.title')}</h1>
        <p className="text-white/40 mt-1 text-sm">Scan. Drop. Earn. Under 10 seconds.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black transition-all ${
              step === s ? 'bg-primary-500 text-white ring-2 ring-primary-500/30' :
              currentStepIndex > i ? 'bg-primary-600 text-white' : 'bg-white/5 text-white/20'
            }`}>
              {currentStepIndex > i ? <Check size={12} /> : i + 1}
            </div>
            {i < 3 && <div className={`flex-1 h-[2px] rounded-full transition-all ${currentStepIndex > i ? 'bg-primary-500' : 'bg-white/5'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Scan QR */}
      {step === 'scan' && (
        <div className="space-y-5">
          {/* Main Scanner Card */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-6 space-y-5">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <QrCode size={36} className="text-primary-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">{t('dispose.scan')}</h2>
              <p className="text-white/30 text-sm">Point your camera at the bin QR code</p>
            </div>

            {/* Camera or Manual Entry Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
              <button onClick={() => setCameraActive(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${cameraActive ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white/60'}`}>
                <Camera size={15} /> Camera
              </button>
              <button onClick={() => setCameraActive(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${!cameraActive ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white/60'}`}>
                <Zap size={15} /> Manual
              </button>
            </div>

            {/* Camera Scanner */}
            {cameraActive && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-primary-500/30 min-h-[300px] bg-black/50">
                  <div id="qr-scanner-container" ref={scannerRef} className="w-full" />
                  {/* Overlay corners */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary-400 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary-400 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary-400 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary-400 rounded-br-lg" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border border-primary-400/30 rounded-lg" />
                    </div>
                  </div>
                </div>
                <button onClick={stopCamera} className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-white/50 text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <CameraOff size={15} /> Stop Scanning
                </button>
              </div>
            )}

            {/* Manual Entry */}
            {!cameraActive && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text" value={qrInput} onChange={e => setQrInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQRScan()}
                    placeholder="e.g. SW-BIN-UON-001"
                    className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                  />
                  <button onClick={handleQRScan} disabled={loading || !qrInput.trim()}
                    className="px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all disabled:opacity-40 flex items-center gap-2 active:scale-95"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location Badge */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
            locationStatus === 'ok' ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' :
            locationStatus === 'denied' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            locationStatus === 'getting' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
            'bg-white/5 border-white/5 text-white/30'
          }`}>
            <MapPin size={14} />
            {locationStatus === 'ok' && 'Location verified — GPS active'}
            {locationStatus === 'denied' && 'Location unavailable — enable GPS for verification'}
            {locationStatus === 'getting' && 'Getting your location...'}
            {locationStatus === 'idle' && 'Location not requested'}
          </div>

          {/* Browse Bins */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
            <button onClick={() => setShowBinList(!showBinList)} className="flex items-center gap-2 text-white/50 hover:text-white/70 text-sm font-bold transition-colors">
              <MapPin size={15} />
              {showBinList ? 'Hide nearby bins' : 'Browse nearby bins'}
              <ChevronRight size={14} className={`transition-transform ${showBinList ? 'rotate-90' : ''}`} />
            </button>

            {showBinList && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                {bins.map(bin => (
                  <button key={bin.id} onClick={() => { setQrInput(bin.qr_code); setShowBinList(false); }}
                    className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary-500/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">{bin.location_name}</p>
                        <p className="text-xs text-white/30">
                          {(bin as any).waste_categories?.name ?? 'General'} · {bin.qr_code}
                          {bin.area_name && <span> · {bin.area_name}</span>}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-white/10 group-hover:text-primary-400 flex-shrink-0 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Demo QR Codes */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Target size={14} className="text-primary-400" /> Demo QR Codes
            </h3>
            <p className="text-white/20 text-[11px] font-semibold mb-3">Tap to auto-fill for testing:</p>
            <div className="grid grid-cols-2 gap-2">
              {['SW-BIN-UON-001', 'SW-BIN-UON-002', 'SW-BIN-WES-001', 'SW-BIN-DEMO-001',
                'SW-BIN-GPO-001', 'SW-BIN-KNH-001', 'SW-BIN-STR-001', 'SW-BIN-JKIA-001'].map(code => (
                <button key={code} onClick={() => setQrInput(code)}
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-xs font-mono font-semibold text-left transition-all border border-white/5 hover:border-white/10"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Category */}
      {step === 'category' && selectedBin && (
        <div className="space-y-5">
          {/* Bin Info Card */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-primary-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{selectedBin.location_name}</p>
                <p className="text-xs text-white/30">
                  {selectedBin.qr_code} · {(selectedBin as any).collection_partners?.name ?? 'General Collection'}
                  {selectedBin.area_name && <span> · {selectedBin.area_name}</span>}
                </p>
              </div>
            </div>

            {checkLocationProximity(selectedBin).distance !== 'N/A' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                checkLocationProximity(selectedBin).ok ? 'bg-primary-500/10 text-primary-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                <MapPin size={13} />
                {checkLocationProximity(selectedBin).ok ? `Within range (${checkLocationProximity(selectedBin).distance})` : `${checkLocationProximity(selectedBin).distance} away — must be within 500m`}
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
            <h2 className="text-lg font-black text-white">{t('dispose.select.type')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const catLimit = limits.find(l => l.waste_category_id === cat.id);
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                    className={`relative p-4 rounded-2xl text-left transition-all ${
                      isSelected ? 'bg-primary-500/10 border-2 border-primary-500' : 'bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{BIN_ICONS[cat.name] ?? '♻️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{language === 'sw' ? cat.name_sw || cat.name : cat.name}</p>
                        <p className="text-xs font-black text-primary-400 mt-0.5">+{cat.points_per_unit} pts</p>
                        {catLimit && <p className="text-[10px] text-white/20 mt-0.5">Max {catLimit.max_per_day}/day</p>}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('scan'); stopCamera(); }} className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:bg-white/5 transition-all">Back</button>
            <button onClick={() => selectedCategory && setStep('confirm')} disabled={!selectedCategory}
              className="flex-1 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedBin && selectedCategory && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-6 space-y-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles size={18} className="text-primary-400" /> Confirm Disposal
            </h2>

            <div className="space-y-3">
              {[
                { label: 'Bin', value: selectedBin.location_name, icon: MapPin },
                { label: 'Type', value: `${BIN_ICONS[selectedCategory.name]} ${language === 'sw' ? selectedCategory.name_sw || selectedCategory.name : selectedCategory.name}`, icon: Recycle },
                { label: 'CO₂ Saved', value: `~${selectedCategory.co2_saved_per_unit} kg`, icon: Leaf },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-white truncate">{value}</p>
                  </div>
                </div>
              ))}

              {/* Points highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/10 to-primary-600/10 border border-primary-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-primary-400" />
                    <span className="text-sm font-bold text-white">Points to Earn</span>
                  </div>
                  <span className="text-2xl font-black text-primary-400">+{selectedCategory.points_per_unit}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span className="text-xs">By confirming, you certify responsible disposal at this location. Fraudulent submissions are flagged automatically.</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('category')} className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:bg-white/5 transition-all">Back</button>
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? <><RefreshCw size={16} className="animate-spin" /> Processing...</> : <><Check size={16} /> Confirm Disposal</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div className="space-y-6 animate-slide-up relative">
          {/* Confetti celebration */}
          <Confetti count={60} />

          {/* Celebration Card */}
          <div className="rounded-3xl bg-gradient-to-b from-primary-500/10 via-primary-600/5 to-white/[0.03] border border-primary-500/20 p-8 text-center relative overflow-hidden">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-transparent to-transparent opacity-50 animate-pulse-slow" />

            {/* Floating stars */}
            <Star size={12} className="absolute top-6 left-8 text-primary-300/40 animate-float" />
            <Star size={10} className="absolute top-12 right-12 text-primary-400/30 animate-float" style={{ animationDelay: '0.3s' }} />
            <Star size={14} className="absolute bottom-16 left-16 text-primary-300/20 animate-float" style={{ animationDelay: '0.6s' }} />

            <div className="relative">
              {/* Animated success icon */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-500/40 animate-success-pop relative">
                <div className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-30" />
                <Check size={52} className="text-white relative z-10" />
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center justify-center gap-2">
                <PartyPopper size={24} className="text-primary-400" />
                {t('dispose.success')}
              </h2>
              <p className="text-white/40 text-sm">You just earned real points for doing good.</p>
            </div>
          </div>

          {/* Points Card */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-8 text-center relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent animate-shimmer-x" />

            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Points Earned</p>
            <div className="relative inline-block">
              <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-primary-300 to-primary-400 animate-gradient-shift">
                +{earnedPoints}
              </p>
              {/* Glow behind number */}
              <div className="absolute inset-0 blur-2xl bg-primary-500/30 rounded-full" />
            </div>
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm mt-3">
              <Zap size={14} className="text-primary-400" />
              New total: <span className="font-bold text-white/60">{profile?.total_points?.toLocaleString() ?? 0} pts</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={reset}
              className="py-3.5 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Recycle size={16} /> Dispose Again
            </button>
            <button onClick={() => onNavigate('dashboard')}
              className="py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary-500/30"
            >
              Dashboard <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
