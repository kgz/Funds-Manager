import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LoginPage from './pages/user/Login.tsx'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import RegisterPage from './pages/user/Register.tsx'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LoginPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				{/* Add more routes here as needed */}

			</Routes>

</BrowserRouter>
	</StrictMode>,
)
