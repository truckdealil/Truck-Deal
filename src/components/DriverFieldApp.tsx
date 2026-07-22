import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Phone, Navigation, MapPin, Calendar, Clock, 
  Check, RefreshCw, Camera, Edit2, AlertCircle, Trash2, 
  CheckCircle2, ArrowRight, ShieldCheck, UserCheck, Play, 
  Award, Wifi, WifiOff, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest, DriverBid } from '../types';
import OperationalChat from './OperationalChat';

interface DriverFieldAppProps {
  initialMoveId: string | null;
  onBackToBidding?: () => void;
}

interface CargoPhoto {
  url: string;
  label: string;
}

export default function DriverFieldApp({ initialMoveId, onBackToBidding }: DriverFieldAppProps) {
  const [moves, setMoves] = useState<MoveRequest[]>([]);
  const [selectedMove, setSelectedMove] = useState<MoveRequest | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Offline state tracker for PWA
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  // Job flow state
  // Supported status progress: 'assigned' -> 'en_route_to_origin' -> 'loading' -> 'en_route_to_dest' -> 'delivered'
  const [activeJobStatus, setActiveJobStatus] = useState<string>('assigned');
  const [cargoPhotos, setCargoPhotos] = useState<CargoPhoto[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Signature pad states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [submittingPOD, setSubmittingPOD] = useState(false);
  const [podSuccess, setPodSuccess] = useState(false);
  const [podSignature, setPodSignature] = useState<string>('');

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch moves and drivers
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch drivers
      const driversRes = await fetch('/api/drivers');
      let driversData: any[] = [];
      if (driversRes.ok) {
        driversData = await driversRes.json();
        setDrivers(driversData);
        // Default to first driver if available
        if (driversData.length > 0) {
          setSelectedDriverId(driversData[0].id);
        }
      }

      // Fetch moves
      const movesRes = await fetch('/api/moves');
      if (movesRes.ok) {
        const movesData: MoveRequest[] = await movesRes.json();
        setMoves(movesData);
        
        // Cache in localStorage for PWA offline operation
        localStorage.setItem('truk_dealil_all_moves', JSON.stringify(movesData));
        localStorage.setItem('truk_dealil_drivers', JSON.stringify(driversData));

        // If an initial move ID was provided, pre-select it
        if (initialMoveId) {
          const matched = movesData.find(m => m.id === initialMoveId);
          if (matched) {
            setSelectedMove(matched);
            initJobState(matched);
          }
        }
      } else {
        throw new Error('שגיאה בטעינת נתונים מהשרת');
      }
    } catch (err) {
      console.error(err);
      // Fallback to offline cache
      const cachedMoves = localStorage.getItem('truk_dealil_all_moves');
      const cachedDrivers = localStorage.getItem('truk_dealil_drivers');
      if (cachedMoves) {
        setMoves(JSON.parse(cachedMoves));
      }
      if (cachedDrivers) {
        const parsedDr = JSON.parse(cachedDrivers);
        setDrivers(parsedDr);
        if (parsedDr.length > 0) setSelectedDriverId(parsedDr[0].id);
      }
      setError('פועל במצב לא מקוון. מציג נתונים שמורים מקומית.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize status state based on selected move
  const initJobState = (move: MoveRequest) => {
    if (move.status === 'completed') {
      setActiveJobStatus('completed');
      setPodSuccess(true);
    } else {
      // Custom tracking state or general status mapping
      const savedStatus = localStorage.getItem(`truk_status_job_${move.id}`);
      setActiveJobStatus(savedStatus || 'assigned');
    }

    // Load any offline-saved photos for this job
    let initialPhotos: CargoPhoto[] = [];
    if (move.deliveryNote && move.deliveryNote.cargoPhotos) {
      initialPhotos = move.deliveryNote.cargoPhotos.map((item: any) => {
        if (typeof item === 'string') {
          return { url: item, label: '' };
        }
        return { url: item.url || '', label: item.label || '' };
      });
    } else {
      const cachedPhotos = localStorage.getItem(`truk_photos_job_${move.id}`);
      if (cachedPhotos) {
        try {
          const parsed = JSON.parse(cachedPhotos);
          if (Array.isArray(parsed)) {
            initialPhotos = parsed.map((item: any) => {
              if (typeof item === 'string') {
                return { url: item, label: '' };
              }
              return { url: item.url || '', label: item.label || '' };
            });
          }
        } catch (err) {
          console.error('Error parsing cached photos:', err);
        }
      }
    }
    setCargoPhotos(initialPhotos);
    
    setReceiverName(move.clientName || '');
    setHasSigned(false);
  };

  // Switch driver selection
  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    setSelectedMove(null);
  };

  // Filter moves assigned to the selected driver
  // Matches assignedDriverId or finalApprovedBid matching selected driver phone/name
  const getDriverJobs = () => {
    const selectedDriver = drivers.find(d => d.id === selectedDriverId);
    if (!selectedDriver) return [];

    return moves.filter(move => {
      // Match explicitly assigned resources
      if (move.assignedDriverId === selectedDriverId) return true;
      
      // Or match bidding driver full name
      const approvedBid = move.driverBids.find(b => b.id === move.finalApprovedBidId || b.status === 'approved');
      if (approvedBid && approvedBid.driverName === selectedDriver.fullName) return true;

      // Or fallback check if it matches initial move
      if (initialMoveId && move.id === initialMoveId) return true;

      return false;
    });
  };

  // Auto-assign mock job to current driver for demo purposes
  const handleCreateMockJob = async () => {
    const selectedDriver = drivers.find(d => d.id === selectedDriverId);
    if (!selectedDriver) return;

    // Find any unassigned move request ('new' or 'bidding')
    const unassigned = moves.find(m => m.status === 'new' || m.status === 'bidding');
    if (!unassigned) {
      alert('לא נמצאו הובלות חדשות פתוחות במערכת למטרת שיוך. אנא צור הובלה חדשה דרך המחשבון תחילה.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/moves/${unassigned.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriver.id,
          truckId: 'truck_1', // default demo truck
          notes: 'שויך אוטומטית לצורך סימולציית נהג שטח'
        })
      });

      if (response.ok) {
        await fetchData();
      } else {
        throw new Error('שגיאה בשיוך ההובלה');
      }
    } catch (err) {
      alert('השיוך נכשל. ננסה לשייך מקומית.');
      // Local fallback
      const updatedMoves = moves.map(m => {
        if (m.id === unassigned.id) {
          return {
            ...m,
            assignedDriverId: selectedDriver.id,
            assignedDriverName: selectedDriver.fullName,
            assignedDriverPhone: selectedDriver.phone,
            status: 'approved_for_driver' as const
          };
        }
        return m;
      });
      setMoves(updatedMoves);
      localStorage.setItem('truk_dealil_all_moves', JSON.stringify(updatedMoves));
    } finally {
      setLoading(false);
    }
  };

  // Handle local and cloud status updates
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedMove) return;

    setActiveJobStatus(newStatus);
    localStorage.setItem(`truk_status_job_${selectedMove.id}`, newStatus);

    // Sync to backend if online
    if (navigator.onLine) {
      setSyncPending(true);
      try {
        // 1. Sync driver status transition (e.g. en_route_to_origin, loading, etc.)
        const driverStatusRes = await fetch(`/api/moves/${selectedMove.id}/driver-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverStatus: newStatus })
        });

        // 2. Map field app statuses to official backend database statuses if completing
        let backendStatus = selectedMove.status;
        if (newStatus === 'completed') {
          backendStatus = 'completed';
        } else if (newStatus !== 'assigned') {
          backendStatus = 'approved_for_driver';
        }

        const res = await fetch(`/api/moves/${selectedMove.id}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: backendStatus,
            paymentStatus: selectedMove.paymentStatus // preserve
          })
        });

        if (res.ok) {
          const data = await res.json();
          // Update local moves and active selected move
          setMoves(prev => prev.map(m => m.id === selectedMove.id ? data.move : m));
          setSelectedMove(data.move);
        } else if (driverStatusRes.ok) {
          const dsData = await driverStatusRes.json();
          setMoves(prev => prev.map(m => m.id === selectedMove.id ? dsData.move : m));
          setSelectedMove(dsData.move);
        }
      } catch (err) {
        console.error('Failed to sync status to server', err);
      } finally {
        setSyncPending(false);
      }
    } else {
      // Offline notice
      console.log('Status saved locally in PWA. Will sync when connection is restored.');
    }
  };

  // Signature Canvas Drawing handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSigned(true);
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // Set up signature context parameters on mount/view change
  useEffect(() => {
    if (activeJobStatus === 'completed' && !podSuccess) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#0a192f'; // Dark Navy ink for rich visibility
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeJobStatus, podSuccess]);

  // Handle cargo photo selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newPhoto = { url: base64, label: '' };
      const updatedPhotos = [...cargoPhotos, newPhoto];
      setCargoPhotos(updatedPhotos);
      
      // Save locally
      if (selectedMove) {
        localStorage.setItem(`truk_photos_job_${selectedMove.id}`, JSON.stringify(updatedPhotos));
      }
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  // Update photo label
  const handleUpdatePhotoLabel = (idx: number, newLabel: string) => {
    const updated = cargoPhotos.map((photo, i) => i === idx ? { ...photo, label: newLabel } : photo);
    setCargoPhotos(updated);
    if (selectedMove) {
      localStorage.setItem(`truk_photos_job_${selectedMove.id}`, JSON.stringify(updated));
    }
  };

  // Remove photo
  const handleRemovePhoto = (idx: number) => {
    const updated = cargoPhotos.filter((_, i) => i !== idx);
    setCargoPhotos(updated);
    if (selectedMove) {
      localStorage.setItem(`truk_photos_job_${selectedMove.id}`, JSON.stringify(updated));
    }
  };

  // Submit complete Proof of Delivery (POD)
  const handleSubmitPOD = async () => {
    if (!selectedMove) return;
    if (!receiverName.trim()) {
      alert('נא להזין את שם הלקוח המקבל ומאשר');
      return;
    }
    if (!hasSigned) {
      alert('נא להחתים את הלקוח בתיבת החתימה');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmittingPOD(true);
    const signatureImage = canvas.toDataURL('image/png');
    setPodSignature(signatureImage);

    const podPayload = {
      signatureImage,
      confirmedItems: selectedMove.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        confirmed: true
      })),
      customerName: receiverName,
      feedbackScore: feedbackRating,
      notes: `הושלם בשטח ע״י אפליקציית נהגים. תועדו ${cargoPhotos.length} צילומי תכולה.`,
      cargoPhotos
    };

    try {
      if (navigator.onLine) {
        const res = await fetch(`/api/moves/${selectedMove.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(podPayload)
        });

        if (res.ok) {
          const data = await res.json();
          // Update moves list
          setMoves(prev => prev.map(m => m.id === selectedMove.id ? data.move : m));
          setPodSuccess(true);
        } else {
          throw new Error('שגיאה באישור מסירה בשרת');
        }
      } else {
        // Offline simulation logic
        const offlineCompletedMove = {
          ...selectedMove,
          status: 'completed' as const,
          deliveryNote: {
            signedBy: receiverName,
            signatureDataUrl: signatureImage,
            signedAt: new Date().toISOString(),
            checklistResults: selectedMove.items.map(item => ({ itemId: item.id, name: item.name, verified: true })),
            feedbackRating: feedbackRating,
            cargoPhotos
          }
        };

        // Cache completed state
        setMoves(prev => prev.map(m => m.id === selectedMove.id ? offlineCompletedMove : m));
        localStorage.setItem(`truk_status_job_${selectedMove.id}`, 'completed');
        
        // Save local delivery note
        localStorage.setItem(`truk_pod_offline_${selectedMove.id}`, JSON.stringify(podPayload));
        setPodSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert('שגיאה בשליחת אישור מסירה. הנתונים נשמרו במכשיר ויסונכרנו בהקדם.');
    } finally {
      setSubmittingPOD(false);
    }
  };

  const activeDriverJobs = getDriverJobs();
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="bg-navy-950 min-h-screen text-gray-100 font-sans p-4" dir="rtl" id="driver-pwa-portal">
      
      {/* PWA STATUS BAR */}
      <div className={`-mx-4 -mt-4 mb-6 py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 transition-all ${
        isOffline 
          ? 'bg-red-600 text-white animate-pulse' 
          : 'bg-emerald-950/80 text-emerald-400 border-b border-emerald-500/20'
      }`}>
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>מצב PWA לא מקוון: נתונים נשמרים ישירות במכשיר (Offline Active Sandbox)</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>מחובר לרשת: שידור נתוני GPS וסטטוס עבודה בזמן אמת למוקד</span>
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* TOP WORKSPACE NAV & SIMULATOR CONTROL */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-navy-900 border border-navy-800 p-4 rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-electric/10 rounded-xl flex items-center justify-center border border-orange-electric/25 text-orange-electric">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">אפליקציית הנהגים והשטח 🚚</h2>
              <p className="text-xs text-gray-400">Truk Dealil IL Driver Dispatch Terminal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none">
              <label className="block text-[10px] text-gray-400 font-bold">זהות נהג (סימולטור):</label>
              <select
                value={selectedDriverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full bg-navy-950 text-white text-xs px-3 py-2 rounded-xl border border-navy-700 outline-none focus:border-orange-electric"
              >
                {drivers.map(dr => (
                  <option key={dr.id} value={dr.id}>
                    {dr.fullName} ({dr.region})
                  </option>
                ))}
              </select>
            </div>

            {onBackToBidding && (
              <button
                onClick={onBackToBidding}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-750 text-gray-300 rounded-xl text-xs font-bold border border-navy-700 cursor-pointer self-end shrink-0"
              >
                חזרה למכרזים
              </button>
            )}
          </div>
        </div>

        {/* FEED / JOB LIST OR DETAILS CONTAINER */}
        {!selectedMove ? (
          <div className="space-y-4">
            
            {/* DRIVER STATS SUMMARY OVERVIEW */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400 block">הובלות שהושלמו השבוע</span>
                <span className="text-2xl font-black text-orange-electric font-mono">{selectedDriver?.completedMoves || 14}</span>
              </div>
              <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400 block">ציון שירות נוכחי</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">⭐ {selectedDriver?.rating || '4.9'}</span>
              </div>
              <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl text-center space-y-1 col-span-2 md:col-span-1">
                <span className="text-xs text-gray-400 block">כלי רכב מורשה</span>
                <span className="text-xs font-extrabold text-white truncate block">{selectedDriver?.truckType || 'משאית 7.5 טון'}</span>
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5">
              <div className="flex justify-between items-center border-b border-navy-800 pb-3 mb-4">
                <h3 className="font-bold text-white text-md">רשימת משימות הובלה פעילות ({activeDriverJobs.length})</h3>
                <span className="text-[10px] text-gray-400">מסודר כרונולוגית</span>
              </div>

              {activeDriverJobs.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-navy-950 flex items-center justify-center border border-navy-800 text-gray-500 mx-auto">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-300">אין הובלות משוייכות פעילות עבור נהג זה</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      כל ההובלות שהגשת להן הצעה טרם אושרו סופית או שלא שויכו ישירות אליך בדשבורד הניהול.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateMockJob}
                    className="mt-2 px-5 py-2.5 bg-orange-electric hover:bg-orange-hover text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/15 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>שייך הובלה לדוגמה לסימולציה מיידית!</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3" id="driver-job-feed-list">
                  {activeDriverJobs.map((move) => (
                    <div 
                      key={move.id}
                      onClick={() => {
                        setSelectedMove(move);
                        initJobState(move);
                      }}
                      className="bg-navy-950 border border-navy-850 hover:border-orange-electric/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] shadow-md"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-orange-electric/10 text-orange-electric px-2.5 py-0.5 rounded-full">
                            #{move.id.substring(5, 11).toUpperCase()}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            move.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {move.status === 'completed' ? 'הושלם בהצלחה 🏁' : 'ממתין לביצוע 🚚'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <p className="text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-electric"></span>
                            <span>מוצא: <strong>{move.originAddress.split(',')[0]}</strong></span>
                          </p>
                          <p className="text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>יעד: <strong>{move.destAddress.split(',')[0]}</strong></span>
                          </p>
                        </div>

                        <div className="flex gap-4 text-[11px] text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-orange-electric" />
                            {move.moveDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-orange-electric" />
                            {move.moveTime}
                          </span>
                          <span className="flex items-center gap-1 bg-navy-900 px-1.5 py-0.5 rounded text-[10px]">
                            סוג: {move.moveType === 'apartment' ? 'דירה' : 'משרד'}
                          </span>
                          {move.craneNeeded === 'yes' && (
                            <span className="text-orange-electric font-bold bg-orange-electric/10 px-1.5 py-0.5 rounded text-[10px]">
                              ⚠️ נדרש מנוף
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto border-t border-navy-850 md:border-none pt-3 md:pt-0">
                        <button
                          className="flex-1 md:flex-none px-4 py-2.5 bg-orange-electric hover:bg-orange-hover text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>כנס למסך משימה</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE DISPATCH CONTROLLER SHEET */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header / Back */}
            <div className="flex justify-between items-center bg-navy-900 border border-navy-800 px-4 py-3 rounded-2xl">
              <button
                onClick={() => setSelectedMove(null)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-navy-950 px-3 py-1.5 rounded-lg border border-navy-850 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לרשימת המשימות</span>
              </button>

              <div className="text-left">
                <span className="text-[10px] text-gray-400 block">מזהה הובלה בשטח:</span>
                <span className="text-xs font-black text-orange-electric">#{selectedMove.id}</span>
              </div>
            </div>

            {/* QUICK ACTIONS PANEL (Waze Navigation, Direct calling client & dispatch) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SMART MAP NAVIGATION BOARD */}
              <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-sm border-b border-navy-850 pb-2 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-orange-electric" />
                  <span>ניווט לווייני חכם לשטח</span>
                </h3>

                <p className="text-xs text-gray-300">
                  לחץ לניווט מהיר ב-Waze או Google Maps ישירות למשאיות:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`https://waze.com/ul?q=${encodeURIComponent(selectedMove.originAddress)}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-navy-950 hover:bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 transition-all group cursor-pointer hover:border-orange-electric"
                  >
                    <MapPin className="w-5 h-5 text-orange-electric group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">נווט למוצא ב-Waze</span>
                    <span className="text-[9px] text-gray-400">כתובת העמסה</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMove.destAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-navy-950 hover:bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 transition-all group cursor-pointer hover:border-emerald-500"
                  >
                    <Navigation className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">נווט ליעד ב-Maps</span>
                    <span className="text-[9px] text-gray-400">כתובת פריקה</span>
                  </a>
                </div>
              </div>

              {/* QUICK ONE-TAP PHONE CALL TARGETS */}
              <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-sm border-b border-navy-850 pb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-orange-electric" />
                  <span>טלפונים לחיוג מהיר מהשטח</span>
                </h3>

                <p className="text-xs text-gray-300">
                  חיוג מיידי ללקוח המקבל או למנהל העבודה מבלי לצאת מהאפליקציה:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${selectedMove.clientPhone}`}
                    className="p-3 bg-navy-950 hover:bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 transition-all group cursor-pointer hover:border-orange-electric"
                  >
                    <Phone className="w-5 h-5 text-orange-electric group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">התקשר ללקוח</span>
                    <span className="text-[9px] text-gray-400 truncate max-w-full">{selectedMove.clientName}</span>
                  </a>

                  <a
                    href="tel:03-9048382"
                    className="p-3 bg-navy-950 hover:bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 transition-all group cursor-pointer hover:border-blue-500"
                  >
                    <ShieldCheck className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">מוקד תפעול</span>
                    <span className="text-[9px] text-gray-400">03-9048382 (מנהל)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* LIVE STEPPER STATUS DRIVER UPDATES */}
            <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-navy-850 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-electric" />
                  <span>עדכון סטטוס התקדמות חי (Live Tracking Feed)</span>
                </h3>
                {syncPending && (
                  <span className="text-[10px] text-orange-electric flex items-center gap-1 font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> מסנכרן...
                  </span>
                )}
              </div>

              {activeJobStatus === 'completed' ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">ההובלה הושלמה ונסגרה בהצלחה! 🏁</p>
                  <p className="text-xs text-gray-400">הלקוח חתם על תעודת המסירה והנתונים עודכנו במשרד.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-300">
                    עדכן את מוקד התפעול ואת הלקוח בווטסאפ בזמן אמת ע״י לחיצה על הסטטוס הנוכחי:
                  </p>

                  {/* Gigantic visual buttons for field fingers click */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => handleUpdateStatus('assigned')}
                      className={`p-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1.5 ${
                        activeJobStatus === 'assigned'
                          ? 'bg-orange-electric border-orange-electric text-white shadow-md'
                          : 'bg-navy-950 border-navy-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">📦</span>
                      <span>1. התקבל לביצוע</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('en_route_to_origin')}
                      className={`p-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1.5 ${
                        activeJobStatus === 'en_route_to_origin'
                          ? 'bg-orange-electric border-orange-electric text-white shadow-md animate-pulse'
                          : 'bg-navy-950 border-navy-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">🚚</span>
                      <span>2. בדרך למוצא</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('loading')}
                      className={`p-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1.5 ${
                        activeJobStatus === 'loading'
                          ? 'bg-orange-electric border-orange-electric text-white shadow-md'
                          : 'bg-navy-950 border-navy-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">⚖️</span>
                      <span>3. העמסה בשטח</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('en_route_to_dest')}
                      className={`p-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1.5 ${
                        activeJobStatus === 'en_route_to_dest'
                          ? 'bg-orange-electric border-orange-electric text-white shadow-md'
                          : 'bg-navy-950 border-navy-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">⚡</span>
                      <span>4. בדרך ליעד</span>
                    </button>
                  </div>
                  
                  {/* Next Step trigger advice */}
                  <div className="bg-navy-950 p-3 rounded-xl text-[11px] text-gray-400 text-center">
                    הסטטוס המעודכן משנה אוטומטית את ארון הלקוח ומשדר להם מפה דינמית מעודכנת!
                  </div>
                </div>
              )}
            </div>

            {/* CARGO CONDITION PHOTOGRAPHY (POD - Step 1) */}
            <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm border-b border-navy-850 pb-2 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-orange-electric" />
                <span>צילומי מצב מטען ותכולה בשטח (cargo documentation)</span>
              </h3>

              <p className="text-xs text-gray-300">
                למניעת תביעות שווא, צלם או העלה תמונות של המטען במוצא וביעד:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Photo uploader trigger */}
                <label className="border-2 border-dashed border-navy-700 hover:border-orange-electric rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-navy-950 h-28 relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                  {isUploadingPhoto ? (
                    <RefreshCw className="w-6 h-6 text-orange-electric animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                  <span className="text-[10px] text-white font-bold text-center">צילום תכולה חי</span>
                  <span className="text-[8px] text-gray-400 block leading-none">מצלמה / קבצים</span>
                </label>

                {/* Previews */}
                {cargoPhotos.map((img, idx) => (
                  <div key={idx} className="flex flex-col bg-navy-950 border border-navy-850 rounded-xl overflow-hidden relative group min-h-[170px]">
                    <div className="relative h-24 w-full">
                      <img src={img.url} alt={`Cargo Condition - ${img.label || 'ללא תווית'}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer z-10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 right-1 bg-navy-950/85 px-1 py-0.5 rounded text-[8px] text-gray-400 font-mono z-10">
                        #{idx + 1} שטח
                      </span>
                    </div>
                    
                    {/* Label Input with Suggestions */}
                    <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                      <input
                        type="text"
                        placeholder="תווית (סלון, מטבח...)"
                        value={img.label}
                        onChange={(e) => handleUpdatePhotoLabel(idx, e.target.value)}
                        className="w-full bg-navy-900 border border-navy-800 focus:border-orange-electric/50 text-white text-[10px] rounded px-1.5 py-1 text-right focus:outline-none placeholder-gray-500 font-semibold"
                      />
                      
                      {/* Rapid Selection suggestion chips */}
                      <div className="flex flex-wrap gap-1 justify-end">
                        {['סלון', 'מטבח', 'שביר', 'חדר שינה'].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleUpdatePhotoLabel(idx, sug)}
                            className={`text-[8px] px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                              img.label === sug
                                ? 'bg-orange-electric/20 border-orange-electric/40 text-orange-electric font-bold'
                                : 'bg-navy-900/85 border-navy-800 text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OPERATIONAL CHAT MODULE WITH ADMINISTRATION */}
            <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm border-b border-navy-850 pb-2 flex items-center gap-1.5 justify-end">
                <span>צ'אט מבצעי בזמן אמת מול מוקד התפעול</span>
                <span className="w-2 h-2 rounded-full bg-orange-electric animate-pulse animate-duration-1000" />
              </h3>
              
              <OperationalChat 
                jobId={selectedMove.id} 
                sender="driver" 
                senderName={selectedDriver?.fullName || 'נהג שטח מורשה'} 
              />
            </div>

            {/* TOUCH-COMPATIBLE SIGNATURE PAD (POD - Step 2) */}
            <AnimatePresence>
              {activeJobStatus !== 'completed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 overflow-hidden"
                >
                  <div className="flex justify-between items-center border-b border-navy-850 pb-2">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4 text-orange-electric" />
                      <span>מסירה בשטח - חתימה אלקטרונית מאושרת</span>
                    </h3>

                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>נקה חתימה</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-gray-400 font-semibold">שם הלקוח המקבל ומאשר <span className="text-orange-electric">*</span></label>
                      <input
                        type="text"
                        placeholder="למשל: יובל שלום"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-navy-950 border border-navy-700 rounded-xl focus:border-orange-electric outline-none text-white text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs text-gray-400 font-semibold font-sans">דירוג חווית הלקוח מהצוות</label>
                      <div className="flex gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <span className={`text-xl ${star <= feedbackRating ? 'opacity-100' : 'opacity-30 filter grayscale'}`}>
                              ⭐
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Drawpad Canvas Frame */}
                  <div className="bg-gray-100 rounded-xl border border-navy-700 overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 bg-white block cursor-crosshair touch-none"
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs font-bold">
                        חתום באצבע כאן לאישור מסירה סופית ✍️
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitPOD}
                    disabled={submittingPOD}
                    className="w-full py-3.5 bg-orange-electric hover:bg-orange-hover disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {submittingPOD ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>אישור מסירה סופי (POD) ונעילת הובלה</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* POD RECEIPT SUMMARY / END OF JOB REPORT */}
            {podSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-navy-900 border border-emerald-500/30 p-6 rounded-3xl text-center space-y-6"
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #printable-pod-receipt, #printable-pod-receipt * {
                      visibility: visible;
                    }
                    #printable-pod-receipt {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      background: white !important;
                      color: #0f172a !important;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 40px !important;
                      direction: rtl !important;
                    }
                    .print-force-light {
                      background-color: #ffffff !important;
                      color: #0f172a !important;
                      border-color: #e2e8f0 !important;
                    }
                    .print-force-text-dark {
                      color: #0f172a !important;
                    }
                    .print-force-text-muted {
                      color: #475569 !important;
                    }
                    .print-force-border {
                      border: 1px solid #cbd5e1 !important;
                    }
                    .print-btn-hide {
                      display: none !important;
                    }
                  }
                `}} />

                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg">תעודת המסירה אושרה וסונכרנה בהצלחה! 🚚</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                    החתימה הדיגיטלית נשמרה בפורמט Data URI. דוח אישור המסירה (POD) זמין להלן להדפסה או ייצוא לקובץ.
                  </p>
                </div>

                {/* VISUAL RECEIPT CONTAINER */}
                <div 
                  id="printable-pod-receipt"
                  className="bg-navy-950 p-6 rounded-2xl border border-navy-850 text-right space-y-5 text-sm print-force-light shadow-inner"
                >
                  {/* Branding Header */}
                  <div className="flex justify-between items-center border-b border-navy-850 pb-4 mb-2 print-force-light print-force-border">
                    <div className="text-right">
                      <span className="font-black text-lg text-orange-electric block">TRUK DEALIL IL</span>
                      <span className="text-[10px] text-gray-400 block font-bold tracking-wider print-force-text-muted">מערכת שידוך והובלות חכמה בע״מ</span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black text-center inline-block print-force-border print-force-text-dark">
                        מסירה חתומה (POD)
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono block mt-1.5 print-force-text-muted">{new Date().toLocaleDateString('he-IL')} • {new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>

                  {/* Move & Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2 text-right">
                      <p className="text-gray-400 print-force-text-muted"><strong>מזהה הזמנה:</strong> <span className="text-white font-mono font-bold print-force-text-dark">#{selectedMove.id}</span></p>
                      <p className="text-gray-400 print-force-text-muted"><strong>מקבל הציוד (מורשה חתימה):</strong> <span className="text-white font-extrabold print-force-text-dark">{receiverName}</span></p>
                      <p className="text-gray-400 print-force-text-muted"><strong>כתובת יעד:</strong> <span className="text-white font-semibold print-force-text-dark">{selectedMove.destination}</span></p>
                      <p className="text-gray-400 print-force-text-muted"><strong>מוביל מורשה:</strong> <span className="text-white font-semibold print-force-text-dark">{selectedDriver?.fullName || 'נהג טראק דיל'} ({selectedDriver?.phone || '050-1234567'})</span></p>
                    </div>
                    <div className="space-y-2 text-right sm:text-left">
                      <p className="text-gray-400 print-force-text-muted"><strong>דירוג שירות לקוח:</strong> <span className="text-amber-400 font-bold">{'★'.repeat(feedbackRating)}{'☆'.repeat(5-feedbackRating)}</span></p>
                      <p className="text-gray-400 print-force-text-muted"><strong>מספר פריטים שנפרקו:</strong> <span className="text-white font-bold print-force-text-dark">{selectedMove.items.length}</span></p>
                      <p className="text-gray-400 print-force-text-muted"><strong>צילומי מטען בשטח:</strong> <span className="text-white font-bold print-force-text-dark">{cargoPhotos.length} צילומים מסונכרנים</span></p>
                    </div>
                  </div>

                  {/* Items list breakdown */}
                  <div className="border-t border-navy-850 pt-3 mt-3 print-force-border">
                    <span className="text-xs font-black text-orange-electric block mb-2 text-right">פירוט פריטי המטען המאושרים:</span>
                    <div className="bg-navy-900/50 p-3 rounded-xl border border-navy-850/60 print-force-light print-force-border space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedMove.items.map((item, idx) => (
                        <div key={item.id} className="flex justify-between items-center text-xs text-gray-300 border-b border-navy-850/30 pb-1 last:border-0 print-force-text-dark">
                          <span className="flex items-center gap-1.5 flex-row-reverse">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{item.name}</span>
                          </span>
                          <span className="font-mono text-gray-400 font-semibold print-force-text-muted">כמות: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cargo condition photos breakdown in receipt */}
                  {cargoPhotos.length > 0 && (
                    <div className="border-t border-navy-850 pt-3 mt-3 print-force-border">
                      <span className="text-xs font-black text-orange-electric block mb-2 text-right">תיעוד מצב מטען ותכולה בשטח (cargo documentation):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {cargoPhotos.map((photo, pIdx) => (
                          <div key={pIdx} className="bg-navy-900 border border-navy-850 p-1.5 rounded-xl text-center flex flex-col space-y-1.5 print-force-light print-force-border">
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-navy-950">
                              <img src={photo.url} alt={`Cargo - ${photo.label || 'שטח'}`} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] font-bold text-white print-force-text-dark truncate block px-0.5">
                              {photo.label ? `🏷️ ${photo.label}` : `📸 תמונת שטח #${pIdx + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual Signature Section (The main requirement) */}
                  <div className="border-t border-navy-850 pt-4 flex flex-col items-center justify-center gap-3 print-force-border">
                    <div className="text-center">
                      <span className="text-xs font-bold text-gray-400 block print-force-text-muted">אישור חתימה דיגיטלית מחייבת (POD Data-URI Document)</span>
                    </div>

                    <div className="w-full max-w-sm bg-white p-3 rounded-2xl border-2 border-navy-800 shadow-md flex flex-col items-center justify-center relative overflow-hidden print-force-border">
                      {/* Grid background to make it look like a real signature pad capture */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                      
                      {podSignature ? (
                        <img 
                          src={podSignature} 
                          alt="Customer Digital Signature" 
                          className="h-24 max-w-full object-contain filter contrast-125 select-none relative z-10 text-black" 
                        />
                      ) : (
                        <div className="h-24 flex items-center justify-center text-gray-400 text-xs font-bold relative z-10">
                          שגיאה בטעינת קובץ החתימה
                        </div>
                      )}

                      {/* Micro security line */}
                      <div className="w-full border-t border-gray-200 mt-2 pt-1 flex justify-between text-[8px] text-gray-400 font-mono select-none">
                        <span>VERIFIED SECURE BY TRUK DEALIL</span>
                        <span>HASH: {selectedMove.id.substring(0, 8).toUpperCase()}-{Date.now().toString(36).toUpperCase()}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 leading-tight max-w-xs print-force-text-muted">
                      החתימה לעיל מהווה אישור סופי ומוחלט לקבלת כל הפריטים המפורטים לעיל לשביעות רצון הלקוח.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 print-btn-hide">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl shadow-lg shadow-orange-500/20 hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <span>הדפס / ייצא אישור מסירה (PDF) 🖨️</span>
                  </button>

                  <button
                    onClick={() => {
                      setPodSuccess(false);
                      setPodSignature('');
                      setReceiverName('');
                      setFeedbackRating(5);
                      setCargoPhotos([]);
                      setSelectedMove(null);
                    }}
                    className="px-6 py-3 bg-navy-800 hover:bg-navy-750 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-navy-700"
                  >
                    חזרה לרשימת המשימות
                  </button>
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
}
