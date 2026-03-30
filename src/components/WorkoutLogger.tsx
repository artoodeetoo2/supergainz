import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Check, Plus, Sparkles } from "lucide-react";
import { collection, addDoc, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import Anthropic from "@anthropic-ai/sdk";

interface ProgramExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  muscleGroup: string;
}

interface Program {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: ProgramExercise[];
  createdAt: string;
}

interface ActiveSet {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExercise {
  name: string;
  muscleGroup: string;
  sets: ActiveSet[];
}

interface WorkoutLoggerProps {
  userId: string;
}

const ZYZZ_QUOTES = [
  "We're all gonna make it, brah.",
  "Dream big, lift bigger.",
  "Be a sick cunt, not a scared cunt.",
  "You are the creator of your own aesthetic.",
  "Train insane or remain the same.",
  "Be proud of what you've built.",
  "Pain is temporary, pride is forever.",
  "Every rep counts.",
  "Confidence is the ultimate aesthetic.",
  "Life's too short to be weak.",
  "Own your body, own your life.",
  "Discipline is the key to gains.",
  "No excuses, just results.",
  "Respect the process.",
  "Consistency is everything.",
  "Push beyond your limits.",
  "Haters fuel your rise.",
  "Train hard, live hard.",
  "Walk in the gym like you own it.",
  "Sculpt your body, sculpt your life.",
  "Look in the mirror and see a legend.",
  "Chase your goals like a beast.",
  "Don't fear the grind, embrace it.",
  "Every day is an opportunity to improve.",
  "Be the inspiration you want to see.",
  "Don't wait for permission to be awesome.",
  "Believe in yourself like no one else will.",
  "Confidence is louder than words.",
  "Your vibe determines your tribe.",
  "Fitness is a lifestyle, not a hobby.",
  "Live life with no regrets.",
  "Be the best version of yourself.",
  "Success is earned, not given.",
  "Grind now, shine later.",
  "Make every day legendary.",
  "Chase the pump, chase your dreams.",
  "Rise above mediocrity.",
  "Your journey defines your legacy.",
  "Sacrifice now, celebrate forever.",
  "Legendary status requires legendary effort.",
  "Fear is for the weak.",
  "The mind controls the body.",
  "Legends are made, not born.",
  "Courage is the ultimate aesthetic.",
  "Be bold, be unapologetic.",
  "Your mindset shapes your reality.",
  "Fear nothing, achieve everything.",
  "Be the legend people talk about.",
  "Legends never fade.",
  "Make life unforgettable.",
  "Legacy is built through passion and effort.",
  "Laugh hard, lift harder.",
  "Be wild, be free, be Zyzz.",
  "Discipline is your secret weapon.",
  "Consistency beats intensity.",
  "Stay hungry, stay driven.",
  "Eliminate excuses, embrace effort.",
  "The grind never sleeps.",
  "Lift others as you rise.",
  "Never settle for less than legendary.",
  "Self-improvement is the ultimate flex.",
  "Push boundaries, exceed limits.",
  "Strive for greatness, not approval.",
  "A legendary mindset creates a legendary life.",
  "Rise above every challenge, brah.",
  "Strength comes from facing the grind.",
  "Every setback fuels your comeback.",
  "Grind harder when life gets tough.",
  "The bigger the struggle, the bigger the reward.",
  "Turn adversity into motivation.",
];

function randomQuote() {
  return ZYZZ_QUOTES[Math.floor(Math.random() * ZYZZ_QUOTES.length)];
}

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-pink-900/50 text-pink-300 border-pink-700",
  back: "bg-purple-900/50 text-purple-300 border-purple-700",
  legs: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  shoulders: "bg-orange-900/50 text-orange-300 border-orange-700",
  arms: "bg-green-900/50 text-green-300 border-green-700",
  core: "bg-gray-800/50 text-gray-300 border-gray-600",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function WorkoutLogger({ userId }: WorkoutLoggerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const program: Program | undefined = location.state?.program;

  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quote] = useState(randomQuote);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});

  // Redirect if no program
  useEffect(() => {
    if (!program) {
      navigate("/");
    }
  }, [program, navigate]);

  // Initialize exercises from program
  useEffect(() => {
    if (!program) return;
    const initialized: ActiveExercise[] = program.exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.reps,
        weight: ex.weight,
        completed: false,
      })),
    }));
    setActiveExercises(initialized);
  }, [program]);

  // Timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!program) return null;

  function handleBack() {
    const anyCompleted = activeExercises.some((ex) =>
      ex.sets.some((s) => s.completed)
    );
    if (anyCompleted) {
      if (!window.confirm("End workout? Progress will be lost.")) return;
    }
    navigate(-1);
  }

  function updateSet(
    exIdx: number,
    setIdx: number,
    field: keyof ActiveSet,
    value: number | boolean
  ) {
    setActiveExercises((prev) => {
      const next = prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si === setIdx ? { ...s, [field]: value } : s
          ),
        };
      });
      return next;
    });
  }

  function addSet(exIdx: number) {
    setActiveExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { reps: last?.reps ?? 10, weight: last?.weight ?? 0, completed: false },
          ],
        };
      })
    );
  }

  async function suggestWeight(exIdx: number, exerciseName: string) {
    setAiLoading((prev) => ({ ...prev, [exIdx]: true }));
    setAiSuggestions((prev) => ({ ...prev, [exIdx]: "" }));
    try {
      const q = query(
        collection(db, `users/${userId}/workouts`),
        orderBy("date", "desc"),
        limit(6)
      );
      const snap = await getDocs(q);
      const history: { date: string; sets: { reps: number; weight: number; completed: boolean }[] }[] = [];
      snap.docs.forEach((d) => {
        const w = d.data();
        const ex = (w.exercises as ActiveExercise[]).find((e) => e.name === exerciseName);
        if (ex) {
          history.push({ date: w.date, sets: ex.sets });
        }
      });

      const currentSets = activeExercises[exIdx].sets;
      const historyText = history.length === 0
        ? "No previous history for this exercise."
        : history.slice(0, 4).map((h, i) => {
            const doneSets = h.sets.filter((s) => s.completed && s.weight > 0);
            const maxW = doneSets.length ? Math.max(...doneSets.map((s) => s.weight)) : 0;
            const avgR = doneSets.length ? Math.round(doneSets.reduce((a, s) => a + s.reps, 0) / doneSets.length) : 0;
            return `Session ${i + 1}: max ${maxW}kg, avg ${avgR} reps (${doneSets.length} sets done)`;
          }).join("\n");

      const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{
          role: "user",
          content: `You are a gym coach. For "${exerciseName}", suggest the weight for today's sets.

Recent history (newest first):
${historyText}

Today's planned sets: ${currentSets.length} sets × ${currentSets[0]?.reps ?? "?"} reps at ${currentSets[0]?.weight ?? "?"}kg

Reply in 1-2 short sentences. Give a specific weight in kg. Be direct and motivating.`,
        }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      setAiSuggestions((prev) => ({ ...prev, [exIdx]: text }));
    } catch (err) {
      console.error("AI suggest failed:", err);
      setAiSuggestions((prev) => ({ ...prev, [exIdx]: "Could not get suggestion. Try again." }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [exIdx]: false }));
    }
  }

  async function handleFinish() {
    setSaving(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const savePromise = addDoc(collection(db, `users/${userId}/workouts`), {
      programId: program!.id,
      programName: program!.name,
      date: new Date().toISOString(),
      exercises: activeExercises.map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets,
      })),
    });
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore timeout")), 8000)
    );
    try {
      await Promise.race([savePromise, timeout]);
    } catch (err) {
      console.error("Failed to save workout:", err);
    }
    setSaving(false);
    setFinished(true);
  }

  const totalSets = activeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = activeExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  // Completion overlay
  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#0b0f19]">
        <div className="bg-[#141a29] border border-purple-900 rounded-2xl p-8 w-full max-w-md text-center">
          <p className="text-4xl mb-4">💪</p>
          <h2 className="text-2xl font-black text-white mb-1">Workout Complete!</h2>
          <p className="text-gray-400 mb-4">Great session, keep pushing.</p>
          <p className="neon-text-pink italic font-semibold text-sm mb-6">"{quote}"</p>

          <div className="flex justify-around mb-8">
            <div>
              <p className="text-2xl font-black font-display neon-text-cyan tracking-widest">{formatTime(seconds)}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider mt-1">Duration</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {completedSets}
                <span className="text-gray-500 font-normal text-lg">/{totalSets}</span>
              </p>
              <p className="text-gray-400 text-xs uppercase tracking-wider mt-1">Sets Done</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(255,0,127,0.4)] hover:scale-105 transition-transform"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f19]">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-[#0b0f19]/95 backdrop-blur border-b border-purple-900/50 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <ChevronLeft size={24} />
        </button>
        <p className="text-white font-bold flex-1 truncate">{program.name}</p>
        <span className="font-display text-lg neon-text-cyan shrink-0 tracking-widest">{formatTime(seconds)}</span>
      </div>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {activeExercises.map((ex, exIdx) => (
          <div
            key={exIdx}
            className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 mb-4"
          >
            {/* Exercise header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white font-bold flex-1">{ex.name}</span>
              <span
                className={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-semibold ${
                  MUSCLE_GROUP_COLORS[ex.muscleGroup] ?? "bg-gray-800/50 text-gray-300 border-gray-600"
                }`}
              >
                {ex.muscleGroup}
              </span>
              <button
                onClick={() => suggestWeight(exIdx, ex.name)}
                disabled={aiLoading[exIdx]}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg border border-pink-800 text-pink-400 hover:border-pink-500 hover:text-pink-300 transition-colors disabled:opacity-50 shrink-0"
                style={aiLoading[exIdx] ? {} : { textShadow: "0 0 6px rgba(255,0,127,0.5)" }}
              >
                <Sparkles size={11} />
                {aiLoading[exIdx] ? "..." : "AI"}
              </button>
            </div>

            {/* AI suggestion */}
            {aiSuggestions[exIdx] && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-pink-950/30 border border-pink-900/50 text-pink-300 text-xs leading-relaxed">
                <span className="text-pink-500 font-bold uppercase tracking-wider text-[10px]">AI Coach · </span>
                {aiSuggestions[exIdx]}
              </div>
            )}

            {/* Column labels */}
            <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 mb-2 px-1">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">SET</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">REPS</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">KG</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">✓</span>
            </div>

            {/* Set rows */}
            {ex.sets.map((set, setIdx) => (
              <div
                key={setIdx}
                className={`grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center mb-2 rounded-xl px-1 py-1 transition-colors ${
                  set.completed ? "bg-green-900/10" : ""
                }`}
              >
                {/* Set badge */}
                <div className="bg-[#0b0f19] border border-purple-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-purple-400 shrink-0">
                  {setIdx + 1}
                </div>

                {/* Reps input */}
                <input
                  type="number"
                  min={0}
                  value={set.reps}
                  onChange={(e) =>
                    updateSet(exIdx, setIdx, "reps", parseInt(e.target.value) || 0)
                  }
                  className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-center w-full text-sm focus:outline-none focus:border-purple-600"
                />

                {/* Weight input */}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={set.weight}
                  onChange={(e) =>
                    updateSet(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)
                  }
                  className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white text-center w-full text-sm focus:outline-none focus:border-purple-600"
                />

                {/* Complete toggle */}
                <button
                  onClick={() => updateSet(exIdx, setIdx, "completed", !set.completed)}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    set.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-700 text-gray-600 hover:border-gray-500"
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              </div>
            ))}

            {/* Add set button */}
            <button
              onClick={() => addSet(exIdx)}
              className="w-full mt-2 border border-dashed border-purple-800 text-purple-400 text-xs font-semibold uppercase tracking-wider rounded-xl py-2 flex items-center justify-center gap-1 hover:border-purple-600 hover:text-purple-300 transition-colors"
            >
              <Plus size={14} />
              Add Set
            </button>
          </div>
        ))}
      </div>

      {/* Fixed finish button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-4 bg-[#0b0f19]/95 backdrop-blur border-t border-purple-900/30">
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,127,0.4)] hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100 uppercase tracking-wider"
        >
          {saving ? "Saving..." : "Finish Workout"}
        </button>
      </div>
    </div>
  );
}
