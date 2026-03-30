import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Dumbbell, LineChart, User, Play } from "lucide-react";
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f19] text-white font-sans">
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
          <Link to="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
            <Dumbbell size={24} />
            <span className="text-[9px] uppercase tracking-widest font-display">Workouts</span>
          </Link>
          <Link to="/programs" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
            <Play size={24} />
            <span className="text-[9px] uppercase tracking-widest font-display">Programs</span>
          </Link>
          <Link to="/stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
            <LineChart size={24} />
            <span className="text-[9px] uppercase tracking-widest font-display">Stats</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
            <User size={24} />
            <span className="text-[9px] uppercase tracking-widest font-display">Profile</span>
          </Link>
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
