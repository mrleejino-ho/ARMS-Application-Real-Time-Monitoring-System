import {
  Menu,
  Bell,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

export default function Topbar({
  setSidebarCollapsed,
  setMobileOpen,
}) {
  const { profile } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  async function loadNotifications() {
    setNotificationsLoading(true);
    setNotificationsError("");

    const { data, error } = await supabase
      .from("violation_details")
      .select("id, student_name, app_name, detected_at, action_taken")
      .order("detected_at", { ascending: false })
      .limit(5);

    if (error) {
      setNotificationsError("Unable to load notifications.");
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }

    setNotificationsLoading(false);
  }

  function toggleNotifications() {
    const shouldOpen = !notificationsOpen;
    setNotificationsOpen(shouldOpen);

    if (shouldOpen) {
      loadNotifications();
    }
  }

  function formatNotificationTime(value) {
    if (!value) return "";

    return new Date(value).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

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
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-blue-50 hover:text-[#1976D2]"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell size={20} />

              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#173B57]">
                      Notifications
                    </h2>
                    <p className="text-xs text-slate-500">
                      Recent monitoring activity
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadNotifications}
                    className="text-xs font-medium text-[#1976D2] hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {notificationsLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <p className="px-4 py-8 text-center text-sm text-red-600">
                    {notificationsError}
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No new notifications.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-[#173B57]">
                          Monitoring violation detected
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {notification.student_name || "A student"} used {notification.app_name || "an application"}.
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatNotificationTime(notification.detected_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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