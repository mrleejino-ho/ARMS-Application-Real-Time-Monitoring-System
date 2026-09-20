import {
  Menu,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Topbar({
  setSidebarCollapsed,
  setMobileOpen,
}) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              // Desktop collapse
              setSidebarCollapsed((value) => !value);

              // Mobile open
              setMobileOpen(true);
            }}
            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-blue-50 hover:text-[#1976D2]"
            aria-label="Toggle navigation"
          >
            <Menu size={21} />
          </button>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#173B57]">
              Santiago National High School
            </p>

            <p className="text-xs text-slate-500">
              Grade 11 STEM • ARMS
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification */}
          <button
            type="button"
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-blue-50 hover:text-[#1976D2]"
            aria-label="Notifications"
          >
            <Bell size={20} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#35B86B]" />
          </button>

          {/* User */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#173B57]">
                {profile?.full_name || "User"}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {profile?.role || "teacher"}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCEEFF] text-sm font-bold text-[#0D5EA8]">
              {(profile?.full_name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <ChevronDown
              size={16}
              className="hidden text-slate-400 sm:block"
            />
          </div>
        </div>
      </div>
    </header>
  );
}