import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';

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
      {/* Sits on the page background (240px wide, no border) */}
      <Sidebar isOpen={mobileSidebarOpen} onCloseMobile={closeMobileSidebar} />

      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 45, background: 'rgba(20, 20, 30, 0.4)' }}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Large rounded white panel (28px radius) with small margin around it on desktop */}
      <div className="app-main-panel app-main-wrapper">
        <Topbar onToggleMobileSidebar={toggleMobileSidebar} />
        <main className="app-content-canvas app-content" id="main-content" tabIndex="-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar for <768px screens */}
      <MobileBottomNav />
    </div>
  );
}

export default AppShell;
