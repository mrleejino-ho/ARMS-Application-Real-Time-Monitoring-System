import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

export default function Reports() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFilter, setDateFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("violation_details")
        .select("*")
        .order("detected_at", { ascending: false });

      if (error) {
        throw error;
      }

      setViolations(data || []);
    } catch (err) {
      console.error("ARMS reports error:", err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const subjects = useMemo(() => {
    return [
      ...new Set(
        violations
          .map((violation) => violation.subject)
          .filter(Boolean)
      ),
    ].sort();
  }, [violations]);

  const filteredViolations = useMemo(() => {
    const now = new Date();

    return violations.filter((violation) => {
      const detectedDate = new Date(violation.detected_at);

      let matchesDate = true;

      if (dateFilter === "today") {
        matchesDate =
          detectedDate.toDateString() === now.toDateString();
      }

      if (dateFilter === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        matchesDate = detectedDate >= sevenDaysAgo;
      }

      if (dateFilter === "month") {
        matchesDate =
          detectedDate.getMonth() === now.getMonth() &&
          detectedDate.getFullYear() === now.getFullYear();
      }

      const matchesSubject =
        subjectFilter === "all" ||
        violation.subject === subjectFilter;

      return matchesDate && matchesSubject;
    });
  }, [violations, dateFilter, subjectFilter]);

  const totalViolations = filteredViolations.length;

  const blockedEvents = filteredViolations.filter(
    (violation) =>
      violation.action_taken?.toLowerCase() === "blocked"
  ).length;

  const uniqueStudents = new Set(
    filteredViolations
      .map((violation) => violation.student_id)
      .filter(Boolean)
  ).size;

  const uniqueSubjects = new Set(
    filteredViolations
      .map((violation) => violation.subject)
      .filter(Boolean)
  ).size;

  const formatDateTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="View and analyze application monitoring activity and violation records."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Total Violations</p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {totalViolations}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Records within selected filters
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Blocked Events</p>
          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {blockedEvents}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Events marked as blocked
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Students Involved</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-400">
            {uniqueStudents}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Unique students with records
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Subjects Involved</p>
          <h2 className="mt-2 text-3xl font-bold text-emerald-400">
            {uniqueSubjects}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Subjects with recorded events
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Report Filters
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Narrow report results by date range or subject.
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Date Range
            </label>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Subject
            </label>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
            >
              <option value="all">All Subjects</option>

              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Monitoring Report
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Detailed application monitoring and violation records.
            </p>
          </div>

          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
            {filteredViolations.length} records
          </span>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading reports...
          </div>
        ) : filteredViolations.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-4xl">📊</div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              No report records found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Violation records will appear here once the Student App
              submits monitoring events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Subject</th>
                  <th className="px-5 py-4">Application</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Detected At</th>
                </tr>
              </thead>

              <tbody>
                {filteredViolations.map((violation) => (
                  <tr
                    key={violation.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {violation.student_name || "Unknown Student"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {violation.student_email || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-300">
                      {violation.subject || violation.class_name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-white">
                        {violation.app_name || "Unknown Application"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {violation.package_name || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-400">
                      {violation.application_category || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                        {violation.action_taken || "Recorded"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-400">
                      {formatDateTime(violation.detected_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}