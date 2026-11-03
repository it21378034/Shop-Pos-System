import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />
      <div className="d-flex flex-1 flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-3 p-md-4 overflow-auto" style={{ backgroundColor: '#f8fafc' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
