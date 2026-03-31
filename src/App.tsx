import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DeviceProvider } from "@/context/DeviceContext";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DataLogsPage from "@/pages/DataLogsPage";
import ControlPage from "@/pages/ControlPage";
import SettingsPage from "@/pages/SettingsPage";
import SystemDesignPage from "@/pages/SystemDesignPage";
import NotFound from "@/pages/NotFound";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/logs" element={<ProtectedRoute><DataLogsPage /></ProtectedRoute>} />
      <Route path="/control" element={<ProtectedRoute><ControlPage /></ProtectedRoute>} />
      <Route path="/design" element={<ProtectedRoute><SystemDesignPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <DeviceProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DeviceProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
