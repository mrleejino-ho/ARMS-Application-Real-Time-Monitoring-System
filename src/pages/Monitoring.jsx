import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

const DISMISSAL_REASONS = [
  "Class postponed",
  "Teacher unavailable",
  "School activity",
  "Holiday or suspension",
  "Room unavailable",
  "Schedule adjustment",
  "Technical problems",
  "Other reason",
];

function getPhilippinesDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(timeValue) {
  if (!timeValue) return "Not set";

  const [hourString, minuteString] = timeValue.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Not available";

  return new Date(dateValue).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getCurrentScheduleStatus(classItem, session, dismissal) {
  if (dismissal) {
    return "dismissed";
  }

  if (session?.status === "active") {
    return "active";
  }

  if (session?.status === "ended") {
    return "ended";
  }

  if (session?.status === "cancelled") {
    return "cancelled";
  }

  return "scheduled";
}

function getStatusStyles(status) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className:
          "border-emerald-700 bg-emerald-950/40 text-emerald-400",
        dotClass: "bg-emerald-400",
      };

    case "ended":
      return {
        label: "Ended",
        className: "border-blue-700 bg-blue-950/40 text-blue-400",
        dotClass: "bg-blue-400",
      };

    case "dismissed":
      return {
        label: "Dismissed",
        className:
          "border-orange-700 bg-orange-950/40 text-orange-400",
        dotClass: "bg-orange-400",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        className: "border-red-700 bg-red-950/40 text-red-400",
        dotClass: "bg-red-400",
      };

    default:
      return {
        label: "Scheduled",
        className:
          "border-yellow-700 bg-yellow-950/40 text-yellow-400",
        dotClass: "bg-yellow-400",
      };
  }
}

