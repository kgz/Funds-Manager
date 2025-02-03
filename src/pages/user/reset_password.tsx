import { useLocation, useNavigate } from 'react-router-dom'
import styles from '../../@scss/login.module.css'
import { Button, Form } from 'semantic-ui-react'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ResetPassword = () => {
	const paths = useLocation().pathname.split('/')
	const [p1, setP1] = useState('')
	const [p2, setP2] = useState('')
	const [resetLoading, setResetLoading] = useState(false)
	const [error, setError] = useState<boolean>(false)

	const navigate = useNavigate()

	const id = paths[2]
	const token = paths[4]

	const validPassword: true | string = useMemo(() => {
		switch (true) {
			case p1.length < 8:
				return 'Password must be at least 8 characters long'
			case p1.search(/[a-z]/) < 0:
				return 'Password must contain at least one lowercase letter'
			case p1.search(/[A-Z]/) < 0:
				return 'Password must contain at least one uppercase letter'
			case p1.search(/[0-9]/) < 0:
				return 'Password must contain at least one digit'
			default:
				return true
		}
	}, [p1])

	useEffect(() => {
		console.log({ validPassword })
	}, [validPassword])

	return (
		<div className={styles.blackout}>
			<div
				style={{
					background: 'white',
					padding: 20,
					borderRadius: 4,
					width: 400,
				}}
			>
				<div className={styles.login}>
					<div className={styles.title}>Change Password</div>
					<form
						onKeyDown={e => {
							if (e.key === 'Enter') {
								// void dispatch(loginUser({ username: email, password })).then(() => {
								// 	void dispatch(getUser())
								// })
							}
						}}
					>
						<Form.Field>
							<Form.Input
								disabled={error}
								error={validPassword !== true}
								style={{ width: '100%' }}
								type="password"
								placeholder="New Password"
								onChange={e => setP1(e.target.value)}
								focus
							/>
						</Form.Field>
						<Form.Field>
							<Form.Input
								disabled={error}
								style={{ width: '100%', marginTop: 5 }}
								type="password"
								placeholder="Validate Password"
								onChange={e => setP2(e.target.value)}
							/>
						</Form.Field>
						<Button
							loading={resetLoading}
							disabled={error || p1.length < 8 || p1 !== p2 || validPassword !== true}
							compact
							fluid
							style={{
								marginTop: 10,
								padding: '12px',
								borderRadius: 8,
								fontSize: 15,
								fontWeight: 550,
								background: 'rgb(149, 100, 255)',
								color: 'white',
							}}
							onClick={e => {
								e.preventDefault()
								setResetLoading(true)
								void axios
									.post<void>(`/chaos/api/user/reset_password/${id}/${token}`, { password: p1 })
									.then(() => {
										toast.success('Password reset successfully!')
										navigate('/login')
									})
									.catch(error => {
										toast.error('Error resetting password')
										setError(true)
										console.error(error)
									})
									.finally(() => {
										setResetLoading(false)
									})
							}}
						>
							Change
						</Button>
						{error && (
							<div style={{ color: 'red', textAlign: 'center', marginTop: 5 }}>
								Error resetting password, please return to the login screen and try again. If the problem persists,
								please contact support.
								<br />
								<br />
								<Button type="button" primary onClick={() => navigate('/login')}>
									Return to login
								</Button>
							</div>
						)}
						{p1.length > 0 && validPassword !== true && <div style={{ color: 'red' }}>{validPassword}</div>}
						{validPassword === true && p1.length > 0 && p1 !== p2 && (
							<div style={{ color: 'red' }}>Passwords do not match</div>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}

export default ResetPassword
