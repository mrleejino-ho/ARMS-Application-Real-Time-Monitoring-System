import {
  Users,
  GraduationCap,
  Radio,
  ShieldAlert,
  ArrowUpRight,
  Activity,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

const stats = [
  {
    title: "Active Classes",
    value: "0",
    description: "Currently active classes",
    icon: GraduationCap,
  },
  {
    title: "Students",
    value: "0",
    description: "Registered students",
    icon: Users,
  },
  {
    title: "Monitoring",
    value: "Inactive",
    description: "Current monitoring session",
    icon: Radio,
  },
  {
    title: "Today's Violations",
    value: "0",
    description: "Recorded today",
    icon: ShieldAlert,
  },
];

export default function Dashboard() {
  const { profile } = useAuth();

  const firstName =
    profile?.full_name?.split(" ")[0] || "Teacher";

  return (
    <div className="space-y-8">

      {/* Page heading */}
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

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-500" />

              <span className="text-sm font-medium">
                Monitoring inactive
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
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

              <p className="mt-1 text-3xl font-bold">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Main dashboard cards */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* Monitoring status */}
        <div className="xl:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
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
          </div>
        </div>

        {/* Quick actions */}
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

      {/* Recent activity */}
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

          <button
            type="button"
            className="text-sm text-neutral-400 hover:text-white"
          >
            View all
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-neutral-800 px-6 py-10 text-center">
          <p className="text-sm text-neutral-500">
            No monitoring events recorded yet.
          </p>
        </div>
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
    <a
      href={href}
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
    </a>
  );
}