import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useAuth } from "../contexts/AuthContext";

export default function TeacherLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      <div
        className={`
          min-h-screen transition-all duration-300
          ${sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[250px]"}
        `}
      >
        <Topbar
          setSidebarCollapsed={setSidebarCollapsed}
          setMobileOpen={setMobileOpen}
        />

        <main className="min-h-[calc(100vh-72px)] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}