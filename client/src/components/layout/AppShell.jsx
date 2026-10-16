import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={mobileSidebarOpen} onCloseMobile={closeMobileSidebar} />

      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 35, background: 'rgba(15, 23, 42, 0.4)' }}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        <Topbar onToggleMobileSidebar={toggleMobileSidebar} />
        <main className="app-content" id="main-content" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
