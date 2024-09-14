import { KeyOutlined, SecurityScanOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Divider, Form, Input, Spin, Table, Tabs, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSelector } from '../../@store/store'
import UserRights from './userRights'
import axios from 'axios'
import type { TUser } from '../../@types/user'
import { Skeleton } from '@mui/material'
import toast from 'react-hot-toast'

const User = () => {
	const params = useParams()
	const { id, sub_path } = params as { id: string; sub_path: string }
	const [data, setData] = useState<[]>([])
	const navigate = useNavigate()
	const { current, rights } = useAppSelector(state => state.userSliceSlice)

	const [userLoading, setUserLoading] = useState(true)
	const [userData, setUserData] = useState<TUser | null>(null)

	const [resetLoading, setResetLoading] = useState(false)

	useEffect(() => {
		if (!rights.includes('UserManagement')) {
			void navigate('/')
		}
	}, [current, navigate, rights])

	useEffect(() => {
		axios
			.get<TUser>(`/chaos/api/admin/user/${id}`)
			.then(response => {
				console.log(response.data)
				setUserData(response.data)
				setUserLoading(false)
			})
			.catch(error => {
				setUserData(null)
				setUserLoading(false)
				console.error(error)
			})
	}, [id])

	useEffect(() => {
		console.log({ userData })
	}, [userData])

	return (
		<Card
			style={{
				margin: 16,
			}}
		>
			<Tabs defaultActiveKey={sub_path} onChange={active => navigate(`/admin/user/${id}/${active}`)}>
				<Tabs.TabPane
					tab={
						<>
							<UserOutlined style={{ marginRight: 3 }} />
							{userLoading ? <></> : userData?.email || 'User'}
							{/* {userData?.email || 'User'} */}
						</>
					}
					key="profile"
				>
					<div
						style={{
							display: 'flex',
						}}
					>
						<div
							style={{
								width: 350,
								padding: 24,
								paddingLeft: '0px',
								// backgroundColor: 'lightgray',
							}}
						>
							<Typography.Title level={4}>Overview</Typography.Title>
							<div
								style={{
									border: '1px solid #afafaf59',
									borderRadius: 4,
									padding: 10,
								}}
							>
								<Avatar size={64} alt="Test" src="../asdfasdf" />
								<br />
								<small>edit</small>
								<br />
								<br />
								<Typography.Text
									style={{
										fontSize: 12,
										color: 'gray',
									}}
								>
									Username
								</Typography.Text>
								<Input value={userData?.username} />
								<br />
								<br />
								<Typography.Text
									style={{
										fontSize: 12,
										color: 'gray',
									}}
								>
									Email
								</Typography.Text>
								<Input value={userData?.email} />
								<Divider plain>
									{' '}
									<Typography.Text
										style={{
											fontSize: 16,
											color: '#393939',
										}}
									>
										Quick Actions
									</Typography.Text>
								</Divider>
								<Button
									loading={resetLoading}
									type="primary"
									style={{ width: '100%' }}
									onClick={() => {
										setResetLoading(true)
										axios
											.post(`/chaos/api/admin/users/email_reset/${id}`)
											.then(response => {
												console.log(response.data)
												toast.success('Email Sent!')
											})
											.catch(error => {
												toast.error('Error sending email')
												console.error(error)
											})
											.finally(() => {
												setResetLoading(false)
											})
									}}
								>
									<KeyOutlined style={{ marginRight: 10 }} />
									Reset Password
								</Button>

								<Button type="primary" danger style={{ width: '100%', marginBlock: 5 }}>
									Disable User
								</Button>
							</div>
						</div>
						<div
							style={{
								flex: 1,
								// backgroundColor: 'lightblue',
							}}
						>
							<div
								style={{
									padding: 24,
									paddingLeft: '0px',
									// backgroundColor: 'lightgray',
								}}
							>
								<Typography.Title level={4}>User History</Typography.Title>
								<br />
								<Table
									dataSource={data}
									columns={[
										{
											title: 'Date',
											dataIndex: 'date',
										},
										{
											title: 'Action',
											dataIndex: 'action',
										},
										{
											title: 'Details',
											dataIndex: 'details',
										},
									]}
								/>
							</div>
						</div>
					</div>
				</Tabs.TabPane>
				<Tabs.TabPane
					tab={
						<>
							<SecurityScanOutlined style={{ marginRight: 3 }} />
							Rights
						</>
					}
					key="rights"
				>
					<UserRights id={Number(id)} />
				</Tabs.TabPane>
			</Tabs>
		</Card>
	)
}

export default User
