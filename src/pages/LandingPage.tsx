import { useRef, useState, useEffect } from 'react';
import {
  QrCode, Gift, Recycle, Star, Trash2,
  Cpu, Lightbulb, FlaskConical, BarChart3,
  ArrowRight, Zap, Shield, TrendingUp, Globe, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Page } from '../types';

interface Props { onNavigate: (page: Page) => void; }

const wasteTypes = [
  { icon: '♻️', name: 'Plastic', pts: 15, color: '#3b82f6' },
  { icon: '📄', name: 'Paper', pts: 10, color: '#f59e0b' },
  { icon: '🔩', name: 'Metal', pts: 20, color: '#8b5cf6' },
  { icon: '🫙', name: 'Glass', pts: 12, color: '#22d3ee' },
  { icon: '🌿', name: 'Organic', pts: 8, color: '#22c55e' },
  { icon: '💻', name: 'E-Waste', pts: 50, color: '#ec4899' },
  { icon: '💡', name: 'LED Bulbs', pts: 25, color: '#f97316' },
  { icon: '🔋', name: 'Batteries', pts: 30, color: '#ef4444' },
];

const steps = [
  { num: '01', icon: QrCode, title: 'Scan the Bin', desc: 'Open SmartWaste, point at any QR bin near you, done.' },
  { num: '02', icon: Trash2, title: 'Pick Category', desc: 'Tap your waste type — plastic, paper, e-waste, and more.' },
  { num: '03', icon: Zap, title: 'Instant Points', desc: 'Points land in your wallet before you walk away.' },
  { num: '04', icon: Gift, title: 'Claim Rewards', desc: 'Airtime, vouchers, merch — real value for real action.' },
];

const stats = [
  { label: 'People Already In', value: '12,400+', icon: '👥' },
  { label: 'Disposals Logged', value: '285K+', icon: '♻️' },
  { label: 'CO₂ Offset', value: '43 tonnes', icon: '🌍' },
  { label: 'Partner Brands', value: '18', icon: '🤝' },
];

const partners = [
  { name: 'Boom Lights', specialty: 'LED Bulbs', icon: Lightbulb, color: '#f97316' },
  { name: 'PET Recycle KE', specialty: 'Plastic', icon: FlaskConical, color: '#3b82f6' },
  { name: 'E-Waste Africa', specialty: 'Electronics', icon: Cpu, color: '#8b5cf6' },
  { name: 'GreenMetal Co.', specialty: 'Metal', icon: BarChart3, color: '#6b7280' },
  { name: 'BioCompost KE', specialty: 'Organic', icon: Recycle, color: '#22c55e' },
];

