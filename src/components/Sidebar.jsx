import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Radio,
  Smartphone,
  ShieldAlert,
  FileText,
  Settings,
  LogOut,
  X,
  MonitorCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Classes",
    path: "/classes",
    icon: GraduationCap,
  },
  {
    name: "Students",
    path: "/students",
    icon: Users,
  },
  {
    name: "Monitoring",
    path: "/monitoring",
    icon: Radio,
  },
  {
    name: "Applications",
    path: "/applications",
    icon: Smartphone,
  },
  {
    name: "Violations",
    path: "/violations",
    icon: ShieldAlert,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  setMobileOpen,
  onLogout,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col
          border-r border-neutral-800 bg-neutral-950
          transition-all duration-300 ease-in-out
          
          ${collapsed ? "lg:w-[76px]" : "lg:w-[250px]"}

          w-[250px]

          ${mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="flex h-[72px] items-center border-b border-neutral-800 px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black">
              <MonitorCheck size={21} strokeWidth={2.4} />
            </div>

            <div
              className={`
                overflow-hidden whitespace-nowrap
                transition-all duration-300
                ${collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"}
              `}
            >
              <p className="text-sm font-bold tracking-wide">
                ARMS
              </p>

              <p className="text-[11px] text-neutral-500">
                Teacher Console
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `
                    group flex items-center gap-3 rounded-xl px-3 py-3
                    text-sm font-medium transition-all duration-200

                    ${
                      isActive
                        ? "bg-white text-black shadow-lg"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                    }

                    ${collapsed ? "lg:justify-center" : ""}
                    `
                  }
                >
                  <Icon
                    size={19}
                    strokeWidth={2}
                    className="shrink-0"
                  />

                  <span
                    className={`
                      overflow-hidden whitespace-nowrap
                      transition-all duration-300
                      ${
                        collapsed
                          ? "lg:w-0 lg:opacity-0"
                          : "w-auto opacity-100"
                      }
                    `}
                  >
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-800 p-3">
          <button
            type="button"
            onClick={onLogout}
            className={`
              flex w-full items-center gap-3 rounded-xl px-3 py-3
              text-sm font-medium text-neutral-400
              transition hover:bg-red-950/40 hover:text-red-300
              ${collapsed ? "lg:justify-center" : ""}
            `}
          >
            <LogOut
              size={19}
              className="shrink-0"
            />

            <span
              className={`
                overflow-hidden whitespace-nowrap
                transition-all duration-300
                ${
                  collapsed
                    ? "lg:w-0 lg:opacity-0"
                    : "w-auto opacity-100"
                }
              `}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}