import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { Dumbbell, LineChart, User, Play } from "lucide-react";
import { useState } from "react";

// Mock views placeholder
function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <img src="/logo.jpg" alt="SuperGainz Logo" className="w-48 h-48 rounded-full neon-border mb-6" />
      <h1 className="text-4xl font-black italic neon-text-pink mb-2">SUPERGAINZ</h1>
      <p className="text-gray-400 mb-8 max-w-sm text-center">
        Track your aesthetic journey, hit your PRs and receive AI-powered weight recommendations.
      </p>
      
      <button className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-3 rounded-xl font-bold text-white shadow-[0_0_15px_#ff007f] hover:scale-105 transition-transform flex items-center gap-2">
        <Play size={20} fill="currentColor" />
        START SESSION
      </button>
    </div>
  );
}

function Programs() {
  return <div className="p-4"><h2 className="text-2xl neon-text-cyan">Programs</h2></div>;
}

function Stats() {
  return <div className="p-4"><h2 className="text-2xl neon-text-cyan">Progress Graph</h2></div>;
}

function Profile() {
  return <div className="p-4"><h2 className="text-2xl neon-text-cyan">Profile</h2></div>;
}

function App() {
  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f19] text-white">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto relative pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-[#141a29] border-t border-purple-900 px-4 py-3 flex justify-between items-center shadow-[0_-5px_20px_rgba(255,0,127,0.15)] z-50">
        <Link to="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
          <Dumbbell size={24} />
          <span className="text-[10px]">Workouts</span>
        </Link>
        <Link to="/programs" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
          <Play size={24} />
          <span className="text-[10px]">Programs</span>
        </Link>
        <Link to="/stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
          <LineChart size={24} />
          <span className="text-[10px]">Stats</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#00ffff] transition-colors">
          <User size={24} />
          <span className="text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

export default App;
