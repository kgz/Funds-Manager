import React, { useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../@store/store'
import { Container, Grid } from 'semantic-ui-react'
import { Alert, Box } from '@mui/material'
import { ConfigProvider, Divider, Flex, Layout, Select, theme } from 'antd'

import style_sidebar from '../@scss/sidebar.module.scss'
import Login from './login'
import Migrations from './admin/migrations'
import {
	DashboardOutlined,
	DatabaseOutlined,
	LogoutOutlined,
	MergeFilled,
	SecurityScanFilled,
	SecurityScanOutlined,
	UserOutlined,
	UserSwitchOutlined,
} from '@ant-design/icons'
import Users from './admin/users'
import User from './admin/user'
import RightsTable from './admin/rights'
import Right from './admin/right'
import { getCookie } from '../@middleware/cookie'
import Calender from './admin/calender/calandar'
import ConditionalLink from '../components/link'
import { Rights } from '../@types/admin/rights'
import ChannelData from './admin/channel_data'
import ResetPassword from './user/reset_password'
import { DateTime } from 'luxon'
import APIDocs from './admin/api'
import { logoutUser } from '../@store/thunks/user/logoutUser'
const { defaultAlgorithm, darkAlgorithm } = theme

const { Header, Footer, Sider, Content } = Layout

function Template() {
	const { loginLoading, loginError, current, rights } = useAppSelector(state => state.userSliceSlice)
	const { error } = useAppSelector(state => state.errorReducer)
	const dispatch = useAppDispatch()

	const paths = useLocation().pathname.split('/')
	useEffect(() => {
		if (!getCookie('jwt')) {
			void dispatch(logoutUser())
		}
	}, [dispatch, paths])

	if (paths[1] === 'user' && paths[3] === 'reset-password') {
		return <ResetPassword />
	}
	if (paths[1] === 'admin' && paths[2] === 'docs') {
		return <APIDocs />
	}

	if (!current) {
		return <Login />
	}

	// useEffect(() => {
	// 	console.log({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
	// }, [])

	return (
		<ConfigProvider
			theme={{
				algorithm: 0 ? darkAlgorithm : defaultAlgorithm,
			}}
		>
			<Flex style={{ height: '100dvh' }}>
				<Layout>
					<Sider className={style_sidebar.main}>
						<div className={style_sidebar.logo}>Logo</div>
						<Divider style={{ marginBlock: 4 }} />
						<ConditionalLink to="/">
							<DashboardOutlined />
							Dashboard
						</ConditionalLink>
						<Divider style={{ marginBlock: 4 }} />
						<div className={style_sidebar.label}>Admin</div>
						<ConditionalLink to="/admin/migrations" rights={[Rights.MigrationManagement]}>
							<MergeFilled />
							Migrations
						</ConditionalLink>
						<ConditionalLink to="/admin/ChannelDataManagement" rights={[Rights.ChannelDataManagement]}>
							<DatabaseOutlined />
							Channel Data
						</ConditionalLink>

						<ConditionalLink to={'/admin/users'} rights={[Rights.UserManagement]}>
							{paths[1] === 'admin' && paths[2] === 'user' ? <UserSwitchOutlined /> : <UserOutlined />}
							Users
						</ConditionalLink>

						<ConditionalLink to={'/admin/rights'} rights={[Rights.RightManagement]}>
							{paths[1] === 'admin' && paths[2] === 'right' ? <SecurityScanOutlined /> : <SecurityScanFilled />}
							Rights
						</ConditionalLink>
						{/* 
						<ConditionalLink to={'/admin/rights'} rights={[Rights.RightManagement]}>
							{paths[1] === 'admin' && paths[2] === 'right' ? <SecurityScanOutlined /> : <SecurityScanFilled />}
							Rights
						</ConditionalLink> */}

						<Divider style={{ marginBlock: 4 }} />

						<ConditionalLink className={style_sidebar.link} to={'#'} onClick={() => void dispatch(logoutUser())}>
							<LogoutOutlined />
							Logout
						</ConditionalLink>
					</Sider>
					<Layout>
						<Header>
							<div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', alignItems: 'center' }}>
								<div>{current.username}</div>
								<div>
									{/* /timezone select */}
									<Select
										style={{ width: 200 }}
										// defaultValue={}
										value={DateTime.local().zoneName}
										showSearch
										notFoundContent={'Coming Soon'}
										// options={Intl.supportedValuesOf('timeZone').map(o => {
										// 	return { label: o, value: o }
										// })}
										// onChange={v => {
										// 	DateTime.local().setZone(v)
										// }}
									></Select>
								</div>
							</div>
						</Header>
						<Content>
							{error && <Alert color="error">{error}</Alert>}
							<Routes>
								<Route path="/" element={<Calender />} />
								<Route path="/login" element={<Login />} />
								<Route path="/admin/users" element={<Users />} />
								<Route path="/admin/user/:id" element={<User />} />
								<Route path="/admin/user/:id/:sub_path" element={<User />} />
								<Route path="/admin/rights" element={<RightsTable />} />
								<Route path="/admin/right/:right" element={<Right />} />
								<Route path="/admin/migrations" element={<Migrations />} />
								<Route path="/admin/ChannelDataManagement" element={<ChannelData />} />
							</Routes>
							<Footer>Footer</Footer>
						</Content>
					</Layout>
				</Layout>
			</Flex>
		</ConfigProvider>
	)
}

export default Template
