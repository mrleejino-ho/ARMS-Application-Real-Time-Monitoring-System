import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

export default function Monitoring() {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMonitoringData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [classesResult, sessionsResult] = await Promise.all([
        supabase
          .from("classes")
          .select(`
            id,
            class_name,
            grade_level,
            strand,
            section,
            subject,
            room,
            schedule_start,
            schedule_end,
            schedule_days,
            status
          `)
          .eq("status", "active")
          .order("schedule_start", { ascending: true }),

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
          .order("created_at", { ascending: false }),
      ]);

      if (classesResult.error) {
        throw classesResult.error;
      }

      if (sessionsResult.error) {
        throw sessionsResult.error;
      }

      setClasses(classesResult.data || []);
      setSessions(sessionsResult.data || []);
    } catch (err) {
      console.error("Monitoring data error:", err);
      setError(err.message || "Failed to load monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoringData();

    // Refresh automatically every 30 seconds
    const interval = setInterval(() => {
      loadMonitoringData(true);
    }, 30000);

    // Listen for changes in monitoring_sessions
    const channel = supabase
      .channel("monitoring-sessions-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring_sessions",
        },
        () => {
          loadMonitoringData(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadMonitoringData]);

  const latestSessionByClass = useMemo(() => {
    const sessionMap = {};

    sessions.forEach((session) => {
      if (!sessionMap[session.class_id]) {
        sessionMap[session.class_id] = session;
      }
    });

    return sessionMap;
  }, [sessions]);

  const getStatusStyles = (status) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          className:
            "border-green-500/40 bg-green-500/10 text-green-400",
          dotClass: "bg-green-400",
        };

      case "ended":
        return {
          label: "Ended",
          className: "border-gray-500/40 bg-gray-500/10 text-gray-400",
          dotClass: "bg-gray-400",
        };

      case "cancelled":
        return {
          label: "Cancelled",
          className: "border-red-500/40 bg-red-500/10 text-red-400",
          dotClass: "bg-red-400",
        };

      case "scheduled":
      default:
        return {
          label: "Scheduled",
          className:
            "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
          dotClass: "bg-yellow-400",
        };
    }
  };

  const formatTime = (time) => {
    if (!time) return "Not set";

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "Not available";

    return new Date(dateTime).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDays = (days) => {
    if (!days || !Array.isArray(days) || days.length === 0) {
      return "No schedule days";
    }

    return days.join(" • ");
  };

  const getSessionStatus = (classItem) => {
    const session = latestSessionByClass[classItem.id];

    if (session?.status) {
      return session.status;
    }

    return "scheduled";
  };

  const activeCount = classes.filter(
    (classItem) => getSessionStatus(classItem) === "active"
  ).length;

  const scheduledCount = classes.filter(
    (classItem) => getSessionStatus(classItem) === "scheduled"
  ).length;

  const endedCount = classes.filter(
    (classItem) => getSessionStatus(classItem) === "ended"
  ).length;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Monitoring"
        description="Automatically monitor classroom sessions based on each subject's schedule."
      />

      <div className="mt-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
            <p className="text-sm text-gray-400">Scheduled</p>
            <p className="mt-2 text-3xl font-semibold text-yellow-400">
              {scheduledCount}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Classes waiting for their schedule
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
            <p className="text-sm text-gray-400">Active</p>
            <p className="mt-2 text-3xl font-semibold text-green-400">
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Classes currently being monitored
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
            <p className="text-sm text-gray-400">Ended</p>
            <p className="mt-2 text-3xl font-semibold text-gray-400">
              {endedCount}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Completed monitoring sessions
            </p>
          </div>
        </div>

        {/* Page Controls */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Classroom Monitoring Sessions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Session status is updated automatically according to each
              subject's schedule.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadMonitoringData(true)}
            disabled={refreshing}
            className="rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#171717] p-10 text-center text-gray-400">
            Loading monitoring sessions...
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#171717] p-10 text-center">
            <p className="text-lg font-medium text-white">
              No active classes found
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Create an active class with a valid subject schedule first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {classes.map((classItem) => {
              const session = latestSessionByClass[classItem.id];
              const status = getSessionStatus(classItem);
              const statusStyles = getStatusStyles(status);

              return (
                <div
                  key={classItem.id}
                  className="rounded-2xl border border-white/10 bg-[#171717] p-6 transition hover:border-white/20"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        {classItem.subject || "Subject"}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold text-white">
                        {classItem.class_name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-400">
                        Grade {classItem.grade_level} •{" "}
                        {classItem.strand || "No strand"}{" "}
                        {classItem.section
                          ? `• ${classItem.section}`
                          : ""}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles.className}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${statusStyles.dotClass}`}
                      />
                      {statusStyles.label}
                    </div>
                  </div>

                  {/* Schedule Information */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-500">◷</span>
                      <div>
                        <p className="text-xs text-gray-500">
                          Class Schedule
                        </p>
                        <p className="mt-1 text-sm text-gray-200">
                          {formatTime(classItem.schedule_start)} -{" "}
                          {formatTime(classItem.schedule_end)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-500">▦</span>
                      <div>
                        <p className="text-xs text-gray-500">
                          Scheduled Days
                        </p>
                        <p className="mt-1 text-sm text-gray-200">
                          {formatDays(classItem.schedule_days)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-500">⌖</span>
                      <div>
                        <p className="text-xs text-gray-500">Room</p>
                        <p className="mt-1 text-sm text-gray-200">
                          {classItem.room || "No room assigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Session Information */}
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Monitoring Session
                    </p>

                    {session ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Session ID</span>
                          <span className="max-w-[220px] truncate text-gray-300">
                            {session.id}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Started</span>
                          <span className="text-right text-gray-300">
                            {formatDateTime(session.start_time)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Ended</span>
                          <span className="text-right text-gray-300">
                            {formatDateTime(session.end_time)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No monitoring session record has been created yet.
                      </p>
                    )}
                  </div>

                  {/* Bottom Status Message */}
                  <div className="mt-5 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    {status === "active" ? (
                      <p className="text-sm text-green-400">
                        ● Automatic monitoring is currently active for this
                        subject.
                      </p>
                    ) : status === "ended" ? (
                      <p className="text-sm text-gray-400">
                        ● This subject's monitoring session has ended.
                      </p>
                    ) : status === "cancelled" ? (
                      <p className="text-sm text-red-400">
                        ● This monitoring session was cancelled.
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-400">
                        ● Monitoring will automatically activate during the
                        scheduled class hours.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Automatic Refresh Notice */}
        <p className="text-center text-xs text-gray-600">
          Monitoring data refreshes automatically every 30 seconds.
        </p>
      </div>
    </div>
  );
}