export default function Monitoring() {
  const { user, profile } = useAuth();

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dismissals, setDismissals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showDismissModal, setShowDismissModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [savingDismissal, setSavingDismissal] = useState(false);
  const [dismissalError, setDismissalError] = useState("");

  const today = useMemo(() => getPhilippinesDate(), []);

  const loadMonitoringData = useCallback(
    async (showLoading = true) => {
      if (!user || !profile) return;

      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      try {
        /*
          --------------------------------------------------------
          LOAD CLASSES
          --------------------------------------------------------
        */
        let classesQuery = supabase
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

        if (profile.role === "teacher") {
          classesQuery = classesQuery.eq("teacher_id", user.id);
        }

        const {
          data: classesData,
          error: classesError,
        } = await classesQuery;

        if (classesError) {
          throw classesError;
        }

        const classIds = (classesData || []).map((item) => item.id);

        setClasses(classesData || []);

        if (classIds.length === 0) {
          setSessions([]);
          setDismissals([]);
          return;
        }

        /*
          --------------------------------------------------------
          LOAD TODAY'S MONITORING SESSIONS
          --------------------------------------------------------
        */
        const startOfTodayUTC = new Date(
          `${today}T00:00:00+08:00`
        ).toISOString();

        const startOfTomorrowUTC = new Date(
          `${today}T00:00:00+08:00`
        );

        startOfTomorrowUTC.setDate(
          startOfTomorrowUTC.getDate() + 1
        );

        const {
          data: sessionsData,
          error: sessionsError,
        } = await supabase
          .from("monitoring_sessions")
          .select(`
            id,
            class_id,
            started_by,
            start_time,
            end_time,
            status,
            created_at
          `)
          .in("class_id", classIds)
          .gte("start_time", startOfTodayUTC)
          .lt(
            "start_time",
            startOfTomorrowUTC.toISOString()
          )
          .order("start_time", {
            ascending: false,
          });

        if (sessionsError) {
          throw sessionsError;
        }

        /*
          --------------------------------------------------------
          LOAD TODAY'S DISMISSALS
          --------------------------------------------------------
        */
        const {
          data: dismissalsData,
          error: dismissalsError,
        } = await supabase
          .from("monitoring_dismissals")
          .select(`
            id,
            class_id,
            dismissed_date,
            reason,
            dismissed_by,
            created_at
          `)
          .in("class_id", classIds)
          .eq("dismissed_date", today);

        if (dismissalsError) {
          throw dismissalsError;
        }

        setSessions(sessionsData || []);
        setDismissals(dismissalsData || []);
      } catch (error) {
        console.error(
          "ARMS: Failed to load monitoring data:",
          error
        );

        setErrorMessage(
          error.message ||
            "Failed to load monitoring information."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, profile, today]
  );

  /*
    ------------------------------------------------------------
    INITIAL LOAD
    ------------------------------------------------------------
  */
  useEffect(() => {
    loadMonitoringData(true);
  }, [loadMonitoringData]);

  /*
    ------------------------------------------------------------
    SUPABASE REALTIME
    ------------------------------------------------------------
  */
  useEffect(() => {
    if (!user || !profile) return;

    const monitoringChannel = supabase
      .channel("arms-monitoring-sessions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring_sessions",
        },
        (payload) => {
          console.log(
            "ARMS monitoring_sessions realtime event:",
            payload
          );

          loadMonitoringData(false);
        }
      )
      .subscribe((status) => {
        console.log(
          "ARMS monitoring_sessions realtime status:",
          status
        );
      });

    const dismissalsChannel = supabase
      .channel("arms-monitoring-dismissals-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring_dismissals",
        },
        (payload) => {
          console.log(
            "ARMS monitoring_dismissals realtime event:",
            payload
          );

          loadMonitoringData(false);
        }
      )
      .subscribe((status) => {
        console.log(
          "ARMS monitoring_dismissals realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(monitoringChannel);
      supabase.removeChannel(dismissalsChannel);
    };
  }, [user, profile, loadMonitoringData]);

  /*
    ------------------------------------------------------------
    DATA MAPPING
    ------------------------------------------------------------
  */
  const monitoringCards = useMemo(() => {
    return classes.map((classItem) => {
      const classSessions = sessions.filter(
        (session) => session.class_id === classItem.id
      );

      const latestSession = classSessions[0] || null;

      const dismissal =
        dismissals.find(
          (item) => item.class_id === classItem.id
        ) || null;

      const status = getCurrentScheduleStatus(
        classItem,
        latestSession,
        dismissal
      );

      return {
        ...classItem,
        session: latestSession,
        dismissal,
        monitoringStatus: status,
      };
    });
  }, [classes, sessions, dismissals]);

  const summary = useMemo(() => {
    return {
      scheduled: monitoringCards.filter(
        (item) => item.monitoringStatus === "scheduled"
      ).length,

      active: monitoringCards.filter(
        (item) => item.monitoringStatus === "active"
      ).length,

      ended: monitoringCards.filter(
        (item) => item.monitoringStatus === "ended"
      ).length,

      dismissed: monitoringCards.filter(
        (item) => item.monitoringStatus === "dismissed"
      ).length,
    };
  }, [monitoringCards]);

  /*
    ------------------------------------------------------------
    DISMISSAL MODAL
    ------------------------------------------------------------
  */
  function openDismissModal(classItem) {
    setSelectedClass(classItem);
    setSelectedReason("");
    setCustomReason("");
    setDismissalError("");
    setShowDismissModal(true);
  }

  function closeDismissModal() {
    if (savingDismissal) return;

    setShowDismissModal(false);
    setSelectedClass(null);
    setSelectedReason("");
    setCustomReason("");
    setDismissalError("");
  }

  async function handleConfirmDismissal() {
    if (!selectedClass || !user) return;

    const finalReason =
      selectedReason === "Other reason"
        ? customReason.trim()
        : selectedReason.trim();

    if (!finalReason) {
      setDismissalError(
        "Please select or enter a reason for postponement."
      );
      return;
    }

    setSavingDismissal(true);
    setDismissalError("");

    try {
      /*
        If an active or scheduled session already exists,
        mark it as ended before saving the dismissal.
      */
      const activeSession = sessions.find(
        (session) =>
          session.class_id === selectedClass.id &&
          ["scheduled", "active"].includes(session.status)
      );

      if (activeSession) {
        const { error: sessionUpdateError } =
          await supabase
            .from("monitoring_sessions")
            .update({
              status: "cancelled",
              end_time: new Date().toISOString(),
            })
            .eq("id", activeSession.id);

        if (sessionUpdateError) {
          throw sessionUpdateError;
        }
      }

      /*
        Save today's dismissal record.
      */
      const { error: dismissalInsertError } =
        await supabase
          .from("monitoring_dismissals")
          .upsert(
            {
              class_id: selectedClass.id,
              dismissed_date: today,
              reason: finalReason,
              dismissed_by: user.id,
            },
            {
              onConflict: "class_id,dismissed_date",
            }
          );

      if (dismissalInsertError) {
        throw dismissalInsertError;
      }

      closeDismissModal();
      await loadMonitoringData(false);
    } catch (error) {
      console.error(
        "ARMS: Failed to dismiss monitoring:",
        error
      );

      setDismissalError(
        error.message ||
          "Failed to dismiss monitoring for this class."
      );
    } finally {
      setSavingDismissal(false);
    }
  }

  /*
    ------------------------------------------------------------
    LOADING STATE
    ------------------------------------------------------------
  */
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <RefreshCw
            size={20}
            className="animate-spin"
          />
          Loading monitoring sessions...
        </div>
      </div>
    );
  }

  /*
    ------------------------------------------------------------
    MAIN UI
    ------------------------------------------------------------
  */
  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              ARMS
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Classroom Monitoring
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Monitoring sessions are automatically managed
              according to each subject's class schedule.
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              Monitoring date: {today}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadMonitoringData(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing ? "animate-spin" : ""
              }
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* Error */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <div>
            <strong>Monitoring error:</strong>{" "}
            {errorMessage}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Clock3 size={21} />}
          label="Scheduled"
          value={summary.scheduled}
          description="Classes waiting for their schedule"
          color="yellow"
        />

        <SummaryCard
          icon={<Activity size={21} />}
          label="Active"
          value={summary.active}
          description="Classes currently being monitored"
          color="green"
        />

        <SummaryCard
          icon={<CheckCircle2 size={21} />}
          label="Ended"
          value={summary.ended}
          description="Completed monitoring sessions"
          color="blue"
        />

        <SummaryCard
          icon={<XCircle size={21} />}
          label="Dismissed"
          value={summary.dismissed}
          description="Postponed monitoring schedules"
          color="orange"
        />
      </section>

      {/* Monitoring Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Monitoring Sessions
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Session status updates automatically through
            Supabase Realtime.
          </p>
        </div>

        {monitoringCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 px-6 py-16 text-center">
            <Activity
              size={36}
              className="mx-auto text-neutral-700"
            />

            <h3 className="mt-4 text-lg font-semibold text-neutral-300">
              No active classes found
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              Create an active class with a valid schedule
              to display monitoring sessions here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {monitoringCards.map((item) => (
              <MonitoringCard
                key={item.id}
                item={item}
                onDismiss={openDismissModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dismissal Modal */}
      {showDismissModal && selectedClass && (
        <DismissMonitoringModal
          classItem={selectedClass}
          selectedReason={selectedReason}
          setSelectedReason={setSelectedReason}
          customReason={customReason}
          setCustomReason={setCustomReason}
          saving={savingDismissal}
          errorMessage={dismissalError}
          onCancel={closeDismissModal}
          onConfirm={handleConfirmDismissal}
        />
      )}
    </div>
  );
}

