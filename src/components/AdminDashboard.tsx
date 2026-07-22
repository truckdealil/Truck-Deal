import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, DollarSign, ShieldAlert, Sparkles, 
  Calendar, CheckCircle2, XCircle, Clock, ExternalLink, 
  Search, ShieldCheck, Check, Ban, AlertCircle, Building, User, Star,
  Plus, Edit, Trash2, Globe, Send, CheckCircle, Info, Settings, Shield, Map, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest, CRMLead, MoveStatus, PaymentStatus } from '../types';
import LiveMap from './LiveMap';
import FleetManager from './FleetManager';
import OperationalChat from './OperationalChat';

export default function AdminDashboard() {
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

  useEffect(() => {
    fetchAdminData();
    
    // Periodically poll for new chat messages to update unread badge counters in real time
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
  }, []);

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

  // Driver CRUD operations
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
      alert('פרטי הנהג נשמרו בהצלחה במערכת!');
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

  // Settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('עדכון הגדרות נכשל');
      alert('כתובת ה-Webhook ל-Make.com עודכנה בהצלחה!');
    } catch (err: any) {
      alert(err.message || 'שגיאה בעדכון הגדרות');
    } finally {
      setActionLoading(false);
    }
  };

  // Dynamic E2E Webhook flow testing
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
        message: 'התראה לנהגים: הובלה חדשה פורסמה בטראק דיל IL! להגשת הצעת מחיר:\n' + window.location.origin + '?view=driver&moveId=test_move_999'
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
        message: 'אישור הצעת מחיר: ההובלה שלך אושרה! המוביל יוסי לוי מוכן. לחץ להסדר תשלום ומעקב:\n' + window.location.origin + '/?view=tracking&moveId=test_move_999'
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
        message: 'תודה רבה! תשלום הובלה #test_move_999 התקבל בהצלחה! 🧾 לצפייה בחשבונית ובמפה:' + window.location.origin + '/?view=tracking&moveId=test_move_999'
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
      if (!response.ok) {
        throw new Error(data.error || 'נכשל בשליחת ה-Webhook');
      }
      setWebhookTestStatus({ success: true, status: response.status, payload: testPayload });
    } catch (err: any) {
      setWebhookTestStatus({ success: false, error: err.message });
    } finally {
      setWebhookTestLoading(false);
    }
  };

  // Helper to get Hebrew state labels
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

  // Admin approves a driver's bid
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
      
      // Update local states
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

  // Admin updates payment or billing release status
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
      
      // Update local states
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

  // Filters handling
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

  // Calculate statistics
  const totalBilled = moves
    .filter(m => m.status === 'completed' || m.status === 'approved_for_driver')
    .reduce((acc, move) => {
      const approvedBid = move.driverBids.find(b => b.id === move.finalApprovedBidId);
      return acc + (approvedBid ? approvedBid.bidAmount : 0);
    }, 0);

  const pendingBidsCount = moves.filter(m => m.status === 'bidding').length;

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

      {/* Tabs configuration */}
      <div className="flex border-b border-navy-800 mb-6 gap-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab('moves'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'moves' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          ניהול מכרזים והובלות ({moves.length})
        </button>
        <button
          onClick={() => { setActiveTab('live_map'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'live_map' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          מפת מעקב ומיקום משאיות חיה 🗺️
        </button>
        <button
          onClick={() => { setActiveTab('fleet'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'fleet' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          ניהול צי ומשאבים 🚛
        </button>
        <button
          onClick={() => { setActiveTab('leads'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'leads' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          לידים עסקיים CRM ({leads.length})
        </button>
        <button
          onClick={() => { setActiveTab('drivers'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'drivers' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          נהגי משאיות מורשים 🚚 ({drivers.length})
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'settings' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          מנוע אוטומציות (Make & WhatsApp) ⚙️
        </button>
        <button
          onClick={() => { setActiveTab('reviews'); setSelectedMove(null); }}
          className={`pb-3 font-bold text-base cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'reviews' ? 'text-orange-electric border-b-2 border-orange-electric' : 'text-gray-400 hover:text-white'
          }`}
        >
          ביקורות ומשובים ⭐
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
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pr-1">
              <button 
                onClick={() => setStatusFilter('all')} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${statusFilter === 'all' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-800'}`}
              >
                הכל
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
          {/* Left main data list */}
          <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-20 bg-navy-900 border border-navy-800 rounded-2xl">
              <div className="w-10 h-10 border-4 border-orange-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">טוען את נתוני מערכת Truk Dealil IL...</p>
            </div>
          ) : activeTab === 'moves' ? (
            filteredMoves.length === 0 ? (
              <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
                לא נמצאו מכרזים או הובלות התואמים את הסינון.
              </div>
            ) : (
              filteredMoves.map((move) => {
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
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            </span>
                          )}
                        </div>
                        <h4 className="text-md font-bold text-white mt-1">{move.clientName}</h4>
                        <span className="text-xs text-gray-400">{move.clientPhone} | {move.clientEmail}</span>
                      </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        move.status === 'new' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        move.status === 'bidding' ? 'bg-orange-electric/10 text-orange-electric border border-orange-electric/20' :
                        move.status === 'bid_approved' || move.status === 'Approved' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        move.status === 'approved_for_driver' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {getMoveStatusLabel(move.status)}
                      </span>

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
                </div>
              );
            })
          )
          ) : activeTab === 'leads' ? (
            /* CRM Leads tab list */
            filteredLeads.length === 0 ? (
              <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
                לא נמצאו לידים במערכת ה-CRM.
              </div>
            ) : (
              filteredLeads.map((lead) => (
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
              ))
            )
          ) : activeTab === 'drivers' ? (
            /* Drivers Registry Section */
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-navy-900 p-4 rounded-xl border border-navy-800">
                <div>
                  <h3 className="font-bold text-white text-sm">מאגר נהגי משאיות מאומתים</h3>
                  <p className="text-xs text-gray-400">נהגים המורשים להגיש הצעות מחיר במכרזי הובלות</p>
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
                          {driver.status === 'active' ? 'פעיל בתפוצה' : 'לא פעיל'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">טלפון: {driver.phone} | אזור פעילות: {driver.region}</p>
                      <p className="text-xs text-orange-electric font-bold">סוג משאית: {driver.truckType}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-1">
                        <span>⭐ דירוג: {driver.rating || 5.0}</span>
                        <span>•</span>
                        <span>הובלות שהושלמו: {driver.completedMoves || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto md:self-center">
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
                        onClick={() => {
                          // Simulate dynamic WhatsApp broadcast testing
                          const testPayload = {
                            action: 'broadcast_alert_to_driver',
                            driverName: driver.fullName,
                            driverPhone: driver.phone,
                            message: `שלום ${driver.fullName}, הובלה חדשה התפרסמה הרגע באזורך בטראק דיל IL! הגש כעת הצעת מחיר.`
                          };
                          
                          fetch('/api/settings/test-webhook', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              webhookUrl: settings.makeWebhookUrl,
                              testPayload
                            })
                          }).then(res => {
                            if (res.ok) {
                              alert(`התראת WhatsApp מדמה נשלחה בהצלחה לנהג ${driver.fullName} (${driver.phone}) דרך Make Webhook!`);
                            } else {
                              alert('נכשל בשליחת Webhook בדיקה. אנא ודא שכתובת ה-Webhook מוגדרת ותקינה בלשונית האוטומציה.');
                            }
                          }).catch(() => {
                            alert('שגיאת תקשורת בשידור בדיקה.');
                          });
                        }}
                        className="px-2.5 py-1.5 bg-orange-electric/10 border border-orange-electric/25 text-orange-electric hover:bg-orange-electric/20 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>שלח התראה מדמה</span>
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
          ) : activeTab === 'reviews' ? (
            /* Reviews & Post-Move Feedback Section */
            <div className="space-y-6 text-right">
              {/* Analytics Header Row */}
              {(() => {
                const reviewedMoves = moves.filter(m => m.deliveryNote?.feedbackRating !== undefined);
                const totalReviews = reviewedMoves.length;
                const avgRating = totalReviews > 0 
                  ? Number((reviewedMoves.reduce((acc, m) => acc + (m.deliveryNote?.feedbackRating || 0), 0) / totalReviews).toFixed(1)) 
                  : 5.0;
                
                const promoters = reviewedMoves.filter(m => (m.deliveryNote?.feedbackRating || 0) >= 4).length;
                const detractors = reviewedMoves.filter(m => (m.deliveryNote?.feedbackRating || 0) <= 3).length;
                const npsScore = totalReviews > 0 ? Math.round(((promoters - detractors) / totalReviews) * 100) : 100;
                const activeTicketsCount = reviewedMoves.filter(m => m.requiresAdminReview && m.adminReviewStatus !== 'resolved').length;

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                      <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 flex justify-between items-center shadow-lg text-right">
                        <div>
                          <span className="text-gray-400 text-[11px] block">ציון שירות ממוצע</span>
                          <span className="text-2xl font-black text-orange-electric font-mono block mt-1">{avgRating} / 5.0</span>
                          <div className="flex gap-0.5 mt-1 justify-end font-mono">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= Math.round(avgRating) ? 'fill-orange-electric text-orange-electric' : 'text-gray-700'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-orange-electric/10 flex items-center justify-center text-orange-electric text-sm font-bold">★</div>
                      </div>

                      <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 flex justify-between items-center shadow-lg text-right">
                        <div>
                          <span className="text-gray-400 text-[11px] block">מדד שביעות רצון (NPS)</span>
                          <span className={`text-2xl font-black font-mono block mt-1 ${npsScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {npsScore > 0 ? '+' : ''}{npsScore}%
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-1">פרומוטרים לעומת מעכבים</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold">NPS</div>
                      </div>

                      <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 flex justify-between items-center shadow-lg text-right">
                        <div>
                          <span className="text-gray-400 text-[11px] block">כרטיסי טיפול פתוחים</span>
                          <span className={`text-2xl font-black font-mono block mt-1 ${activeTicketsCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            {activeTicketsCount}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-1">ביקורות נמוכות בטיפול</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-sm font-bold">⚠️</div>
                      </div>
                    </div>

                    {reviewedMoves.length === 0 ? (
                      <div className="text-center py-16 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500">
                        טרם התקבלו משובים או ביקורות מלקוחות לאחר השלמת הובלות. המשובים יופיעו כאן אוטומטית.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviewedMoves.map((move) => {
                          const rating = move.deliveryNote?.feedbackRating || 5;
                          
                          return (
                            <div 
                              key={move.id}
                              onClick={() => { setSelectedMove(move); setActionError(null); setActionSuccess(null); }}
                              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                selectedMove?.id === move.id 
                                  ? 'bg-navy-850 border-orange-electric shadow-lg shadow-orange-electric/5' 
                                  : 'bg-navy-900 border-navy-800 hover:border-navy-750'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-3 border-b border-navy-850/60 mb-3 text-right">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 justify-end sm:justify-start">
                                    <h4 className="font-bold text-white text-base">{move.clientName}</h4>
                                    <span className="text-xs text-gray-500 font-mono">#{move.id.substr(5, 6)}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    מסלול: {move.originCity || move.originAddress.split(',')[0]} ← {move.destCity || move.destAddress.split(',')[0]} | מוביל: <span className="text-orange-electric font-semibold">{move.assignedDriverName || move.assignedDriverName || 'צוות טראק דיל'}</span>
                                  </p>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0 self-end sm:self-center">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= rating ? 'fill-orange-electric text-orange-electric animate-pulse' : 'text-navy-800'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {move.deliveryNote?.signedAt ? new Date(move.deliveryNote.signedAt).toLocaleDateString('he-IL') : ''}
                                  </span>
                                </div>
                              </div>

                              {move.deliveryNote?.feedbackText && (
                                <blockquote className="p-3 bg-navy-950/80 rounded-xl border border-navy-850 text-xs text-gray-300 italic mb-3 text-right">
                                  "{move.deliveryNote.feedbackText}"
                                </blockquote>
                              )}

                              {/* Incident Handling Ticket System */}
                              {move.requiresAdminReview && (
                                <div className={`p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                                  move.adminReviewStatus === 'resolved' 
                                    ? 'bg-emerald-950/10 border border-emerald-500/20 text-emerald-400' 
                                    : 'bg-red-950/10 border border-red-500/20 text-red-400'
                                }`}>
                                  <div className="space-y-0.5 text-right font-sans">
                                    <span className="text-[10px] uppercase font-black tracking-wider block">⚠️ כרטיס טיפול תקלות הנהלה</span>
                                    <span className="text-xs font-bold text-white block">
                                      מזהה כרטיס: <span className="font-mono text-orange-electric font-bold">{move.adminReviewTicketId}</span> | 
                                      סטטוס: {move.adminReviewStatus === 'resolved' ? '✓ פתור וסגור' : '✗ פתוח - טיפול דחוף'}
                                    </span>
                                  </div>

                                  {move.adminReviewStatus !== 'resolved' && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm(`האם לאשר כי המקרה טופל טלפונית לשביעות רצון הלקוח ולסגור את כרטיס הטיפול #${move.adminReviewTicketId}?`)) {
                                          try {
                                            const res = await fetch(`/api/moves/${move.id}/resolve-ticket`, { method: 'POST' });
                                            if (res.ok) {
                                              const result = await res.json();
                                              setMoves(moves.map(m => m.id === move.id ? result.move : m));
                                              setSelectedMove(result.move);
                                              alert('כרטיס הטיפול נסגר בהצלחה! אירוע סגירת הכרטיס נרשם בלוג ההיסטוריה.');
                                            } else {
                                              alert('שגיאה בסגירת כרטיס הטיפול');
                                            }
                                          } catch (err) {
                                            console.error('Error resolving ticket:', err);
                                          }
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-all self-end sm:self-center"
                                    >
                                      סגור כרטיס וסמן כפתור 🤝
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : activeTab === 'settings' ? (
            /* Integration Settings Section */
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4 text-right">
                <div className="flex items-center gap-2 pb-3 border-b border-navy-800 justify-end">
                  <div className="text-right">
                    <h3 className="font-bold text-white text-sm">הגדרות אינטגרציה חיצוניות (Make.com)</h3>
                    <p className="text-xs text-gray-400">הגדרת כתובת Webhook לניהול הודעות WhatsApp ותפוצת נהגים</p>
                  </div>
                  <Globe className="w-5 h-5 text-orange-electric" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">כתובת Make.com Webhook URL:</label>
                  <input
                    type="url"
                    required
                    placeholder="https://hook.eu1.make.com/..."
                    value={settings.makeWebhookUrl || ''}
                    onChange={(e) => setSettings({ ...settings, makeWebhookUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:border-orange-electric outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-500 leading-normal">
                    * כתובת זו תקבל בקשות POST בפורמט JSON בכל אירוע מפתח (פרסום הובלה, אישור מנהל, והשלמת תשלום). Make.com יוכל לנתב זאת לספק WhatsApp (כגון Joni) להודעות אוטומטיות לנהגים וללקוחות.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span>שמור הגדרות Webhook</span>
                  </button>
                </div>
              </form>

              {/* Webhook End-to-End Testing Playground Console */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4 text-right">
                <div className="flex items-center gap-2 pb-3 border-b border-navy-800 justify-end">
                  <div className="text-right">
                    <h3 className="font-bold text-white text-sm">סימולטור בדיקות קצה לקצה (End-to-End Test Console)</h3>
                    <p className="text-xs text-gray-400">בדוק את תקינות הזרימה והודעות ה-WhatsApp ללא צורך ביצירת הובלות אמיתיות</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-orange-electric" />
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  בחר את סוג האירוע לבדיקת קצה לקצה כדי לשדר Payload לדוגמה ל-Webhook של Make.com:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook('create')}
                    disabled={webhookTestLoading}
                    className="p-4 bg-navy-950 border border-navy-850 hover:border-orange-electric rounded-xl text-right cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-black text-orange-electric block group-hover:underline">1. פרסום מכרז הובלה חדש</span>
                    <span className="text-[10px] text-gray-500 block leading-tight">שולח התראה לנהגים להגשת הצעות מחיר</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestWebhook('approve')}
                    disabled={webhookTestLoading}
                    className="p-4 bg-navy-950 border border-navy-850 hover:border-orange-electric rounded-xl text-right cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-black text-orange-electric block group-hover:underline">2. אישור הצעת נהג ע״י מנהל</span>
                    <span className="text-[10px] text-gray-500 block leading-tight">הודעה ללקוח עם קישור מעקב חי ותשלום מקדמה</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestWebhook('payment')}
                    disabled={webhookTestLoading}
                    className="p-4 bg-navy-950 border border-navy-850 hover:border-orange-electric rounded-xl text-right cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-black text-orange-electric block group-hover:underline">3. קליטת תשלום מוצלח</span>
                    <span className="text-[10px] text-gray-500 block leading-tight">אישור הזמנה, פרטי מוביל נעולים וחשבונית</span>
                  </button>
                </div>

                {webhookTestLoading && (
                  <div className="p-4 bg-navy-950 border border-navy-800 rounded-xl flex items-center justify-center gap-3 text-xs text-gray-400">
                    <div className="w-4 h-4 border-2 border-orange-electric border-t-transparent rounded-full animate-spin"></div>
                    <span>משדר Payload לבדיקה וממתין לתגובת Make.com...</span>
                  </div>
                )}

                {webhookTestStatus && (
                  <div className={`p-4 rounded-xl border space-y-3 text-right ${webhookTestStatus.success ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span className="text-xs font-bold flex items-center gap-1.5 flex-row-reverse">
                        {webhookTestStatus.success ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300">ה-Webhook נשלח בהצלחה!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-300">נכשל בשליחת ה-Webhook</span>
                          </>
                        )}
                      </span>
                      {webhookTestStatus.success && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded font-bold">
                          תגובת שרת: Status {webhookTestStatus.status}
                        </span>
                      )}
                    </div>

                    {webhookTestStatus.success ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-gray-400 text-right">
                          הנתונים שודרו בהצלחה למערכת Make.com. להלן ה-Payload המלא שנמסר בפורמט JSON:
                        </p>
                        <pre className="p-3 bg-navy-950 rounded-lg text-[10px] text-gray-300 font-mono overflow-x-auto border border-navy-850 leading-relaxed text-left" dir="ltr font-mono">
                          {JSON.stringify(webhookTestStatus.payload, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-xs text-red-300 text-right">
                        שגיאה: {webhookTestStatus.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right detail preview pane */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'drivers' ? (
              /* Driver Edit/Add or General Driver Stats Sidebar */
              showDriverModal ? (
                <motion.div
                  key="driver-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-navy-900 border border-orange-electric/40 rounded-3xl p-6 space-y-4 sticky top-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-navy-800">
                    <h3 className="font-bold text-white text-md">
                      {editingDriver ? 'עריכת פרטי נהג מורשה' : 'רישום נהג חדש במערכת'}
                    </h3>
                    <button 
                      onClick={() => { setShowDriverModal(false); setEditingDriver(null); }}
                      className="text-gray-500 hover:text-white text-xs cursor-pointer"
                    >
                      ביטול [x]
                    </button>
                  </div>

                  <form onSubmit={handleSaveDriver} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">שם מלא של הנהג:</label>
                      <input
                        type="text"
                        required
                        value={driverForm.fullName}
                        onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none focus:border-orange-electric"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">מספר טלפון ל-WhatsApp:</label>
                      <input
                        type="text"
                        required
                        placeholder="05X-XXXXXXX"
                        value={driverForm.phone}
                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none focus:border-orange-electric"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">אזור פעילות עיקרי:</label>
                      <select
                        value={driverForm.region}
                        onChange={(e) => setDriverForm({ ...driverForm, region: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none focus:border-orange-electric cursor-pointer"
                      >
                        <option value="מרכז והשרון">מרכז והשרון</option>
                        <option value="גוש דן וירושלים">גוש דן וירושלים</option>
                        <option value="צפון וחיפה">צפון וחיפה</option>
                        <option value="דרום ובאר שבע">דרום ובאר שבע</option>
                        <option value="ארצי">ארצי - כל הארץ</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">סוג המשאית ומידות הובלה:</label>
                      <input
                        type="text"
                        required
                        placeholder="לדוגמה: משאית 7.5 טון + רמפה הידראולית"
                        value={driverForm.truckType}
                        onChange={(e) => setDriverForm({ ...driverForm, truckType: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none focus:border-orange-electric"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-300">סטטוס זמינות בתפוצה:</label>
                      <select
                        value={driverForm.status}
                        onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none focus:border-orange-electric cursor-pointer"
                      >
                        <option value="active">פעיל לקבלת מכרזים</option>
                        <option value="inactive">מושבת זמנית</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingDriver ? 'עדכן פרטי נהג' : 'שמור נהג חדש'}</span>
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="driver-stats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-navy-900 border border-navy-800 rounded-3xl p-6 space-y-5 sticky top-8 shadow-2xl"
                >
                  <div className="flex items-center gap-2 text-orange-electric font-bold text-sm">
                    <Shield className="w-5 h-5" />
                    <span>תנאי סף לנהגים מאושרים</span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    כל נהג במערכת "טראק דיל IL" עובר סינון קפדני הכולל אימות רישיון משאית בתוקף, בדיקת פוליסת ביטוח תכולה במעבר (עד 200,000 ₪) וחתימה על אמנת שירות.
                  </p>

                  <div className="space-y-3 pt-3 border-t border-navy-800">
                    <div className="flex items-center gap-2 text-xs text-white">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>שידור מכרזים אוטומטי לווטסאפ</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>אימות טלפוני דו-שלבי לכל נהג</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>חסימת אבטחה כספית במעקף</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-navy-800">
                    <span className="text-[10px] text-gray-500 block">נהגים פעילים כעת:</span>
                    <span className="text-2xl font-black text-white font-mono">{drivers.filter(d => d.status === 'active').length} מתוך {drivers.length}</span>
                  </div>
                </motion.div>
              )
            ) : activeTab === 'settings' ? (
              /* Settings Visual Workflow Sidebar */
              <motion.div
                key="settings-workflow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-navy-900 border border-navy-800 rounded-3xl p-6 space-y-5 sticky top-8 shadow-2xl"
              >
                <div className="flex items-center gap-2 text-orange-electric font-bold text-sm">
                  <Globe className="w-5 h-5 animate-pulse" />
                  <span>זרימת המידע והתראות ה-WhatsApp</span>
                </div>

                <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                  <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-orange-electric/15 text-orange-electric font-mono font-bold flex items-center justify-center shrink-0">1</div>
                    <div>
                      <strong className="text-white block">פרסום ההובלה</strong>
                      <span>הלקוח מפרסם טופס הובלה ⇄ השרת מנתח את הפריטים ומפעיל את ה-Webhook לשידור לנהגים.</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-orange-electric/15 text-orange-electric font-mono font-bold flex items-center justify-center shrink-0">2</div>
                    <div>
                      <strong className="text-white block">אישור הצעת מחיר</strong>
                      <span>המושל מאשר את הצעת הנהג המתאימה ביותר ⇄ המערכת ששולחת הודעת ווטסאפ עם קישור המעקב והתשלום האישי.</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-orange-electric/15 text-orange-electric font-mono font-bold flex items-center justify-center shrink-0">3</div>
                    <div>
                      <strong className="text-white block">הסדרת תשלום</strong>
                      <span>הלקוח משלם מקדמה מאובטחת ⇄ ה-Webhook משדר אישור סגירה וקבלה דיגיטלית ישירות ללקוח ולנהג המאומת.</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-navy-950 border border-navy-850 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">סטטוס שילוב:</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>המנוע מוכן ומחכה לשידורים</span>
                  </span>
                </div>
              </motion.div>
            ) : selectedMove ? (
              /* Selected Move Detail Pane */
              <motion.div
                key={selectedMove.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-navy-900 border border-navy-800 rounded-3xl p-6 space-y-6 sticky top-8 shadow-2xl max-h-[750px] overflow-y-auto pr-2"
              >
                {/* Header */}
                <div className="border-b border-navy-800 pb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-orange-electric font-mono">#{selectedMove.id}</span>
                    <button 
                      onClick={() => setSelectedMove(null)} 
                      className="text-gray-500 hover:text-white text-xs"
                    >
                      סגור [x]
                    </button>
                  </div>
                  <h3 className="font-bold text-white text-lg">{selectedMove.clientName}</h3>
                  <p className="text-xs text-gray-400">{selectedMove.clientPhone} | {selectedMove.clientEmail}</p>
                  
                  {/* Client Live tracking link helper */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a 
                      href={`/?view=tracking&moveId=${selectedMove.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-orange-electric/15 border border-orange-electric/25 hover:bg-orange-electric/25 text-orange-electric rounded text-[10px] font-bold transition-all flex items-center gap-1"
                    >
                      <span>🔍 דף מעקב לקוח חי</span>
                    </a>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?view=tracking&moveId=${selectedMove.id}`);
                        alert('קישור מעקב אישי ללקוח הועתק ללוח! מוכן לשליחה ב-WhatsApp 📋');
                      }}
                      className="px-2.5 py-1 bg-navy-800 hover:bg-navy-750 border border-navy-700 text-gray-300 hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋 העתק קישור ל-WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Status Update Messages (Error/Success) */}
                {actionError && (
                  <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Security Gate Guard Component */}
                <div className="p-4 bg-navy-950 border border-navy-800 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-electric">
                    <ShieldCheck className="w-4 h-4" />
                    <span>מנגנון אבטחה תפעולי פיננסי</span>
                  </div>
                  
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    מניעת שחרור/אישור הובלה לנהג אלא אם התקבל אישור מנהל לחיוב הלקוח במערכת.
                  </p>

                  <div className="pt-2 border-t border-navy-800 flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMove.clientApprovedForBilling}
                        onChange={(e) => handleUpdatePaymentAndRelease(selectedMove.id, { clientApprovedForBilling: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-orange-electric focus:ring-orange-electric bg-navy-900 border-navy-700"
                      />
                      <span className="text-xs font-bold text-white">אושר חיוב לקוח (מנהל אישר כספית)</span>
                    </label>

                    {/* Operational Flow Trigger */}
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[11px] text-gray-400">שחרור הובלה לנהג מורשה:</span>
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdatePaymentAndRelease(selectedMove.id, { status: 'approved_for_driver' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ${
                            selectedMove.status === 'approved_for_driver' 
                              ? 'bg-emerald-600' 
                              : 'bg-orange-electric hover:bg-orange-hover'
                          }`}
                        >
                          {selectedMove.status === 'approved_for_driver' ? 'הוקצה ושוחרר לנהג' : 'אישור והקצאה סופית לנהג'}
                        </button>

                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdatePaymentAndRelease(selectedMove.id, { status: 'completed' })}
                          className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
                        >
                          הושלם
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Flow and Billing status section */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-gray-400 block">בקרת תזרים ותנאי תשלום:</span>
                  <select
                    value={selectedMove.paymentStatus}
                    onChange={(e) => handleUpdatePaymentAndRelease(selectedMove.id, { paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="pending_payment">ממתין לתשלום (פתוח)</option>
                    <option value="paid_deposit">שולמה מקדמה (סגור בחלקו)</option>
                    <option value="paid_full">שולם במלואו (סגור)</option>
                    <option value="net_30">שוטף + 30 עסקי/מוסדי</option>
                  </select>
                </div>

                {/* Driver Bids Manager */}
                <div className="space-y-4 pt-4 border-t border-navy-800">
                  <h4 className="font-bold text-white text-sm flex items-center justify-between">
                    <span>הצעות מחיר מנהגים</span>
                    <span className="px-2 py-0.5 bg-navy-950 text-orange-electric rounded text-xs font-bold font-mono">
                      {selectedMove.driverBids.length}
                    </span>
                  </h4>

                  {selectedMove.driverBids.length === 0 ? (
                    <div className="text-center py-6 bg-navy-950 rounded-xl text-gray-600 text-xs">
                      טרם התקבלו הצעות נהגים. הצעות יופיעו כאן בזמן אמת.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {selectedMove.driverBids.map((bid) => (
                        <div 
                          key={bid.id} 
                          className={`p-3.5 bg-navy-950 rounded-xl border relative ${
                            bid.status === 'approved' 
                              ? 'border-emerald-500/40 bg-emerald-950/10' 
                              : bid.status === 'rejected'
                              ? 'border-red-500/10 opacity-50'
                              : 'border-navy-800'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold text-white text-xs block">{bid.driverName}</span>
                              <span className="text-[10px] text-gray-500">{bid.driverPhone}</span>
                            </div>
                            
                            <div className="text-left">
                              <span className="font-mono font-black text-sm text-orange-electric block">₪{bid.bidAmount}</span>
                              <span className="text-[9px] text-gray-400 block">זמן עבודה: {bid.estimatedDuration}</span>
                            </div>
                          </div>

                          {bid.notes && (
                            <p className="text-[10px] text-gray-400 bg-navy-900/50 p-2 rounded border border-navy-850/40 leading-relaxed mb-3">
                              {bid.notes}
                            </p>
                          )}

                          {bid.status === 'pending' && (
                            <div className="flex justify-end gap-2 pt-2 border-t border-navy-850">
                              <button
                                disabled={actionLoading}
                                onClick={() => handleApproveBid(selectedMove.id, bid.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>אשר הצעה ושלח לקוח</span>
                              </button>
                            </div>
                          )}

                          {bid.status === 'approved' && (
                            <span className="text-[10px] text-emerald-400 font-bold block text-left pt-1 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>הצעה מאושרת ומסונכרנת</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cargo Details */}
                <div className="pt-4 border-t border-navy-800 space-y-2">
                  <span className="text-xs font-semibold text-gray-400 block">תקציר פריטים להובלה:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedMove.items.map((item) => (
                      <span key={item.id} className="px-2 py-1 bg-navy-950 text-gray-300 rounded text-xs border border-navy-850">
                        {item.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Digital Delivery Note Signature & Report */}
                {selectedMove.status === 'completed' && selectedMove.deliveryNote && (
                  <div className="pt-4 border-t border-navy-800 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <FileText className="w-4 h-4" />
                      <span>תעודת משלוח דיגיטלית חתומה</span>
                    </div>

                    <div className="bg-navy-950 p-4 rounded-xl border border-navy-850 space-y-3 text-xs text-right">
                      <div className="flex justify-between items-center border-b border-navy-800 pb-2">
                        <span className="text-gray-400">נחתם ע״י הלקוח:</span>
                        <strong className="text-white">{selectedMove.deliveryNote.signedBy || selectedMove.clientName}</strong>
                      </div>

                      <div className="flex justify-between items-center border-b border-navy-800 pb-2">
                        <span className="text-gray-400">תאריך ושעה:</span>
                        <span className="text-gray-300 font-mono">
                          {selectedMove.deliveryNote.signedAt ? new Date(selectedMove.deliveryNote.signedAt).toLocaleString('he-IL') : 'נחתם בשטח'}
                        </span>
                      </div>

                      {/* Checklist Results Summary */}
                      <div className="space-y-1.5">
                        <span className="text-gray-400 block font-bold mb-1">וידוא פריטים שנפרקו:</span>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          {selectedMove.deliveryNote.checklistResults?.map((res: any, index: number) => (
                            <div key={res.itemId || index} className="flex justify-between items-center bg-navy-900/50 px-2 py-1 rounded">
                              <span className="text-gray-300">{res.name}</span>
                              <span className={`font-black ${res.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                                {res.verified ? '✓ תקין / נפרק' : '✗ חסר / נפגם'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedMove.deliveryNote.missingNotes && (
                        <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded text-red-200 text-[11px]">
                          <strong>הערות חוסרים/נזקים: </strong>
                          {selectedMove.deliveryNote.missingNotes}
                        </div>
                      )}

                      {/* Feedback rating */}
                      {selectedMove.deliveryNote.feedbackRating && (
                        <div className="flex items-center gap-1.5 border-t border-navy-800 pt-2 text-[11px]">
                          <span className="text-gray-400">דירוג השירות בשטח:</span>
                          <span className="text-amber-400 font-bold font-mono">{'★'.repeat(selectedMove.deliveryNote.feedbackRating)}</span>
                        </div>
                      )}

                      {selectedMove.deliveryNote.feedbackText && (
                        <div className="p-2 bg-navy-900 rounded text-gray-400 text-[11px] italic">
                          "{selectedMove.deliveryNote.feedbackText}"
                        </div>
                      )}

                      {/* Cargo photos with labels on Admin Dashboard */}
                      {selectedMove.deliveryNote.cargoPhotos && selectedMove.deliveryNote.cargoPhotos.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-navy-800">
                          <span className="text-gray-400 block text-[11px] mb-1">צילומי מצב מטען ותכולה מהשטח (POD):</span>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedMove.deliveryNote.cargoPhotos.map((photo: any, idx: number) => (
                              <div key={idx} className="bg-navy-900/40 p-1.5 rounded-lg border border-navy-850/60 text-center flex flex-col space-y-1">
                                <div className="relative aspect-[4/3] rounded overflow-hidden bg-navy-950">
                                  <img src={photo.url} alt={`Cargo #${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 truncate">
                                  {photo.label ? `🏷️ ${photo.label}` : `📸 תמונה #${idx + 1}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Signature graphic block */}
                      {selectedMove.deliveryNote.signatureDataUrl && (
                        <div className="space-y-1 pt-2 border-t border-navy-800">
                          <span className="text-gray-400 block text-[11px] mb-1">חתימה גרפית אלקטרונית:</span>
                          <div className="bg-white rounded-lg p-2 flex justify-center items-center border border-navy-700 max-w-[200px] mx-auto">
                            <img 
                              src={selectedMove.deliveryNote.signatureDataUrl} 
                              alt="חתימת לקוח דיגיטלית" 
                              className="max-h-24 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WhatsApp Notification history ledger */}
                <div className="pt-4 border-t border-navy-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-electric justify-end">
                    <span>היסטוריית שידורים והתראות WhatsApp 📱</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  
                  {!selectedMove.notificationsLog || selectedMove.notificationsLog.length === 0 ? (
                    <div className="p-3 bg-navy-950 rounded-xl border border-navy-850 text-center text-gray-600 text-[10px]">
                      טרם נשלחו הודעות WhatsApp עבור מכרז זה. הודעות יישלחו אוטומטית בהתאם לשלבי ההובלה.
                    </div>
                  ) : (
                    <div className="space-y-3 relative border-r border-navy-800 pr-3 mr-1.5 text-right">
                      {selectedMove.notificationsLog.map((log) => (
                        <div key={log.id} className="relative group text-[11px] font-sans">
                          {/* Timeline dot */}
                          <span className="absolute -right-[16.5px] top-1.5 w-2 h-2 rounded-full bg-orange-electric border border-navy-950 group-hover:scale-125 transition-transform" />
                          
                          <div className="flex justify-between items-center gap-2 text-gray-500 mb-0.5 flex-row-reverse">
                            <span className="font-mono text-[9px]">
                              {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} {new Date(log.timestamp).toLocaleDateString('he-IL', { month: '2-digit', day: '2-digit' })}
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-black uppercase">
                              WhatsApp נמסר ✓
                            </span>
                          </div>
                          
                          <p className="text-gray-200 leading-relaxed font-medium text-right">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operational Live Chat with Driver */}
                <div className="pt-6 border-t border-navy-800">
                  <OperationalChat 
                    jobId={selectedMove.id} 
                    sender="admin" 
                    senderName="ניהול טראק דיל" 
                  />
                </div>
              </motion.div>
            ) : (
              <div className="bg-navy-900 border border-navy-800 rounded-3xl p-8 text-center text-gray-500 sticky top-8 min-h-[350px] flex flex-col items-center justify-center space-y-2">
                <ShieldCheck className="w-12 h-12 text-gray-600 mb-2" />
                <h4 className="font-bold text-white text-md">פרטי הובלה נבחרת</h4>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  בחר הובלה מהרשימה כדי לבצע אישור חיוב לקוח, לאשר הצעות מחיר של נהגים מורשים או לעדכן סטטוס פיננסי.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </div>
  );
}
