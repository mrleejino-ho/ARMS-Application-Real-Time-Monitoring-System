import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  UserRound,
  XCircle,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../services/supabase";

const FILTER_OPTIONS = [
  { value: "all", label: "All Violations" },
  { value: "today", label: "Today" },
  { value: "blocked", label: "Blocked" },
  { value: "warned", label: "Warned" },
  { value: "allowed", label: "Allowed" },
];

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActionLabel(action) {
  if (!action) return "Unknown";

  return String(action)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getActionClass(action) {
  const normalized = String(action || "").toLowerCase();

  if (normalized === "blocked") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "warned" || normalized === "warning") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (normalized === "allowed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-neutral-700 bg-neutral-800 text-neutral-300";
}

function getActionIcon(action) {
  const normalized = String(action || "").toLowerCase();

  if (normalized === "blocked") {
    return <XCircle size={14} />;
  }

  if (normalized === "allowed") {
    return <CheckCircle2 size={14} />;
  }

  return <AlertTriangle size={14} />;
}

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loadViolations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const { data, error } = await supabase
        .from("violation_details")
        .select(`
          id,
          student_id,
          student_name,
          student_email,
          device_id,
          class_id,
          class_name,
          subject,
          grade_level,
          strand,
          section,
          monitoring_session_id,
          session_start_time,
          session_end_time,
          session_status,
          application_id,
          app_name,
          package_name,
          application_category,
          detected_at,
          action_taken,
          created_at
        `)
        .order("detected_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      console.log("ARMS violations response:", data);

      setViolations(data || []);
    } catch (error) {
      console.error("ARMS violations loading error:", error);

      setErrorMessage(
        error.message || "Failed to load violation records."
      );

      setViolations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();

    const channel = supabase
      .channel("violations-page-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "violations",
        },
        (payload) => {
          console.log(
            "ARMS violations realtime event:",
            payload.eventType
          );

          loadViolations(true);
        }
      )
      .subscribe((status) => {
        console.log(
          "ARMS violations Realtime subscription:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadViolations]);

  const statistics = useMemo(() => {
    const today = new Date().toDateString();

    const todayViolations = violations.filter((item) => {
      if (!item.detected_at) return false;

      return (
        new Date(item.detected_at).toDateString() === today
      );
    });

    const blockedCount = violations.filter(
      (item) =>
        String(item.action_taken || "").toLowerCase() === "blocked"
    ).length;

    const warnedCount = violations.filter((item) => {
      const action = String(
        item.action_taken || ""
      ).toLowerCase();

      return action === "warned" || action === "warning";
    }).length;

    const uniqueStudents = new Set(
      violations
        .map((item) => item.student_id)
        .filter(Boolean)
    ).size;

    return {
      total: violations.length,
      today: todayViolations.length,
      blocked: blockedCount,
      warned: warnedCount,
      students: uniqueStudents,
    };
  }, [violations]);

  const filteredViolations = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return violations.filter((item) => {
      const action = String(
        item.action_taken || ""
      ).toLowerCase();

      const detectedDate = item.detected_at
        ? new Date(item.detected_at).toDateString()
        : "";

      const today = new Date().toDateString();

      const matchesSearch =
        !normalizedSearch ||
        item.student_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.student_email
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.app_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.package_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.subject
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.class_name
          ?.toLowerCase()
          .includes(normalizedSearch);

      let matchesFilter = true;

      if (filter === "today") {
        matchesFilter = detectedDate === today;
      }

      if (filter === "blocked") {
        matchesFilter = action === "blocked";
      }

      if (filter === "warned") {
        matchesFilter =
          action === "warned" || action === "warning";
      }

      if (filter === "allowed") {
        matchesFilter = action === "allowed";
      }

      return matchesSearch && matchesFilter;
    });
  }, [violations, search, filter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Violations"
        description="Review detected restricted application events and student monitoring violations."
      />

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Total Violations
            </p>

            <div className="rounded-xl bg-red-500/10 p-2 text-red-400">
              <ShieldAlert size={20} />
            </div>
          </div>

          <p className="mt-4 text-3xl font-bold text-white">
            {statistics.total}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            All recorded violation events
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Detected Today
            </p>

            <div className="rounded-xl bg-yellow-500/10 p-2 text-yellow-400">
              <CalendarDays size={20} />
            </div>
          </div>

          <p className="mt-4 text-3xl font-bold text-white">
            {statistics.today}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Violations detected today
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Blocked Events
            </p>

            <div className="rounded-xl bg-orange-500/10 p-2 text-orange-400">
              <XCircle size={20} />
            </div>
          </div>

          <p className="mt-4 text-3xl font-bold text-white">
            {statistics.blocked}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Events marked as blocked
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Students Involved
            </p>

            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
              <UserRound size={20} />
            </div>
          </div>

          <p className="mt-4 text-3xl font-bold text-white">
            {statistics.students}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Unique students with recorded events
          </p>
        </div>
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, application, subject..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-yellow-500"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
            >
              {FILTER_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadViolations(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />

              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-4 text-sm text-red-300">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Failed to load violations
            </p>

            <p className="mt-1 text-red-400">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Violation Records */}
      <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl">
        <div className="flex flex-col gap-2 border-b border-neutral-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Violation Records
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Automatically updated when new violations are recorded.
            </p>
          </div>

          <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-400">
            {filteredViolations.length} record
            {filteredViolations.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-neutral-500">
            <RefreshCw
              size={28}
              className="animate-spin"
            />

            <p className="text-sm">
              Loading violation records...
            </p>
          </div>
        ) : filteredViolations.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-neutral-600">
              <ShieldAlert size={42} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-neutral-200">
              No violation records found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {violations.length === 0
                ? "No restricted application events have been recorded yet. Violation records will appear here once the Student App detects and submits an event."
                : "No records match your current search or filter. Try changing the search keyword or filter."}
            </p>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filteredViolations.map((violation) => (
              <article
                key={violation.id}
                className="p-5 transition hover:bg-neutral-800/30"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  {/* Main Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getActionClass(
                          violation.action_taken
                        )}`}
                      >
                        {getActionIcon(violation.action_taken)}

                        {getActionLabel(
                          violation.action_taken
                        )}
                      </span>

                      <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                        {violation.application_category ||
                          "Uncategorized"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="rounded-xl bg-neutral-800 p-3 text-neutral-300">
                        <Smartphone size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-white">
                          {violation.app_name ||
                            "Unknown Application"}
                        </h3>

                        <p className="mt-1 break-all text-xs text-neutral-500">
                          {violation.package_name ||
                            "Package name unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <UserRound
                          size={16}
                          className="mt-0.5 shrink-0 text-neutral-500"
                        />

                        <div>
                          <p className="text-xs text-neutral-500">
                            Student
                          </p>

                          <p className="mt-1 text-sm font-medium text-neutral-200">
                            {violation.student_name ||
                              "Unknown Student"}
                          </p>

                          {violation.student_email && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {violation.student_email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          size={16}
                          className="mt-0.5 shrink-0 text-neutral-500"
                        />

                        <div>
                          <p className="text-xs text-neutral-500">
                            Subject / Class
                          </p>

                          <p className="mt-1 text-sm font-medium text-neutral-200">
                            {violation.subject ||
                              violation.class_name ||
                              "Unknown Class"}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {[
                              violation.grade_level
                                ? `Grade ${violation.grade_level}`
                                : null,
                              violation.strand,
                              violation.section,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock
                          size={16}
                          className="mt-0.5 shrink-0 text-neutral-500"
                        />

                        <div>
                          <p className="text-xs text-neutral-500">
                            Detected At
                          </p>

                          <p className="mt-1 text-sm text-neutral-200">
                            {formatDateTime(
                              violation.detected_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <ShieldAlert
                          size={16}
                          className="mt-0.5 shrink-0 text-neutral-500"
                        />

                        <div>
                          <p className="text-xs text-neutral-500">
                            Monitoring Session
                          </p>

                          <p className="mt-1 text-sm text-neutral-200">
                            {violation.session_status
                              ? getActionLabel(
                                  violation.session_status
                                )
                              : "Unknown"}
                          </p>

                          {violation.session_start_time && (
                            <p className="mt-1 text-xs text-neutral-500">
                              Started{" "}
                              {formatTime(
                                violation.session_start_time
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Summary */}
                  <div className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 xl:max-w-xs">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Event Details
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs text-neutral-500">
                          Application
                        </p>

                        <p className="mt-1 text-sm text-neutral-200">
                          {violation.app_name || "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Action Taken
                        </p>

                        <p className="mt-1 text-sm font-medium text-neutral-200">
                          {getActionLabel(
                            violation.action_taken
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Event Date
                        </p>

                        <p className="mt-1 text-sm text-neutral-200">
                          {formatDateTime(
                            violation.created_at ||
                              violation.detected_at
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}