/*
  ============================================================
  SUMMARY CARD
  ============================================================
*/
function SummaryCard({
  icon,
  label,
  value,
  description,
  color,
}) {
  const colorClasses = {
    yellow: "text-yellow-400",
    green: "text-emerald-400",
    blue: "text-blue-400",
    orange: "text-orange-400",
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800 ${colorClasses[color]}`}
      >
        {icon}
      </div>

      <p className="text-sm text-neutral-500">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-bold ${colorClasses[color]}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-500">
        {description}
      </p>
    </div>
  );
}

/*
  ============================================================
  MONITORING CARD
  ============================================================
*/
function MonitoringCard({ item, onDismiss }) {
  const statusStyles = getStatusStyles(
    item.monitoringStatus
  );

  const canDismiss = ["scheduled", "active"].includes(
    item.monitoringStatus
  );

  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-xl">
      {/* Card Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {item.subject || item.class_name}
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            {item.class_name}
          </h3>

          <p className="mt-1 text-sm text-neutral-400">
            Grade {item.grade_level} • {item.strand}
            {item.section ? ` • ${item.section}` : ""}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles.className}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${statusStyles.dotClass}`}
          />
          {statusStyles.label}
        </span>
      </div>

      {/* Schedule Details */}
      <div className="mt-6 grid gap-4 border-t border-neutral-800 pt-5 sm:grid-cols-2">
        <InfoItem
          icon={<Clock3 size={16} />}
          label="Class Schedule"
          value={`${formatTime(
            item.schedule_start
          )} - ${formatTime(item.schedule_end)}`}
        />

        <InfoItem
          icon={<CalendarDays size={16} />}
          label="Scheduled Days"
          value={
            item.schedule_days?.length
              ? item.schedule_days.join(" • ")
              : "Not set"
          }
        />

        <InfoItem
          icon={<MapPin size={16} />}
          label="Room"
          value={item.room || "Not assigned"}
        />

        <InfoItem
          icon={<ShieldCheck size={16} />}
          label="Monitoring"
          value={
            item.monitoringStatus === "active"
              ? "Automatically monitoring"
              : item.monitoringStatus === "dismissed"
                ? "Dismissed for today"
                : item.monitoringStatus === "ended"
                  ? "Monitoring completed"
                  : "Automatic schedule enabled"
          }
        />
      </div>

      {/* Session Information */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Monitoring Session
        </p>

        {item.session ? (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">
                Session Status
              </span>

              <span className="font-medium text-neutral-200">
                {item.session.status}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">
                Started
              </span>

              <span className="text-right text-neutral-300">
                {formatDateTime(
                  item.session.start_time
                )}
              </span>
            </div>

            {item.session.end_time && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">
                  Ended
                </span>

                <span className="text-right text-neutral-300">
                  {formatDateTime(
                    item.session.end_time
                  )}
                </span>
              </div>
            )}
          </div>
        ) : item.dismissal ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-orange-400">
              Monitoring dismissed for today
            </p>

            <p className="mt-2 text-sm text-neutral-400">
              Reason: {item.dismissal.reason}
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Dismissed:{" "}
              {formatDateTime(
                item.dismissal.created_at
              )}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-neutral-400">
              No monitoring session record has been created
              yet.
            </p>

            <p className="mt-2 text-xs text-yellow-500">
              Monitoring will automatically activate during
              the scheduled class hours.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {canDismiss && (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onDismiss(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-800 bg-orange-950/20 px-4 py-2.5 text-sm font-semibold text-orange-400 transition hover:bg-orange-950/50"
          >
            <XCircle size={17} />
            Dismiss Monitoring
          </button>
        </div>
      )}
    </article>
  );
}

/*
  ============================================================
  INFO ITEM
  ============================================================
*/
function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-neutral-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-neutral-500">
          {label}
        </p>

        <p className="mt-1 text-sm text-neutral-200">
          {value}
        </p>
      </div>
    </div>
  );
}

