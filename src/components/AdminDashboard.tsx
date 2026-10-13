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
          const res = await fetch('/api/chats', { headers: getAuthHeaders() });
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

  const getAdminToken = () => {
    return localStorage.getItem('truckdeal_admin_jwt') || localStorage.getItem('truckdeal_admin_token') || '';
  };

  const getAuthHeaders = () => {
    const token = getAdminToken();
    return {
      'Authorization': `Bearer ${token}`,
      'x-admin-token': token,
      'Content-Type': 'application/json'
    };
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanPassword = adminPasswordInput.trim();
    if (!cleanPassword) return;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdminAuthenticated(true);
        localStorage.setItem('truckdeal_admin_jwt', data.token);
        localStorage.setItem('truckdeal_admin_auth', 'true');
        setAuthError('');
      } else {
        setAuthError('סיסמת מנהל שגויה (Zero-Trust)!');
      }
    } catch {
      setAuthError('שגיאת תקשורת באימות מנהל');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('truckdeal_admin_auth');
    localStorage.removeItem('truckdeal_admin_jwt');
    localStorage.removeItem('truckdeal_admin_token');
    setAdminPasswordInput('');
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();

      const [movesRes, leadsRes, driversRes, settingsRes, chatsRes] = await Promise.all([
        fetch('/api/moves', { headers }),
        fetch('/api/leads', { headers }),
        fetch('/api/drivers', { headers }),
        fetch('/api/settings', { headers }),
        fetch('/api/chats', { headers })
      ]);

      if (!movesRes.ok || !leadsRes.ok) {
        if (movesRes.status === 401 || movesRes.status === 403) {
          handleAdminLogout();
          throw new Error('פג תוקף אימות המנהל. נא להתחבר מחדש.');
        }
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
      const response = await fetch(`/api/drivers/${driverId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
      const res = await fetch(`/api/moves/${moveId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
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
      const res = await fetch('/api/moves/clear-dummy', { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const refreshRes = await fetch('/api/moves', { headers: getAuthHeaders() });
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
        headers: getAuthHeaders()
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
        headers: getAuthHeaders(),
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
                <p className="text-xs text-gray-400 mt-1">{lead.phone} | {lead.email}</p>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                רישום: {new Date(lead.createdAt).toLocaleString('he-IL')}
              </span>
            </div>
            {lead.notes && (
              <div className="mt-3 p-3 bg-navy-950 rounded-lg text-xs text-gray-300 border border-navy-850">
                <strong>תוכן הפנייה:</strong> {lead.notes}
              </div>
            )}
          </div>
        ));

      case 'drivers':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-navy-900 p-4 rounded-xl border border-navy-800">
              <div>
                <h3 className="font-bold text-white text-sm">מאגר נהגי משאיות מאומתים (צי רכב)</h3>
                <p className="text-xs text-gray-400">נהגים מורשים ומאושרים להגשת הצעות מחיר במכרזי הובלות</p>
              </div>
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setDriverForm({ fullName: '', phone: '', region: 'מרכז והשרון', truckType: 'משאית 7.5 טון', status: 'active' });
                  setShowDriverModal(true);
                }}
                className="px-3.5 py-1.5 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף נהג חדש</span>
              </button>
            </div>

            {drivers.length === 0 ? (
              <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
                לא רשומים נהגים במערכת. לחץ על 'הוסף נהג חדש' כדי להתחיל.
              </div>
            ) : (
              drivers.map((driver) => (
                <div key={driver.id} className="p-5 bg-navy-900 border border-navy-800 rounded-2xl hover:border-navy-750 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-md">{driver.fullName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${driver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                        {driver.status === 'active' ? 'מורשה ומאושר 🟢' : 'ממתין / חסום 🔴'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">טלפון: {driver.phone} | אזור: {driver.region}</p>
                    <p className="text-xs text-orange-electric font-bold">סוג משאית: {driver.truckType}</p>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto md:self-center">
                    <button
                      onClick={() => handleToggleDriverStatus(driver.id, driver.status, driver.phone)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        driver.status === 'active'
                          ? 'bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/50'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50'
                      }`}
                    >
                      {driver.status === 'active' ? 'חסום גישה 🔴' : 'אשר גישת נהג 🟢'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingDriver(driver);
                        setDriverForm({
                          fullName: driver.fullName,
                          phone: driver.phone,
                          region: driver.region || 'מרכז והשרון',
                          truckType: driver.truckType || 'משאית 7.5 טון',
                          status: driver.status || 'active'
                        });
                        setShowDriverModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-navy-950 border border-navy-800 text-gray-300 hover:text-white rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>ערוך</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="px-2.5 py-1.5 bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6 text-right">
            {moves.filter(m => m.deliveryNote?.feedbackRating !== undefined).length === 0 ? (
              <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
                טרם התקבלו משובים או ביקורות מלקוחות לאחר השלמת הובלות.
              </div>
            ) : (
              <div className="space-y-4">
                {moves.filter(m => m.deliveryNote?.feedbackRating !== undefined).map((move) => (
                  <div key={move.id} className="p-5 rounded-2xl border border-navy-800 bg-navy-900">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-white text-base">{move.clientName}</h4>
                      <div className="flex gap-0.5">
                        {'★'.repeat(move.deliveryNote?.feedbackRating || 5)}
                      </div>
                    </div>
                    {move.deliveryNote?.feedbackText && (
                      <p className="text-xs text-gray-300 italic">"{move.deliveryNote.feedbackText}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-navy-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 text-right">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-navy-800 gap-3">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${settings.googleSheetId || '1Hch4csBenIwr9vt6XlyzTQ0z88LIo1917w0NPYKXqTc'}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>פתח גיליון Google Sheets חי ↗</span>
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <h3 className="font-bold text-white text-sm">אינטגרציה וסנכרון Google Sheets (Apps Script)</h3>
                    <p className="text-xs text-gray-400">סנכרון מלא של משלוחים, צי רכב, הצעות ואישורים</p>
                  </div>
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-gray-300 block">מזהה גיליון (Spreadsheet ID):</label>
                  <input
                    type="text"
                    value={settings.googleSheetId || '1Hch4csBenIwr9vt6XlyzTQ0z88LIo1917w0NPYKXqTc'}
                    onChange={(e) => setSettings({ ...settings, googleSheetId: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-gray-300 block">כתובת Web App (Google Apps Script):</label>
                  <input
                    type="url"
                    value={settings.googleScriptUrl || 'https://script.google.com/macros/s/AKfycbyDiRrXdNdcYaa9VY29x6qVsumayrOBD0yHzEHosbuncvsRd-mNSaM_xEenhThsANN-/exec'}
                    onChange={(e) => setSettings({ ...settings, googleScriptUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={handleTestGoogleSheet}
                  disabled={googleSheetTestLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{googleSheetTestLoading ? 'בודק חיבור...' : 'בדוק חיבור לגיליון'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Settings className="w-4 h-4" />
                  <span>שמור הגדרות</span>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-gray-400 text-xs block">סה״כ הובלות במערכת</span>
            <span className="text-3xl font-black text-white font-mono mt-1 block">{moves.length}</span>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-gray-400 text-xs block">מכרזים פעילים (נהגים מציעים)</span>
            <span className="text-3xl font-black text-orange-electric font-mono mt-1 block">{pendingBidsCount}</span>
          </div>
          <div className="w-12 h-12 bg-orange-electric/10 text-orange-electric rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-gray-400 text-xs block">מחזור הובלות מאושר (₪)</span>
            <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">₪{totalBilled.toLocaleString('he-IL')}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-gray-400 text-xs block">לידים רשומים ב-CRM</span>
            <span className="text-3xl font-black text-purple-400 font-mono mt-1 block">{leads.length}</span>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs configuration + Logout */}
      <div className="flex items-center justify-between border-b border-navy-800 mb-6 gap-6 overflow-x-auto scrollbar-none">
        <div className="flex gap-6 whitespace-nowrap">
          <button
            onClick={() => { setActiveTab('moves'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'moves' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            ניהול מכרזים והובלות ({moves.length})
          </button>
          <button
            onClick={() => { setActiveTab('live_map'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'live_map' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            מפת מעקב ומיקום משאיות חיה 🗺️
          </button>
          <button
            onClick={() => { setActiveTab('fleet'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'fleet' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            ניהול צי ומשאבים 🚛
          </button>
          <button
            onClick={() => { setActiveTab('leads'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'leads' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            לידים עסקיים CRM ({leads.length})
          </button>
          <button
            onClick={() => { setActiveTab('drivers'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'drivers' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            נהגי משאיות מורשים 🚚 ({drivers.length})
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'settings' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            מנוע אוטומציות (Make & WhatsApp) ⚙️
          </button>
          <button
            onClick={() => { setActiveTab('reviews'); setSelectedMove(null); }}
            className={`pb-3 font-bold text-base cursor-pointer transition-all ${
              activeTab === 'reviews' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            ביקורות ומשובים ⭐
          </button>
        </div>

        <button
          onClick={handleAdminLogout}
          className="pb-3 text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>התנתק מהמערכת</span>
        </button>
      </div>

      {/* Control bar */}
      {activeTab !== 'settings' && activeTab !== 'drivers' && activeTab !== 'live_map' && activeTab !== 'fleet' && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-navy-900 p-4 rounded-xl border border-navy-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === 'moves' ? "חפש לפי לקוח, טלפון או כתובת..." : "חפש ליד לפי שם, טלפון..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:border-orange-electric outline-none"
            />
          </div>

          {activeTab === 'moves' && (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto pr-1">
                <button 
                  onClick={() => setStatusFilter('all')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'all' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
                >
                  הכל ({moves.length})
                </button>
                <button 
                  onClick={() => setStatusFilter('new')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'new' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
                >
                  חדש
                </button>
                <button 
                  onClick={() => setStatusFilter('bidding')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'bidding' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
                >
                  במכרז
                </button>
                <button 
                  onClick={() => setStatusFilter('bid_approved')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'bid_approved' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
                >
                  הצעה אושרה
                </button>
                <button 
                  onClick={() => setStatusFilter('approved_for_driver')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'approved_for_driver' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
                >
                  שוחרר לנהג
                </button>
              </div>

              {moves.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearDummyMoves}
                  disabled={clearDummyLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/50 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearDummyLoading ? 'מוחק הזמנות דמה...' : 'מחק הזמנות דמה / אפס מכרזים'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'live_map' ? (
        <div className="mb-8">
          <LiveMap 
            moves={moves} 
            onSelectMove={(move) => {
              setActiveTab('moves');
              setSelectedMove(move);
            }} 
          />
        </div>
      ) : activeTab === 'fleet' ? (
        <div className="mb-8">
          <FleetManager 
            moves={moves} 
            drivers={drivers} 
            onMoveUpdated={(updatedMove) => {
              setMoves(moves.map(m => m.id === updatedMove.id ? updatedMove : m));
              if (selectedMove?.id === updatedMove.id) {
                setSelectedMove(updatedMove);
              }
            }} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {renderTabContent()}
          </div>

          {/* Right detail preview pane */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {selectedMove ? (
                <motion.div
                  key={selectedMove.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-navy-900 border border-navy-800 rounded-3xl p-6 space-y-6 sticky top-8 shadow-2xl max-h-[750px] overflow-y-auto pr-2"
                >
                  <div className="border-b border-navy-800 pb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-orange-electric font-mono">#{selectedMove.id}</span>
                      <button 
                        onClick={() => setSelectedMove(null)} 
                        className="text-gray-500 hover:text-white text-xs cursor-pointer"
                      >
                        סגור [x]
                      </button>
                    </div>
                    <h3 className="font-bold text-white text-lg">{selectedMove.clientName}</h3>
                    <p className="text-xs text-gray-400">{selectedMove.clientPhone} | {selectedMove.clientEmail}</p>
                  </div>

                  <div className="p-4 bg-navy-950 border border-navy-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-electric">
                      <ShieldCheck className="w-4 h-4" />
                      <span>בקרת שחרור ואישור הובלה לנהג</span>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMove.clientApprovedForBilling}
                        onChange={(e) => handleUpdatePaymentAndRelease(selectedMove.id, { clientApprovedForBilling: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-orange-electric focus:ring-orange-electric bg-navy-900 border-navy-700"
                      />
                      <span className="text-xs font-bold text-white">אושר חיוב לקוח במערכת</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdatePaymentAndRelease(selectedMove.id, { status: 'approved_for_driver' })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-orange-electric hover:bg-orange-600 cursor-pointer"
                      >
                        שחרר הובלה לנהג
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdatePaymentAndRelease(selectedMove.id, { status: 'completed' })}
                        className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg text-xs font-semibold text-gray-300 cursor-pointer"
                      >
                        סמן כהושלם
                      </button>
                    </div>
                  </div>

                  {/* Driver Bids List */}
                  <div className="space-y-3 pt-3 border-t border-navy-800">
                    <h4 className="font-bold text-white text-sm">הצעות מחיר מנהגים</h4>
                    {selectedMove.driverBids.length === 0 ? (
                      <p className="text-xs text-gray-500">טרם הוגשו הצעות מחיר להובלה זו.</p>
                    ) : (
                      selectedMove.driverBids.map((bid) => (
                        <div key={bid.id} className="p-3 bg-navy-950 border border-navy-800 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="text-white font-bold">{bid.driverName}</p>
                            <p className="text-gray-400">{bid.driverPhone}</p>
                            <p className="text-orange-electric font-mono font-bold">₪{bid.bidAmount}</p>
                          </div>
                          {bid.status === 'pending' ? (
                            <button
                              onClick={() => handleApproveBid(selectedMove.id, bid.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                            >
                              אשר הצעה
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-bold">מאושר ✓</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-navy-900 border border-navy-800 rounded-3xl p-8 text-center text-gray-500 sticky top-8">
                  <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <h4 className="font-bold text-white text-md">פרטי הובלה נבחרת</h4>
                  <p className="text-xs text-gray-400">בחר הובלה מהרשימה לצפייה וניהול שיבוצים.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
