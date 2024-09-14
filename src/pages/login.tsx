import { Button, ButtonOr, Divider, Form, FormButton, Icon } from 'semantic-ui-react'
import styles from '../@scss/login.module.scss'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace'

import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { createUser, getUser, loginUser, setLoginError } from '../@store/slices/user'
import { useAppDispatch, useAppSelector } from '../@store/store'
import { getCookie } from '../@middleware/cookie'
import { pink } from '@mui/material/colors'
import { faCalendar, faClock, faFootball, faFootballBall } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	CalendarOutlined,
	ClockCircleOutlined,
	FacebookFilled,
	FacebookOutlined,
	GooglePlusCircleFilled,
	TwitterCircleFilled,
} from '@ant-design/icons'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Tooltip } from '@mui/material'
const Login = () => {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [register, setRegister] = useState(false)
	const [userGetLoading, setUserGetLoading] = useState(true)
	const [error, setError] = useState('')
	const [resetError, setResetError] = useState<null | string>(null)
	const [resetLoading, setResetLoading] = useState(false)
	const [resetSuccess, setResetSuccess] = useState<null | string>(null)
	const dispatch = useAppDispatch()
	const createEmailRef = useRef<HTMLInputElement>()

	const { loginLoading, loginError, current, createError, createLoading } = useAppSelector(
		state => state.userSliceSlice,
	)

	const validateEmail = (email: string) => {
		const re = /\S+@\S+\.\S+/
		return re.test(email)
	}

	useEffect(() => {
		const jwt = getCookie('jwt')
		if (jwt) {
			void dispatch(getUser())
				.then(() => {
					setTimeout(() => {
						setUserGetLoading(false)
					}, 5000)
				})
				.catch(() => {
					// setUserGetLoading(false)
					setError('Error getting user data. Please try again.')
				})
		} else {
			console.log('no jwt')
			setUserGetLoading(false)
		}
	}, [dispatch])

	useEffect(() => {
		console.log({ current })
	}, [current])

	const validPassword: true | string = useMemo(() => {
		switch (true) {
			case password.length < 8:
				return 'Password must be at least 8 characters long'
			case password.search(/[a-z]/) < 0:
				return 'Password must contain at least one lowercase letter'
			case password.search(/[A-Z]/) < 0:
				return 'Password must contain at least one uppercase letter'
			case password.search(/[0-9]/) < 0:
				return 'Password must contain at least one digit'
			default:
				return true
		}
	}, [password])

	return (
		!current && (
			<div className={styles.blackout}>
				{userGetLoading && !error && <div>Loading...</div>}
				{error && <div>{error}</div>}
				{!userGetLoading && (
					<div className={styles.container}>
						<div
							style={{
								position: 'relative',
								marginTop: '-122.5%',
								background: 'transparent',
								pointerEvents: 'none',
								width: 0,
								// height: 355,
								height: '100%',
								zIndex: 1,
							}}
						>
							<div
								className={styles.register}
								style={{
									transform: register ? 'translateX(0)' : 'translateX(100%)',
									transitionDuration: '0.5s',
									position: 'absolute',
									width: 350,
									// height: 355,
									bottom: 0,
									top: 0,
									pointerEvents: 'all',
								}}
							>
								<div
									className={styles.title}
									style={{
										transform: register ? 'translateX(0%)' : 'translateX(-100%)',
										opacity: register ? 1 : 0,
										transitionDuration: '0.5s',
										pointerEvents: register ? 'all' : 'none',
										marginBottom: -56,
									}}
								>
									Dont have an account?
								</div>
								<div
									className={styles.title}
									style={{
										transform: !register ? 'translateX(0%)' : 'translateX(100%)',
										opacity: !register ? 1 : 0,
										transitionDuration: '0.5s',
										pointerEvents: !register ? 'all' : 'none',
									}}
								>
									Available for free!
								</div>
								<div className={styles.content}>
									{/* get access to sports as soon as they become available,  */}
									<div className={styles.pitch}>
										{/* <Icon name="calendar check outline" style={{ color: 'white', fontSize: 30 }} /> */}
										<CalendarOutlined style={{ color: 'white', fontSize: 35 }} />

										<span>View sports as soon as they become available!</span>
									</div>

									<div className={styles.pitch}>
										{/* <Icon name="clock outline" style={{ color: 'white', fontSize: 30 }} /> */}
										<ClockCircleOutlined style={{ color: 'white', fontSize: 35 }} />

										<span>Get access to automatic notifications!</span>
									</div>

									<div className={styles.pitch}>
										{/* <Icon name="football ball" style={{ color: 'white', fontSize: 35 }} />
										 */}
										<FontAwesomeIcon icon={faFootballBall} style={{ color: 'white', fontSize: 35 }} />
										<span>Ability to track and get suggestions based on your favorite sports and teams!</span>
									</div>

									<div>
										<Button
											style={{
												// marginTop: 10,
												// padding: '12px',
												borderRadius: 8,
												fontSize: 15,
												fontWeight: 550,
												// background: 'rgb(149, 100, 255)',
												// color: 'white',
												outline: 'none',
												border: 'none',
												transitionDuration: '0.5s',
												transition: 'all 0.5s',
												// float: register ? 'right' : 'left',
												transform: !register ? 'translateX(0)' : 'translateX(140%)',
												position: 'absolute',
												width: !register ? 150 : 130,
												height: 30,
												bottom: '2%',
											}}
											// attached={!register ? 'right' : 'left'}
											// fluid
											// floated={register ? 'right' : 'left'}
											basic
											toggle
											// animated
											inverted
											onClick={() => setRegister(!register)}
											// attached
											size="mini"
										>
											{/* 2 divs that slide in and out */}
											<div
												style={{
													transitionDuration: '0.5s',
													position: 'absolute',
													width: 100,
													top: 7,
													left: 15, // register ? 15 : 300,
													opacity: register ? 1 : 0,
													transition: 'all 0.5s',
													pointerEvents: register ? 'all' : 'none',
												}}
											>
												<span>Back to login</span>
												{/* <Icon name="arrow right" style={{ marginLeft: 5 }} /> */}
											</div>
											<div
												style={{
													transitionDuration: '0.5s',
													position: 'absolute',
													width: 140,
													top: 7,
													left: 5, // !register ? 5 : 300,
													opacity: !register ? 1 : 0,
													transition: 'all 0.5s',
													pointerEvents: !register ? 'all' : 'none',
												}}
												onClick={() => {
													console.log(createEmailRef.current)
												}}
											>
												{/* <Icon name="arrow left" /> */}
												<span>Create an account!</span>
											</div>
										</Button>
									</div>
								</div>
							</div>
						</div>
						<div className={styles.login}>
							<div className={styles.title}>Login</div>
							<form
								onKeyDown={e => {
									if (e.key === 'Enter') {
										void dispatch(loginUser({ username: email, password })).then(() => {
											void dispatch(getUser())
										})
									}
								}}
							>
								<Form.Field>
									<Form.Input
										style={{ width: '100%' }}
										type="email"
										placeholder="Email"
										onChange={e => setEmail(e.target.value)}
									/>
								</Form.Field>
								<Form.Field>
									<Form.Input
										style={{ width: '100%', marginTop: 5 }}
										type="password"
										placeholder="Password"
										onChange={e => setPassword(e.target.value)}
									/>
								</Form.Field>
								<Button
									loading={loginLoading}
									disabled={loginLoading || resetLoading || !validateEmail(email)}
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
										setResetError(null)
										setResetSuccess(null)
										void dispatch(loginUser({ username: email, password })).then(() => {
											void dispatch(getUser())
										})
									}}
								>
									Login
								</Button>
								<div style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold' }}>
									{loginError && <div style={{ color: 'red' }}>{loginError}</div>}{' '}
									{resetError && <div style={{ color: 'red' }}>{resetError}</div>}{' '}
									{resetSuccess && <div style={{ color: 'green' }}>{resetSuccess}</div>}
								</div>
							</form>

							<Divider horizontal>OR</Divider>

							<div className={styles.social}>
								<Button color="facebook">
									<FacebookFilled style={{ fontSize: 20 }} />
								</Button>
								<Button color="google plus">
									<GooglePlusCircleFilled style={{ fontSize: 20 }} />
								</Button>
								<Button color="twitter">
									<TwitterCircleFilled style={{ fontSize: 20 }} />
								</Button>
							</div>
							<Button
								loading={resetLoading}
								disabled={loginLoading || resetLoading}
								type="button"
								compact
								basic
								floated="right"
								as={'a'}
								style={{ border: 'none !important', boxShadow: 'none', marginBlock: '10px -10px' }}
								onClick={() => {
									setResetLoading(true)
									setResetError(null)
									setResetSuccess(null)
									void dispatch(setLoginError(''))
									if (!email) {
										setResetLoading(false)

										return setResetError('Please enter your email address')
									}

									if (!validateEmail(email)) {
										setResetLoading(false)

										return setResetError('Please enter a valid email address')
									}
									setResetError(null)

									void axios
										.post('/chaos/api/user/email_reset/' + email, { email })
										.then(res => {
											setTimeout(() => {
												setResetSuccess('An email has been sent if a user with that email exists.')
												setResetError(null)
											}, 1000)
										})
										.catch(err => {
											setTimeout(() => {
												setResetError('An error occurred. Please try again.')
												setResetSuccess(null)
											}, 1000)
										})
										.finally(() => {
											setTimeout(() => {
												setResetLoading(false)
											}, 1000)
										})
								}}
							>
								Forgot Password?
							</Button>
						</div>
						<div
							className={styles.login}
							style={{
								position: 'static',
								// right:0
								// transform: 'translateX(200%)',
							}}
						>
							<div className={styles.title}>Register</div>
							<form
								onKeyDown={e => {
									if (e.key === 'Enter') {
										void dispatch(createUser({ username: email, password })).then(() => {
											void dispatch(getUser())
										})
									}
								}}
							>
								{/* <Form loading={createLoading}> */}
								<Form.Field error={Boolean(email && !validateEmail(email))}>
									<Form.Input
										ref={createEmailRef}
										style={{ width: '100%' }}
										type="email"
										placeholder="Email"
										onChange={e => setEmail(e.target.value)}
									/>
								</Form.Field>
								<Form.Field error={Boolean(createError.password || (password && validPassword !== true))}>
									<Form.Input
										style={{ width: '100%', marginTop: 10 }}
										type="password"
										placeholder="Password"
										onChange={e => setPassword(e.target.value)}
									/>
									{register && (createError.password || (password && validPassword !== true)) && (
										<div style={{ color: 'red' }}>{createError.password || validPassword}</div>
									)}
								</Form.Field>
								<Form.Field>
									<Form.Input
										style={{ width: '100%', marginTop: 10 }}
										type="password"
										placeholder="Confirm Password"
										onChange={e => setConfirmPassword(e.target.value)}
									/>
								</Form.Field>
								{/* </Form> */}
								<Button
									loading={createLoading}
									compact
									fluid
									style={{
										marginTop: 20,
										padding: '12px',
										borderRadius: 8,
										fontSize: 15,
										fontWeight: 550,
										background: 'rgb(149, 100, 255)',
										color: 'white',
									}}
									onClick={e => {
										e.preventDefault()
										void dispatch(createUser({ email: email, username: email, password })).then(() => {
											if (Object.values(createError).length == 0) {
												void dispatch(loginUser({ username: email, password })).then(() => {
													void dispatch(getUser())
												})
											} else {
												console.log({ k: Object.values(createError).length })
											}
										})
									}}
								>
									Register
								</Button>
								{/* <a className={styles.register} href="/register">
						Register
					</a> */}
								{/* {createError && <div style={{ color: 'red' }}>{createError}</div>} */}
							</form>
						</div>
					</div>
				)}
			</div>
		)
	)
}

export default Login
