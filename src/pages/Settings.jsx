import { useEffect, useState } from "react";
import {
  User,
  School,
  Bell,
  ShieldCheck,
  Database,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  BadgeCheck,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

// Official school information
const SCHOOL_INFORMATION = {
  name: "Santiago National High School",
  schoolCode: "304698",
  division: "Schools Division of Agusan del Norte",
  region: "Caraga — Region XIII",
  location: "Santiago, Agusan del Norte",
};

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoMonitoringEnabled, setAutoMonitoringEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the currently authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("No authenticated user found.");
      }

      setAuthUser(user);

      // Get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
            id,
            school_id,
            full_name,
            email,
            role,
            grade_level,
            strand,
            section,
            status
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);
    } catch (err) {
      console.error("ARMS Settings loading error:", err);
      setError(err.message || "Unable to load account information.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Preferences are currently stored in local React state.
    // Supabase preference storage can be added later.
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const formatRole = (role) => {
    if (!role) return "Not specified";

    return role
      .toString()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatStatus = (status) => {
    if (!status) return "Not specified";

    return status
      .toString()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Settings"
          description="Configure ARMS system and account preferences."
        />

        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-[#151515]">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="animate-spin" size={20} />
            Loading account settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Configure ARMS system and account preferences."
      />

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <AlertCircle
            className="mt-0.5 shrink-0 text-red-400"
            size={20}
          />

          <div>
            <h3 className="font-medium text-red-300">
              Unable to load account information
            </h3>

            <p className="mt-1 text-sm leading-6 text-red-200/70">
              {error}
            </p>

            <button
              type="button"
              onClick={loadSettingsData}
              className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-400/10"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Account Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <User size={19} className="text-gray-300" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Account Information
            </h2>

            <p className="text-sm text-gray-500">
              Information retrieved from Supabase Authentication and Profiles.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Full Name
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <User size={16} className="text-gray-500" />
                {profile?.full_name || "Not specified"}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Email Address
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <Mail size={16} className="text-gray-500" />
                {profile?.email || authUser?.email || "Not specified"}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Account Role
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <BadgeCheck size={16} className="text-gray-500" />
                {formatRole(profile?.role)}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Account Status
              </label>

              <div
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                  profile?.status === "active"
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                    : "border-yellow-500/20 bg-yellow-500/5 text-yellow-400"
                }`}
              >
                <CheckCircle2 size={16} />
                {formatStatus(profile?.status)}
              </div>
            </div>
          </div>

          {/* User ID */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <label className="mb-2 block text-sm text-gray-400">
              Authentication User ID
            </label>

            <div className="break-all rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-gray-500">
              {authUser?.id || "Unavailable"}
            </div>
          </div>
        </div>
      </section>

      {/* School Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <School size={19} className="text-gray-300" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              School Information
            </h2>

            <p className="text-sm text-gray-500">
              Official school and academic information associated with ARMS.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* School Name */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                School Name
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                {SCHOOL_INFORMATION.name}
              </div>
            </div>

            {/* Official School Code */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                DepEd School ID
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white">
                {SCHOOL_INFORMATION.schoolCode}
              </div>
            </div>

            {/* Division */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Division
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white">
                {SCHOOL_INFORMATION.division}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Region
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                {SCHOOL_INFORMATION.region}
              </div>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-gray-400">
                Location
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                {SCHOOL_INFORMATION.location}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monitoring Preferences */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Bell size={19} className="text-gray-300" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Monitoring Preferences
            </h2>

            <p className="text-sm text-gray-500">
              Configure monitoring-related interface preferences.
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#151515]">
          {/* Automatic Monitoring */}
          <div className="flex items-center justify-between gap-6 p-6">
            <div className="flex items-start gap-4">
              <Clock className="mt-1 text-gray-400" size={19} />

              <div>
                <h3 className="font-medium text-white">
                  Automatic Monitoring Sessions
                </h3>

                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  Automatically activate and end monitoring sessions based on
                  the class schedule.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setAutoMonitoringEnabled(!autoMonitoringEnabled)
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                autoMonitoringEnabled ? "bg-emerald-500" : "bg-gray-700"
              }`}
              aria-label="Toggle automatic monitoring"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  autoMonitoringEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between gap-6 p-6">
            <div className="flex items-start gap-4">
              <Bell className="mt-1 text-gray-400" size={19} />

              <div>
                <h3 className="font-medium text-white">
                  Monitoring Notifications
                </h3>

                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  Receive notifications when monitoring events or violations
                  are recorded.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setNotificationsEnabled(!notificationsEnabled)
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                notificationsEnabled ? "bg-emerald-500" : "bg-gray-700"
              }`}
              aria-label="Toggle monitoring notifications"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  notificationsEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* System Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Database size={19} className="text-gray-300" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              System Information
            </h2>

            <p className="text-sm text-gray-500">
              Technical information about the ARMS platform.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151515] p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Database Provider */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Database Provider
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                Supabase
              </div>
            </div>

            {/* System Timezone */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                System Timezone
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                Asia/Manila — Philippine Time
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Platform
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                React + Vite
              </div>
            </div>

            {/* System Version */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                System Version
              </label>

              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                ARMS v1.0.0
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Notice */}
      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 text-blue-400"
            size={20}
          />

          <div>
            <h3 className="font-medium text-blue-300">
              Security and Privacy
            </h3>

            <p className="mt-1 text-sm leading-6 text-blue-200/70">
              ARMS should only collect monitoring data authorized by the
              school. Student information and application activity must be
              protected through proper authentication, database permissions,
              and privacy policies.
            </p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 border-t border-white/10 pt-6">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 size={16} />
            Preferences saved locally
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
        >
          <Save size={17} />
          Save Preferences
        </button>
      </div>
    </div>
  );
}