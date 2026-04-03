import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Dumbbell, LineChart, User, Play, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./components/Login";
import Profile from "./components/Profile";
import Programs from "./components/Programs";
import Home from "./components/Home";
import WorkoutLogger from "./components/WorkoutLogger";
import Stats from "./components/Stats";

function AppRoutes({ user }: { user: any }) {
  const location = useLocation();
  const isWorkout = location.pathname === "/workout";
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f19] text-white font-sans">
      {!isOnline && (
        <div className="w-full bg-yellow-900/80 border-b border-yellow-700/50 px-4 py-1.5 flex items-center justify-center gap-2 z-50">
          <WifiOff size={12} className="text-yellow-400" />
          <span className="text-yellow-300 text-[11px] font-bold uppercase tracking-widest font-display">Offline — changes will sync when connected</span>
        </div>
      )}
      <main className={`flex-1 overflow-y-auto w-full max-w-md mx-auto relative ${isWorkout ? "" : "pb-20"}`}>
        <Routes>
          <Route path="/" element={<Home userId={user.uid} userName={user.displayName || ""} />} />
          <Route path="/programs" element={<Programs userId={user.uid} />} />
          <Route path="/workout" element={<WorkoutLogger userId={user.uid} />} />
          <Route path="/stats" element={<Stats userId={user.uid} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {!isWorkout && (
        <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-[#141a29] border-t border-purple-900 px-4 py-3 flex justify-between items-center shadow-[0_-5px_20px_rgba(255,0,127,0.15)] z-50">
          {[
            { to: "/", icon: <Dumbbell size={22} />, label: "Workouts" },
            { to: "/programs", icon: <Play size={22} />, label: "Programs" },
            { to: "/stats", icon: <LineChart size={22} />, label: "Stats" },
            { to: "/profile", icon: <User size={22} />, label: "Profile" },
          ].map(({ to, icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 transition-colors"
                style={active ? {
                  color: "#ff007f",
                  textShadow: "0 0 8px rgba(255,0,127,0.8), 0 0 16px rgba(255,0,127,0.4)",
                  filter: "drop-shadow(0 0 4px rgba(255,0,127,0.6))",
                } : { color: "#6b7280" }}
              >
                {icon}
                <span className="text-[9px] uppercase tracking-widest font-display">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen w-full bg-[#0b0f19] text-pink-500 font-bold uppercase tracking-widest">LOADING...</div>;
  }

  // If user is not logged in, show the Login view full screen
  if (!user) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0b0f19] text-white font-sans">
        <Login />
      </div>
    );
  }

  return <AppRoutes user={user} />;
}

export default App;
