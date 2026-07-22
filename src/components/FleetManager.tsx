import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Calendar, CheckCircle2, XCircle, Clock, 
  Search, ShieldAlert, Plus, Edit, Trash2, User, AlertCircle, 
  Settings, Info, Hammer, Sparkles, Filter, ChevronRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest } from '../types';

interface TruckResource {
  id: string;
  model: string;
  licensePlate: string;
  type: 'flatbed' | 'crane' | 'hydraulic_ramp';
  status: 'available' | 'on_route' | 'maintenance';
  testDate: string;
  insuranceDate: string;
}

interface DriverShift {
  id: string;
  driverId: string;
  driverName: string;
  date: string;
  status: 'available' | 'busy' | 'off' | 'sick';
  shiftType: 'morning' | 'evening' | 'night';
  notes?: string;
}

interface FleetManagerProps {
  moves: MoveRequest[];
  drivers: any[];
  onMoveUpdated: (updatedMove: MoveRequest) => void;
}

export default function FleetManager({ moves, drivers, onMoveUpdated }: FleetManagerProps) {
  const [trucks, setTrucks] = useState<TruckResource[]>([]);
  const [shifts, setShifts] = useState<DriverShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sub-tabs inside Fleet tab
  const [subTab, setSubTab] = useState<'trucks' | 'assign' | 'shifts'>('trucks');

  // Truck Form State
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckResource | null>(null);
  const [truckForm, setTruckForm] = useState<Omit<TruckResource, 'id'>>({
    model: '',
    licensePlate: '',
    type: 'flatbed',
    status: 'available',
    testDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
    insuranceDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Assign Board State
  const [selectedMove, setSelectedMove] = useState<MoveRequest | null>(null);
  const [assignmentDriverId, setAssignmentDriverId] = useState<string>('');
  const [assignmentTruckId, setAssignmentTruckId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [assignAlerts, setAssignAlerts] = useState<{ type: 'danger' | 'warning' | 'info'; message: string }[]>([]);

  // Shift Management State
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    driverId: '',
    status: 'available' as 'available' | 'busy' | 'off' | 'sick',
    shiftType: 'morning' as 'morning' | 'evening' | 'night',
    notes: ''
  });

  // Fetch initial data
  useEffect(() => {
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      const [trucksRes, shiftsRes] = await Promise.all([
        fetch('/api/trucks'),
        fetch('/api/shifts')
      ]);

      if (trucksRes.ok) {
        const trucksData = await trucksRes.json();
        setTrucks(trucksData);
      }
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData);
      }
    } catch (err) {
      console.error('Error fetching fleet data:', err);
      setError('שגיאה בטעינת נתוני הצי והנהגים מהשרת');
    } finally {
      setLoading(false);
    }
  };

  // Check assignment rules and produce smart alerts
  useEffect(() => {
    if (!selectedMove) {
      setAssignAlerts([]);
      return;
    }

    const alerts: { type: 'danger' | 'warning' | 'info'; message: string }[] = [];
    const selectedTruck = trucks.find(t => t.id === assignmentTruckId);
    const selectedDriver = drivers.find(d => d.id === assignmentDriverId);

    // Rule 1: Crane requirements matching
    if (selectedMove.craneNeeded === 'yes') {
      if (selectedTruck && selectedTruck.type !== 'crane') {
        alerts.push({
          type: 'danger',
          message: '⚠️ חסימת התאמה: הובלה זו מחייבת מנוף! המשאית שבחרת אינה מצוידת במנוף (סוג: ' + getTruckTypeLabel(selectedTruck.type) + ').'
        });
      } else if (!selectedTruck) {
        alerts.push({
          type: 'warning',
          message: 'שים לב: הובלה זו דורשת משאית מנוף ייעודית. ודא שחוקי המנוף נשמרים בעת השיוך.'
        });
      }
    }

    // Rule 2: Heavy cargo limits
    const totalItemsCount = selectedMove.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    if (totalItemsCount > 15 && selectedTruck && selectedTruck.type === 'hydraulic_ramp' && selectedTruck.model.includes('קטנה')) {
      alerts.push({
        type: 'warning',
        message: 'התראת משקל: כמות פריטים גבוהה עבור המשאית הקטנה שנבחרה. מומלץ לשייך משאית 12 טון.'
      });
    }

    // Rule 3: Truck Operational Status
    if (selectedTruck && selectedTruck.status === 'maintenance') {
      alerts.push({
        type: 'danger',
        message: '⚠️ משאית בטיפול: המשאית הנבחרת נמצאת כעת בסטטוס "בטיפול במוסך" ולא ניתנת לשחרור!'
      });
    }

    // Rule 4: Driver shift availability for Move date
    if (selectedDriver && selectedMove.moveDate) {
      const driverShiftOnDate = shifts.find(
        s => s.driverId === selectedDriver.id && s.date === selectedMove.moveDate
      );
      if (driverShiftOnDate) {
        if (driverShiftOnDate.status === 'off') {
          alerts.push({
            type: 'warning',
            message: `זמינות נהג: הנהג ${selectedDriver.fullName} מוגדר ב"חופשה" בתאריך ההובלה (${selectedMove.moveDate}).`
          });
        } else if (driverShiftOnDate.status === 'sick') {
          alerts.push({
            type: 'danger',
            message: `⚠️ הנהג ${selectedDriver.fullName} חולה בתאריך ${selectedMove.moveDate}! לא ניתן לשבצו לעבודה.`
          });
        }
      }
    }

    setAssignAlerts(alerts);
  }, [assignmentDriverId, assignmentTruckId, selectedMove, trucks, drivers, shifts]);

  // Truck CRUD handlers
  const handleSaveTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTruck ? `/api/trucks/${editingTruck.id}` : '/api/trucks';
      const method = editingTruck ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(truckForm)
      });

      if (!res.ok) throw new Error('שגיאה בשמירת פרטי המשאית');
      const data = await res.json();
      setTrucks(data.trucks);
      setShowTruckModal(false);
      setEditingTruck(null);
      setTruckForm({
        model: '',
        licensePlate: '',
        type: 'flatbed',
        status: 'available',
        testDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        insuranceDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTruck = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משאית זו מהצי?')) return;
    try {
      const res = await fetch(`/api/trucks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('שגיאה במחיקת המשאית');
      const data = await res.json();
      setTrucks(data.trucks);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assignment Handler
  const handleAssignResource = async () => {
    if (!selectedMove) return;
    if (!assignmentDriverId || !assignmentTruckId) {
      alert('נא לבחור נהג ומשאית תפעולית להובלה');
      return;
    }

    // Block logic for danger alerts
    const hasDanger = assignAlerts.some(a => a.type === 'danger');
    if (hasDanger) {
      alert('לא ניתן לבצע את השיוך עקב אזהרות בטיחות חמורות (רכב בטיפול, חוסר התאמת מנוף או נהג חולה). אנא תקן את הבחירה.');
      return;
    }

    setAssigningLoading(true);
    try {
      const res = await fetch(`/api/moves/${selectedMove.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: assignmentDriverId,
          truckId: assignmentTruckId,
          notes: assignmentNotes
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'שגיאה בשיוך המשאבים');
      }

      const data = await res.json();
      onMoveUpdated(data.move);
      setSelectedMove(null);
      setAssignmentDriverId('');
      setAssignmentTruckId('');
      setAssignmentNotes('');
      alert('המשאבים שויכו בהצלחה למכרז והועבר סטטוס הובלה! הנהג קיבל התראה ב-WhatsApp 🚚');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigningLoading(false);
    }
  };

  // Shift Board handlers
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.driverId) {
      alert('נא לבחור נהג');
      return;
    }

    const selectedDriver = drivers.find(d => d.id === shiftForm.driverId);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...shiftForm,
          driverName: selectedDriver?.fullName || 'נהג',
          date: selectedShiftDate
        })
      });

      if (!res.ok) throw new Error('שגיאה בשמירת יום הזמניות');
      const data = await res.json();
      setShifts(data.shifts);
      setShowShiftModal(false);
      setShiftForm({
        driverId: '',
        status: 'available',
        shiftType: 'morning',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper Labels translation
  const getTruckTypeLabel = (type: string) => {
    switch (type) {
      case 'flatbed': return 'משאית משטח';
      case 'crane': return 'משאית מנוף עד 10 טון 🏗️';
      case 'hydraulic_ramp': return 'משאית עם דופן הידראולית';
      default: return type;
    }
  };

  const getTruckStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'פנוי לתפעול';
      case 'on_route': return 'בדרך להובלה 🚚';
      case 'maintenance': return 'בטיפול / מוסך 🔧';
      default: return status;
    }
  };

  const getShiftStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'פנוי';
      case 'busy': return 'בתפקיד';
      case 'off': return 'חופש';
      case 'sick': return 'מחלה 🤒';
      default: return status;
    }
  };

  const getShiftTypeLabel = (type: string) => {
    switch (type) {
      case 'morning': return 'משמרת בוקר';
      case 'evening': return 'משמרת צהריים/ערב';
      case 'night': return 'משמרת לילה';
      default: return type;
    }
  };

  // Filter moves to see ones needing assignment
  const unassignedMoves = moves.filter(
    m => m.status === 'bid_approved' || (m.status as string) === 'Approved' || m.status === 'approved_for_driver'
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Sub tabs nav */}
      <div className="flex bg-navy-950 p-1.5 rounded-xl border border-navy-850 gap-2 max-w-md">
        <button
          onClick={() => setSubTab('trucks')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'trucks' ? 'bg-orange-electric text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ניהול צי משאיות ({trucks.length})
        </button>
        <button
          onClick={() => setSubTab('assign')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'assign' ? 'bg-orange-electric text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          שיוך חכם למכרזים ({unassignedMoves.length})
        </button>
        <button
          onClick={() => setSubTab('shifts')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            subTab === 'shifts' ? 'bg-orange-electric text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          שגרת עבודה ומשמרות
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-navy-900 border border-navy-800 rounded-2xl">
          <div className="w-10 h-10 border-4 border-orange-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <span className="text-sm text-gray-400">טוען נתוני צי ומשאבים...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* SUBTAB 1: TRUCKS BOARD */}
          {subTab === 'trucks' && (
            <motion.div
              key="trucks-board"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-navy-900 p-4 border border-navy-800 rounded-xl">
                <div>
                  <h3 className="font-black text-white text-lg">ניהול משאיות וציוד כבד</h3>
                  <p className="text-xs text-gray-400 mt-1">צפה בסטטוס התפעולי, מספרי רישוי ומועדי טסט/ביטוח של הכלים בצי</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTruck(null);
                    setTruckForm({
                      model: '',
                      licensePlate: '',
                      type: 'flatbed',
                      status: 'available',
                      testDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      insuranceDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    });
                    setShowTruckModal(true);
                  }}
                  className="px-3.5 py-2 bg-orange-electric hover:bg-orange-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>הוסף משאית לצי</span>
                </button>
              </div>

              {trucks.length === 0 ? (
                <div className="text-center py-20 bg-navy-900 border border-navy-800 rounded-2xl text-gray-500 text-sm">
                  אין משאיות רשומות כרגע במערכת. לחץ על "הוסף משאית" כדי להתחיל.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trucks.map((truck) => {
                    const daysToTest = Math.ceil(
                      (new Date(truck.testDate).getTime() - Date.now()) / (1000 * 3600 * 24)
                    );
                    const isTestUrgent = daysToTest < 30;

                    return (
                      <div 
                        key={truck.id} 
                        className="bg-navy-900 border border-navy-800 hover:border-navy-700 rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Header details */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              truck.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              truck.status === 'on_route' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {getTruckStatusLabel(truck.status)}
                            </span>

                            <div className="w-9 h-9 bg-navy-950 rounded-xl flex items-center justify-center text-orange-electric border border-navy-800">
                              <Truck className="w-5 h-5" />
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-base">{truck.model}</h4>
                            <span className="text-xs text-gray-400 block font-mono mt-0.5">לוחית: {truck.licensePlate}</span>
                          </div>
                        </div>

                        {/* Specs and Expiry Dates */}
                        <div className="bg-navy-950 p-3 rounded-xl border border-navy-850 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">סוג כלי:</span>
                            <span className="text-white font-semibold">{getTruckTypeLabel(truck.type)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">טסט שנתי:</span>
                            <span className={`font-semibold ${isTestUrgent ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                              {truck.testDate} {isTestUrgent && `(בעוד ${daysToTest} ימים! ⚠️)`}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-400">ביטוח חובה+מקיף:</span>
                            <span className="text-gray-300">{truck.insuranceDate}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 border-t border-navy-850 pt-3">
                          <button
                            onClick={() => {
                              setEditingTruck(truck);
                              setTruckForm({
                                model: truck.model,
                                licensePlate: truck.licensePlate,
                                type: truck.type,
                                status: truck.status,
                                testDate: truck.testDate,
                                insuranceDate: truck.insuranceDate
                              });
                              setShowTruckModal(true);
                            }}
                            className="p-1.5 hover:bg-navy-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="ערוך פרטי משאית"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTruck(truck.id)}
                            className="p-1.5 hover:bg-red-950/40 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="מחק מהצי"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* SUBTAB 2: SMART ASSIGNMENT BOARD */}
          {subTab === 'assign' && (
            <motion.div
              key="assignment-board"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Move selection list */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4">
                  <h4 className="font-bold text-white text-sm mb-1">הובלות ממתינות לשיוך ({unassignedMoves.length})</h4>
                  <p className="text-[11px] text-gray-400 mb-4">בחר הובלה או מכרז מאושר כדי לשייך נהג ומשאית תואמת</p>

                  {unassignedMoves.length === 0 ? (
                    <div className="text-center py-12 bg-navy-950 border border-navy-850 rounded-xl text-gray-600 text-xs">
                      אין הובלות מאושרות הממתינות לשיוך משאבים בשטח כרגע.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {unassignedMoves.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMove(m);
                            setAssignmentDriverId(m.finalApprovedBidId ? (m.driverBids.find(b => b.id === m.finalApprovedBidId)?.driverPhone || '') : '');
                            setAssignmentTruckId('');
                          }}
                          className={`p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                            selectedMove?.id === m.id
                              ? 'bg-orange-electric/10 border-orange-electric'
                              : 'bg-navy-950 hover:bg-navy-900 border-navy-850'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono bg-navy-900 text-orange-electric border border-navy-800 px-1.5 py-0.5 rounded font-bold">
                              #{m.id.substring(0, 8)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">{m.moveDate}</span>
                          </div>

                          <h5 className="font-bold text-white text-xs">{m.clientName}</h5>
                          <p className="text-[10px] text-gray-400 truncate mt-1">מ: {m.originAddress}</p>
                          <p className="text-[10px] text-gray-400 truncate">ל: {m.destAddress}</p>

                          {m.craneNeeded === 'yes' && (
                            <span className="inline-block mt-2 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              🏗️ דורש מנוף חיצוני
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Allocation Form & Verification */}
              <div className="lg:col-span-2 space-y-4">
                {selectedMove ? (
                  <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-6">
                    <div className="border-b border-navy-850 pb-4">
                      <span className="text-xs text-orange-electric font-bold tracking-wider block mb-1">שיוך ושיבוץ חכם למכרז</span>
                      <h3 className="text-lg font-bold text-white">הובלה עבור {selectedMove.clientName}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        תאריך מבוקש: <strong>{selectedMove.moveDate}</strong> | סך פריטים: {selectedMove.items?.reduce((s, i) => s + i.quantity, 0)}
                      </p>
                    </div>

                    {/* Quick Smart Verification Alerts */}
                    {assignAlerts.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-400 block">תוצאות בדיקת תאימות מערכת:</span>
                        {assignAlerts.map((alert, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                              alert.type === 'danger' ? 'bg-red-950/40 border-red-500/20 text-red-200' :
                              alert.type === 'warning' ? 'bg-amber-950/30 border-amber-500/20 text-amber-200' :
                              'bg-blue-950/30 border-blue-500/20 text-blue-200'
                            }`}
                          >
                            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                            <span>{alert.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Driver Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400">בחר נהג מוסמך להובלה</label>
                        <select
                          value={assignmentDriverId}
                          onChange={(e) => setAssignmentDriverId(e.target.value)}
                          className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                        >
                          <option value="">-- בחר נהג מהרשימה --</option>
                          {drivers.map((driver) => {
                            // Check if driver has shift today
                            const driverShift = shifts.find(
                              s => s.driverId === driver.id && s.date === selectedMove.moveDate
                            );
                            const shiftStatus = driverShift ? ` (${getShiftStatusLabel(driverShift.status)})` : '';
                            
                            return (
                              <option key={driver.id} value={driver.id}>
                                {driver.fullName} - {driver.truckType || 'מוביל'} {shiftStatus}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Truck Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400">בחר משאית/כלי ציוד תואם</label>
                        <select
                          value={assignmentTruckId}
                          onChange={(e) => setAssignmentTruckId(e.target.value)}
                          className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                        >
                          <option value="">-- בחר משאית מהצי --</option>
                          {trucks.map((truck) => (
                            <option key={truck.id} value={truck.id}>
                              {truck.model} ({truck.licensePlate}) - {getTruckTypeLabel(truck.type)} - {getTruckStatusLabel(truck.status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Operational Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400">הערות תפעוליות ספציפיות למשלוח זה</label>
                      <textarea
                        rows={3}
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        placeholder="למשל: ודא הבאת שמיכות עיטוף נוספות עבור הרהיט השביר בסלון. תיאום מנוף בוצע מול אבי מנופים."
                        className="w-full p-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-xs outline-none focus:border-orange-electric resize-none"
                      />
                    </div>

                    <div className="pt-2 flex gap-4">
                      <button
                        onClick={handleAssignResource}
                        disabled={assigningLoading || !assignmentDriverId || !assignmentTruckId}
                        className="flex-1 py-3 bg-orange-electric hover:bg-orange-hover disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                      >
                        {assigningLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="w-4.5 h-4.5" />
                            <span>אשר ושלח שיבוץ סופי לשטח</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedMove(null);
                          setAssignmentDriverId('');
                          setAssignmentTruckId('');
                          setAssignmentNotes('');
                        }}
                        className="px-4 py-3 bg-navy-950 hover:bg-navy-850 text-gray-400 hover:text-white rounded-xl text-xs font-bold border border-navy-800 transition-colors cursor-pointer"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-navy-900 border border-navy-800 rounded-2xl p-8 text-center text-gray-500 min-h-[350px] flex flex-col items-center justify-center space-y-3">
                    <Info className="w-10 h-10 text-orange-electric" />
                    <h4 className="font-bold text-white text-sm">טרם נבחרה הובלה לשיוך</h4>
                    <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                      בחר הובלה מהרשימה בצד ימין כדי לפתוח את ממשק השיוך החכם. המערכת תבדוק אוטומטית שיובר מנופים, דופן הידראולית וזמינות נהג למניעת טעויות אנוש.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SUBTAB 3: SHIFT AND CALENDAR BOARD */}
          {subTab === 'shifts' && (
            <motion.div
              key="shifts-board"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-navy-900 p-4 border border-navy-800 rounded-xl">
                <div>
                  <h3 className="font-black text-white text-lg">שגרת עבודה וזמינות נהגים</h3>
                  <p className="text-xs text-gray-400 mt-1">נהל את יומן המשמרות, מחלות, חופשות וסידורי העבודה של הנהגים</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold">תאריך:</span>
                    <input
                      type="date"
                      value={selectedShiftDate}
                      onChange={(e) => setSelectedShiftDate(e.target.value)}
                      className="bg-navy-950 border border-navy-800 text-white text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-orange-electric"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setShiftForm({
                        driverId: '',
                        status: 'available',
                        shiftType: 'morning',
                        notes: ''
                      });
                      setShowShiftModal(true);
                    }}
                    className="px-3 py-1.5 bg-orange-electric hover:bg-orange-hover text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>עדכן יום זמינות</span>
                  </button>
                </div>
              </div>

              {/* Shift visual list */}
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm border-b border-navy-850 pb-2">
                  סידור עבודה וזמינות לתאריך: <span className="text-orange-electric font-mono">{selectedShiftDate}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drivers.map((driver) => {
                    const driverShift = shifts.find(
                      s => s.driverId === driver.id && s.date === selectedShiftDate
                    );

                    return (
                      <div 
                        key={driver.id} 
                        className="bg-navy-950 border border-navy-850 rounded-xl p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-white text-sm">{driver.fullName}</h5>
                            <span className="text-[11px] text-gray-400">{driver.truckType || 'מוביל מוסמך'}</span>
                          </div>
                        </div>

                        <div className="text-left space-y-1">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold block ${
                            !driverShift || driverShift.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            driverShift.status === 'busy' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                            driverShift.status === 'off' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {driverShift ? getShiftStatusLabel(driverShift.status) : 'פנוי לתפעול (ברירת מחדל)'}
                          </span>
                          
                          {driverShift && (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {getShiftTypeLabel(driverShift.shiftType)}
                            </span>
                          )}

                          {driverShift?.notes && (
                            <span className="text-[10px] text-gray-500 italic block max-w-xs truncate">
                              "{driverShift.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* TRUCK FORM MODAL */}
      {showTruckModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-900 border border-navy-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl text-right"
          >
            <h4 className="font-black text-white text-lg border-b border-navy-800 pb-2">
              {editingTruck ? 'ערוך פרטי משאית בצי' : 'הוספת משאית חדשה לצי'}
            </h4>

            <form onSubmit={handleSaveTruck} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">דגם המשאית / יצרן *</label>
                <input
                  type="text"
                  required
                  placeholder="איסוזו סומו 12 טון"
                  value={truckForm.model}
                  onChange={(e) => setTruckForm({ ...truckForm, model: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">מספר רישוי (לוחית) *</label>
                <input
                  type="text"
                  required
                  placeholder="33-444-55"
                  value={truckForm.licensePlate}
                  onChange={(e) => setTruckForm({ ...truckForm, licensePlate: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs font-mono outline-none focus:border-orange-electric"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">סוג כלי ואיפיון *</label>
                <select
                  value={truckForm.type}
                  onChange={(e) => setTruckForm({ ...truckForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                >
                  <option value="flatbed">משאית משטח פתוחה</option>
                  <option value="crane">משאית מנוף עד 10 טון 🏗️</option>
                  <option value="hydraulic_ramp">משאית סגורה + דופן הידראולית</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-400 font-bold">תאריך טסט שנתי</label>
                  <input
                    type="date"
                    value={truckForm.testDate}
                    onChange={(e) => setTruckForm({ ...truckForm, testDate: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-400 font-bold">תאריך חידוש ביטוח</label>
                  <input
                    type="date"
                    value={truckForm.insuranceDate}
                    onChange={(e) => setTruckForm({ ...truckForm, insuranceDate: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">סטטוס תפעולי ראשוני</label>
                <select
                  value={truckForm.status}
                  onChange={(e) => setTruckForm({ ...truckForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                >
                  <option value="available">פנוי לעבודה (Available)</option>
                  <option value="on_route">בדרך לביצוע (On Route)</option>
                  <option value="maintenance">בטיפול / מוסך (Maintenance)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-electric hover:bg-orange-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  שמור במערכת
                </button>
                <button
                  type="button"
                  onClick={() => setShowTruckModal(false)}
                  className="px-4 py-2.5 bg-navy-950 hover:bg-navy-850 text-gray-400 hover:text-white border border-navy-850 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  סגור
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SHIFT AVAILABILITY FORM MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-900 border border-navy-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl text-right"
          >
            <h4 className="font-black text-white text-lg border-b border-navy-800 pb-2">
              עדכון זמינות נהג לתאריך: <span className="text-orange-electric font-mono">{selectedShiftDate}</span>
            </h4>

            <form onSubmit={handleSaveShift} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">בחר נהג מוסמך *</label>
                <select
                  required
                  value={shiftForm.driverId}
                  onChange={(e) => setShiftForm({ ...shiftForm, driverId: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                >
                  <option value="">-- בחר נהג --</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">סטטוס זמינות לתאריך זה *</label>
                <select
                  value={shiftForm.status}
                  onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                >
                  <option value="available">פנוי לעבודה (Available)</option>
                  <option value="busy">משובץ להובלה (Busy)</option>
                  <option value="off">יום חופש / מנוחה (Off)</option>
                  <option value="sick">יום מחלה / אי-כושר (Sick)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">סוג משמרת / שעות מועדפות</label>
                <select
                  value={shiftForm.shiftType}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric cursor-pointer"
                >
                  <option value="morning">משמרת בוקר (06:00 - 14:00)</option>
                  <option value="evening">משמרת ערב (14:00 - 22:00)</option>
                  <option value="night">משמרת לילה (22:00 - 06:00)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-bold">הערות שיבוץ ספציפיות</label>
                <input
                  type="text"
                  placeholder="למשל: ביקש לעבוד רק במשמרת בוקר עקב לימודים"
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs outline-none focus:border-orange-electric"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-electric hover:bg-orange-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  אשר ועדכן סידור
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2.5 bg-navy-950 hover:bg-navy-850 text-gray-400 hover:text-white border border-navy-850 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
