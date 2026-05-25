import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'

import { applyBackgroundTheme, loadBackgroundTheme } from './theme/backgroundTheme'
import { bootTheme } from './theme/userTheme'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/RequireAuth'
import { PageLoadOverlay } from './components/PageLoadOverlay'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EntryPage = lazy(() => import('./pages/EntryPage').then((m) => ({ default: m.EntryPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const StatusListPage = lazy(() => import('./pages/StatusListPage').then((m) => ({ default: m.StatusListPage })))
const ViewEntryPage = lazy(() => import('./pages/ViewEntryPage').then((m) => ({ default: m.ViewEntryPage })))
const EditEntryPage = lazy(() => import('./pages/EditEntryPage').then((m) => ({ default: m.EditEntryPage })))

applyBackgroundTheme(loadBackgroundTheme())
bootTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<PageLoadOverlay show label="Loading page…" />}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/entry" element={<EntryPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/ongoing" element={<StatusListPage status="Ongoing" />} />
            <Route path="/resolved" element={<StatusListPage status="Resolved" />} />
            <Route path="/social-media" element={<StatusListPage status="Social Media" />} />
            <Route path="/on-hold" element={<Navigate to="/ongoing" replace />} />

            <Route element={<RequireRole allow={['admin']} />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            <Route path="/entries/:id" element={<ViewEntryPage />} />
            <Route path="/entries/:id/edit" element={<EditEntryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>,
)
