// הוסף בתוך קומפוננטת AdminDashboard:
const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
  return localStorage.getItem('truckdeal_admin_auth') === 'true';
});
const [adminPasswordInput, setAdminPasswordInput] = useState('');
const [authError, setAuthError] = useState('');

const handleAdminLogin = (e: React.FormEvent) => {
  e.preventDefault();
  const validPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Rami1125';
  if (adminPasswordInput.trim() === validPassword) {
    setIsAuthenticated(true);
    localStorage.setItem('truckdeal_admin_auth', 'true');
    setAuthError('');
  } else {
    setAuthError('סיסמת מנהל שגויה!');
  }
};

const handleAdminLogout = () => {
  setIsAuthenticated(false);
  localStorage.removeItem('truckdeal_admin_auth');
};

// מסך נעילת מנהל:
if (!isAuthenticated) {
  return (
    <div className="max-w-md mx-auto my-20 p-8 bg-navy-900 border border-navy-800 rounded-3xl shadow-2xl text-right space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-orange-electric/10 text-orange-electric border border-orange-electric/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
          🛡️
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