/*
  ============================================================
  DISMISSAL MODAL
  ============================================================
*/
function DismissMonitoringModal({
  classItem,
  selectedReason,
  setSelectedReason,
  customReason,
  setCustomReason,
  saving,
  errorMessage,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-orange-400">
              <AlertCircle size={20} />

              <span className="text-xs font-semibold uppercase tracking-wider">
                Dismiss Monitoring
              </span>
            </div>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Postpone this class?
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {classItem.subject || classItem.class_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            aria-label="Close dismissal modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 px-6 py-6">
          <div className="rounded-xl border border-orange-900/60 bg-orange-950/20 p-4">
            <p className="text-sm leading-6 text-orange-200">
              Dismissing monitoring will prevent automatic
              monitoring for this subject on the current
              date. If a session is already active, it will
              be cancelled.
            </p>
          </div>

          <div>
            <label
              htmlFor="dismissal-reason"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Reason for postponement
            </label>

            <select
              id="dismissal-reason"
              value={selectedReason}
              onChange={(event) =>
                setSelectedReason(event.target.value)
              }
              disabled={saving}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500 disabled:opacity-50"
            >
              <option value="">
                Select a common reason
              </option>

              {DISMISSAL_REASONS.map((reason) => (
                <option
                  key={reason}
                  value={reason}
                >
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === "Other reason" && (
            <div>
              <label
                htmlFor="custom-dismissal-reason"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Enter your reason
              </label>

              <textarea
                id="custom-dismissal-reason"
                value={customReason}
                onChange={(event) =>
                  setCustomReason(event.target.value)
                }
                disabled={saving}
                rows={3}
                placeholder="Type the reason for postponement..."
                className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-orange-500 disabled:opacity-50"
              />
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/30 px-3 py-3 text-sm text-red-300">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <FileText size={17} />
                Confirm Dismissal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}