import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { CarriersPage } from "@/features/admin/CarriersPage";
import { DashboardPage } from "@/features/admin/DashboardPage";
import { SecurityPage } from "@/features/admin/SecurityPage";
import { UsersPage } from "@/features/admin/UsersPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { KanbanPage } from "@/features/crm/KanbanPage";
import { LeadFormPage } from "@/features/crm/LeadFormPage";
import { LauncherPage } from "@/features/launcher/LauncherPage";
import { ShipmentFormPage } from "@/features/shipments/ShipmentFormPage";
import { ShipmentsPage } from "@/features/shipments/ShipmentsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <LauncherPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm/leads/:id"
        element={
          <ProtectedRoute>
            <LeadFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipments"
        element={
          <ProtectedRoute>
            <ShipmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipments/:id"
        element={
          <ProtectedRoute>
            <ShipmentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="carriers" element={<CarriersPage />} />
        <Route path="security" element={<SecurityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
