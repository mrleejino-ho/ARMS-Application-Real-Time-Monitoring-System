import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStudents = async () => {
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
        .eq("role", "student")
        .order("full_name", { ascending: true });

      if (error) {
        throw error;
      }

      setStudents(data || []);
    } catch (err) {
      console.error("ARMS students error:", err);
      setError(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        student.full_name?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search) ||
        student.section?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || student.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, statusFilter]);

  const activeStudents = students.filter(
    (student) => student.status === "active"
  ).length;

  const inactiveStudents = students.filter(
    (student) => student.status !== "active"
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Students"
        description="Manage registered Grade 11 STEM students and their devices."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Total Students</p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {students.length}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Registered student accounts
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Active Students</p>
          <h2 className="mt-2 text-3xl font-bold text-emerald-400">
            {activeStudents}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Currently active accounts
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <p className="text-sm text-gray-400">Inactive Students</p>
          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {inactiveStudents}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Inactive or unavailable accounts
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Registered Students
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              View student information registered in the ARMS database.
            </p>
          </div>

          <button
            onClick={fetchStudents}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            placeholder="Search student name, email, or section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl">👥</div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              No students found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              No student records match your search or filter.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-4">Student</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Grade & Strand</th>
                  <th className="px-4 py-4">Section</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10 font-semibold text-yellow-400">
                          {student.full_name?.charAt(0)?.toUpperCase() || "S"}
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {student.full_name || "Unnamed Student"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Student Account
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-sm text-gray-400">
                      {student.email || "—"}
                    </td>

                    <td className="px-4 py-5 text-sm text-gray-300">
                      Grade {student.grade_level || "—"}{" "}
                      {student.strand || ""}
                    </td>

                    <td className="px-4 py-5 text-sm text-gray-300">
                      {student.section || "—"}
                    </td>

                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          student.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-orange-500/10 text-orange-400"
                        }`}
                      >
                        {student.status || "Unknown"}
                      </span>
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