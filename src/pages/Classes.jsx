import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus,
  Search,
  GraduationCap,
  Trash2,
  Clock,
  MapPin,
  BookOpen,
  X,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function Classes() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedClass, setSelectedClass] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function loadClasses() {
    if (!user || !profile) {
      console.log("ARMS: Waiting for user/profile...");
      return;
    }

    console.log("ARMS: Loading classes...");
    console.log("Current user ID:", user.id);
    console.log("Current role:", profile.role);

    setLoading(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("classes")
        .select(`
          id,
          school_id,
          teacher_id,
          class_name,
          grade_level,
          strand,
          section,
          subject,
          room,
          schedule_start,
          schedule_end,
          schedule_days,
          status,
          created_at
        `)
        .eq("status", "active")
        .order("created_at", {
          ascending: false,
        });

      // Teachers see only their own classes.
      // Admins can see all active classes.
      if (profile.role === "teacher") {
        query = query.eq("teacher_id", user.id);
      }

      const { data, error } = await query;

      console.log("ARMS classes response:", data);
      console.log("ARMS classes error:", error);

      if (error) {
        throw error;
      }

      setClasses(data || []);
    } catch (error) {
      console.error(
        "ARMS: Failed to load classes:",
        error
      );

      setErrorMessage(
        error.message || "Failed to load classes."
      );

      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  function openDeleteModal(classItem) {
    setSelectedClass(classItem);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setSelectedClass(null);
  }

  useEffect(() => {
    loadClasses();
  }, [user, profile]);

  const filteredClasses = classes.filter((item) => {
    const text = `
      ${item.class_name || ""}
      ${item.subject || ""}
      ${item.section || ""}
      ${item.room || ""}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              ARMS
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Classes
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Create and manage your Grade 11 STEM
              classes and classroom monitoring
              sessions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            <Plus size={18} />
            Create Class
          </button>
        </div>
      </section>

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <strong>Failed to load classes:</strong>{" "}
          {errorMessage}
        </div>
      )}

      {/* Toolbar */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search classes..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600"
          />
        </div>

        <div className="text-sm text-neutral-500">
          {filteredClasses.length}{" "}
          {filteredClasses.length === 1
            ? "class"
            : "classes"}
        </div>
      </section>

      {/* Classes */}
      {loading ? (
        <LoadingState />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          search={search}
          onCreate={() => setShowModal(true)}
        />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              onClick={() =>
                navigate(`/classes/${classItem.id}`)
              }
              onDelete={() =>
                openDeleteModal(classItem)
              }
            />
          ))}
        </section>
      )}

      {/* Create class modal */}
      {showModal && (
        <CreateClassModal
          user={user}
          profile={profile}
          onClose={() => setShowModal(false)}
          onCreated={async () => {
            setShowModal(false);
            await loadClasses();
          }}
        />
      )}

      {/* Delete class modal */}
      {showDeleteModal && selectedClass && (
        <DeleteClassModal
          user={user}
          classItem={selectedClass}
          onClose={closeDeleteModal}
          onDeleted={async () => {
            closeDeleteModal();
            await loadClasses();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   CLASS CARD
   ============================================================ */

function ClassCard({
  classItem,
  onClick,
  onDelete,
}) {
  function handleKeyDown(event) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="w-full cursor-pointer rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left transition hover:border-neutral-700 hover:bg-neutral-850 focus:outline-none focus:ring-2 focus:ring-neutral-600"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800">
          <GraduationCap size={20} />
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-lg p-2 text-neutral-500 transition hover:bg-red-950/60 hover:text-red-400"
          aria-label={`Delete ${classItem.class_name}`}
          title="Delete class"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <h2 className="mt-5 text-lg font-semibold">
        {classItem.class_name}
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        Grade {classItem.grade_level} •{" "}
        {classItem.strand}
        {classItem.section
          ? ` • ${classItem.section}`
          : ""}
      </p>

      <div className="mt-5 space-y-3">
        {classItem.subject && (
          <InfoRow
            icon={BookOpen}
            text={classItem.subject}
          />
        )}

        {classItem.room && (
          <InfoRow
            icon={MapPin}
            text={classItem.room}
          />
        )}

        {classItem.schedule_start &&
          classItem.schedule_end && (
            <InfoRow
              icon={Clock}
              text={`${formatTime(
                classItem.schedule_start
              )} - ${formatTime(
                classItem.schedule_end
              )}`}
            />
          )}

        {classItem.schedule_days?.length > 0 && (
          <InfoRow
            icon={Clock}
            text={classItem.schedule_days.join(
              " • "
            )}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   INFO ROW
   ============================================================ */

function InfoRow({
  icon: Icon,
  text,
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-neutral-400">
      <Icon
        size={16}
        className="shrink-0 text-neutral-600"
      />

      <span>{text}</span>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  search,
  onCreate,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 px-6 py-16 text-center">
      <GraduationCap
        size={34}
        className="mx-auto text-neutral-600"
      />

      <h2 className="mt-4 text-lg font-semibold">
        {search
          ? "No classes found"
          : "No classes yet"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
        {search
          ? "Try a different search term."
          : "Create your first Grade 11 STEM class to begin managing students and monitoring sessions."}
      </p>

      {!search && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
        >
          Create Class
        </button>
      )}
    </div>
  );
}

/* ============================================================
   LOADING STATE
   ============================================================ */

function LoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900"
        />
      ))}
    </div>
  );
}

/* ============================================================
   CREATE CLASS MODAL
   ============================================================ */

function CreateClassModal({
  user,
  profile,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState({
    class_name: "",
    section: "",
    subject: "",
    room: "",
    schedule_start: "",
    schedule_end: "",
    schedule_days: [],
    teacher_id: user?.id || "",
  });

  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ----------------------------------------------------------
     LOAD TEACHERS FOR ADMIN
     ---------------------------------------------------------- */

  useEffect(() => {
    async function loadTeachers() {
      // Teachers do not need a teacher dropdown.
      if (profile?.role !== "admin") {
        return;
      }

      try {
        setTeachersLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "teacher")
          .eq("status", "active")
          .order("full_name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setTeachers(data || []);

        // Automatically select the teacher
        // if exactly one teacher exists.
        if (
          data?.length === 1 &&
          !form.teacher_id
        ) {
          setForm((current) => ({
            ...current,
            teacher_id: data[0].id,
          }));
        }
      } catch (error) {
        console.error(
          "Failed to load teachers:",
          error
        );

        setError(
          error.message ||
            "Failed to load teachers."
        );
      } finally {
        setTeachersLoading(false);
      }
    }

    loadTeachers();
  }, [profile?.role]);

  /* ----------------------------------------------------------
     FORM HELPERS
     ---------------------------------------------------------- */

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleDay(day) {
    setForm((current) => {
      const exists =
        current.schedule_days.includes(day);

      return {
        ...current,
        schedule_days: exists
          ? current.schedule_days.filter(
              (item) => item !== day
            )
          : [
              ...current.schedule_days,
              day,
            ],
      };
    });
  }

  /* ----------------------------------------------------------
     CREATE CLASS
     ---------------------------------------------------------- */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!user) {
      setError(
        "You must be logged in to create a class."
      );
      return;
    }

    if (!form.class_name.trim()) {
      setError("Class name is required.");
      return;
    }

    if (!form.subject.trim()) {
      setError("Subject is required.");
      return;
    }

    if (form.schedule_days.length === 0) {
      setError(
        "Please select at least one schedule day."
      );
      return;
    }

    if (
      form.schedule_start &&
      form.schedule_end &&
      form.schedule_start >= form.schedule_end
    ) {
      setError(
        "End time must be later than start time."
      );
      return;
    }

    if (
      profile?.role === "admin" &&
      !form.teacher_id
    ) {
      setError(
        "Please select a class teacher."
      );
      return;
    }

    setSaving(true);

    try {
      /* -------------------------------------------------------
         FIND SCHOOL
         ------------------------------------------------------- */

      const {
        data: school,
        error: schoolError,
      } = await supabase
        .from("schools")
        .select("id")
        .eq("school_code", "SNHS")
        .single();

      if (schoolError) {
        throw schoolError;
      }

      if (!school?.id) {
        throw new Error(
          "Santiago National High School was not found."
        );
      }

      /* -------------------------------------------------------
         DETERMINE CLASS TEACHER
         ------------------------------------------------------- */

      const selectedTeacherId =
        profile?.role === "admin"
          ? form.teacher_id
          : user.id;

      if (!selectedTeacherId) {
        throw new Error(
          "Unable to determine the class teacher."
        );
      }

      /* -------------------------------------------------------
         INSERT CLASS
         ------------------------------------------------------- */

      const { error: insertError } =
        await supabase
          .from("classes")
          .insert({
            school_id: school.id,

            teacher_id: selectedTeacherId,

            class_name:
              form.class_name.trim(),

            grade_level: 11,

            strand: "STEM",

            section:
              form.section.trim() || null,

            subject:
              form.subject.trim(),

            room:
              form.room.trim() || null,

            schedule_start:
              form.schedule_start || null,

            schedule_end:
              form.schedule_end || null,

            schedule_days:
              form.schedule_days.length > 0
                ? form.schedule_days
                : null,

            status: "active",
          });

      if (insertError) {
        throw insertError;
      }

      await onCreated();
    } catch (error) {
      console.error(
        "ARMS: Failed to create class:",
        error
      );

      setError(
        error.message ||
          "Failed to create class."
      );
    } finally {
      setSaving(false);
    }
  }

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  /* ----------------------------------------------------------
     MODAL UI
     ---------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">
              Create Class
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create a Grade 11 STEM classroom.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Class Name */}
          <Field
            label="Class Name"
            required
          >
            <input
              type="text"
              value={form.class_name}
              onChange={(event) =>
                updateField(
                  "class_name",
                  event.target.value
                )
              }
              placeholder="e.g. General Mathematics"
              className="input"
            />
          </Field>

          {/* Class Teacher */}
          <Field
            label="Class Teacher"
            required
          >
            {profile?.role === "admin" ? (
              <select
                value={form.teacher_id}
                onChange={(event) =>
                  updateField(
                    "teacher_id",
                    event.target.value
                  )
                }
                disabled={teachersLoading}
                className="input"
              >
                <option value="">
                  {teachersLoading
                    ? "Loading teachers..."
                    : "Select a teacher"}
                </option>

                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.full_name} —{" "}
                    {teacher.email}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={profile?.full_name || ""}
                disabled
                className="input cursor-not-allowed opacity-60"
              />
            )}
          </Field>

          {/* Grade + Strand */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grade Level">
              <input
                type="text"
                value="11"
                disabled
                className="input cursor-not-allowed opacity-60"
              />
            </Field>

            <Field label="Strand">
              <input
                type="text"
                value="STEM"
                disabled
                className="input cursor-not-allowed opacity-60"
              />
            </Field>
          </div>

          {/* Section + Subject */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section">
              <input
                type="text"
                value={form.section}
                onChange={(event) =>
                  updateField(
                    "section",
                    event.target.value
                  )
                }
                placeholder="e.g. STEM-A"
                className="input"
              />
            </Field>

            <Field
              label="Subject"
              required
            >
              <input
                type="text"
                value={form.subject}
                onChange={(event) =>
                  updateField(
                    "subject",
                    event.target.value
                  )
                }
                placeholder="e.g. General Mathematics"
                className="input"
              />
            </Field>
          </div>

          {/* Room */}
          <Field label="Room">
            <input
              type="text"
              value={form.room}
              onChange={(event) =>
                updateField(
                  "room",
                  event.target.value
                )
              }
              placeholder="e.g. STEM Laboratory"
              className="input"
            />
          </Field>

          {/* Schedule Days */}
          <Field
            label="Schedule Days"
            required
          >
            <div className="flex flex-wrap gap-2">
              {days.map((day) => {
                const selected =
                  form.schedule_days.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`
                      rounded-lg border px-3 py-2 text-sm transition
                      ${
                        selected
                          ? "border-white bg-white text-black"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Time">
              <input
                type="time"
                value={form.schedule_start}
                onChange={(event) =>
                  updateField(
                    "schedule_start",
                    event.target.value
                  )
                }
                className="input"
              />
            </Field>

            <Field label="End Time">
              <input
                type="time"
                value={form.schedule_end}
                onChange={(event) =>
                  updateField(
                    "schedule_end",
                    event.target.value
                  )
                }
                className="input"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-300 transition hover:bg-neutral-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   DELETE CLASS MODAL
   ============================================================ */

function DeleteClassModal({
  user,
  classItem,
  onClose,
  onDeleted,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete(event) {
    event.preventDefault();

    setError("");

    if (!user?.email) {
      setError(
        "Unable to identify the logged-in account."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your account password."
      );
      return;
    }

    setDeleting(true);

    try {
      /*
       * Step 1:
       * Re-authenticate the currently logged-in
       * teacher or administrator.
       */
      const {
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        throw new Error(
          "Incorrect password. Please try again."
        );
      }

      /*
       * Step 2:
       * Delete the selected class.
       *
       * Supabase RLS policies determine whether
       * the current account is authorized.
       */
      const {
        error: deleteError,
      } = await supabase
        .from("classes")
        .delete()
        .eq("id", classItem.id);

      if (deleteError) {
        throw deleteError;
      }

      /*
       * Step 3:
       * Refresh the class list.
       */
      await onDeleted();
    } catch (error) {
      console.error(
        "ARMS: Failed to delete class:",
        error
      );

      let message =
        error.message ||
        "Failed to delete class.";

      if (
        message
          .toLowerCase()
          .includes("foreign key") ||
        message
          .toLowerCase()
          .includes("violates")
      ) {
        message =
          "This class cannot be deleted because it is still connected to other records such as enrolled students or monitoring data.";
      }

      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-950/60 text-red-400">
              <AlertTriangle size={21} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Delete Class
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                This action requires account verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            aria-label="Close delete modal"
          >
            <X size={19} />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleConfirmDelete}
          className="space-y-5 p-6"
        >
          <div className="rounded-xl border border-red-900/70 bg-red-950/30 p-4">
            <p className="text-sm text-red-300">
              You are about to permanently delete:
            </p>

            <p className="mt-2 font-semibold text-white">
              {classItem.class_name}
            </p>

            <p className="mt-1 text-xs text-red-300/70">
              This action cannot be undone.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={17}
                className="text-neutral-400"
              />

              <p className="text-sm font-medium text-neutral-300">
                Account verification
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Enter the password of the currently
              logged-in teacher or administrator account.
            </p>

            <p className="mt-3 break-all text-sm text-neutral-300">
              {user?.email}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Password */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-300">
              Account Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={deleting}
              className="input"
            />
          </label>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={deleting || !password}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {deleting
                ? "Deleting..."
                : "Confirm Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  required = false,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-300">
        {label}

        {required && (
          <span className="ml-1 text-neutral-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/* ============================================================
   TIME FORMATTER
   ============================================================ */

function formatTime(value) {
  if (!value) return "";

  const [hours, minutes] = value.split(":");

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes)
  );

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}