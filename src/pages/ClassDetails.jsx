import {
  ArrowLeft,
  Users,
  Smartphone,
  Radio,
  Plus,
  Search,
  Check,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../services/supabase";

export default function ClassDetails() {
  const navigate = useNavigate();
  const { classId } = useParams();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);

  async function loadClass() {
    try {
      setLoading(true);

      const { data: classResult, error: classError } =
        await supabase
          .from("classes")
          .select("*")
          .eq("id", classId)
          .single();

      if (classError) {
        throw classError;
      }

      setClassData(classResult);

      const { data: studentResult, error: studentError } =
        await supabase
          .from("class_students")
          .select(`
            id,
            status,
            joined_at,
            profiles (
              id,
              full_name,
              email,
              grade_level,
              strand,
              section
            )
          `)
          .eq("class_id", classId)
          .order("joined_at", {
            ascending: true,
          });

      if (studentError) {
        throw studentError;
      }

      setStudents(studentResult || []);
    } catch (error) {
      console.error(
        "Failed to load class:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClass();
  }, [classId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-neutral-500">
        Loading class...
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">
          Class not found
        </h1>

        <button
          type="button"
          onClick={() => navigate("/classes")}
          className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/classes")}
        className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to Classes
      </button>

      {/* Header */}
      <section>
        <p className="text-sm text-neutral-500">
          Class
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          {classData.class_name}
        </h1>

        <p className="mt-2 text-sm text-neutral-400">
          Grade {classData.grade_level} •{" "}
          {classData.strand}
          {classData.section
            ? ` • ${classData.section}`
            : ""}
        </p>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          title="Students"
          value={students.length}
        />

        <StatCard
          icon={Smartphone}
          title="Devices"
          value="0"
        />

        <StatCard
          icon={Radio}
          title="Monitoring"
          value="Inactive"
        />
      </section>

      {/* Students */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="flex flex-col gap-4 border-b border-neutral-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Students
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Students enrolled in this class.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddStudent(true)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            <Plus size={17} />
            Add Student
          </button>
        </div>

        {students.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">
            No students enrolled yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {students.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {item.profiles?.full_name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    {item.profiles?.email}
                  </p>

                  <p className="mt-1 text-xs text-neutral-600">
                    Grade {item.profiles?.grade_level} •{" "}
                    {item.profiles?.strand}
                    {item.profiles?.section
                      ? ` • ${item.profiles.section}`
                      : ""}
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add student modal */}
      {showAddStudent && (
        <AddStudentModal
          classId={classId}
          classData={classData}
          enrolledStudents={students}
          onClose={() => setShowAddStudent(false)}
          onEnrolled={async () => {
            setShowAddStudent(false);
            await loadClass();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  classId,
  classData,
  enrolledStudents,
  onClose,
  onEnrolled,
}) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAvailableStudents() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            email,
            grade_level,
            strand,
            section,
            status
          `)
          .eq("school_id", classData.school_id)
          .eq("role", "student")
          .eq("grade_level", 11)
          .eq("strand", "STEM")
          .eq("status", "active")
          .order("full_name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setStudents(data || []);
      } catch (error) {
        console.error(
          "Failed to load students:",
          error
        );

        setError(
          error.message ||
            "Failed to load students."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAvailableStudents();
  }, [classData.school_id]);

  const enrolledIds = new Set(
    enrolledStudents.map(
      (item) => item.profiles?.id
    )
  );

  const filteredStudents = students.filter(
    (student) => {
      const text = `
        ${student.full_name}
        ${student.email}
        ${student.section || ""}
      `.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    }
  );

  async function handleEnroll() {
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error } = await supabase
        .from("class_students")
        .insert({
          class_id: classId,
          student_id: selectedStudent.id,
          status: "active",
        });

      if (error) {
        throw error;
      }

      await onEnrolled();
    } catch (error) {
      console.error(
        "Failed to enroll student:",
        error
      );

      if (
        error.code === "23505"
      ) {
        setError(
          "This student is already enrolled in this class."
        );
      } else {
        setError(
          error.message ||
            "Failed to enroll student."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">
              Add Student
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Enroll a Grade 11 STEM student in{" "}
              {classData.class_name}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-neutral-800 p-5">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search students..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Student list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-neutral-500">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center">
              <Users
                size={30}
                className="mx-auto text-neutral-700"
              />

              <p className="mt-3 text-sm text-neutral-500">
                No matching students found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(
                (student) => {
                  const alreadyEnrolled =
                    enrolledIds.has(student.id);

                  const selected =
                    selectedStudent?.id ===
                    student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      disabled={alreadyEnrolled}
                      onClick={() => {
                        if (!alreadyEnrolled) {
                          setSelectedStudent(
                            student
                          );
                        }
                      }}
                      className={`
                        flex w-full items-center gap-4 rounded-xl border p-4 text-left transition

                        ${
                          alreadyEnrolled
                            ? "cursor-not-allowed border-neutral-900 bg-neutral-900/40 opacity-50"
                            : selected
                              ? "border-white bg-neutral-800"
                              : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                        }
                      `}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold">
                        {student.full_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {student.full_name}
                        </p>

                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {student.email}
                        </p>

                        <p className="mt-1 text-xs text-neutral-600">
                          Grade {student.grade_level} •{" "}
                          {student.strand}
                          {student.section
                            ? ` • ${student.section}`
                            : ""}
                        </p>
                      </div>

                      {alreadyEnrolled ? (
                        <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[11px] text-neutral-500">
                          Enrolled
                        </span>
                      ) : selected ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
                          <Check size={15} />
                        </div>
                      ) : null}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-800 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleEnroll}
            disabled={
              saving || !selectedStudent
            }
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Enrolling..."
              : "Enroll Student"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
        <Icon size={19} />
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}