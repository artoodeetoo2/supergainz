import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Check, Plus, Sparkles, Timer, Trash2, X } from "lucide-react";
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

const ZYZZ_GIFS = [
  "/gifs/zyzz-dancing.webp",
  "/gifs/zyzz-flexing.webp",
  "/gifs/zyzz-mirin.webp",
];

const VOICE_LINES = [
  "u mirin brah?", "aesthetics.", "ngmi if you stop now.", "we're all gonna make it.",
  "do it for him.", "feel the pump.", "stay aesthetic.", "sickcunt.",
  "that's how it's done.", "just like that brah.", "WGMI.", "no days off.",
  "built different.", "u jelly brah?", "mirin hard rn.", "one more brah.", "legend.",
];

const REST_OPTIONS = [30, 60, 90, 120, 180];

function randomGif() {
  return ZYZZ_GIFS[Math.floor(Math.random() * ZYZZ_GIFS.length)];
}

function randomVoiceLine() {
  return VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)];
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
  const [gif] = useState(randomGif);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, { message: string; weight: number | null }>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});
  // Rest timer
  const [restDuration, setRestDuration] = useState<Record<number, number>>({});
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restExName, setRestExName] = useState("");
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Voice line toast
  const [voiceLine, setVoiceLine] = useState<string | null>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Rest countdown tick
  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) {
      if (restRef.current) clearInterval(restRef.current);
      if (restRemaining !== null && restRemaining <= 0) setRestRemaining(null);
      return;
    }
    restRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r === null || r <= 1) { clearInterval(restRef.current!); return null; }
        return r - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining !== null]);

  if (!program) return null;

  function getRestDuration(exIdx: number) { return restDuration[exIdx] ?? 90; }

  function cycleRestDuration(exIdx: number) {
    const idx = REST_OPTIONS.indexOf(getRestDuration(exIdx));
    setRestDuration((prev) => ({ ...prev, [exIdx]: REST_OPTIONS[(idx + 1) % REST_OPTIONS.length] }));
  }

  function startRest(exIdx: number) {
    if (restRef.current) clearInterval(restRef.current);
    setRestExName(activeExercises[exIdx]?.name ?? "");
    setRestRemaining(getRestDuration(exIdx));
  }

  function skipRest() {
    if (restRef.current) clearInterval(restRef.current);
    setRestRemaining(null);
  }

  function showVoiceLine() {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    setVoiceLine(randomVoiceLine());
    voiceTimeoutRef.current = setTimeout(() => setVoiceLine(null), 1800);
  }

  function handleBack() {
    const anyCompleted = activeExercises.some((ex) => ex.sets.some((s) => s.completed));
    if (anyCompleted) {
      if (!window.confirm("Abandon workout? Progress will be lost.")) return;
    }
    navigate(-1);
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof ActiveSet, value: number | boolean) {
    setActiveExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) };
      })
    );
    if (field === "completed" && value === true) {
      setTimeout(() => { showVoiceLine(); startRest(exIdx); }, 0);
    }
  }

  function removeSet(exIdx: number, setIdx: number) {
    setActiveExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
      })
    );
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

  function applyWeight(exIdx: number, weight: number) {
    setActiveExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return { ...ex, sets: ex.sets.map((s) => ({ ...s, weight })) };
      })
    );
    setAiSuggestions((prev) => ({ ...prev, [exIdx]: { ...prev[exIdx], weight: null } }));
  }

  async function suggestWeight(exIdx: number, exerciseName: string) {
    setAiLoading((prev) => ({ ...prev, [exIdx]: true }));
    setAiSuggestions((prev) => ({ ...prev, [exIdx]: { message: "", weight: null } }));
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
        max_tokens: 120,
        messages: [{
          role: "user",
          content: `You are a gym coach. For "${exerciseName}", suggest the weight for today's sets.

Recent history (newest first):
${historyText}

Today's planned sets: ${currentSets.length} sets × ${currentSets[0]?.reps ?? "?"} reps at ${currentSets[0]?.weight ?? "?"}kg

Respond ONLY with valid JSON in this exact format:
{"weight": <number in kg, use 0.5 increments>, "message": "<one motivating sentence>"}`,
        }],
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      let weight: number | null = null;
      let message = "";
      try {
        const parsed = JSON.parse(cleaned);
        weight = typeof parsed.weight === "number" ? parsed.weight : null;
        message = parsed.message ?? "";
      } catch {
        const match = cleaned.match(/(\d+(?:\.\d+)?)\s*kg/i);
        weight = match ? parseFloat(match[1]) : null;
        message = cleaned;
      }
      setAiSuggestions((prev) => ({ ...prev, [exIdx]: { weight, message } }));
    } catch (err) {
      console.error("AI suggest failed:", err);
      setAiSuggestions((prev) => ({ ...prev, [exIdx]: { weight: null, message: "Could not get suggestion. Try again." } }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [exIdx]: false }));
    }
  }

  async function handleFinish() {
    setSaving(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    skipRest();
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
        <div className="bg-[#141a29] border border-purple-900 rounded-2xl overflow-hidden w-full max-w-md text-center">
          <img
            src={gif}
            alt="Zyzz"
            className="w-full object-cover"
            style={{ height: "220px", objectPosition: "center 20%" }}
          />
          <div className="p-8">
          <h2 className="text-2xl font-black font-display neon-text-pink uppercase tracking-widest mb-1">Workout Complete!</h2>
          <p className="text-gray-400 mb-4 text-sm">Great session, keep pushing.</p>
          <p className="neon-text-cyan italic font-semibold text-sm mb-6">"{quote}"</p>

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
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f19]">

      {/* Voice line toast */}
      {voiceLine && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-[#1a0a2e] border border-pink-700 neon-text-pink text-sm font-bold font-display tracking-widest uppercase pointer-events-none"
          style={{ textShadow: "0 0 10px rgba(255,0,127,0.8)", boxShadow: "0 0 16px rgba(255,0,127,0.3)" }}>
          {voiceLine}
        </div>
      )}

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
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-36">
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
              {/* Rest duration */}
              <button
                onClick={() => cycleRestDuration(exIdx)}
                title="Tap to change rest duration"
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-cyan-900 text-cyan-500 hover:border-cyan-600 hover:text-cyan-300 transition-colors shrink-0"
              >
                <Timer size={11} />
                {getRestDuration(exIdx)}s
              </button>
              {/* AI suggest */}
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
                {aiSuggestions[exIdx].message}
                {aiSuggestions[exIdx].weight !== null && (
                  <button
                    onClick={() => applyWeight(exIdx, aiSuggestions[exIdx].weight!)}
                    className="mt-2 flex items-center gap-1 w-full justify-center bg-pink-600/30 hover:bg-pink-600/50 border border-pink-600 text-pink-200 font-bold uppercase tracking-wider text-[10px] py-1.5 rounded-lg transition-colors"
                  >
                    <Sparkles size={10} />
                    Apply {aiSuggestions[exIdx].weight} kg to all sets
                  </button>
                )}
              </div>
            )}

            {/* Column labels */}
            <div className="grid grid-cols-[28px_1fr_1fr_36px_28px] gap-2 mb-2 px-1">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">SET</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">REPS</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">KG</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center">✓</span>
              <span />
            </div>

            {/* Set rows */}
            {ex.sets.map((set, setIdx) => (
              <div
                key={setIdx}
                className={`grid grid-cols-[28px_1fr_1fr_36px_28px] gap-2 items-center mb-2 rounded-xl px-1 py-1 transition-colors ${
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
                {/* Remove set */}
                <button
                  onClick={() => removeSet(exIdx, setIdx)}
                  disabled={ex.sets.length <= 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-red-500 transition-colors disabled:opacity-20"
                >
                  <Trash2 size={13} />
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

      {/* Fixed bottom area */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0b0f19]/95 backdrop-blur border-t border-purple-900/30">
        {/* Rest timer bar */}
        {restRemaining !== null && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-3">
            <Timer size={16} className="text-cyan-400 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-300 text-xs font-bold uppercase tracking-wider font-display">Rest · {restExName}</span>
                <span className="text-cyan-400 font-black font-display text-lg tracking-widest">{formatTime(restRemaining)}</span>
              </div>
              <div className="w-full h-1 bg-cyan-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(restRemaining / (restDuration[activeExercises.findIndex((e) => e.name === restExName)] ?? 90)) * 100}%` }}
                />
              </div>
            </div>
            <button onClick={skipRest} className="text-gray-500 hover:text-white transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-4 py-4">
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,127,0.4)] hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100 uppercase tracking-wider"
          >
            {saving ? "Saving..." : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