const testimonials = [
  { name: 'Amina O.', role: 'UoN Student', text: "Made KES 500 in airtime just from tossing bottles on campus. Literally free money.", rating: 5, img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80' },
  { name: 'David K.', role: 'Lecturer, Strathmore', text: "Our whole dept competes on the leaderboard now. Never seen anything drive behaviour change this fast.", rating: 5, img: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80' },
  { name: 'Grace W.', role: 'Office Manager', text: "Recycling engagement at our office jumped 400% in month one. That number is real.", rating: 5, img: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80' },
];

function useCounter(target: number) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    let c = 0;
    const step = target / 60;
    const t = setInterval(() => {
      c += step; if (c >= target) { setV(target); clearInterval(t); } else setV(Math.floor(c));
    }, 24);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

export default function LandingPage({ onNavigate }: Props) {
  const { language, setLanguage } = useLanguage();
  const users = useCounter(12400);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
          <img src="/Logo.png" alt="SmartWaste" className="h-7 sm:h-8 w-auto" />
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/50">
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#categories" className="hover:text-white transition-colors">Categories</a>
            <a href="#community" className="hover:text-white transition-colors">Community</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-[11px] font-bold">
              <button onClick={() => setLanguage('en')} className={`px-2.5 py-1 rounded-md transition-colors ${language === 'en' ? 'bg-primary-500 text-white' : 'text-white/40'}`}>EN</button>
              <button onClick={() => setLanguage('sw')} className={`px-2.5 py-1 rounded-md transition-colors ${language === 'sw' ? 'bg-primary-500 text-white' : 'text-white/40'}`}>SW</button>
            </div>
            <button onClick={() => onNavigate('login')} className="text-xs font-semibold text-white/50 hover:text-white px-3 py-2 transition-colors">Sign In</button>
            <button onClick={() => onNavigate('register')} className="btn-primary !py-2 !px-4 text-sm">Get Started</button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-14 min-h-[100svh] flex flex-col justify-center overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-brand-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary-500/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-800/20 blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-5 py-16 md:py-24 w-full">
          <div className="text-center max-w-4xl mx-auto">

            {/* Logo */}
            <div className="flex justify-center mb-10">
              <img src="/Logo.png" alt="SmartWaste" className="h-14 sm:h-16 md:h-20 w-auto animate-fade-in" />
            </div>

            {/* Live activity pill */}
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 rounded-full px-4 py-2 mb-8 animate-fade-up">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-primary-400 text-xs font-bold">{users.toLocaleString()}+ people earning right now</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tight mb-6 animate-fade-up delay-100">
              Scan. Drop.<br /><span className="text-gradient-green">Earn.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/50 mb-10 max-w-xl mx-auto leading-relaxed animate-fade-up delay-200">
              Every piece of waste is worth something. SmartWaste pays you in real rewards for responsible disposal.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up delay-300">
              <button onClick={() => onNavigate('register')} className="btn-primary text-base !px-8 !py-4 glow-green flex items-center justify-center gap-2 group">
                Start Earning Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition-all text-sm">
                See How It Works <ChevronDown size={16} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-10 animate-fade-up delay-400">
              {[
                { icon: '🛡️', text: 'Fraud Protected' },
                { icon: '⚡', text: 'Instant Rewards' },
                { icon: '🆓', text: 'Always Free' },
                { icon: '📍', text: 'Kenya-First' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-white/50 text-[11px] font-semibold">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating waste cards - horizontal scroll on mobile */}
          <div className="mt-16 overflow-x-auto -mx-4 px-4 pb-4">
            <div className="flex gap-3 sm:flex-wrap sm:justify-center min-w-max sm:min-w-0">
              {wasteTypes.map((w, i) => (
                <div key={i} className="flex-shrink-0 glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-bounce-soft hover:scale-105 transition-transform cursor-default" style={{ animationDelay: `${i * 0.3}s` }}>
                  <span className="text-2xl">{w.icon}</span>
                  <div><p className="text-white text-xs font-bold">{w.name}</p><p className="text-primary-400 text-xs font-black">+{w.pts} pts</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ===== STATS ===== */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="text-center p-5 rounded-2xl bg-white/3 border border-white/5 hover:border-primary-500/30 transition-colors">
                <span className="text-3xl block mb-2">{s.icon}</span>
                <p className="text-2xl sm:text-3xl font-black text-white">{s.value}</p>
                <p className="text-white/30 text-[11px] font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-14">
            <span className="section-tag-dark">4 Steps</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-4">Dead Simple.</h2>
            <p className="text-white/40 mt-3 text-base max-w-sm mx-auto">Under 10 seconds from scan to points.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="relative p-5 rounded-2xl bg-gray-900 border border-white/5 hover:border-primary-500/40 group transition-all duration-300 hover:-translate-y-1">
                <div className="text-[11px] font-black text-primary-500 mb-4 font-mono">{num}</div>
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                  <Icon size={22} className="text-primary-400" />
                </div>
                <h3 className="font-black text-white mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section id="categories" className="py-24 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-12">
            <span className="section-tag-dark">8 Categories</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-4">Anything Counts.</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {wasteTypes.map(w => (
              <div key={w.name} className="group bg-gray-900 hover:bg-gray-800 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-center cursor-default transition-all duration-300 hover:-translate-y-1">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{w.icon}</div>
                <p className="text-white text-[11px] font-bold">{w.name}</p>
                <p className="text-[11px] font-black mt-1" style={{ color: w.color }}>+{w.pts}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY SMARTWASTE ===== */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-tag-dark">Why It Hits Different</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-4 mb-8">Built for the streets,<br />not the boardroom.</h2>
              <div className="space-y-5">
                {[
                  { icon: Shield, title: 'No gaming the system', desc: 'GPS lock, daily caps, anomaly detection. Points go to real disposals.', color: '#22c55e' },
                  { icon: TrendingUp, title: 'Live impact tracking', desc: 'See your CO₂ saved, waste diverted, and rank — in real time.', color: '#3b82f6' },
                  { icon: Globe, title: 'Campus & hood leaderboards', desc: 'Compete with your estate, campus, or community — not strangers.', color: '#f59e0b' },
                  { icon: Zap, title: 'Instant gratification', desc: 'Points credited before you even put your phone away.', color: '#ec4899' },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{title}</p>
                      <p className="text-white/40 text-sm mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-3xl overflow-hidden">
                <img src="https://images.pexels.com/photos/6995365/pexels-photo-6995365.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Recycling" className="w-full h-72 sm:h-96 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center"><Zap size={18} className="text-primary-400" /></div>
                  <div><p className="text-white font-bold text-sm">+50 pts earned</p><p className="text-white/40 text-xs">E-Waste • CBD Hub • Just now</p></div>
                  <div className="ml-auto badge bg-primary-500/20 text-primary-300 !text-[11px]">Live</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARTNERS ===== */}
      <section className="py-20 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <p className="text-center text-white/20 text-[11px] font-black uppercase tracking-widest mb-8">Powered by Kenya's top recovery partners</p>
          <div className="flex flex-wrap justify-center gap-4">
            {partners.map(({ name, specialty, icon: Icon, color }) => (
              <div key={name} className="flex items-center gap-3 bg-gray-900 border border-white/5 rounded-full px-5 py-3 hover:border-white/15 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${color}15` }}><Icon size={14} style={{ color }} /></div>
                <div><p className="text-white text-xs font-bold">{name}</p><p className="text-white/30 text-[10px]">{specialty}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="community" className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-12">
            <span className="section-tag-dark">Real Talk</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-4">Kenyans are eating.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map(({ name, role, text, rating, img }) => (
              <div key={name} className="bg-gray-900 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all hover:-translate-y-1 duration-300">
                <div className="flex gap-0.5 mb-4">{[...Array(rating)].map((_, i) => <Star key={i} size={12} className="fill-gold-400 text-gold-400" />)}</div>
                <p className="text-white/60 text-sm leading-relaxed mb-5 italic">"{text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <img src={img} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-500/30" />
                  <div><p className="text-white font-bold text-sm">{name}</p><p className="text-white/30 text-[11px]">{role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-brand-950 to-gray-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-[100px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-5 text-center">
          <img src="/Logo.png" alt="SmartWaste" className="h-12 sm:h-14 w-auto mx-auto mb-8 opacity-90" />
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-5 leading-tight">Your waste has been wasting itself. <span className="text-gradient-green">Fix that.</span></h2>
          <p className="text-white/40 text-base mb-10">Free forever. Real rewards. Under 10 seconds per drop.</p>
          <button onClick={() => onNavigate('register')} className="btn-primary text-lg !px-10 !py-5 glow-green inline-flex items-center gap-3 group">
            Join for Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-white/20 text-xs mt-6">admin@smartwaste.ke / Admin@2024 to explore the admin dashboard</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <img src="/Logo.png" alt="SmartWaste" className="h-8 w-auto opacity-70" />
            <p className="text-white/20 text-xs">© 2025 SmartWaste Kenya. All rights reserved.</p>
            <div className="flex gap-5 text-xs text-white/20">
              <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
              <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
              <a href="#" className="hover:text-white/50 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
