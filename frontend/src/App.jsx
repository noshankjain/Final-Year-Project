import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Navbar from './components/shared/Navbar';
import Sidebar from './components/shared/Sidebar';
import PageTransition from './components/shared/PageTransition';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CasesListPage from './pages/CasesListPage';
import NewCasePage from './pages/NewCasePage';
import InferenceResultPage from './pages/InferenceResultPage';

const Layout = ({ children }) => (
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

/**
 * AnimatedRoutes — must be a child of BrowserRouter so it can call useLocation.
 * AnimatePresence key = location.pathname so React unmounts/remounts on route change.
 * mode="wait" ensures exit animation completes before the next page enters.
 */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={
          <PageTransition><LoginPage /></PageTransition>
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <PageTransition><DashboardPage /></PageTransition>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/cases" element={
          <ProtectedRoute>
            <Layout>
              <PageTransition><CasesListPage /></PageTransition>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/cases/new" element={
          <ProtectedRoute>
            <Layout>
              <PageTransition><NewCasePage /></PageTransition>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/cases/:id/results" element={
          <ProtectedRoute>
            <Layout>
              <PageTransition><InferenceResultPage /></PageTransition>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
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
            success: { iconTheme: { primary: '#7D4047', secondary: '#F1ECE6' } },
            error:   { iconTheme: { primary: '#C03040', secondary: '#F1ECE6' } },
          }}
        />
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
