import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { NavLink } from "react-router-dom";
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
			<Route path="/breakdown" element={<BreakdownPage />} />
			<Route path="/planned" element={<PlannedSpendingPage />} />
			<Route path="/predictions" element={<PredictionsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
