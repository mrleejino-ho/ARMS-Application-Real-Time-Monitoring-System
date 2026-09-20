import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  Radio,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const { profile } = useAuth();

  const [dashboardData, setDashboardData] = useState({
    activeClasses: 0,
    students: 0,
    monitoring: "Inactive",
    todaysViolations: 0,
    recentEvents: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const firstName =
    profile?.full_name?.split(" ")[0] || "Teacher";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayISOString = today.toISOString();

      // Fetch active classes
      const { count: activeClasses, error: classesError } =
        await supabase
          .from("classes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active");

      if (classesError) throw classesError;

      // Fetch active students
      const { count: students, error: studentsError } =
        await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "student")
          .eq("status", "active");

      if (studentsError) throw studentsError;

      // Fetch current monitoring session
      const { data: monitoringSession, error: monitoringError } =
        await supabase
          .from("monitoring_sessions")
          .select("id, status, start_time, class_id")
          .eq("status", "active")
          .order("start_time", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (monitoringError) throw monitoringError;

      // Fetch today's violations
      const { count: todaysViolations, error: violationsError } =
        await supabase
          .from("violations")
          .select("*", {
            count: "exact",
            head: true,
          })
          .gte("detected_at", todayISOString);

      if (violationsError) throw violationsError;

      // Fetch recent violation records
      const { data: recentEvents, error: recentEventsError } =
        await supabase
          .from("violation_details")
          .select(`
            id,
            student_name,
            app_name,
            application_category,
            detected_at,
            action_taken,
            class_name,
            subject
          `)
          .order("detected_at", {
            ascending: false,
          })
          .limit(5);

      if (recentEventsError) throw recentEventsError;

      setDashboardData({
        activeClasses: activeClasses || 0,
        students: students || 0,
        monitoring: monitoringSession ? "Active" : "Inactive",
        todaysViolations: todaysViolations || 0,
        recentEvents: recentEvents || [],
      });
    } catch (err) {
      console.error("Dashboard data error:", err);
      setError(
        err.message || "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      title: "Active Classes",
      value: dashboardData.activeClasses,
      description: "Currently active classes",
      icon: GraduationCap,
    },
    {
      title: "Students",
      value: dashboardData.students,
      description: "Registered active students",
      icon: Users,
    },
    {
      title: "Monitoring",
      value: dashboardData.monitoring,
      description: "Current monitoring session",
      icon: Radio,
    },
    {
      title: "Today's Violations",
      value: dashboardData.todaysViolations,
      description: "Recorded today",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Monitor registered Grade 11 STEM student
              devices and manage classroom application
              restrictions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium transition hover:border-neutral-600 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />

              Refresh
            </button>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    dashboardData.monitoring === "Active"
                      ? "bg-emerald-500"
                      : "bg-neutral-500"
                  }`}
                />

                <span className="text-sm font-medium">
                  Monitoring{" "}
                  {dashboardData.monitoring === "Active"
                    ? "active"
                    : "inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-medium">
              Failed to load dashboard data
            </p>

            <p className="mt-1 text-red-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
                  <Icon size={19} />
                </div>

                <ArrowUpRight
                  size={17}
                  className="text-neutral-600 transition group-hover:text-white"
                />
              </div>

              <p className="mt-5 text-sm text-neutral-500">
                {stat.title}
              </p>

              <p
                className={`mt-1 text-3xl font-bold ${
                  stat.title === "Monitoring" &&
                  dashboardData.monitoring === "Active"
                    ? "text-emerald-400"
                    : ""
                }`}
              >
                {loading ? "—" : stat.value}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Main Dashboard Cards */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Monitoring Status */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">
                Live Monitoring
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Classroom Monitoring
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
              <Activity size={19} />
            </div>
          </div>

          {dashboardData.monitoring === "Active" ? (
            <div className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-6 py-10 text-center">
              <Radio
                size={30}
                className="mx-auto text-emerald-400"
              />

              <h3 className="mt-4 font-medium text-emerald-300">
                Monitoring session is active
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                A classroom monitoring session is
                currently running.
              </p>

              <Link
                to="/monitoring"
                className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                View Monitoring
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-800 px-6 py-10 text-center">
              <Radio
                size={30}
                className="mx-auto text-neutral-600"
              />

              <h3 className="mt-4 font-medium">
                No active monitoring session
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                Start a classroom monitoring session to
                view connected student devices and
                application activity in real time.
              </p>

              <Link
                to="/monitoring"
                className="mt-5 inline-flex rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:border-neutral-500 hover:bg-neutral-800"
              >
                Go to Monitoring
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-500">
            Quick Actions
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Get started
          </h2>

          <div className="mt-6 space-y-3">
            <QuickAction
              title="Create Class"
              description="Set up a class session"
              href="/classes"
            />

            <QuickAction
              title="Add Students"
              description="Manage class participants"
              href="/students"
            />

            <QuickAction
              title="Configure Apps"
              description="Manage restricted apps"
              href="/applications"
            />

            <QuickAction
              title="Start Monitoring"
              description="Begin a monitoring session"
              href="/monitoring"
            />
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              Recent Activity
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Monitoring Events
            </h2>
          </div>

          <Link
            to="/violations"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            View all
          </Link>
        </div>

        {dashboardData.recentEvents.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-800 px-6 py-10 text-center">
            <ShieldAlert
              size={30}
              className="mx-auto text-neutral-600"
            />

            <p className="mt-4 text-sm text-neutral-500">
              No monitoring events recorded yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {dashboardData.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-neutral-800/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950/40 text-red-400">
                    <ShieldAlert size={17} />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {event.student_name || "Unknown Student"}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {event.app_name || "Unknown Application"}
                      {event.class_name
                        ? ` • ${event.class_name}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-neutral-400">
                    {event.detected_at
                      ? new Date(
                          event.detected_at
                        ).toLocaleString()
                      : "Unknown date"}
                  </p>

                  <p className="mt-1 text-xs capitalize text-neutral-600">
                    {event.action_taken || "Detected"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
}) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600 hover:bg-neutral-800"
    >
      <div>
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={17}
        className="text-neutral-600"
      />
    </Link>
  );
}