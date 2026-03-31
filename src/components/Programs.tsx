import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, Sparkles, Bot, ChevronRight } from "lucide-react";
import { MUSCLE_ICONS } from "../lib/muscleIcons";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ProgramsProps {
  userId: string;
}

type CoachStep = "goal" | "experience" | "strength" | "generating" | "optimizing" | "results";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-pink-900/50 text-pink-300 border-pink-700",
  back: "bg-purple-900/50 text-purple-300 border-purple-700",
  legs: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  shoulders: "bg-orange-900/50 text-orange-300 border-orange-700",
  arms: "bg-green-900/50 text-green-300 border-green-700",
  core: "bg-gray-800/50 text-gray-300 border-gray-600",
};

const MUSCLE_GROUP_OPTIONS = ["chest", "back", "legs", "shoulders", "arms", "core"];

const DEFAULT_PROGRAMS = [
  {
    name: "Push Day",
    muscleGroups: ["chest", "shoulders", "arms"],
    exercises: [
      { name: "Bench Press", sets: 4, reps: 8, weight: 80, muscleGroup: "chest" },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 30, muscleGroup: "chest" },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 50, muscleGroup: "shoulders" },
      { name: "Lateral Raises", sets: 3, reps: 15, weight: 10, muscleGroup: "shoulders" },
      { name: "Tricep Pushdown", sets: 3, reps: 12, weight: 30, muscleGroup: "arms" },
    ],
  },
  {
    name: "Pull Day",
    muscleGroups: ["back", "arms"],
    exercises: [
      { name: "Deadlift", sets: 3, reps: 5, weight: 100, muscleGroup: "back" },
      { name: "Barbell Row", sets: 4, reps: 8, weight: 70, muscleGroup: "back" },
      { name: "Lat Pulldown", sets: 3, reps: 10, weight: 60, muscleGroup: "back" },
      { name: "Face Pulls", sets: 3, reps: 15, weight: 20, muscleGroup: "back" },
      { name: "Barbell Curl", sets: 3, reps: 10, weight: 30, muscleGroup: "arms" },
    ],
  },
  {
    name: "Leg Day",
    muscleGroups: ["legs"],
    exercises: [
      { name: "Back Squat", sets: 4, reps: 6, weight: 90, muscleGroup: "legs" },
      { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 80, muscleGroup: "legs" },
      { name: "Leg Press", sets: 3, reps: 12, weight: 120, muscleGroup: "legs" },
      { name: "Leg Curl", sets: 3, reps: 12, weight: 50, muscleGroup: "legs" },
      { name: "Calf Raises", sets: 4, reps: 20, weight: 60, muscleGroup: "legs" },
    ],
  },
  {
    name: "Upper Body",
    muscleGroups: ["chest", "back", "shoulders", "arms"],
    exercises: [
      { name: "Bench Press", sets: 3, reps: 8, weight: 80, muscleGroup: "chest" },
      { name: "Barbell Row", sets: 3, reps: 8, weight: 70, muscleGroup: "back" },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 50, muscleGroup: "shoulders" },
      { name: "Pull-ups", sets: 3, reps: 8, weight: 0, muscleGroup: "back" },
      { name: "Dumbbell Curl", sets: 3, reps: 12, weight: 15, muscleGroup: "arms" },
    ],
  },
  {
    name: "Lower Body",
    muscleGroups: ["legs", "core"],
    exercises: [
      { name: "Front Squat", sets: 3, reps: 8, weight: 70, muscleGroup: "legs" },
      { name: "Hip Thrust", sets: 4, reps: 10, weight: 100, muscleGroup: "legs" },
      { name: "Walking Lunges", sets: 3, reps: 12, weight: 20, muscleGroup: "legs" },
      { name: "Leg Extension", sets: 3, reps: 15, weight: 40, muscleGroup: "legs" },
      { name: "Plank", sets: 3, reps: 60, weight: 0, muscleGroup: "core" },
    ],
  },
];

