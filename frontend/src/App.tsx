import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { CredentialTemplatesPage } from './pages/CredentialTemplatesPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { IssuersPage } from './pages/IssuersPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { TestSuitePage } from './pages/TestSuitePage'
import { RequireAuth } from './routes/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="issuers" element={<IssuersPage />} />
        <Route path="credential-templates" element={<CredentialTemplatesPage />} />
        <Route path="credentials" element={<CredentialsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="test-suite" element={<TestSuitePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
