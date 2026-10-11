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
        trackingLink: `${window.location.origin}/?view
