import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CopilotDrawer } from "../copilot/CopilotDrawer";

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <CopilotDrawer />
    </div>
  );
};
