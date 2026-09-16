import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (error) {
        console.error("Profile loading error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        Loading ARMS...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">
              ARMS
            </h1>

            <p className="text-sm text-neutral-400">
              Application Real-Time Monitoring System
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-8">
          <p className="text-sm text-neutral-500">
            Santiago National High School
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            Welcome, {profile?.full_name || "User"}
          </h2>

          <p className="mt-2 text-neutral-400">
            Role:{" "}
            <span className="text-white font-medium">
              {profile?.role}
            </span>
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Classes"
            value="0"
            description="Active classes"
          />

          <DashboardCard
            title="Students"
            value="0"
            description="Registered students"
          />

          <DashboardCard
            title="Monitoring"
            value="Inactive"
            description="Current session"
          />

          <DashboardCard
            title="Violations"
            value="0"
            description="Today's violations"
          />
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm text-neutral-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-sm text-neutral-400">
        {description}
      </p>
    </div>
  );
}