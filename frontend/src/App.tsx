import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { Dashboard } from "./components/dashboard";
import { Settings } from "./components/settings";
import "./App.css"
import { Statements } from "./pages/statements";
import { CategoriesPage } from "./pages/categories";
import { AccountsPage } from "./pages/accounts";
import TransactionsPage from "./pages/transactions";
import RecurringExpensesPage from "./pages/recurring";
import BreakdownPage from "./pages/breakdown";
import PlannedSpendingPage from "./pages/planned";
import PredictionsPage from "./pages/predictions";
import LiabilitiesPage from "./pages/liabilities";
import AssetsPage from "./pages/assets";
import { IncomePage } from "./pages/income";
import { ServiceabilityPage } from "./pages/serviceability";
import { ReportSnapshotsPage } from "./pages/report-snapshots/index";
import { ReportSnapshotDetailPage } from "./pages/report-snapshots/detail";
import { BrokerReportPage } from "./pages/broker-report/index";
import { PublicBrokerReportPage } from "./pages/broker-report/public";
import { LenderExpensesLayout } from "./pages/lender-expenses/layout";
import { LenderExpenseMappingsPage } from "./pages/lender-expenses/mappings-page";
import { LenderExpensesSummaryPage } from "./pages/lender-expenses/summary-page";

function AppLayout({
	setTheme,
	theme,
}: {
	setTheme: Dispatch<SetStateAction<string>>;
	theme: string;
}) {
  return (
    <div className={`
		min-h-screen  transition-all
			bg-black/70
		`}>
      <Sidebar setTheme={setTheme} theme={theme} />
      <div className="ml-16 lg:ml-64">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/recurring" element={<RecurringExpensesPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/lender-expenses" element={<LenderExpensesLayout />}>
            <Route index element={<LenderExpensesSummaryPage />} />
            <Route path="mappings" element={<LenderExpenseMappingsPage />} />
          </Route>
          <Route path="/serviceability" element={<ServiceabilityPage />} />
          <Route path="/report-snapshots" element={<ReportSnapshotsPage />} />
          <Route path="/report-snapshots/:id/report" element={<BrokerReportPage />} />
          <Route path="/report-snapshots/:id" element={<ReportSnapshotDetailPage />} />
          <Route path="/breakdown" element={<BreakdownPage />} />
          <Route path="/planned" element={<PlannedSpendingPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/liabilities" element={<LiabilitiesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </div>
    </div>
  );
}

const App = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Update the theme in localStorage and apply the theme class
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <Router
      basename={
        import.meta.env.BASE_URL.replace(/\/$/, '') === ''
          ? undefined
          : import.meta.env.BASE_URL.replace(/\/$/, '')
      }
    >
      <Routes>
        <Route path="/r/:token" element={<PublicBrokerReportPage />} />
        <Route path="*" element={<AppLayout setTheme={setTheme} theme={theme} />} />
      </Routes>
    </Router>
  );
};

export default App;
