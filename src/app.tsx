import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'

import { Provider } from 'react-redux'
import store from './@store/store'
import 'semantic-ui-css/semantic.min.css'
import styles from './@scss/template.module.css'
import Template from './pages/template'

const App = () => {
	return (
		<Provider store={store}>
			<BrowserRouter basename="chaos">
				<Toaster position="top-center" reverseOrder={false} />
				<div className={styles.container}>
					{/* <Migrations />
				<Login /> */}
					<Template />
				</div>
			</BrowserRouter>
		</Provider>
	)
}

export default App
