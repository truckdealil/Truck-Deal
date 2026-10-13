/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Clock, Users, ArrowLeftRight, 
  Settings, Menu, X, Sparkles, MessageSquareHeart,
  Sun, Moon, Lock, Info, Building2, KeyRound, AlertCircle
} from 'lucide-react';
import CrmLandingPage from './components/CrmLandingPage';
import MoveForm from './components/MoveForm';
import DriverBidPage from './components/DriverBidPage';
import AdminDashboard from './components/AdminDashboard';
import ClientLiveTracking from './components/ClientLiveTracking';
import ClientFeedbackPage from './components/ClientFeedbackPage';
import DriverRegistrationPage from './components/DriverRegistrationPage';
import AboutUsPage from './components/AboutUsPage';
import AccessibilityWidget from './components/AccessibilityWidget';
import LegalModals, { LegalModalType } from './components/LegalModals';
import AIConcierge from './components/AIConcierge';
import { MoveRequest } from './types';

export default function App() {
  const [view, setView] = useState<'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register' | 'about'>('landing');
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme mode: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('truck_theme') as 'dark' | 'light') || 'dark';
  });

  // Admin PIN Protection Modal
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);

  // Legal Modals state
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  const isAdminLoggedIn = localStorage.getItem('truckdeal_admin_auth') === 'true';
  const isDriverLoggedIn = !!localStorage.getItem('truk_active_driver_session');

  // Apply Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
    localStorage.setItem('truck_theme', theme);
  }, [theme]);

  // Keyboard shortcut Ctrl + Shift + A for secret Admin access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ש')) {
        e.preventDefault();
        setAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const moveIdParam = params.get('moveId');

    if (viewParam === 'driver' && moveIdParam) {
      setView('driver');
      setSelectedMoveId(moveIdParam);
    } else if (viewParam === 'tracking' && moveIdParam) {
      setView('tracking');
      setSelectedMoveId(moveIdParam);
    } else if (viewParam === 'feedback' && moveIdParam) {
      setView('feedback');
      setSelectedMoveId(moveIdParam);
    } else if (viewParam === 'admin') {
      // Direct URL check: if not logged in with server-issued JWT token, prompt for login
      if (localStorage.getItem('truckdeal_admin_jwt')) {
        setView('admin');
      } else {
        setAdminModalOpen(true);
        setView('landing');
      }
    } else if (viewParam === 'quote') {
      setView('quote');
    } else if (viewParam === 'driver-register') {
      setView('driver-register');
    } else if (viewParam === 'about') {
      setView('about');
    }
  }, []);

  const handleNavigate = (targetView: 'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register' | 'about', moveId: string | null = null) => {
    if (targetView === 'admin' && !isAdminLoggedIn) {
      setAdminModalOpen(true);
      return;
    }

    setView(targetView);
    setSelectedMoveId(moveId);
    setMobileMenuOpen(false);

    const newUrl = new URL(window.location.href);
    if (targetView === 'driver' && moveId) {
      newUrl.searchParams.set('view', 'driver');
      newUrl.searchParams.set('moveId', moveId);
    } else if (targetView === 'tracking' && moveId) {
      newUrl.searchParams.set('view', 'tracking');
      newUrl.searchParams.set('moveId', moveId);
    } else if (targetView === 'feedback' && moveId) {
      newUrl.searchParams.set('view', 'feedback');
      newUrl.searchParams.set('moveId', moveId);
    } else if (targetView === 'admin') {
      newUrl.searchParams.set('view', 'admin');
      newUrl.searchParams.delete('moveId');
    } else if (targetView === 'driver-register') {
      newUrl.searchParams.set('view', 'driver-register');
      newUrl.searchParams.delete('moveId');
    } else if (targetView === 'quote') {
      newUrl.searchParams.set('view', 'quote');
      newUrl.searchParams.delete('moveId');
    } else if (targetView === 'about') {
      newUrl.searchParams.set('view', 'about');
      newUrl.searchParams.delete('moveId');
    } else {
      newUrl.searchParams.delete('view');
      newUrl.searchParams.delete('moveId');
    }
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPinInput.trim();
    if (!cleanPin) return;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPin })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('truckdeal_admin_jwt', data.token);
        localStorage.setItem('truckdeal_admin_auth', 'true');
        setAdminPinError(false);
        setAdminModalOpen(false);
        setAdminPinInput('');
        handleNavigate('admin');
      } else {
        setAdminPinError(true);
      }
    } catch {
      setAdminPinError(true);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col font-sans transition-colors duration-200" dir="rtl">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-900/80 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Right Brand Logo & Title */}
          <div 
            onClick={() => handleNavigate('landing')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-electric/10 flex items-center justify-center border border-orange-electric/20 p-1 group-hover:scale-105 transition-all">
              <img 
                src="https://i.ibb.co/Ldb5GCxF/logo.png" 
                alt="Truk Dealil Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-xl font-black text-white font-sans tracking-tight group-hover:text-orange-electric transition-colors">
                טראק דיל il
              </span>
              <span className="text-[10px] text-orange-electric font-bold block leading-none tracking-widest uppercase">
                Truk Dealil IL
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-navy-900 p-1 rounded-xl border border-navy-800">
            <button
              onClick={() => handleNavigate('landing')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                view === 'landing' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              דף נחיתה
            </button>

            <button
              onClick={() => handleNavigate('about')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'about' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>אודות החברה</span>
            </button>

            <button
              onClick={() => handleNavigate('quote')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'quote' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>מכרז ומחשבון</span>
            </button>

            <button
              onClick={() => handleNavigate('driver', selectedMoveId)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'driver' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>פורטל נהגים</span>
              {isDriverLoggedIn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            {/* Smart Deduplication: Hide Driver Registration Button when already on driver-register page */}
            {view !== 'driver-register' && (
              <button
                onClick={() => handleNavigate('driver-register')}
                className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>הרשמת נהגים 🚜</span>
              </button>
            )}

            {selectedMoveId && (
              <button
                onClick={() => handleNavigate('tracking', selectedMoveId)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  view === 'tracking' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-orange-electric/90 border border-orange-electric/30 hover:bg-orange-electric/10'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>מעקב לקוח חי</span>
              </button>
            )}
          </nav>

          {/* Left Actions: Day/Night Mode Switch & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1.5 rounded-xl border border-navy-800 bg-navy-900 hover:bg-navy-850 text-gray-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm select-none"
              title={theme === 'dark' ? 'מעבר למצב יום (Light Mode)' : 'מעבר למצב לילה (Dark Mode)'}
              aria-label="החלף מצב תצוגה"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">מצב יום</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">מצב לילה</span>
                </>
              )}
            </button>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-navy-900 border border-navy-800 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                aria-label="פתח תפריט"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-900 border-b border-navy-800 p-4 space-y-2 text-right">
          <button
            onClick={() => handleNavigate('landing')}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'landing' ? 'bg-orange-electric text-white' : 'text-gray-300'
            }`}
          >
            דף נחיתה ולידים
          </button>

          <button
            onClick={() => handleNavigate('about')}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'about' ? 'bg-orange-electric text-white' : 'text-gray-300'
            }`}
          >
            אודות החברה והצי 🏢
          </button>

          <button
            onClick={() => handleNavigate('quote')}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'quote' ? 'bg-orange-electric text-white' : 'text-gray-300'
            }`}
          >
            מכרז ומחשבון הובלה
          </button>

          <button
            onClick={() => handleNavigate('driver', selectedMoveId)}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'driver' ? 'bg-orange-electric text-white' : 'text-gray-300'
            }`}
          >
            פורטל נהגים
          </button>

          {/* Hide on registration page to prevent button duplication */}
          {view !== 'driver-register' && (
            <button
              onClick={() => handleNavigate('driver-register')}
              className="w-full py-2.5 px-4 rounded-xl text-right font-bold block text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            >
              🚜 הרשמת נהגים ומנופים
            </button>
          )}

          {selectedMoveId && (
            <button
              onClick={() => handleNavigate('tracking', selectedMoveId)}
              className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
                view === 'tracking' ? 'bg-orange-electric text-white' : 'text-orange-electric'
              }`}
            >
              מעקב לקוח חי 📱
            </button>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1">
        {view === 'landing' && (
          <CrmLandingPage 
            onNavigateToQuote={() => handleNavigate('quote')} 
            onNavigateToDriverRegister={() => handleNavigate('driver-register')}
          />
        )}

        {view === 'about' && (
          <AboutUsPage 
            onNavigateToQuote={() => handleNavigate('quote')}
            onNavigateToDriverRegister={() => handleNavigate('driver-register')}
          />
        )}
        
        {view === 'quote' && (
          <div className="py-8">
            <div className="text-center mb-6 max-w-xl mx-auto px-4">
              <h1 className="text-3xl font-extrabold text-white">הגשת בקשת הובלה ומכרז</h1>
              <p className="text-sm text-gray-400 mt-2">
                מלא את פרטי ההובלה והתכולה. המערכת תנתח את המטען ותפיץ את המכרז לנהגים מורשים.
              </p>
            </div>
            <MoveForm 
              onMoveCreated={(newMove) => {
                setSelectedMoveId(newMove.id);
                handleNavigate('tracking', newMove.id);
              }} 
            />
          </div>
        )}

        {view === 'driver' && (
          <DriverBidPage 
            initialMoveId={selectedMoveId} 
            onBidSubmitted={() => {
              console.log('Bid submitted');
            }}
            onNavigateToRegister={() => handleNavigate('driver-register')}
          />
        )}

        {view === 'tracking' && (
          <ClientLiveTracking 
            moveId={selectedMoveId}
            onBackToLanding={() => handleNavigate('landing')}
          />
        )}

        {view === 'admin' && (
          <AdminDashboard />
        )}

        {view === 'driver-register' && (
          <DriverRegistrationPage 
            onNavigateToPortal={() => handleNavigate('driver')}
            onBackToLanding={() => handleNavigate('landing')}
          />
        )}

        {view === 'feedback' && (
          <ClientFeedbackPage 
            moveId={selectedMoveId}
            onBackToLanding={() => handleNavigate('landing')}
          />
        )}
      </main>

      {/* Footer with Legal Links & Discrete Admin Lock Link */}
      <footer className="bg-navy-950 border-t border-navy-900 py-8 px-4 text-center text-xs text-gray-400 space-y-4">
        {/* Navigation & Legal Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-gray-400 font-medium">
          <button 
            onClick={() => handleNavigate('about')} 
            className="hover:text-orange-electric transition-colors cursor-pointer"
          >
            אודות החברה והצי
          </button>
          <span>•</span>
          <button 
            onClick={() => setLegalModal('terms')} 
            className="hover:text-orange-electric transition-colors cursor-pointer"
          >
            תקנון והגבלת אחריות
          </button>
          <span>•</span>
          <button 
            onClick={() => setLegalModal('privacy')} 
            className="hover:text-orange-electric transition-colors cursor-pointer"
          >
            מדיניות פרטיות
          </button>
          <span>•</span>
          <button 
            onClick={() => setLegalModal('security')} 
            className="hover:text-orange-electric transition-colors cursor-pointer"
          >
            מרכז אבטחת מידע (SOC 2)
          </button>
        </div>

        {/* Discreet Admin Lock Link (Authorized Only) */}
        <div className="flex justify-center items-center gap-3 pt-2 text-[11px] text-gray-500">
          <span>© {new Date().getFullYear()} טראק דיל il (Truk Dealil IL). כל הזכויות שמורות.</span>
          <span>•</span>
          <button
            onClick={() => setAdminModalOpen(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 font-mono text-[11px] cursor-pointer"
            title="כניסת מורשים (קוד PIN נדרש)"
          >
            <span>מורשים בלבד</span>
            <Lock className="w-3 h-3" />
          </button>
        </div>
      </footer>

      {/* Admin PIN Verification Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md" dir="rtl">
          <div className="bg-navy-900 border-2 border-navy-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-orange-electric/15 border border-orange-electric/30 flex items-center justify-center text-orange-electric">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">כניסת מנהל מערכת</h3>
              <p className="text-xs text-gray-400">
                אזור זה מוגבל למורשים בלבד. הזן קוד PIN סודי להמשך.
              </p>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <input
                type="password"
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  setAdminPinError(false);
                }}
                placeholder="הזן קוד PIN מנהל..."
                className="w-full px-4 py-2.5 bg-navy-950 border border-navy-750 text-white rounded-xl text-center text-sm font-mono tracking-widest outline-none focus:border-orange-electric"
                autoFocus
              />

              {adminPinError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>קוד שגוי — נסה שוב</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAdminModalOpen(false);
                    setAdminPinInput('');
                    setAdminPinError(false);
                  }}
                  className="flex-1 py-2 bg-navy-800 hover:bg-navy-750 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-electric hover:bg-orange-hover text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  אימות וכניסה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Israeli Standard IS 5568 AA Accessibility Floating Widget */}
      <AccessibilityWidget />

      {/* Legal Modals (Terms, Privacy, Security) */}
      <LegalModals activeModal={legalModal} onClose={() => setLegalModal(null)} />

      {/* AI Concierge Chat Drawer */}
      <AIConcierge onNavigate={handleNavigate} />
    </div>
  );
}
