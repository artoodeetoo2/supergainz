import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
}

interface ExerciseListProps {
  userId: string;
  muscleGroup: string;
  muscleGroupName: string;
}

const defaultForm = {
  name: "",
  defaultSets: 3,
  defaultReps: 10,
  defaultWeight: 0,
};

export default function ExerciseList({
  userId,
  muscleGroup,
  muscleGroupName: _muscleGroupName,
}: ExerciseListProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const exercisesRef = collection(db, "users", userId, "exercises");

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const q = query(exercisesRef, where("muscleGroup", "==", muscleGroup));
      const snapshot = await getDocs(q);
      const data: Exercise[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Exercise, "id">),
      }));
      setExercises(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscleGroup, userId]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(exercisesRef, {
        name: form.name.trim(),
        muscleGroup,
        defaultSets: Number(form.defaultSets),
        defaultReps: Number(form.defaultReps),
        defaultWeight: Number(form.defaultWeight),
      });
      setForm(defaultForm);
      setShowForm(false);
      await fetchExercises();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "users", userId, "exercises", id));
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="mt-4 space-y-3">
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
      ) : exercises.length === 0 && !showForm ? (
        <p className="text-gray-400 text-sm text-center py-6">
          No exercises yet. Add your first one!
        </p>
      ) : (
        exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-[#141a29] border border-purple-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{exercise.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {exercise.defaultSets} sets &times; {exercise.defaultReps} reps
                &nbsp;&bull;&nbsp;
                {exercise.defaultWeight} kg
              </p>
            </div>
            <button
              onClick={() => handleDelete(exercise.id)}
              className="text-gray-600 hover:text-red-500 transition-colors flex-shrink-0 p-1"
              aria-label="Delete exercise"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))
      )}

      {showForm ? (
        <div className="bg-[#141a29] border border-purple-900 rounded-2xl p-4 space-y-3">
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
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-4 py-2 text-white w-full focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">
                Sets
              </label>
              <input
                type="number"
                min={1}
                value={form.defaultSets}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultSets: Number(e.target.value) }))
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
                value={form.defaultReps}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultReps: Number(e.target.value) }))
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
                value={form.defaultWeight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultWeight: Number(e.target.value) }))
                }
                className="bg-[#0b0f19] border border-purple-900/50 rounded-xl px-3 py-2 text-white w-full focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 rounded-xl font-bold text-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm(defaultForm);
              }}
              className="border border-purple-900 px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-purple-700 rounded-2xl py-3 text-purple-400 hover:text-pink-400 hover:border-pink-500 transition-colors text-sm font-semibold tracking-wide"
        >
          + Add Exercise
        </button>
      )}
    </div>
  );
}
