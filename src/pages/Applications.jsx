import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Filter,
  Gamepad2,
  Globe,
  LayoutGrid,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const COMMON_CATEGORIES = [
  "Education",
  "Social Media",
  "Games",
  "Entertainment",
  "Productivity",
  "Communication",
  "Browser",
  "System",
  "Other",
];

const EMPTY_FORM = {
  app_name: "",
  package_name: "",
  category: "Other",
};

const CATEGORY_STYLES = {
  Education: {
    icon: LayoutGrid,
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  "Social Media": {
    icon: Smartphone,
    className:
      "border-pink-500/20 bg-pink-500/10 text-pink-300",
  },
  Games: {
    icon: Gamepad2,
    className:
      "border-purple-500/20 bg-purple-500/10 text-purple-300",
  },
  Entertainment: {
    icon: AppWindow,
    className:
      "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  Productivity: {
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  Communication: {
    icon: Smartphone,
    className:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },
  Browser: {
    icon: Globe,
    className:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  },
  System: {
    icon: Package,
    className:
      "border-neutral-500/30 bg-neutral-500/10 text-neutral-300",
  },
  Other: {
    icon: Package,
    className:
      "border-neutral-500/30 bg-neutral-500/10 text-neutral-300",
  },
};

function getCategoryStyle(category) {
  return (
    CATEGORY_STYLES[category] || {
      icon: Package,
      className:
        "border-neutral-500/30 bg-neutral-500/10 text-neutral-300",
    }
  );
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel("applications-page-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchApplications() {
    try {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("applications")
        .select("*")
        .order("app_name", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setApplications(data || []);
    } catch (err) {
      console.error("Applications loading error:", err);
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingApplication(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(application) {
    setEditingApplication(application);

    setForm({
      app_name: application.app_name || "",
      package_name: application.package_name || "",
      category: application.category || "Other",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingApplication(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.app_name.trim() || !form.package_name.trim()) {
      setError("Application name and package name are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        app_name: form.app_name.trim(),
        package_name: form.package_name.trim(),
        category: form.category,
        updated_at: new Date().toISOString(),
      };

      if (editingApplication) {
        const { error: updateError } = await supabase
          .from("applications")
          .update(payload)
          .eq("id", editingApplication.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess("Application updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("applications")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          throw insertError;
        }

        setSuccess("Application added successfully.");
      }

      await fetchApplications();

      setShowModal(false);
      setEditingApplication(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Application save error:", err);
      setError(err.message || "Unable to save application.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .eq("id", deleteTarget.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess("Application deleted successfully.");
      setDeleteTarget(null);

      await fetchApplications();
    } catch (err) {
      console.error("Application delete error:", err);

      setError(
        err.message ||
          "Unable to delete this application. It may already be used in monitoring records."
      );
    } finally {
      setSaving(false);
    }
  }

  const categories = useMemo(() => {
    const databaseCategories = applications
      .map((application) => application.category)
      .filter(Boolean);

    return [
      "All",
      ...new Set([...COMMON_CATEGORIES, ...databaseCategories]),
    ];
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return applications.filter((application) => {
      const matchesSearch =
        !normalizedSearch ||
        application.app_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        application.package_name
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "All" ||
        application.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [applications, search, categoryFilter]);

  const totalCategories = Math.max(categories.length - 1, 0);

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* PAGE HEADER */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
            ARMS
          </p>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Applications
            </h1>

            <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-400">
              Application Registry
            </span>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            Manage registered Android applications and classroom
            restriction rules used by the monitoring system.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-white/5 transition hover:bg-neutral-200 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Application
        </button>
      </section>

      {/* ALERTS */}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto text-emerald-300/70 transition hover:text-emerald-200"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && !showModal && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <XCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-300/70 transition hover:text-red-200"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-400">
                Total Applications
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                {applications.length}
              </p>

              <p className="mt-2 text-xs text-neutral-500">
                Registered applications in Supabase
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300">
              <AppWindow size={22} />
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-400">
                Application Categories
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                {totalCategories}
              </p>

              <p className="mt-2 text-xs text-neutral-500">
                Categories available for classification
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-300">
              <LayoutGrid size={22} />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN PANEL */}
      <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
        {/* PANEL HEADER */}
        <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Registered Applications
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Search and manage applications used for classroom monitoring.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchApplications}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="border-b border-neutral-800 bg-neutral-950/40 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />

              <input
                type="text"
                placeholder="Search application name or package..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-600 focus:ring-2 focus:ring-white/5"
              />
            </div>

            <div className="relative md:w-56">
              <Filter
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="h-11 w-full appearance-none rounded-xl border border-neutral-800 bg-neutral-900 pl-10 pr-10 text-sm text-neutral-200 outline-none transition focus:border-neutral-600 focus:ring-2 focus:ring-white/5"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "All"
                      ? "All Categories"
                      : category}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <Loader2
              size={34}
              className="animate-spin text-neutral-400"
            />

            <h3 className="mt-4 text-base font-semibold text-white">
              Loading applications
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              Please wait while applications are retrieved.
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-neutral-600">
              <AppWindow size={38} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              {applications.length === 0
                ? "No applications registered"
                : "No matching applications"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {applications.length === 0
                ? "Add an application to begin managing classroom restrictions."
                : "Try changing your search keyword or category filter."}
            </p>

            {applications.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                <Plus size={17} />
                Add First Application
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-neutral-800 bg-neutral-950/60">
                  <tr className="text-xs uppercase tracking-wider text-neutral-500">
                    <th className="px-6 py-4 font-medium">
                      Application
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Package Name
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Category
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Created
                    </th>

                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800/80">
                  {filteredApplications.map((application) => {
                    const categoryStyle = getCategoryStyle(
                      application.category
                    );

                    const CategoryIcon = categoryStyle.icon;

                    return (
                      <tr
                        key={application.id}
                        className="group transition hover:bg-white/[0.025]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-300">
                              <CategoryIcon size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-white">
                                {application.app_name}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                Android application
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <code className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-400">
                            {application.package_name}
                          </code>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${categoryStyle.className}`}
                          >
                            <CategoryIcon size={13} />
                            {application.category || "Uncategorized"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-neutral-400">
                          {formatDate(application.created_at)}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(application)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget(application)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-neutral-800 md:hidden">
              {filteredApplications.map((application) => {
                const categoryStyle = getCategoryStyle(
                  application.category
                );

                const CategoryIcon = categoryStyle.icon;

                return (
                  <div
                    key={application.id}
                    className="space-y-4 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-300">
                        <CategoryIcon size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white">
                          {application.app_name}
                        </h3>

                        <p className="mt-1 break-all text-xs text-neutral-500">
                          {application.package_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${categoryStyle.className}`}
                      >
                        <CategoryIcon size={13} />
                        {application.category || "Uncategorized"}
                      </span>

                      <span className="text-xs text-neutral-500">
                        {formatDate(application.created_at)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(application)
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-xs font-medium text-neutral-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(application)
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-xs font-medium text-neutral-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TABLE FOOTER */}
        {!loading && filteredApplications.length > 0 && (
          <div className="border-t border-neutral-800 bg-neutral-950/40 px-5 py-4 sm:px-6">
            <p className="text-xs text-neutral-500">
              Showing{" "}
              <span className="font-semibold text-neutral-300">
                {filteredApplications.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-neutral-300">
                {applications.length}
              </span>{" "}
              registered applications
            </p>
          </div>
        )}
      </section>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black/50">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <AppWindow size={14} />
                  {editingApplication
                    ? "Edit Application"
                    : "New Application"}
                </div>

                <h2 className="text-xl font-bold text-white">
                  {editingApplication
                    ? "Update Application"
                    : "Register Application"}
                </h2>

                <p className="mt-2 text-sm leading-5 text-neutral-500">
                  Add Android application details for classroom
                  monitoring and restriction management.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5 px-6 py-6">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="app_name"
                    className="mb-2 block text-sm font-medium text-neutral-300"
                  >
                    Application Name
                  </label>

                  <input
                    id="app_name"
                    name="app_name"
                    type="text"
                    placeholder="Example: Facebook"
                    value={form.app_name}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-600 focus:ring-2 focus:ring-white/5"
                  />
                </div>

                <div>
                  <label
                    htmlFor="package_name"
                    className="mb-2 block text-sm font-medium text-neutral-300"
                  >
                    Android Package Name
                  </label>

                  <input
                    id="package_name"
                    name="package_name"
                    type="text"
                    placeholder="Example: com.facebook.katana"
                    value={form.package_name}
                    onChange={handleInputChange}
                    required
                    className="h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 font-mono text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-600 focus:ring-2 focus:ring-white/5"
                  />

                  <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-neutral-500">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                    The package name must match the actual Android
                    package identifier.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-medium text-neutral-300"
                  >
                    Application Category
                  </label>

                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleInputChange}
                      required
                      className="h-12 w-full appearance-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 pr-10 text-sm text-white outline-none transition focus:border-neutral-600 focus:ring-2 focus:ring-white/5"
                    >
                      {COMMON_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
                    />
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 bg-neutral-900/40 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingApplication ? (
                    <>
                      <Pencil size={17} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Add Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-neutral-950 shadow-2xl shadow-black/50">
            <div className="px-6 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
                <Trash2 size={23} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-white">
                Delete Application?
              </h2>

              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-white">
                  {deleteTarget.app_name}
                </span>
                ?
              </p>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-3 text-xs leading-5 text-orange-300">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />

                <span>
                  If this application is already referenced by
                  monitoring or violation records, Supabase may
                  prevent deletion.
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 bg-neutral-900/40 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}