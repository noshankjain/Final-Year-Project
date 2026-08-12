import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Navbar from './components/shared/Navbar';
import Sidebar from './components/shared/Sidebar';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CasesListPage from './pages/CasesListPage';
import NewCasePage from './pages/NewCasePage';
import InferenceResultPage from './pages/InferenceResultPage';

const Layout = ({ children }) => {
  return (
    // min-h-[100dvh] instead of h-screen — fixes iOS Safari address bar layout jump
    <div className="flex min-h-[100dvh] overflow-hidden" style={{ background: 'var(--surface-base)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface-overlay)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border-hi)',
              borderRadius: 'var(--radius-md)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00d4b4', secondary: '#041210' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/cases"     element={<ProtectedRoute><Layout><CasesListPage /></Layout></ProtectedRoute>} />
          <Route path="/cases/new" element={<ProtectedRoute><Layout><NewCasePage /></Layout></ProtectedRoute>} />
          <Route path="/cases/:id/results" element={<ProtectedRoute><Layout><InferenceResultPage /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
