import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'sw';

interface Translations {
  [key: string]: string;
}

const en: Translations = {
  // Nav
  'nav.dashboard': 'Dashboard',
  'nav.dispose': 'Dispose Waste',
  'nav.rewards': 'Rewards',
  'nav.leaderboard': 'Leaderboard',
  'nav.history': 'My History',
  'nav.profile': 'Profile',
  'nav.admin': 'Admin',
  'nav.partner': 'Partner Portal',
  'nav.signout': 'Sign Out',
  // Landing
  'landing.hero.title': 'Turning Waste Into Impact',
  'landing.hero.subtitle': 'Scan, Dispose, Earn — Rewarding responsible waste disposal one item at a time.',
  'landing.hero.cta': 'Get Started',
  'landing.hero.learn': 'Learn More',
  // Auth
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.fullname': 'Full Name',
  'auth.signin.submit': 'Sign In',
  'auth.register.submit': 'Create Account',
  'auth.switch.login': 'Already have an account? Sign in',
  'auth.switch.register': "Don't have an account? Sign up",
  // Dashboard
  'dashboard.welcome': 'Welcome back',
  'dashboard.points': 'Total Points',
  'dashboard.streak': 'Day Streak',
  'dashboard.disposals': 'Total Disposals',
  'dashboard.co2': 'CO₂ Saved (kg)',
  'dashboard.quickdispose': 'Quick Dispose',
  'dashboard.recentactivity': 'Recent Activity',
  // Disposal
  'dispose.title': 'Dispose Waste',
  'dispose.scan': 'Scan QR Code',
  'dispose.select.bin': 'Select Bin Location',
  'dispose.select.type': 'Select Waste Type',
  'dispose.confirm': 'Confirm Disposal',
  'dispose.success': 'Disposal Confirmed!',
  'dispose.earning': 'You earned',
  'dispose.points': 'points',
  // Rewards
  'rewards.title': 'Rewards Store',
  'rewards.redeem': 'Redeem',
  'rewards.points': 'points',
  'rewards.myrewards': 'My Redemptions',
  // Leaderboard
  'leaderboard.title': 'Leaderboard',
  'leaderboard.rank': 'Rank',
  'leaderboard.name': 'Name',
  'leaderboard.points': 'Points',
  'leaderboard.disposals': 'Disposals',
};

const sw: Translations = {
  // Nav
  'nav.dashboard': 'Dashibodi',
  'nav.dispose': 'Tupa Taka',
  'nav.rewards': 'Zawadi',
  'nav.leaderboard': 'Ubao wa Viongozi',
  'nav.history': 'Historia Yangu',
  'nav.profile': 'Wasifu',
  'nav.admin': 'Msimamizi',
  'nav.partner': 'Mshirika',
  'nav.signout': 'Toka',
  // Landing
  'landing.hero.title': 'Kubadilisha Taka Kuwa Athari',
  'landing.hero.subtitle': 'Scan, Tupa, Pata — Tunatuza utupaji wa taka kwa kuwajibika.',
  'landing.hero.cta': 'Anza Sasa',
  'landing.hero.learn': 'Jifunze Zaidi',
  // Auth
  'auth.login': 'Ingia',
  'auth.register': 'Unda Akaunti',
  'auth.email': 'Anwani ya barua pepe',
  'auth.password': 'Nywila',
  'auth.fullname': 'Jina Kamili',
  'auth.signin.submit': 'Ingia',
  'auth.register.submit': 'Unda Akaunti',
  'auth.switch.login': 'Una akaunti? Ingia',
  'auth.switch.register': 'Huna akaunti? Jisajili',
  // Dashboard
  'dashboard.welcome': 'Karibu tena',
  'dashboard.points': 'Jumla ya Pointi',
  'dashboard.streak': 'Mfululizo wa Siku',
  'dashboard.disposals': 'Jumla ya Utupaji',
  'dashboard.co2': 'CO₂ Iliyookolewa (kg)',
  'dashboard.quickdispose': 'Tupa Haraka',
  'dashboard.recentactivity': 'Shughuli za Hivi Karibuni',
  // Disposal
  'dispose.title': 'Tupa Taka',
  'dispose.scan': 'Scan Msimbo wa QR',
  'dispose.select.bin': 'Chagua Mahali pa Pipa',
  'dispose.select.type': 'Chagua Aina ya Taka',
  'dispose.confirm': 'Thibitisha Utupaji',
  'dispose.success': 'Utupaji Umethibitishwa!',
  'dispose.earning': 'Umepata',
  'dispose.points': 'pointi',
  // Rewards
  'rewards.title': 'Duka la Zawadi',
  'rewards.redeem': 'Komboa',
  'rewards.points': 'pointi',
  'rewards.myrewards': 'Zawadi Zangu',
  // Leaderboard
  'leaderboard.title': 'Ubao wa Viongozi',
  'leaderboard.rank': 'Nafasi',
  'leaderboard.name': 'Jina',
  'leaderboard.points': 'Pointi',
  'leaderboard.disposals': 'Utupaji',
};

const translations: Record<Language, Translations> = { en, sw };

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  function t(key: string): string {
    return translations[language][key] ?? translations['en'][key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
