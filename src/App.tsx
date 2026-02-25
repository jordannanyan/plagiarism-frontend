import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import RedirectByRole from "./pages/RedirectByRole";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import AdminLayout from "./layouts/AdminLayout";
import DosenLayout from "./layouts/DosenLayout";
import MahasiswaLayout from "./layouts/MahasiswaLayout";

import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminCorpusPage from "./pages/admin/AdminCorpusPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPoliciesPage from "./pages/admin/AdminPoliciesPage";
import AdminParamsPage from "./pages/admin/AdminParamsPage";

import DosenHomePage from "./pages/dosen/DosenHomePage";
import DosenVerificationPage from "./pages/dosen/DosenVerifikasiPage";
import DosenDocumentsPage from "./pages/dosen/DosenDocumentsPage";
import DosenChecksPage from "./pages/dosen/DosenChecksPage";

import MahasiswaDashboard from "./pages/mahasiswa/MahasiswaHomePage";
import MahasiswaDocumentsPage from "./pages/mahasiswa/MahasiswaDocumentsPage";
import MahasiswaDocumentDetailPage from "./pages/mahasiswa/MahasiswaDocumentDetailPage";
import MahasiswaChecksPage from "./pages/mahasiswa/MahasiswaCheckPage";
import MahasiswaCheckCreatePage from "./pages/mahasiswa/MahasiswaCheckCreatePage";
import MahasiswaCheckDetailPage from "./pages/mahasiswa/MahasiswaCheckDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RedirectByRole />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["admin"]}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route path="corpus" element={<AdminCorpusPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="policies" element={<AdminPoliciesPage />} />
          <Route path="params" element={<AdminParamsPage />} />
        </Route>

        {/* DOSEN */}
        <Route
          path="/dosen"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["dosen"]}>
                <DosenLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<DosenHomePage />} />
          <Route path="verifikasi" element={<DosenVerificationPage />} />
          <Route path="/dosen/documents" element={<DosenDocumentsPage />} />
          <Route path="/dosen/checks" element={<DosenChecksPage />} />
        </Route>

        {/* MAHASISWA */}
        <Route
          path="/mahasiswa"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["mahasiswa"]}>
                <MahasiswaLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<MahasiswaDashboard />} />

          <Route path="documents" element={<MahasiswaDocumentsPage />} />
          <Route path="documents/:id" element={<MahasiswaDocumentDetailPage />} />

          <Route path="checks" element={<MahasiswaChecksPage />} />
          <Route path="checks/new" element={<MahasiswaCheckCreatePage />} />
          <Route path="checks/:id" element={<MahasiswaCheckDetailPage />} />

        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}