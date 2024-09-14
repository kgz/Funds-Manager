import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'

import { Provider } from 'react-redux'
import store from './@store/store'
import { Helmet } from 'react-helmet'
import Migrations from './pages/admin/migrations'
import 'semantic-ui-css/semantic.min.css'
import Login from './pages/login'
import styles from './@scss/template.module.scss'
import theme from './@scss/_root.module.scss'
import Template from './pages/template'
// create conetex for types const [isLoggedin, setIsLoggedin] = useState(false);

const DARK = false

const App = () => {
	return (
		<Provider store={store}>
			<BrowserRouter basename="chaos">
				<Toaster position="top-center" reverseOrder={false} />
				<div className={styles.container + ' ' + (DARK ? theme.dark : '')}>
					{/* <Migrations />
				<Login /> */}
					<Template />
				</div>
			</BrowserRouter>
		</Provider>
	)
}

export default App
