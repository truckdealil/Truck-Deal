/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Clock, Users, ArrowLeftRight, 
  Settings, Menu, X, Sparkles, MessageSquareHeart
} from 'lucide-react';
import CrmLandingPage from './components/CrmLandingPage';
import MoveForm from './components/MoveForm';
import DriverBidPage from './components/DriverBidPage';
import AdminDashboard from './components/AdminDashboard';
import ClientLiveTracking from './components/ClientLiveTracking';
import ClientFeedbackPage from './components/ClientFeedbackPage';
import DriverRegistrationPage from './components/DriverRegistrationPage';
import AIConcierge from './components/AIConcierge';
import { MoveRequest } from './types';

export default function App() {
  const [view, setView] = useState<'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register'>('landing');
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminLoggedIn = localStorage.getItem('truckdeal_admin_auth') === 'true';
  const isDriverLoggedIn = !!localStorage.getItem('truk_active_driver_session');

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
      setView('admin');
    } else if (viewParam === 'quote') {
      setView('quote');
    } else if (viewParam === 'driver-register') {
      setView('driver-register');
    }
  }, []);

  const handleNavigate = (targetView: 'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register', moveId: string | null = null) => {
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
    } else {
      newUrl.searchParams.delete('view');
      newUrl.searchParams.delete('moveId');
    }
    window.history.pushState({}, '', newUrl.toString());
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col font-sans" dir="rtl">
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
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                view === 'landing' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              דף נחיתה ולידים
            </button>

            <button
              onClick={() => handleNavigate('quote')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'quote' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>מכרז ומחשבון הובלה</span>
            </button>

            <button
              onClick={() => handleNavigate('driver', selectedMoveId)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'driver' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>פורטל נהגים</span>
              {isDriverLoggedIn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            <button
              onClick={() => handleNavigate('driver-register')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'driver-register' 
                  ? 'bg-orange-electric text-white font-bold shadow-md' 
                  : 'text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>הרשמת נהגים ומנופים 🚜</span>
            </button>

            {selectedMoveId && (
              <button
                onClick={() => handleNavigate('tracking', selectedMoveId)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  view === 'tracking' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-orange-electric/90 border border-orange-electric/30 hover:bg-orange-electric/10'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>מעקב לקוח חי</span>
              </button>
            )}

            <button
              onClick={() => handleNavigate('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                view === 'admin' ? 'bg-orange-electric text-white font-bold shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>מערכת ניהול (Admin)</span>
              {isAdminLoggedIn && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-navy-900 border border-navy-800 rounded-lg text-gray-400 hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
          <button
            onClick={() => handleNavigate('driver-register')}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'driver-register' 
                ? 'bg-orange-electric text-white' 
                : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
            }`}
          >
            🚜 הרשמת נהגים ומנופים
          </button>
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
          <button
            onClick={() => handleNavigate('admin')}
            className={`w-full py-2.5 px-4 rounded-xl text-right font-bold block ${
              view === 'admin' ? 'bg-orange-electric text-white' : 'text-gray-300'
            }`}
          >
            מערכת ניהול (Admin)
          </button>
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

      <footer className="bg-navy-950 border-t border-navy-900 py-6 text-center text-xs text-gray-600">
        <p>© {new Date().getFullYear()} טראק דיל il (Truk Dealil IL). כל הזכויות שמורות.</p>
      </footer>

      <AIConcierge onNavigate={handleNavigate} />
    </div>
  );
}
