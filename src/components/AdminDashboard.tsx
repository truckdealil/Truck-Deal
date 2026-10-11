import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, DollarSign, ShieldAlert, Sparkles, 
  Calendar, CheckCircle2, XCircle, Clock, ExternalLink, 
  Search, ShieldCheck, Check, Ban, AlertCircle, Building, User, Star,
  Plus, Edit, Trash2, Globe, Send, CheckCircle, Info, Settings, Shield, Map, FileText,
  Lock, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest, CRMLead, MoveStatus, PaymentStatus } from '../types';
import LiveMap from './LiveMap';
import FleetManager from './FleetManager';
import OperationalChat from './OperationalChat';
import MoveCountdownTimer from './MoveCountdownTimer';

export default function AdminDashboard() {
  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('truckdeal_admin_auth') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [moves, setMoves] = useState<MoveRequest[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ makeWebhookUrl: '' });
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and active views
  const [activeTab, setActiveTab] = useState<'moves' | 'leads' | 'drivers' | 'settings' | 'live_map' | 'fleet' | 'reviews'>('moves');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Move detail modal view
  const [selectedMove, setSelectedMove] = useState<MoveRequest | null>(null);
  
  // Operational actions loading/errors
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Driver modal and form state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [driverForm, setDriverForm] = useState({
    fullName: '',
    phone: '',
    region: 'מרכז והשרון',
    truckType: 'משאית 7.5 טון',
    status: 'active'
  });

  // Webhook custom test tool state
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<any>(null);
  const [googleSheetTestLoading, setGoogleSheetTestLoading] = useState(false);
  const [googleSheetTestStatus, setGoogleSheetTestStatus] = useState<any>(null);
  const [clearDummyLoading, setClearDummyLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAdminData();
      
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/chats');
          if (res.ok) {
            const chatData = await res.json();
            setChats(chatData);
          }
        } catch (err) {
          console.error('Error polling chats in dashboard:', err);
        }
      }, 4000);

      return () => clearInterval(pollInterval);
    }
  }, [isAdminAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Rami1125';
    if (adminPasswordInput.trim() === validPassword) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('truckdeal_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('סיסמת מנהל שגויה!');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('truckdeal_admin_auth');
    setAdminPasswordInput('');
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [movesRes, leadsRes, driversRes, settingsRes, chatsRes] = await Promise.all([
        fetch('/api/moves'),
        fetch('/api/leads'),
        fetch('/api/drivers'),
        fetch('/api/settings'),
        fetch('/api/chats')
      ]);

      if (!movesRes.ok || !leadsRes.ok) {
        throw new Error('שגיאה בשליפת נתוני הניהול מהשרת');
      }

      const movesData = await movesRes.json();
      const leadsData = await leadsRes.json();
      setMoves(movesData);
      setLeads(leadsData);

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'שגיאה כללית בחיבור למערכת הניהול');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDriverStatus = async (driverId: string, currentStatus: string, driverPhone: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setActionLoading(true);
    try {
      const gasUrl = settings.googleScriptUrl || import.meta.env.VITE_GAS_WEBAPP_URL;
      if (gasUrl) {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'admin_approve_driver',
            phone: driverPhone,
            approve: newStatus === 'active'
          })
        }).catch(e => console.error('Error updating driver status in Sheets:', e));
      }

      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverId, status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers);
      }
    } catch (err: any) {
      alert(err.message || 'שגיאה בעדכון סטטוס הנהג');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDriver ? { ...driverForm, id: editingDriver.id } : driverForm)
      });
      if (!response.ok) throw new Error('נכשל בשמירת הנהג');
      const resData = await response.json();
      setDrivers(resData.drivers);
      setShowDriverModal(false);
      setEditingDriver(null);
      setDriverForm({ fullName: '', phone: '', region: 'מרכז והשרון', truckType: 'משאית 7.5 טון', status: 'active' });
      alert('פרטי הנהג נשמרו בהצלחה במערכת ובגיליון!');
    } catch (err: any) {
      alert(err.message || 'שגיאה בשמירת הנהג');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק נהג זה מרשימת התפוצה?')) return;
    try {
      const response = await fetch(`/api/drivers/${driverId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('נכשל במחיקת הנהג');
      const resData = await response.json();
      setDrivers(resData.drivers);
    } catch (err: any) {
      alert(err.message || 'שגיאה במחיקת הנהג');
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('עדכון הגדרות נכשל');
      alert('הגדרות המערכת עודכנו בהצלחה!');
    } catch (err: any) {
      alert(err.message || 'שגיאה בעדכון הגדרות');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestGoogleSheet = async () => {
    setGoogleSheetTestLoading(true);
    setGoogleSheetTestStatus(null);
    try {
      const response = await fetch('/api/settings/test-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl: settings.googleScriptUrl,
          sheetId: settings.googleSheetId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'בדיקת החיבור לגיליון נכשלה');
      }
      setGoogleSheetTestStatus({
        success: true,
        status: response.status,
        message: data.response?.message || 'חיבור פעיל ומסונכרן מול Google Sheets',
        sheetUrl: data.sheetUrl
      });
    } catch (err: any) {
      setGoogleSheetTestStatus({ success: false, error: err.message });
    } finally {
      setGoogleSheetTestLoading(false);
    }
  };

  const handleDeleteMove = async (moveId: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הובלה #${moveId}?`)) return;
    try {
      const res = await fetch(`/api/moves/${moveId}`, { method: 'DELETE' });
      if (res.ok) {
        setMoves(prev => prev.filter(m => m.id !== moveId));
        if (selectedMove?.id === moveId) setSelectedMove(null);
        alert('ההובלה נמחקה בהצלחה!');
      } else {
        alert('שגיאה במחיקת ההובלה');
      }
    } catch (err) {
      alert('שגיאת תקשורת במחיקת ההובלה');
    }
  };

  const handleClearDummyMoves = async () => {
    if (!window.confirm('האם לאפס ולמחוק את כל הזמנות הדמה והבדיקות מהמערכת?')) return;
    setClearDummyLoading(true);
    try {
      const res = await fetch('/api/moves/clear-dummy', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const refreshRes = await fetch('/api/moves');
        const refreshedMoves = await refreshRes.json();
        setMoves(refreshedMoves);
        setSelectedMove(null);
        alert(`הזמנות הדמה נמחקו בהצלחה! נמחקו ${data.cleared || 0} הזמנות.`);
      } else {
        alert('שגיאה במחיקת הזמנות הדמה');
      }
    } catch (err) {
      alert('שגיאת תקשורת במחיקת הזמנות הדמה');
    } finally {
      setClearDummyLoading(false);
    }
  };

  const handleTestWebhook = async (type: 'create' | 'approve' | 'payment') => {
    setWebhookTestLoading(true);
    setWebhookTestStatus(null);
    
    let testPayload: any = {};
    if (type === 'create') {
      testPayload = {
        action: 'create_move',
        moveId: 'test_move_999',
        clientName: 'אלכסנדר הגדול (בדיקת שירות)',
        clientPhone: '054-9998877',
        origin: 'רחוב פנקס 12, תל אביב',
        destination: 'דרך יפו 102, ירושלים',
        moveDate: '2026-08-20',
        moveType: 'apartment',
        estimatedPriceRange: '₪1,400 - ₪1,900',
        message: 'התראה לנהגים: הובלה חדשה פורסמה בטראק דיל IL!\n' + window.location.origin + '?view=driver&moveId=test_move_999'
      };
    } else if (type === 'approve') {
      testPayload = {
        action: 'bid_approved_notify_client',
        moveId: 'test_move_999',
        clientName: 'אלכסנדר הגדול',
        clientPhone: '054-9998877',
        approvedPrice: 1550,
        driverName: 'יוסי לוי (מוביל Truk Dealil)',
        trackingLink: `${window.location.origin}/?view=tracking&moveId=test_move_999`,
        message: 'אישור הצעת מחיר: ההובלה שלך אושרה!\n' + window.location.origin + '/?view=tracking&moveId=test_move_999'
      };
    } else {
      testPayload = {
        action: 'payment_success_notify',
        moveId: 'test_move_999',
        clientName: 'אלכסנדר הגדול',
        clientPhone: '054-9998877',
        amountPaid: 1550,
        driverName: 'יוסי לוי',
        driverPhone: '052-8765432',
        trackingLink: `${window.location.origin}/?view=tracking&moveId=test_move_999`,
        invoiceLink: `${window.location.origin}/?view=tracking&moveId=test_move_999&showReceipt=true`,
        message: 'תודה רבה! תשלום הובלה #test_move_999 התקבל בהצלחה! 🧾'
      };
    }

    try {
      const response = await fetch('/api/settings/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: settings.makeWebhookUrl,
          testPayload
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'נכשל בשליחת ה-Webhook');
      setWebhookTestStatus({ success: true, status: response.status, payload: testPayload });
    } catch (err: any) {
      setWebhookTestStatus({ success: false, error: err.message });
    } finally {
      setWebhookTestLoading(false);
    }
  };

  const getMoveStatusLabel = (status: MoveStatus) => {
    switch(status) {
      case 'new': return 'חדש';
      case 'bidding': return 'מכרז פעיל';
      case 'bid_approved':
      case 'Approved' as any: 
        return 'הצעה מאושרת (נשלח ב-WhatsApp) 🔔';
      case 'approved_for_driver': return 'משוחרר לנהג (מאושר)';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getPaymentStatusLabel = (status: PaymentStatus) => {
    switch(status) {
      case 'pending_payment': return 'ממתין לתשלום';
      case 'paid_deposit': return 'שולמה מקדמה';
      case 'paid_full': return 'שולם במלואו';
      case 'net_30': return 'שוטף + 30 מוסדי';
      default: return status;
    }
  };

  const handleApproveBid = async (moveId: string, bidId: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/moves/${moveId}/bids/${bidId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'לא הצלחנו לאשר את הצעת המחיר');
      }

      const result = await response.json();
      setMoves(moves.map(m => m.id === moveId ? result.move : m));
      setSelectedMove(result.move);
      setActionSuccess('הצעת הנהג אושרה בהצלחה! עדכון נשלח ללקוח ב-WhatsApp');
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'שגיאה באישור הצעת המחיר');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentAndRelease = async (
    moveId: string, 
    fields: { paymentStatus?: PaymentStatus, clientApprovedForBilling?: boolean, status?: MoveStatus }
  ) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/moves/${moveId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה בעדכון ההגדרות הלוגיסטיות');
      }

      const result = await response.json();
      setMoves(moves.map(m => m.id === moveId ? result.move : m));
      setSelectedMove(result.move);
      setActionSuccess('הגדרות האבטחה והתשלום עודכנו בהצלחה במערכת!');
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'שגיאה בעדכון');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMoves = moves.filter(move => {
    const matchesStatus = statusFilter === 'all' || 
      move.status === statusFilter || 
      (statusFilter === 'bid_approved' && move.status === 'Approved');
    const matchesSearch = 
      move.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.clientPhone.includes(searchQuery) ||
      move.originAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.destAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredLeads = leads.filter(lead => {
    return (
      lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalBilled = moves
    .filter(m => m.status === 'completed' || m.status === 'approved_for_driver')
    .reduce((acc, move) => {
      const approvedBid = move.driverBids.find(b => b.id === move.finalApprovedBidId);
      return acc + (approvedBid ? approvedBid.bidAmount : 0);
    }, 0);

  const pendingBidsCount = moves.filter(m => m.status === 'bidding').length;

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-navy-900 border border-navy-800 rounded-3xl shadow-2xl text-right space-y-6" dir="rtl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-orange-electric/10 text-orange-electric border border-orange-electric/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            <Lock className="w-8 h-8 text-orange-electric" />
          </div>
          <h3 className="font-black text-white text-xl">כניסת מנהל מערכת</h3>
          <p className="text-xs text-gray-400">
            גישה מאובטחת לניהול הובלות, כספים ואישור נהגים (Truk Dealil IL).
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300">סיסמת מנהל:</label>
            <input
              type="password"
              required
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              placeholder="הזן סיסמת מנהל..."
              className="w-full py-2.5 px-4 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric outline-none"
            />
          </div>

          {authError && (
            <div className="text-red-400 text-xs font-bold flex items-center gap-1.5 justify-end">
              <span>{authError}</span>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-orange-electric hover:bg-orange-600 text-white font-extrabold rounded-xl shadow-lg transition-all cursor-pointer text-sm"
          >
            אימות וכניסה לדשבורד 🔓
          </button>
        </form>
      </div>
    );
  }

  // Helper render function to prevent nested JSX ternary syntax issues
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="text-center py-20 bg-navy-900 border border-navy-800 rounded-2xl">
          <div className="w-10 h-10 border-4 border-orange-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">טוען את נתוני מערכת Truk Dealil IL...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'moves':
        if (filteredMoves.length === 0) {
          return (
            <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
              לא נמצאו מכרזים או הובלות התואמים את הסינון.
            </div>
          );
        }
        return filteredMoves.map((move) => {
          const unreadCount = chats.filter((c: any) => c.jobId === move.id && c.sender === 'driver' && !c.readByAdmin).length;
          return (
            <div 
              key={move.id}
              onClick={() => { setSelectedMove(move); setActionError(null); setActionSuccess(null); }}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                selectedMove?.id === move.id 
                  ? 'bg-navy-850 border-orange-electric shadow-lg shadow-orange-electric/5' 
                  : 'bg-navy-900 border-navy-800 hover:border-navy-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-electric font-mono block">מזהה: #{move.id.substr(5, 6)}</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                        <span>{unreadCount} הודעות חדשות 💬</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-md font-bold text-white mt-1">{move.clientName}</h4>
                  <span className="text-xs text-gray-400">{move.clientPhone} | {move.clientEmail}</span>
                </div>
              
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMove(move.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      move.status === 'new' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      move.status === 'bidding' ? 'bg-orange-electric/10 text-orange-electric border border-orange-electric/20' :
                      move.status === 'bid_approved' || move.status === 'Approved' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      move.status === 'approved_for_driver' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {getMoveStatusLabel(move.status)}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    move.clientApprovedForBilling ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {move.clientApprovedForBilling ? '✓ אושר לחיוב' : '✗ ממתין לאישור חיוב'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-navy-800/60 text-xs text-gray-400">
                <div>
                  <span>נתיב הובלה:</span>
                  <p className="text-white font-medium mt-0.5 truncate">{move.originAddress.split(',')[0]} ⇄ {move.destAddress.split(',')[0]}</p>
                </div>
                <div>
                  <span>מועד מבוקש:</span>
                  <p className="text-white font-medium mt-0.5">{move.moveDate}</p>
                </div>
                <div>
                  <span>מדד קושי:</span>
                  <p className="text-white font-medium mt-0.5 font-mono">{move.aiAnalysis?.difficultyScore || 'טרם חושב'} / 10</p>
                </div>
                <div>
                  <span>סטטוס תשלום:</span>
                  <p className="text-orange-electric font-medium mt-0.5 font-semibold">{getPaymentStatusLabel(move.paymentStatus)}</p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-navy-800/40 flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 font-medium">זמן יציאה משוער לשטח:</span>
                <MoveCountdownTimer 
                  moveDate={move.moveDate} 
                  moveTime={move.moveTime} 
                  status={move.status} 
                  variant="compact" 
                />
              </div>
            </div>
          );
        });

      case 'leads':
        if (filteredLeads.length === 0) {
          return (
            <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
              לא נמצאו לידים במערכת ה-CRM.
            </div>
          );
        }
        return filteredLeads.map((lead) => (
          <div key={lead.id} className="p-5 bg-navy-900 border border-navy-800 rounded-2xl hover:border-navy-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-white text-md flex items-center gap-2">
                  <span>{lead.fullName}</span>
                  {lead.companyName && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-xs font-normal">
                      {lead.companyName}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-400 mt
