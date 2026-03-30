import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { LogOut, User as UserIcon } from "lucide-react";

export default function Profile({ user }: { user: any }) {
  return (
    <div className="p-6 flex flex-col items-center">
      <h2 className="text-3xl font-black neon-text-cyan mb-8 uppercase tracking-widest">Profile</h2>
      
      <div className="w-full bg-[#141a29] border border-purple-900 rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] mb-6 flex flex-col items-center">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full neon-border mb-4" />
        ) : (
          <div className="w-24 h-24 rounded-full neon-border bg-gray-800 flex items-center justify-center mb-4">
            <UserIcon size={40} className="text-pink-500" />
          </div>
        )}
        
        <h3 className="text-xl font-bold text-white mb-1">{user.displayName || "Gainz Warrior"}</h3>
        <p className="text-gray-400 text-sm mb-6">{user.email}</p>
        
        <div className="w-full grid grid-cols-2 gap-4 text-center">
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-pink-900/50">
            <div className="text-2xl font-black text-white">12</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest">Workouts</div>
          </div>
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-cyan-900/50">
            <div className="text-2xl font-black text-white">4</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest">Programs</div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => signOut(auth)}
        className="mt-auto w-full max-w-xs flex items-center justify-center gap-2 bg-transparent border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white px-6 py-3 rounded-xl font-bold transition-colors"
      >
        <LogOut size={20} />
        SIGN OUT
      </button>
    </div>
  );
}
