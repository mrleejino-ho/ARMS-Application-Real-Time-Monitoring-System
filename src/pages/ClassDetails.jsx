import {
  ArrowLeft,
  Users,
  Smartphone,
  Radio,
  Plus,
  Search,
  Check,
  X,
  History,
  CalendarDays,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  AppWindow,
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
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  async function loadClass() {
    try {
      setLoading(true);

      const {
        data: classResult,
        error: classError,
      } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (classError) {
        throw classError;
      }

      setClassData(classResult);

      const {
        data: studentResult,
        error: studentError,
      } = await supabase
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

      const studentsWithDevices = await Promise.all(
        (studentResult || []).map(async (student) => {
          const studentId = student.profiles?.id;

          if (!studentId) {
            return {
              ...student,
              devices: [],
            };
          }

          const {
            data: deviceData,
            error: deviceError,
          } = await supabase
            .from("devices")
            .select(`
              id,
              device_name,
              device_model,
              manufacturer,
              android_version,
              device_identifier,
              is_active,
              last_seen
            `)
            .eq("student_id", studentId)
            .eq("is_active", true)
            .order("registered_at", {
              ascending: false,
            });

          if (deviceError) {
            console.error(
              "Failed to load student devices:",
              deviceError
            );
          }

          return {
            ...student,
            devices: deviceData || [],
          };
        })
      );

      setStudents(studentsWithDevices);
    } catch (error) {
      console.error("Failed to load class:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClass();
  }, [classId]);

  const totalDevices = students.reduce(
    (total, student) => total + (student.devices?.length || 0),
    0
  );

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

  function openStudentHistory(student) {
    setSelectedStudent(student);
    setShowHistory(true);
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
          value={totalDevices}
        />

        <StatCard
          icon={Radio}
          title="Monitoring"
          value="Scheduled"
        />
      </section>

      {/* Schedule Information */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center gap-3">
          <CalendarDays
            size={20}
            className="text-neutral-400"
          />

          <div>
            <h2 className="font-semibold">
              Class Monitoring Schedule
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Monitoring is based on the schedule configured for this subject.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-neutral-500">
              Days
            </p>

            <p className="mt-1 text-white">
              {Array.isArray(classData.schedule_days) &&
              classData.schedule_days.length > 0
                ? classData.schedule_days.join(" • ")
                : "No schedule days configured"}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-neutral-500">
              Class Hours
            </p>

            <p className="mt-1 text-white">
              {classData.schedule_start &&
              classData.schedule_end
                ? `${formatTime(classData.schedule_start)} - ${formatTime(
                    classData.schedule_end
                  )}`
                : "No class hours configured"}
            </p>
          </div>
        </div>
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
            {students.map((item) => {
              const student = item.profiles;
              const device = item.devices?.[0];

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Student Information */}
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {student?.full_name || "Unknown Student"}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {student?.email || "No email available"}
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Grade {student?.grade_level} •{" "}
                      {student?.strand}
                      {student?.section
                        ? ` • ${student.section}`
                        : ""}
                    </p>

                    {/* Device Information */}
                    <div className="mt-4 w-fit rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Smartphone size={14} />
                        DEVICE
                      </div>

                      {device ? (
                        <div className="mt-2">
                          <p className="text-sm text-white">
                            {device.device_name ||
                              device.device_model ||
                              "Registered Device"}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {device.manufacturer || "Unknown manufacturer"}
                            {device.android_version
                              ? ` • Android ${device.android_version}`
                              : ""}
                          </p>

                          <span className="mt-2 inline-flex rounded-full border border-emerald-900 bg-emerald-950/30 px-2 py-1 text-[10px] text-emerald-400">
                            Registered
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-neutral-600">
                          No device registered
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-emerald-900 bg-emerald-950/20 px-3 py-1 text-xs text-emerald-400">
                      {item.status || "active"}
                    </span>

                    <button
                      type="button"
                      onClick={() => openStudentHistory(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                    >
                      <History size={16} />
                      View History
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        alert(
                          "Student removal can be implemented after confirming the required removal policy."
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-900 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Student Modal */}
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

      {/* Student History Modal */}
      {showHistory && selectedStudent && (
        <StudentHistoryModal
          classId={classId}
          classData={classData}
          studentRecord={selectedStudent}
          onClose={() => {
            setShowHistory(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   STUDENT HISTORY MODAL
============================================================ */

function StudentHistoryModal({
  classId,
  classData,
  studentRecord,
  onClose,
}) {
  const student = studentRecord.profiles;

  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString()
  );

  const [presence, setPresence] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (!student?.id || !classId || !selectedDate) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const startOfDay = new Date(
        `${selectedDate}T00:00:00`
      );

      const endOfDay = new Date(
        `${selectedDate}T23:59:59.999`
      );

      const startISO = startOfDay.toISOString();
      const endISO = endOfDay.toISOString();

      /* -------------------------------------------------------
         LOAD ONLINE/OFFLINE PRESENCE
      ------------------------------------------------------- */

      const {
        data: presenceData,
        error: presenceError,
      } = await supabase
        .from("student_monitoring_presence")
        .select("*")
        .eq("student_id", student.id)
        .eq("class_id", classId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (presenceError) {
        throw presenceError;
      }

      setPresence(presenceData || null);

      /* -------------------------------------------------------
         LOAD APPLICATION USAGE HISTORY
      ------------------------------------------------------- */

      const {
        data: usageData,
        error: usageError,
      } = await supabase
        .from("appusage")
        .select(
          "id, student_id, package_name, usage_date, total_seconds, last_seen_at"
        )
        .eq("student_id", student.id)
        .eq("usage_date", selectedDate)
        .order("last_seen_at", {
          ascending: false,
        });

      if (usageError) {
        throw usageError;
      }

      setUsageRecords(
        (usageData || []).map((record) => ({
          ...record,
          app_name: record.package_name,
          started_at: record.last_seen_at,
          duration_seconds: record.total_seconds,
          was_violated: false,
        }))
      );
    } catch (error) {
      console.error(
        "Failed to load student history:",
        error
      );

      setError(
        error.message ||
          "Failed to load student history."
      );

      setPresence(null);
      setUsageRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [student?.id, classId, selectedDate]);

  const hasPresence = Boolean(presence);
  const hasUsage = usageRecords.length > 0;

  const isOffline =
    hasPresence &&
    String(presence.status).toLowerCase() === "offline";

  const isOnline =
    hasPresence &&
    String(presence.status).toLowerCase() === "online";

  const hasViolations = usageRecords.some(
    (record) => record.was_violated === true
  );

  const totalUsageSeconds = usageRecords.reduce(
    (total, record) =>
      total + Number(record.duration_seconds || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <History size={16} />
              Student Usage History
            </div>

            <h2 className="mt-2 text-xl font-semibold text-white">
              {student?.full_name || "Student"}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {classData.class_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            aria-label="Close history"
          >
            <X size={19} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 border-b border-neutral-800 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500">
              Monitoring Date
            </label>

            <div className="relative">
              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-5 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-neutral-500">
              Loading student history...
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <HistorySummaryCard
                  icon={hasPresence ? Wifi : Activity}
                  title="Attendance Status"
                  value={
                    !hasPresence
                      ? "No Record"
                      : isOffline
                        ? "Offline"
                        : isOnline
                          ? "Online"
                          : capitalize(presence.status)
                  }
                  tone={
                    isOnline
                      ? "green"
                      : isOffline
                        ? "red"
                        : "neutral"
                  }
                />

                <HistorySummaryCard
                  icon={AppWindow}
                  title="Applications Used"
                  value={usageRecords.length}
                  tone="neutral"
                />

                <HistorySummaryCard
                  icon={hasViolations ? ShieldAlert : ShieldCheck}
                  title="Violation Status"
                  value={
                    !hasUsage
                      ? "No Usage"
                      : hasViolations
                        ? "Violation Detected"
                        : "No Violation"
                  }
                  tone={
                    hasViolations
                      ? "red"
                      : hasUsage
                        ? "green"
                        : "neutral"
                  }
                />
              </div>

              {/* Attendance Explanation */}
              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="flex items-start gap-3">
                  {isOffline ? (
                    <WifiOff
                      size={20}
                      className="mt-0.5 text-red-400"
                    />
                  ) : isOnline ? (
                    <Wifi
                      size={20}
                      className="mt-0.5 text-emerald-400"
                    />
                  ) : (
                    <Activity
                      size={20}
                      className="mt-0.5 text-neutral-500"
                    />
                  )}

                  <div>
                    <p className="font-medium text-white">
                      {isOffline
                        ? "Student was offline during the recorded monitoring period."
                        : isOnline && !hasUsage
                          ? "Student was online but no application usage was recorded."
                          : isOnline && hasUsage
                            ? "Student was online and application activity was recorded."
                            : "No monitoring presence record is available for this date."}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {classData.schedule_start &&
                      classData.schedule_end
                        ? `Subject schedule: ${formatTime(
                            classData.schedule_start
                          )} - ${formatTime(
                            classData.schedule_end
                          )}`
                        : "Subject schedule is not completely configured."}
                    </p>
                  </div>
                </div>
              </div>

              {/* No Presence */}
              {!hasPresence && !hasUsage && (
                <EmptyHistoryState
                  title="No monitoring data available"
                  description="There is no presence or application usage record for this student on the selected date."
                />
              )}

              {/* Offline State */}
              {isOffline && !hasUsage && (
                <EmptyHistoryState
                  title="Offline during monitoring"
                  description="The student has no recorded application usage for this monitoring period."
                  icon={WifiOff}
                />
              )}

              {/* Online but no apps */}
              {isOnline && !hasUsage && (
                <EmptyHistoryState
                  title="Online — No application usage"
                  description="The student was online, but no application activity was recorded during the selected monitoring period."
                  icon={ShieldCheck}
                />
              )}

              {/* Usage Table */}
              {hasUsage && (
                <section className="mt-6">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        Application Usage Records
                      </h3>

                      <p className="mt-1 text-xs text-neutral-500">
                        Total recorded usage:{" "}
                        {formatDuration(totalUsageSeconds)}
                      </p>
                    </div>

                    <span className="text-xs text-neutral-500">
                      {usageRecords.length} record
                      {usageRecords.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-neutral-800">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
                        <tr>
                          <th className="px-4 py-3">
                            Application
                          </th>

                          <th className="px-4 py-3">
                            Time
                          </th>

                          <th className="px-4 py-3">
                            Duration
                          </th>

                          <th className="px-4 py-3">
                            Status
                          </th>

                          <th className="px-4 py-3">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-neutral-800">
                        {usageRecords.map((record) => (
                          <tr
                            key={
                              record.id ||
                              `${record.application_id}-${record.started_at}`
                            }
                            className="bg-neutral-950 transition hover:bg-neutral-900"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900">
                                  <AppWindow
                                    size={17}
                                    className="text-neutral-400"
                                  />
                                </div>

                                <div>
                                  <p className="font-medium text-white">
                                    {record.app_name ||
                                      "Unknown Application"}
                                  </p>

                                  <p className="mt-1 text-xs text-neutral-600">
                                    {record.package_name ||
                                      "No package name"}
                                  </p>

                                  {record.category && (
                                    <p className="mt-1 text-xs text-neutral-500">
                                      {record.category}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-xs text-neutral-400">
                              <div className="flex items-center gap-1.5">
                                <Clock size={13} />
                                {formatDateTime(
                                  record.started_at
                                )}
                              </div>

                              {record.ended_at && (
                                <p className="mt-1 text-neutral-600">
                                  Until{" "}
                                  {formatClockTime(
                                    record.ended_at
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-xs text-neutral-400">
                              {formatDuration(
                                record.duration_seconds
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {record.was_violated ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-900 bg-red-950/30 px-2.5 py-1 text-xs text-red-400">
                                  <ShieldAlert size={13} />
                                  Violated
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-400">
                                  <ShieldCheck size={13} />
                                  No Violation
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-xs text-neutral-400">
                              {record.was_violated
                                ? record.action_taken ||
                                  "Recorded"
                                : "None"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Presence Details */}
              {presence && (
                <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                  <h3 className="font-semibold text-white">
                    Monitoring Presence Details
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="First Seen"
                      value={formatDateTime(
                        presence.first_seen_at
                      )}
                    />

                    <DetailItem
                      label="Last Seen"
                      value={formatDateTime(
                        presence.last_seen_at
                      )}
                    />

                    <DetailItem
                      label="Total Online Time"
                      value={formatDuration(
                        presence.total_online_seconds
                      )}
                    />

                    <DetailItem
                      label="Presence Status"
                      value={capitalize(
                        presence.status
                      )}
                    />
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-neutral-800 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD STUDENT MODAL
============================================================ */

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

        const {
          data,
          error: studentError,
        } = await supabase
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

        if (studentError) {
          throw studentError;
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
        ${student.full_name || ""}
        ${student.email || ""}
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
      const {
        error: insertError,
      } = await supabase
        .from("class_students")
        .insert({
          class_id: classId,
          student_id: selectedStudent.id,
          status: "active",
        });

      if (insertError) {
        throw insertError;
      }

      await onEnrolled();
    } catch (error) {
      console.error(
        "Failed to enroll student:",
        error
      );

      if (error.code === "23505") {
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
              onChange={(event) =>
                setSearch(event.target.value)
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
              {filteredStudents.map((student) => {
                const alreadyEnrolled =
                  enrolledIds.has(student.id);

                const selected =
                  selectedStudent?.id === student.id;

                return (
                  <button
                    key={student.id}
                    type="button"
                    disabled={alreadyEnrolled}
                    onClick={() => {
                      if (!alreadyEnrolled) {
                        setSelectedStudent(student);
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
                      {(student.full_name || "?")
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
              })}
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

/* ============================================================
   REUSABLE COMPONENTS
============================================================ */

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

      <p className="mt-1 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function HistorySummaryCard({
  icon: Icon,
  title,
  value,
  tone = "neutral",
}) {
  const toneClasses = {
    green: "border-emerald-900 bg-emerald-950/20 text-emerald-400",
    red: "border-red-900 bg-red-950/20 text-red-400",
    neutral: "border-neutral-800 bg-neutral-900 text-white",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        toneClasses[tone] || toneClasses.neutral
      }`}
    >
      <Icon size={19} />

      <p className="mt-3 text-xs text-neutral-500">
        {title}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function EmptyHistoryState({
  title,
  description,
  icon: Icon = Activity,
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 px-6 py-12 text-center">
      <Icon
        size={32}
        className="mx-auto text-neutral-600"
      />

      <h3 className="mt-4 font-semibold text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm text-white">
        {value || "Not available"}
      </p>
    </div>
  );
}

/* ============================================================
   FORMATTERS
============================================================ */

function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(timeValue) {
  if (!timeValue) {
    return "Not set";
  }

  const [hours, minutes] = timeValue
    .split(":")
    .map(Number);

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatClockTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);

  if (totalSeconds <= 0) {
    return "0 seconds";
  }

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (
    remainingSeconds > 0 &&
    hours === 0
  ) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(" ") || "0 seconds";
}

function capitalize(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .charAt(0)
    .toUpperCase() + String(value).slice(1);
}