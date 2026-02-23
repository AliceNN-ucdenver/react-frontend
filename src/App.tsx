import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { NotFoundPage } from '@/components/NotFoundPage';
import { UnauthorizedPage } from '@/components/UnauthorizedPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { SearchPage } from '@/pages/SearchPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ReviewFormPage } from '@/pages/ReviewFormPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminMovieListPage } from '@/pages/admin/AdminMovieListPage';
import { AdminMovieFormPage } from '@/pages/admin/AdminMovieFormPage';
import { AdminActorListPage } from '@/pages/admin/AdminActorListPage';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<CatalogPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes — reviewer+ */}
        <Route
          path="/reviews/new"
          element={
            <ProtectedRoute requiredRole="reviewer">
              <ReviewFormPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes — admin only, wrapped in AdminDashboardPage layout */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        >
          <Route index element={<AdminMovieListPage />} />
          <Route path="movies" element={<AdminMovieListPage />} />
          <Route path="movies/new" element={<AdminMovieFormPage />} />
          <Route path="movies/:id/edit" element={<AdminMovieFormPage />} />
          <Route path="actors" element={<AdminActorListPage />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