const defaultExerciseForm = {
  name: "",
  muscleGroup: "chest",
  sets: 3,
  reps: 10,
  weight: 0,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Large icon + label — used in program cards & detail header
function MuscleIconStack({ groups }: { groups: string[] }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {groups.map((group) => {
        const icon = MUSCLE_ICONS[group];
        const textColor = (MUSCLE_GROUP_COLORS[group] ?? "text-gray-400")
          .split(" ").find((c) => c.startsWith("text-")) ?? "text-gray-400";
        return (
          <div key={group} className="flex flex-col items-center gap-1">
            {icon ? (
              <img
                src={icon}
                alt={group}
                className="w-12 h-12 rounded-xl object-cover object-top"
                style={{ boxShadow: "0 0 10px rgba(0,255,255,0.15)" }}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 text-xs uppercase font-bold">
                {group[0]}
              </div>
            )}
            <span className={`text-[9px] uppercase tracking-widest font-semibold ${textColor}`}>
              {group}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Programs({ userId }: ProgramsProps) {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  // AI suggestions state
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Omit<Program, "id" | "createdAt">[]>([]);

  // AI Coach state
  const [coachStep, setCoachStep] = useState<CoachStep | null>(null);
  const [coachGoal, setCoachGoal] = useState("");
  const [coachExperience, setCoachExperience] = useState("");
  const [_coachStrength, setCoachStrength] = useState("");
  const [coachResults, setCoachResults] = useState<ProgramExercise[]>([]);
  const [hasHistory, setHasHistory] = useState(false);

  // Add exercise form (detail view)
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState(defaultExerciseForm);
  const [savingExercise, setSavingExercise] = useState(false);

  const programsRef = collection(db, "users", userId, "programs");

  // ── Fetch programs ──────────────────────────────────────────────────────────

  const cacheKey = `programs_${userId}`;

  const fetchPrograms = async (skipCache = false) => {
    if (!skipCache) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setPrograms(JSON.parse(cached));
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const snapshot = await getDocs(programsRef);
      const data: Program[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Program, "id">),
      }));
      setPrograms(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Keep selectedProgram in sync with programs list (after updates)
  useEffect(() => {
    if (selectedProgram) {
      const updated = programs.find((p) => p.id === selectedProgram.id);
      if (updated) setSelectedProgram(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs]);

  // ── Load defaults ───────────────────────────────────────────────────────────

  const handleLoadDefaults = async () => {
    if (programs.length > 0) {
      const confirmed = window.confirm(
        "This will add default programs to your list."
      );
      if (!confirmed) return;
    }
    try {
      const now = new Date().toISOString();
      await Promise.all(
        DEFAULT_PROGRAMS.map((p) =>
          addDoc(programsRef, { ...p, createdAt: now })
        )
      );
      sessionStorage.removeItem(cacheKey);
      await fetchPrograms(true);
    } catch (err) {
      console.error("Failed to load defaults:", err);
    }
  };

  // ── Delete program ──────────────────────────────────────────────────────────

  const handleDeleteProgram = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "users", userId, "programs", id));
      const updated = programs.filter((p) => p.id !== id);
      setPrograms(updated);
      sessionStorage.setItem(cacheKey, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete program:", err);
    }
  };

  // ── AI Suggest ──────────────────────────────────────────────────────────────

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const client = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const existingNames = programs.map((p) => p.name).join(", ");
      const prompt = `You are a fitness coach. The user already has these workout programs: ${existingNames || "none"}.
Suggest 2 new complementary workout programs. Respond ONLY with valid JSON array, no markdown, no explanation:
[
  {
    "name": "Program Name",
    "muscleGroups": ["chest", "back"],
    "exercises": [
      {"name": "Exercise Name", "sets": 3, "reps": 10, "weight": 60, "muscleGroup": "chest"}
    ]
  }
]
Only use these muscleGroups: chest, back, legs, shoulders, arms, core.`;

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(responseText);
      setSuggestions(parsed);
    } catch (err) {
      console.error("AI suggest failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptSuggestion = async (
    suggestion: Omit<Program, "id" | "createdAt">
  ) => {
    try {
      await addDoc(programsRef, {
        ...suggestion,
        createdAt: new Date().toISOString(),
      });
      setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
      sessionStorage.removeItem(cacheKey);
      await fetchPrograms(true);
    } catch (err) {
      console.error("Failed to accept suggestion:", err);
    }
  };

  const handleRejectSuggestion = (name: string) => {
    setSuggestions((prev) => prev.filter((s) => s.name !== name));
  };

  // ── AI Coach ────────────────────────────────────────────────────────────────

  const resetCoach = () => {
    setCoachStep(null);
    setCoachGoal("");
    setCoachExperience("");
    setCoachStrength("");
    setCoachResults([]);
  };

  useEffect(() => {
    if (!selectedProgram) { setHasHistory(false); return; }
    (async () => {
      const q = query(
        collection(db, "users", userId, "workouts"),
        orderBy("date", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      const found = snap.docs.some((d) => d.data().programId === selectedProgram.id);
      setHasHistory(found);
    })();
  }, [selectedProgram, userId]);

  const runOptimize = async () => {
    if (!selectedProgram) return;
    setCoachStep("optimizing");
    try {
      // Fetch last 6 months of workouts, sorted oldest→newest for timeline
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoff = sixMonthsAgo.toISOString();
      const q = query(
        collection(db, "users", userId, "workouts"),
        orderBy("date", "asc"),
        limit(60)
      );
      const snap = await getDocs(q);
      const allWorkouts = snap.docs
        .map((d) => d.data())
        .filter((w) => (w.date ?? "") >= cutoff);

      // Build per-exercise timeline across ALL workouts (not just this program)
      const exerciseNames = selectedProgram.exercises.map((e) => e.name);
      type SetEntry = { reps: number; weight: number; completed: boolean };
      const timelines: Record<string, { date: string; sets: SetEntry[]; completionRate: number; maxWeight: number; avgReps: number }[]> = {};

      for (const w of allWorkouts) {
        const date = w.date?.slice(0, 10) ?? "";
        for (const ex of (w.exercises ?? []) as { name: string; sets: SetEntry[] }[]) {
          if (!exerciseNames.includes(ex.name)) continue;
          const done = ex.sets.filter((s) => s.completed && s.weight > 0);
          const all = ex.sets.length;
          const maxWeight = done.length ? Math.max(...done.map((s) => s.weight)) : 0;
          const avgReps = done.length ? Math.round(done.reduce((a, s) => a + s.reps, 0) / done.length) : 0;
          const completionRate = all > 0 ? Math.round((done.length / all) * 100) : 0;
          if (!timelines[ex.name]) timelines[ex.name] = [];
          timelines[ex.name].push({ date, sets: ex.sets, completionRate, maxWeight, avgReps });
        }
      }

      // Format timeline text per exercise
      const timelineText = exerciseNames.map((name) => {
        const tl = timelines[name] ?? [];
        if (tl.length === 0) return `${name}: no history`;
        const rows = tl.map((t) =>
          `  ${t.date}: ${t.maxWeight}kg max, ${t.avgReps} avg reps, ${t.completionRate}% sets completed`
        ).join("\n");
        return `${name} (${tl.length} sessions):\n${rows}`;
      }).join("\n\n");

      const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });
      const prompt = `You are an expert strength and hypertrophy coach. Analyze this athlete's full performance timeline and optimize their program intelligently.

Program: ${selectedProgram.name}
Current program targets:
${selectedProgram.exercises.map((e) => `  ${e.name}: ${e.sets}×${e.reps} @ ${e.weight}kg`).join("\n")}

Full performance timeline per exercise (oldest → newest):
${timelineText}

Analyze each exercise independently:
- Look at the trend: is weight/reps increasing, plateauing, or declining?
- Consider completion rate: consistently 100% = ready for more; <70% = too heavy
- A plateau over 3+ sessions may need a rep scheme change, not just weight
- Progressive overload: recommend increases only when the trend and completion support it
- If the athlete is clearly progressing well, reflect that with a modest increase
- If stagnant or struggling, consider same weight with more reps, or a slight deload
- Do NOT automatically increase weight — base every decision on the data

For each exercise provide your recommendation as JSON. Keep muscleGroup unchanged.

Respond ONLY with a valid JSON array, no markdown:
[{"name":"...","sets":3,"reps":8,"weight":80,"muscleGroup":"chest"}]`;

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed: ProgramExercise[] = JSON.parse(cleaned);
      setCoachResults(parsed);
      setCoachStep("results");
    } catch (err) {
      console.error("Optimize failed:", err);
      resetCoach();
    }
  };

  const runCoach = async (goal: string, experience: string, strength: string) => {
    if (!selectedProgram) return;
    setCoachStep("generating");
    try {
      const client = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      const prompt = `You are an expert fitness coach. Personalize this workout program for the user.

User profile:
- Goal: ${goal}
- Training experience: ${experience}
- Current strength level: ${strength}

Program: ${selectedProgram.name}
Exercises to personalize:
${JSON.stringify(selectedProgram.exercises, null, 2)}

Adjust sets, reps, and weight (kg) for each exercise to match the user's profile.
For Goal "Strength": lower reps (3-6), higher weight, more sets.
For Goal "Muscle Growth": moderate reps (8-12), moderate weight.
For Goal "Endurance": higher reps (15-20), lower weight.
For Goal "Fat Loss": moderate-high reps (12-15), shorter rest implied.
Scale weights based on experience and strength level.

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"name":"...","sets":3,"reps":8,"weight":80,"muscleGroup":"chest"}]`;

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed: ProgramExercise[] = JSON.parse(cleaned);
      setCoachResults(parsed);
      setCoachStep("results");
    } catch (err) {
      console.error("AI Coach failed:", err);
      resetCoach();
    }
  };

  const handleApplyCoach = async () => {
    if (!selectedProgram || coachResults.length === 0) return;
    try {
      await updateDoc(doc(db, "users", userId, "programs", selectedProgram.id), {
        exercises: coachResults,
      });
      const updated = { ...selectedProgram, exercises: coachResults };
      setSelectedProgram(updated);
      setPrograms((prev) => {
        const next = prev.map((p) => (p.id === selectedProgram.id ? updated : p));
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
        return next;
      });
      resetCoach();
    } catch (err) {
      console.error("Failed to apply coach results:", err);
    }
  };

  // ── Detail view: delete exercise ────────────────────────────────────────────

  const handleDeleteExercise = async (program: Program, index: number) => {
    const updatedExercises = program.exercises.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, "users", userId, "programs", program.id), {
        exercises: updatedExercises,
      });
      const updatedProgram = { ...program, exercises: updatedExercises };
      setSelectedProgram(updatedProgram);
      setPrograms((prev) => {
        const next = prev.map((p) => (p.id === program.id ? updatedProgram : p));
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.error("Failed to delete exercise:", err);
    }
  };

  // ── Detail view: add exercise ───────────────────────────────────────────────

  const handleAddExercise = async () => {
    if (!exerciseForm.name.trim() || !selectedProgram) return;
    setSavingExercise(true);
    try {
      const newExercise: ProgramExercise = {
        name: exerciseForm.name.trim(),
        muscleGroup: exerciseForm.muscleGroup,
        sets: Number(exerciseForm.sets),
        reps: Number(exerciseForm.reps),
        weight: Number(exerciseForm.weight),
      };
      const updatedExercises = [...selectedProgram.exercises, newExercise];
      await updateDoc(
        doc(db, "users", userId, "programs", selectedProgram.id),
        { exercises: updatedExercises }
      );
      const updatedProgram = { ...selectedProgram, exercises: updatedExercises };
      setSelectedProgram(updatedProgram);
      setPrograms((prev) => {
        const next = prev.map((p) => (p.id === selectedProgram.id ? updatedProgram : p));
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
        return next;
      });
      setExerciseForm(defaultExerciseForm);
      setShowAddExercise(false);
    } catch (err) {
      console.error("Failed to add exercise:", err);
    } finally {
      setSavingExercise(false);
    }
  };

  // ── Detail view ─────────────────────────────────────────────────────────────

  // ── Coach UI ────────────────────────────────────────────────────────────────

  if (selectedProgram && coachStep) {
    const GOALS = ["Strength", "Muscle Growth", "Endurance", "Fat Loss"];
    const EXPERIENCES = ["Beginner (0–1 yr)", "Intermediate (1–3 yrs)", "Advanced (3+ yrs)"];
    const STRENGTHS = ["Light – just starting", "Moderate – getting stronger", "Heavy – solid lifts", "Very Heavy – advanced lifts"];

    const OptionButton = ({ label, onSelect }: { label: string; onSelect: () => void }) => (
      <button
        onClick={onSelect}
        className="w-full bg-[#141a29] border border-purple-900 hover:border-pink-500 hover:bg-[#1a1f35] text-white font-semibold py-4 px-5 rounded-2xl text-left flex items-center justify-between transition-colors group"
      >
        <span>{label}</span>
        <ChevronRight size={18} className="text-gray-600 group-hover:text-pink-400 transition-colors" />
      </button>
    );

    return (
      <div className="p-6 pb-8">
        <button
          onClick={resetCoach}
          className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors mb-6 text-sm font-semibold uppercase tracking-widest"
        >
          <ChevronLeft size={18} />
          Cancel
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Bot size={22} className="text-pink-500" />
          <h2 className="text-2xl font-black neon-text-pink uppercase tracking-widest font-display">AI Coach</h2>
        </div>
        <p className="text-gray-400 text-sm mb-8">Personalizing: <span className="text-white font-semibold">{selectedProgram.name}</span></p>

        {coachStep === "goal" && (
          <>
            <p className="text-white font-bold text-lg mb-4">What's your main goal?</p>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <OptionButton key={g} label={g} onSelect={() => { setCoachGoal(g); setCoachStep("experience"); }} />
              ))}
            </div>
          </>
        )}

        {coachStep === "experience" && (
          <>
            <p className="text-white font-bold text-lg mb-4">How long have you been training?</p>
            <div className="space-y-3">
              {EXPERIENCES.map((e) => (
                <OptionButton key={e} label={e} onSelect={() => { setCoachExperience(e); setCoachStep("strength"); }} />
              ))}
            </div>
          </>
        )}

        {coachStep === "strength" && (
          <>
            <p className="text-white font-bold text-lg mb-4">How would you rate your current lifting strength?</p>
            <div className="space-y-3">
              {STRENGTHS.map((s) => (
                <OptionButton key={s} label={s} onSelect={() => { setCoachStrength(s); runCoach(coachGoal, coachExperience, s); }} />
              ))}
            </div>
          </>
        )}

        {(coachStep === "generating" || coachStep === "optimizing") && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Sparkles size={36} className="text-pink-500 animate-pulse" />
            <p className="text-white font-bold text-lg">
              {coachStep === "optimizing" ? "Analyzing your performance..." : "Analyzing your profile..."}
            </p>
            <p className="text-gray-400 text-sm">
              {coachStep === "optimizing" ? "Claude is reviewing your workout history" : "Claude is crafting your personalized program"}
            </p>
          </div>
        )}

        {coachStep === "results" && (
          <>
            <p className="text-white font-bold text-lg mb-1">Your personalized program</p>
            <p className="text-gray-400 text-xs mb-5">Goal: <span className="text-pink-400">{coachGoal}</span> · {coachExperience}</p>
            <div className="space-y-2 mb-6">
              {coachResults.map((ex, i) => {
                const original = selectedProgram.exercises[i];
                return (
                  <div key={i} className="bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3">
                    <p className="text-white font-semibold text-sm mb-1">{ex.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 line-through">
                        {original?.sets}×{original?.reps} @ {original?.weight}kg
                      </span>
                      <span className="text-gray-600">→</span>
                      <span className="text-cyan-400 font-bold">
                        {ex.sets}×{ex.reps} @ {ex.weight}kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleApplyCoach}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-[0_0_20px_#ff007f] hover:scale-[1.02] transition-transform mb-3"
            >
              Apply Changes
            </button>
            <button
              onClick={resetCoach}
              className="w-full border border-purple-900 py-3 rounded-2xl text-gray-400 hover:text-white transition-colors text-sm font-semibold"
            >
              Discard
            </button>
          </>
        )}
      </div>
    );
  }

  if (selectedProgram) {
    return (
      <div className="p-6 pb-8">
        {/* Back */}
        <button
          onClick={() => {
            setSelectedProgram(null);
            setShowAddExercise(false);
            setExerciseForm(defaultExerciseForm);
          }}
          className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors mb-5 text-sm font-semibold uppercase tracking-widest"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        {/* Title */}
        <h2 className="text-3xl font-black neon-text-cyan mb-2 uppercase tracking-widest font-display neon-flicker">
          {selectedProgram.name}
        </h2>

        {/* Muscle group tags */}
        <div className="mb-6">
          <MuscleIconStack groups={selectedProgram.muscleGroups} />
        </div>

        {/* AI Coach button */}
        <button
          onClick={() => hasHistory ? runOptimize() : setCoachStep("goal")}
          className="w-full flex items-center justify-center gap-2 border border-pink-800 text-pink-400 hover:bg-pink-900/20 hover:border-pink-500 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors mb-6"
        >
          <Bot size={16} />
          {hasHistory ? "Optimize with AI Coach" : "Personalize with AI"}
        </button>

        {/* Exercise list */}
        <div className="space-y-3 mb-6">
          {selectedProgram.exercises.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No exercises yet. Add one below!
            </p>
          ) : (
            selectedProgram.exercises.map((ex, i) => (
              <div
                key={i}
                className="bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate neon-text-cyan" style={{ fontSize: "13px" }}>{ex.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5 font-display tracking-widest">
                    {ex.sets}×{ex.reps} @ {ex.weight}kg
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteExercise(selectedProgram, i)}
                  className="text-gray-600 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                  aria-label="Delete exercise"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add exercise form */}
        {showAddExercise ? (
          <div className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 space-y-3 mb-6">
            <h4 className="text-pink-500 font-bold uppercase text-xs tracking-widest mb-1">
              New Exercise
            </h4>

            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                Exercise Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bench Press"
                value={exerciseForm.name}
                onChange={(e) =>
                  setExerciseForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-4 py-2 text-white w-full focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                Muscle Group
              </label>
              <select
                value={exerciseForm.muscleGroup}
                onChange={(e) =>
                  setExerciseForm((f) => ({ ...f, muscleGroup: e.target.value }))
                }
                className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-4 py-2 text-white w-full focus:outline-none focus:border-pink-500"
              >
                {MUSCLE_GROUP_OPTIONS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg.charAt(0).toUpperCase() + mg.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                  Sets
                </label>
                <input
                  type="number"
                  min={1}
                  value={exerciseForm.sets}
                  onChange={(e) =>
                    setExerciseForm((f) => ({ ...f, sets: Number(e.target.value) }))
                  }
                  className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white w-full focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                  Reps
                </label>
                <input
                  type="number"
                  min={1}
                  value={exerciseForm.reps}
                  onChange={(e) =>
                    setExerciseForm((f) => ({ ...f, reps: Number(e.target.value) }))
                  }
                  className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white w-full focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                  Weight kg
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={exerciseForm.weight}
                  onChange={(e) =>
                    setExerciseForm((f) => ({
                      ...f,
                      weight: Number(e.target.value),
                    }))
                  }
                  className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white w-full focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddExercise}
                disabled={savingExercise || !exerciseForm.name.trim()}
                className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 rounded-xl font-bold text-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingExercise ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowAddExercise(false);
                  setExerciseForm(defaultExerciseForm);
                }}
                className="border border-purple-900 px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full border border-dashed border-purple-700 rounded-2xl py-3 text-purple-400 hover:text-pink-400 hover:border-pink-500 transition-colors text-sm font-semibold tracking-wide mb-6"
          >
            + Add Exercise
          </button>
        )}

        {/* Start Workout */}
        <button
          onClick={() => navigate("/workout", { state: { program: selectedProgram } })}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-[0_0_20px_#ff007f] hover:scale-[1.02] transition-transform"
        >
          Start Workout
        </button>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 pb-8">
      {/* Header */}
      <h2 className="text-3xl font-black neon-text-cyan mb-1 uppercase tracking-widest font-display neon-flicker">
        Programs
      </h2>
      <p className="text-gray-500 text-xs mb-5 uppercase tracking-widest font-display">Your workout programs</p>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleLoadDefaults}
          className="flex-1 border border-cyan-800 text-cyan-400 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider hover:border-cyan-500 hover:text-cyan-300 transition-colors font-display"
          style={{ textShadow: "0 0 8px rgba(0,255,255,0.4)" }}
        >
          Defaults
        </button>
        <button
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 py-2.5 rounded-xl text-sm font-bold text-white shadow-[0_0_12px_#ff007f] hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          {aiLoading ? "Analyzing..." : "AI Suggest"}
        </button>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-pink-400 font-bold uppercase text-xs tracking-widest mb-2">
            AI Suggestions
          </h3>
          {suggestions.map((s) => (
            <div
              key={s.name}
              className="bg-[#141a29] border border-pink-800 rounded-2xl p-4"
            >
              <p className="font-black uppercase tracking-wider font-display neon-text-pink mb-1" style={{ fontSize: "13px" }}>{s.name}</p>
              <div className="mb-3">
                <MuscleIconStack groups={s.muscleGroups} />
              </div>
              <p className="text-gray-400 text-xs mb-3">
                {s.exercises.length} exercise{s.exercises.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptSuggestion(s)}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectSuggestion(s.name)}
                  className="flex-1 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm font-bold py-2 rounded-xl transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program list */}
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-10">Loading programs...</p>
      ) : programs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">
          No programs yet. Load defaults or let AI create some for you.
        </p>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <div
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              className="bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-4 cursor-pointer hover:border-purple-600 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase tracking-wider font-display neon-text-cyan leading-tight mb-2" style={{ fontSize: "14px" }}>
                    {program.name}
                  </p>
                  <div className="mb-3">
                    <MuscleIconStack groups={program.muscleGroups} />
                  </div>
                  <p className="text-gray-400 text-xs">
                    {program.exercises.length} exercise
                    {program.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteProgram(program.id, e)}
                  className="text-gray-600 hover:text-red-500 transition-colors flex-shrink-0 p-1 mt-0.5"
                  aria-label="Delete program"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
