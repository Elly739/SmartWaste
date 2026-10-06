import { useEffect, useState, Suspense, lazy, Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Ban, RefreshCw, AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import UserDashboard from './pages/UserDashboard';
import DisposalPage from './pages/DisposalPage';
import ProfilePage from './pages/ProfilePage';
import { OfflineIndicator } from './hooks/useNetwork.tsx';
import type { Page } from './types';

// Lazy load heavy pages (admin, partner, charts)
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const InstitutionDashboard = lazy(() => import('./pages/InstitutionDashboard'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-20">
      <RefreshCw size={28} className="animate-spin text-primary-500" />
    </div>
  );
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.error('Page render error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-20 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">Something went wrong</h2>
          <p className="text-white/40 text-sm mb-6">This page encountered an error while loading. Try refreshing.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all">
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('login');

  useEffect(() => {
    if (!loading) {
      if (user && ['login', 'register'].includes(page)) {
        setPage(profile?.role === 'institution' ? 'institution' : profile?.role === 'partner' ? 'partner' : profile?.role === 'admin' ? 'admin' : 'dashboard');
      } else if (!user && !['landing', 'login', 'register'].includes(page)) {
        setPage('login');
      }
    }
  }, [user, loading]);

  function navigate(p: Page) {
    if (!user && !['landing', 'login', 'register'].includes(p)) {
      setPage('login');
      return;
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-6">
          <img src="/Logo.png" alt="SmartWaste" className="h-14 w-auto animate-pulse-slow" />
          <div className="w-7 h-7 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Public pages
  if (!user) {
    if (page === 'register') return <AuthPage mode="register" onNavigate={navigate} />;
    if (page === 'landing') return <LandingPage onNavigate={navigate} />;
    return <AuthPage mode="login" onNavigate={navigate} />;
  }

  // Suspended account — force logout
  if (profile?.suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Ban size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-extrabold text-white mb-2">Account Suspended</h1>
          <p className="text-white/50 text-sm mb-2">{profile.suspended_reason ?? 'Your account has been suspended for violating our terms of service.'}</p>
          <p className="text-white/30 text-xs mb-6">Contact support if you believe this is an error.</p>
          <button onClick={() => signOut()} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-semibold text-sm border border-white/5 transition-all">Sign Out</button>
        </div>
      </div>
    );
  }

  // Authenticated layout
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Navbar currentPage={page} onNavigate={navigate} />
      <OfflineIndicator />

      {/* Main content */}
      <main className="flex-1 lg:ml-[260px] min-h-screen pb-20 lg:pb-0">
        <div className="lg:hidden h-12" />

        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8">
          {page === 'dashboard' && <UserDashboard onNavigate={navigate} />}
          {page === 'dispose' && <DisposalPage onNavigate={navigate} />}
          {page === 'rewards' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <RewardsPage />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'leaderboard' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <LeaderboardPage />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'history' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <HistoryPage />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'profile' && <ProfilePage onNavigate={navigate} />}
          {page === 'admin' && profile?.role === 'admin' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'admin' && profile?.role !== 'admin' && (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-20">
              <p className="text-white/50 text-lg font-semibold">Access Denied</p>
              <p className="text-white/40 text-sm mt-2">Admin access required.</p>
            </div>
          )}
          {page === 'partner' && profile?.role === 'partner' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PartnerDashboard />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'partner' && profile?.role !== 'partner' && (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-20">
              <p className="text-white/50 text-lg font-semibold">Access Denied</p>
              <p className="text-white/40 text-sm mt-2">Partner access required.</p>
            </div>
          )}
          {page === 'institution' && profile?.role === 'institution' && (
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <InstitutionDashboard />
              </Suspense>
            </PageErrorBoundary>
          )}
          {page === 'institution' && profile?.role !== 'institution' && (
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 text-center py-20">
              <p className="text-white/50 text-lg font-semibold">Access Denied</p>
              <p className="text-white/40 text-sm mt-2">Institution admin access required.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
