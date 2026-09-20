import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  gradeLevel: "11",
  strand: "STEM",
  section: "",
  classId: "",
  temporaryPassword: "",
};

function validateForm(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.email.trim()) errors.email = "Email address is required.";
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.gradeLevel.trim()) errors.gradeLevel = "Grade level is required.";
  if (!form.strand.trim()) errors.strand = "Strand is required.";
  if (!form.section.trim()) errors.section = "Section is required.";
  if (form.temporaryPassword.length < 8) errors.temporaryPassword = "Use at least 8 characters.";
  return errors;
}

export default function Students() {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  async function fetchStudents() {
    try {
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, email, grade_level, strand, section, status")
        .eq("role", "student")
        .order("full_name", { ascending: true });
      if (fetchError) throw fetchError;
      setStudents(data || []);
    } catch (fetchError) {
      console.error("ARMS students error:", fetchError);
      setError(fetchError.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    try {
      setLoadingClasses(true);
      let query = supabase
        .from("classes")
        .select("id, class_name, grade_level, strand, section, status, teacher_id")
        .eq("status", "active")
        .order("class_name", { ascending: true });
      if (profile?.role === "teacher" && profile?.id) query = query.eq("teacher_id", profile.id);
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setClasses(data || []);
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load classes.");
    } finally {
      setLoadingClasses(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = student.full_name?.toLowerCase().includes(search) || student.email?.toLowerCase().includes(search) || student.section?.toLowerCase().includes(search);
    return matchesSearch && (statusFilter === "all" || student.status === statusFilter);
  }), [students, searchTerm, statusFilter]);

  const activeStudents = students.filter((student) => student.status === "active").length;
  const inactiveStudents = students.length - activeStudents;

  function openModal() {
    setError("");
    setSuccess("");
    setShowModal(true);
    fetchClasses();
  }

  async function handleStudentCreated() {
    setShowModal(false);
    setSuccess("Student account created successfully.");
    await fetchStudents();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader title="Students" description="Manage registered Grade 11 STEM students and their devices." />
        <button type="button" onClick={openModal} className="arms-button arms-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
          <UserPlus size={17} /> Add Student
        </button>
      </div>

      {success && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={18} />{success}<button type="button" onClick={() => setSuccess("")} className="ml-auto" aria-label="Dismiss success message"><X size={16} /></button></div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total Students" value={students.length} description="Registered student accounts" />
        <SummaryCard label="Active Students" value={activeStudents} description="Currently active accounts" tone="success" />
        <SummaryCard label="Inactive Students" value={inactiveStudents} description="Inactive or unavailable accounts" tone="warning" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-semibold text-white">Registered Students</h2><p className="mt-1 text-sm text-gray-500">View student information registered in the ARMS database.</p></div>
          <button type="button" onClick={fetchStudents} disabled={loading} className="arms-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search student name, email, or section..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="input pl-10" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input md:w-48"><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>

        {error && !showModal && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? <div className="py-16 text-center text-sm text-gray-500">Loading students...</div> : filteredStudents.length === 0 ? <div className="py-16 text-center"><div className="text-4xl">👥</div><h3 className="mt-4 text-lg font-semibold text-white">No students found</h3><p className="mt-2 text-sm text-gray-500">No student records match your search or filter.</p></div> : (
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500"><th className="px-4 py-4">Student</th><th className="px-4 py-4">Email</th><th className="px-4 py-4">Grade & Strand</th><th className="px-4 py-4">Section</th><th className="px-4 py-4">Status</th></tr></thead><tbody>{filteredStudents.map((student) => <tr key={student.id} className="border-b border-white/5 transition hover:bg-white/[0.03]"><td className="px-4 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10 font-semibold text-yellow-400">{student.full_name?.charAt(0)?.toUpperCase() || "S"}</div><div><p className="font-semibold text-white">{student.full_name || "Unnamed Student"}</p><p className="text-xs text-gray-500">Student Account</p></div></div></td><td className="px-4 py-5 text-sm text-gray-400">{student.email || "—"}</td><td className="px-4 py-5 text-sm text-gray-300">Grade {student.grade_level || "—"} {student.strand || ""}</td><td className="px-4 py-5 text-sm text-gray-300">{student.section || "—"}</td><td className="px-4 py-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${student.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>{student.status || "Unknown"}</span></td></tr>)}</tbody></table></div>
        )}
      </div>

      {showModal && <AddStudentModal classes={classes} loadingClasses={loadingClasses} onClose={() => setShowModal(false)} onCreated={handleStudentCreated} />}
    </div>
  );
}

function SummaryCard({ label, value, description, tone = "default" }) {
  const valueClass = tone === "success" ? "text-emerald-400" : tone === "warning" ? "text-orange-400" : "text-white";
  return <div className="rounded-2xl border border-white/10 bg-[#151515] p-5"><p className="text-sm text-gray-400">{label}</p><h2 className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</h2><p className="mt-1 text-xs text-gray-500">{description}</p></div>;
}

function AddStudentModal({ classes, loadingClasses, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      const { data: functionData, error: functionError } = await supabase.functions.invoke("create-student", {
        body: {
          first_name: form.firstName.trim(),
          middle_name: form.middleName.trim() || null,
          last_name: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          grade_level: form.gradeLevel.trim(),
          strand: form.strand.trim(),
          section: form.section.trim(),
          class_id: form.classId || null,
          temporary_password: form.temporaryPassword,
        },
      });

      if (functionError) {
        const response = functionError.context;
        const responseDetails = {
          message: functionError.message || "Unable to create student account.",
          status: response?.status || null,
          context: response instanceof Response ? {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
          } : response || null,
          responseData: functionData || null,
          body: null,
        };

        console.error("Create student Edge Function error:", functionError);
        console.error("Create student Edge Function details:", responseDetails);

        if (response instanceof Response) {
          try {
            responseDetails.body = await response.clone().json();
          } catch (parseError) {
            console.error("Could not parse Edge Function error response as JSON:", parseError);

            try {
              responseDetails.body = await response.clone().text();
            } catch (textError) {
              console.error("Could not read Edge Function error response body:", textError);
              responseDetails.body = "Unable to read response body.";
            }
          }
        }

        console.error("Edge Function response body:", responseDetails.body);
        throw new Error(JSON.stringify(responseDetails, null, 2));
      }

      await onCreated();
    } catch (createError) {
      setSubmitError(createError.message || "Unable to create student account.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#263746]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-student-title"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCEAF5] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 id="add-student-title" className="text-xl font-bold text-[#263746]">Add New Student</h2><p className="mt-1 text-sm text-[#465B72]">Create a student account with a temporary password.</p></div><button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-2 text-[#788D99] hover:bg-[#DCEAF5]" aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={handleSubmit} className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Field label="First Name" name="firstName" value={form.firstName} onChange={updateField} error={errors.firstName} required /><Field label="Middle Name" name="middleName" value={form.middleName} onChange={updateField} /><Field label="Last Name" name="lastName" value={form.lastName} onChange={updateField} error={errors.lastName} required /></div><Field label="Email Address" type="email" name="email" value={form.email} onChange={updateField} error={errors.email} required /><div className="grid gap-4 sm:grid-cols-3"><Field label="Grade Level" name="gradeLevel" value={form.gradeLevel} onChange={updateField} error={errors.gradeLevel} required /><Field label="Strand" name="strand" value={form.strand} onChange={updateField} error={errors.strand} required /><Field label="Section" name="section" value={form.section} onChange={updateField} error={errors.section} required /></div><div><label className="mb-2 block text-sm font-medium text-[#263746]">Class <span className="font-normal text-[#788D99]">(optional)</span></label><select name="classId" value={form.classId} onChange={updateField} className="input" disabled={loadingClasses}><option value="">Do not enroll yet</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name} · Grade {item.grade_level} {item.section ? `· ${item.section}` : ""}</option>)}</select></div><Field label="Temporary Password" type="password" name="temporaryPassword" value={form.temporaryPassword} onChange={updateField} error={errors.temporaryPassword} hint="The student should change this password after signing in." required />{submitError && <div role="alert" className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#F1C3C1] bg-[#FDECEC] px-4 py-3 font-mono text-xs text-[#B33B38]">{submitError}</div>}<div className="flex flex-col-reverse gap-3 border-t border-[#DCEAF5] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={submitting} className="arms-button rounded-xl px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="submit" disabled={submitting} className="arms-button arms-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">{submitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Plus size={16} /> Create Student</>}</button></div></form></div></div>;
}

function Field({ label, name, value, onChange, type = "text", error, hint, required = false }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-medium text-[#263746]">{label} {required && <span className="text-[#D9534F]">*</span>}</label><input id={name} name={name} type={type} value={value} onChange={onChange} className={`input ${error ? "border-[#D9534F] ring-2 ring-[#FDECEC]" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} />{error && <p id={`${name}-error`} className="mt-1 text-xs text-[#B33B38]">{error}</p>}{hint && !error && <p id={`${name}-hint`} className="mt-1 text-xs text-[#788D99]">{hint}</p>}</div>;
}
