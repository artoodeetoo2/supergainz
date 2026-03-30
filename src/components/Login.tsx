import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const ZYZZ_QUOTES = [
  "We're all gonna make it, brah.",
  "Dream big, lift bigger.",
  "Be a sick cunt, not a scared cunt.",
  "Chase your goals like a beast.",
  "Don't fear the grind, embrace it.",
  "You are the creator of your own aesthetic.",
  "Every day is an opportunity to improve.",
  "Train hard, live hard.",
  "Life's too short to be weak.",
  "Be the inspiration you want to see.",
  "Confidence is the ultimate aesthetic.",
  "Own your body, own your life.",
  "Don't wait for permission to be awesome.",
  "Believe in yourself like no one else will.",
  "Walk in the gym like you own it.",
  "Confidence is louder than words.",
  "Be proud of what you've built.",
  "Haters fuel your rise.",
  "Your vibe determines your tribe.",
  "Look in the mirror and see a legend.",
  "Train insane or remain the same.",
  "Discipline is the key to gains.",
  "Every rep counts.",
  "Pain is temporary, pride is forever.",
  "Push beyond your limits.",
  "Consistency is everything.",
  "Respect the process.",
  "No excuses, just results.",
  "Sculpt your body, sculpt your life.",
  "Fitness is a lifestyle, not a hobby.",
  "Live life with no regrets.",
  "Positive vibes only.",
  "Be the best version of yourself.",
  "Life's a party, enjoy the journey.",
  "Embrace the chaos and thrive.",
  "Success is earned, not given.",
  "Grind now, shine later.",
  "Make every day legendary.",
  "Chase the pump, chase your dreams.",
  "Rise above mediocrity.",
  "Push harder than yesterday.",
  "Your journey defines your legacy.",
  "Sacrifice now, celebrate forever.",
  "Legendary status requires legendary effort.",
  "Fear is for the weak.",
  "Step out of your comfort zone.",
  "The mind controls the body.",
  "Legends are made, not born.",
  "Courage is the ultimate aesthetic.",
  "Be bold, be unapologetic.",
  "Your mindset shapes your reality.",
  "Fear nothing, achieve everything.",
  "Leave a mark that inspires others.",
  "Be the legend people talk about.",
  "Inspire through action, not words.",
  "Legends never fade.",
  "Make life unforgettable.",
  "Legacy is built through passion and effort.",
  "Be a party in a world of boredom.",
  "Laugh hard, lift harder.",
  "Don't take life too seriously.",
  "Bring energy wherever you go.",
  "Be wild, be free, be Zyzz.",
  "Focus on your gains, ignore distractions.",
  "Discipline is your secret weapon.",
  "Consistency beats intensity.",
  "Stay hungry, stay driven.",
  "Control the mind, control the body.",
  "Discipline transforms dreams into results.",
  "Eliminate excuses, embrace effort.",
  "The grind never sleeps.",
  "Surround yourself with legends.",
  "Train together, rise together.",
  "Legends inspire legends.",
  "Lift others as you rise.",
  "Grow daily, evolve constantly.",
  "Never settle for less than legendary.",
  "Self-improvement is the ultimate flex.",
  "Push boundaries, exceed limits.",
  "Strive for greatness, not approval.",
  "Ambition requires sacrifice and dedication.",
  "Personal growth is the key to legacy.",
  "Think positive, lift positive.",
  "Positivity is contagious, spread it.",
  "Energy flows where focus goes.",
  "A legendary mindset creates a legendary life.",
  "Obstacles are just opportunities in disguise.",
  "Rise above every challenge, brah.",
  "Strength comes from facing the grind.",
  "Challenges define your legacy.",
  "Every setback fuels your comeback.",
  "Grind harder when life gets tough.",
  "The bigger the struggle, the bigger the reward.",
  "Turn adversity into motivation.",
];

const quote = ZYZZ_QUOTES[Math.floor(Math.random() * ZYZZ_QUOTES.length)];

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f19] overflow-hidden items-center justify-center">
      <div className="w-full max-w-sm flex flex-col h-full">
        {/* Zyzz hero image */}
        <div className="relative flex-1 min-h-0">
          <img
            src="/zyzz.jpg"
            alt="SuperGainZ"
            className="w-full h-full object-contain object-bottom"
          />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0b0f19] to-transparent" />
        </div>

        {/* Bottom section */}
        <div className="px-6 pb-12 pt-4 flex flex-col items-center gap-4 shrink-0">
          <p className="neon-text-pink italic font-semibold text-base text-center leading-snug">
            "{quote}"
          </p>
          <p className="text-gray-600 text-xs tracking-widest uppercase -mt-2">— Zyzz</p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-[0_0_25px_#ff007f] hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:scale-100 text-sm mt-2"
          >
            {loading ? "Connecting..." : "Login with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
