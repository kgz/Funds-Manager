import ReactDOM from 'react-dom/client'
import 'semantic-ui-css/semantic.min.css'

import App from './app'
import React from 'react'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
