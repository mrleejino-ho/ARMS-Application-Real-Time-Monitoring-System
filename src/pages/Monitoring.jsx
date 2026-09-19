import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Radio,
  School,
  Timer,
  XCircle,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../services/supabase";

function formatTime(timeValue) {
  if (!timeValue) return "Not set";

  const [hours, minutes] = timeValue.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Not available";

  return new Date(dateValue).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusStyles(status) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        badge:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        icon: <Radio size={15} />,
        dot: "bg-emerald-400",
      };

    case "ended":
      return {
        label: "Ended",
        badge: "border-slate-500/40 bg-slate-500/10 text-slate-400",
        icon: <CheckCircle2 size={15} />,
        dot: "bg-slate-400",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        badge: "border-red-500/40 bg-red-500/10 text-red-400",
        icon: <XCircle size={15} />,
        dot: "bg-red-400",
      };

    default:
      return {
        label: "Scheduled",
        badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
        icon: <Clock3 size={15} />,
        dot: "bg-yellow-400",
      };
  }
}

function getCurrentScheduleStatus(classItem, session) {
  if (session?.status) {
    return session.status;
  }

  return "scheduled";
}

export default function Monitoring() {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMonitoringData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const [
        { data: classData, error: classError },
        { data: sessionData, error: sessionError },
      ] = await Promise.all([
        supabase
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
          }),

        supabase
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
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (classError) {
        throw classError;
      }

      if (sessionError) {
        throw sessionError;
      }

      setClasses(classData || []);
      setSessions(sessionData || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("ARMS monitoring load error:", error);

      setErrorMessage(
        error.message || "Failed to load monitoring sessions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoringData();

    /*
      Listen for changes in monitoring_sessions.

      This allows the page to update automatically when:
      scheduled -> active
      active -> ended
      new session is created
    */
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
            "ARMS Realtime monitoring_sessions event:",
            payload
          );

          loadMonitoringData(true);
        }
      )
      .subscribe((status) => {
        console.log(
          "ARMS monitoring Realtime subscription:",
          status
        );
      });

    /*
      Listen for class schedule changes.
    */
    const classesChannel = supabase
      .channel("arms-classes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classes",
        },
        (payload) => {
          console.log("ARMS Realtime classes event:", payload);

          loadMonitoringData(true);
        }
      )
      .subscribe((status) => {
        console.log(
          "ARMS classes Realtime subscription:",
          status
        );
      });

    /*
      Fallback refresh every 60 seconds.

      This helps keep the displayed schedule accurate even if
      a Realtime event is missed.
    */
    const fallbackInterval = setInterval(() => {
      loadMonitoringData(true);
    }, 60000);

    return () => {
      supabase.removeChannel(monitoringChannel);
      supabase.removeChannel(classesChannel);
      clearInterval(fallbackInterval);
    };
  }, [loadMonitoringData]);

  const latestSessionByClass = useMemo(() => {
    const sessionMap = new Map();

    for (const session of sessions) {
      if (!sessionMap.has(session.class_id)) {
        sessionMap.set(session.class_id, session);
      }
    }

    return sessionMap;
  }, [sessions]);

  const monitoringClasses = useMemo(() => {
    return classes.map((classItem) => {
      const session = latestSessionByClass.get(classItem.id);

      return {
        ...classItem,
        session,
        currentStatus: getCurrentScheduleStatus(
          classItem,
          session
        ),
      };
    });
  }, [classes, latestSessionByClass]);

  const scheduledCount = monitoringClasses.filter(
    (item) => item.currentStatus === "scheduled"
  ).length;

  const activeCount = monitoringClasses.filter(
    (item) => item.currentStatus === "active"
  ).length;

  const endedCount = monitoringClasses.filter(
    (item) => item.currentStatus === "ended"
  ).length;

  const cancelledCount = monitoringClasses.filter(
    (item) => item.currentStatus === "cancelled"
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Monitoring"
        description="Monitor classroom sessions automatically according to each subject's schedule."
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <strong>Monitoring error:</strong> {errorMessage}
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Scheduled"
          value={scheduledCount}
          description="Classes waiting for their schedule"
          icon={<Clock3 size={20} />}
          iconClass="text-yellow-400"
        />

        <SummaryCard
          title="Active"
          value={activeCount}
          description="Classes currently being monitored"
          icon={<Radio size={20} />}
          iconClass="text-emerald-400"
        />

        <SummaryCard
          title="Ended"
          value={endedCount}
          description="Completed monitoring sessions"
          icon={<CheckCircle2 size={20} />}
          iconClass="text-slate-400"
        />

        <SummaryCard
          title="Cancelled"
          value={cancelledCount}
          description="Cancelled monitoring sessions"
          icon={<XCircle size={20} />}
          iconClass="text-red-400"
        />
      </section>

      {/* Page Toolbar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Classroom Monitoring Sessions
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Session status updates automatically through Supabase Realtime.
          </p>

          {lastUpdated && (
            <p className="mt-1 text-xs text-neutral-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => loadMonitoringData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
          <RefreshCw
            size={30}
            className="mx-auto animate-spin text-neutral-500"
          />

          <p className="mt-4 text-sm text-neutral-400">
            Loading monitoring sessions...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && monitoringClasses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900 px-6 py-16 text-center">
          <School
            size={35}
            className="mx-auto text-neutral-600"
          />

          <h3 className="mt-4 font-semibold">
            No active classes found
          </h3>

          <p className="mt-2 text-sm text-neutral-500">
            Create an active class with a valid schedule to display it here.
          </p>
        </div>
      )}

      {/* Monitoring Cards */}
      {!loading && monitoringClasses.length > 0 && (
        <section className="grid gap-5 xl:grid-cols-2">
          {monitoringClasses.map((classItem) => {
            const statusStyles = getStatusStyles(
              classItem.currentStatus
            );

            return (
              <article
                key={classItem.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      {classItem.subject || classItem.class_name}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      {classItem.class_name}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-400">
                      Grade {classItem.grade_level} •{" "}
                      {classItem.strand}
                      {classItem.section
                        ? ` • ${classItem.section}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles.badge}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                    />

                    {statusStyles.label}
                  </span>
                </div>

                {/* Class Information */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoItem
                    icon={<Clock3 size={16} />}
                    label="Class Schedule"
                    value={`${formatTime(
                      classItem.schedule_start
                    )} - ${formatTime(classItem.schedule_end)}`}
                  />

                  <InfoItem
                    icon={<CalendarDays size={16} />}
                    label="Scheduled Days"
                    value={
                      classItem.schedule_days?.length
                        ? classItem.schedule_days.join(" • ")
                        : "No days configured"
                    }
                  />

                  <InfoItem
                    icon={<School size={16} />}
                    label="Room"
                    value={classItem.room || "No room assigned"}
                  />

                  <InfoItem
                    icon={<Timer size={16} />}
                    label="Session Status"
                    value={statusStyles.label}
                  />
                </div>

                {/* Monitoring Session Details */}
                <div className="mt-6 border-t border-neutral-800 pt-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Monitoring Session
                  </p>

                  {classItem.session ? (
                    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                      <div className="flex items-center gap-2">
                        {statusStyles.icon}

                        <span className="text-sm font-semibold">
                          {statusStyles.label}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="text-neutral-500">
                            Start time
                          </span>

                          <span className="text-neutral-300">
                            {formatDateTime(
                              classItem.session.start_time
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="text-neutral-500">
                            End time
                          </span>

                          <span className="text-neutral-300">
                            {classItem.session.end_time
                              ? formatDateTime(
                                  classItem.session.end_time
                                )
                              : "Not ended"}
                          </span>
                        </div>

                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="text-neutral-500">
                            Session ID
                          </span>

                          <span className="max-w-full break-all font-mono text-xs text-neutral-600">
                            {classItem.session.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 p-4">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Clock3 size={16} />

                        <span className="text-sm font-medium">
                          No monitoring session record yet
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-neutral-500">
                        A scheduled session will be created automatically
                        according to the subject's class schedule.
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Notice */}
                <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Activity
                      size={16}
                      className="mt-0.5 shrink-0 text-neutral-500"
                    />

                    <p className="text-xs leading-relaxed text-neutral-500">
                      {classItem.currentStatus === "active"
                        ? "This class is currently within its scheduled monitoring period."
                        : classItem.currentStatus === "ended"
                        ? "This monitoring session has already completed."
                        : classItem.currentStatus === "cancelled"
                        ? "This monitoring session was cancelled."
                        : "Monitoring will automatically activate during the scheduled class hours."}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800 ${iconClass}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm text-neutral-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {description}
      </p>
    </div>
  );
}

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

        <p className="mt-1 break-words text-sm text-neutral-300">
          {value}
        </p>
      </div>
    </div>
  );
}