import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthModal } from './components/auth/AuthModal';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';

// Application Pages (Protected)
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Income } from './pages/Income';
import { Expenses } from './pages/Expenses';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Bills } from './pages/Bills';
import { FraudIntelligence } from './pages/FraudIntelligence';
import { SpendingForecast } from './pages/SpendingForecast';
import { SpendingSegmentation } from './pages/SpendingSegmentation';
import { StatementUpload } from './pages/StatementUpload';
import { GooglePayImport } from './pages/GooglePayImport';
import { ImportPreview } from './pages/ImportPreview';
import { DuplicateReview } from './pages/DuplicateReview';
import { ImportHistory } from './pages/ImportHistory';
import { CategoryCorrection } from './pages/CategoryCorrection';
import { BankConnection } from './pages/BankConnection';
import { ConsentManagement } from './pages/ConsentManagement';
import { Assistant } from './pages/Assistant';
import { Reports } from './pages/Reports';
import { UserProfile } from './pages/UserProfile';
import { Settings } from './pages/Settings';
import { HelpAbout } from './pages/HelpAbout';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthModal />

              <Routes>
                {/* 1. Public Marketing Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* 2, 3, 4. Public Authentication Pages */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Application Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* 5. Main Dashboard */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* 6. Transactions Page */}
                  <Route path="/transactions" element={<Transactions />} />

                  {/* 7. Income Page */}
                  <Route path="/income" element={<Income />} />

                  {/* 8. Expenses Page */}
                  <Route path="/expenses" element={<Expenses />} />

                  {/* 9. Budget Management */}
                  <Route path="/budgets" element={<Budgets />} />

                  {/* Additional Financial Tracking */}
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/bills" element={<Bills />} />

                  {/* 10. Analytics & Reports */}
                  <Route path="/reports" element={<Reports />} />

                  {/* 11. AI Fraud Detection */}
                  <Route path="/fraud" element={<FraudIntelligence />} />

                  {/* 12. Spending Forecast */}
                  <Route path="/forecast" element={<SpendingForecast />} />

                  {/* 13. Spending Segmentation */}
                  <Route path="/segmentation" element={<SpendingSegmentation />} />

                  {/* 14. Bank Connection (AA) */}
                  <Route path="/bank-connection" element={<BankConnection />} />

                  {/* 15. Google Pay Statement Import */}
                  <Route path="/import/gpay" element={<GooglePayImport />} />

                  {/* 16. Bank Statement Upload */}
                  <Route path="/import/statement" element={<StatementUpload />} />

                  {/* 17. Transaction Import Preview */}
                  <Route path="/import/preview/:id" element={<ImportPreview />} />

                  {/* 18. Duplicate Transaction Review */}
                  <Route path="/import/duplicates/:id" element={<DuplicateReview />} />

                  {/* 19. Category Correction */}
                  <Route path="/categories/correction" element={<CategoryCorrection />} />

                  {/* 20. Import History */}
                  <Route path="/import/history" element={<ImportHistory />} />

                  {/* 21. Connected Accounts and Consent Management */}
                  <Route path="/accounts/consent" element={<ConsentManagement />} />

                  {/* 22. User Profile */}
                  <Route path="/profile" element={<UserProfile />} />

                  {/* 23. Settings */}
                  <Route path="/settings" element={<Settings />} />

                  {/* 24. Help and About */}
                  <Route path="/help" element={<HelpAbout />} />

                  {/* AI Assistant */}
                  <Route path="/assistant" element={<Assistant />} />
                </Route>

                {/* Catch-all redirect to Landing or Dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
