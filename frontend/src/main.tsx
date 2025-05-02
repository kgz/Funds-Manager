import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Provider } from 'react-redux'
import {store} from "./store/store"
import { Template } from './pages/template'
import App from './App'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		    <Provider store={store}>

		{/* <BrowserRouter basename=''>
			<Routes>
				<Route path="/" element={<Template />} />

			</Routes>

</BrowserRouter> */}

			<App />
</Provider>
	</StrictMode>,
)
