import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../@store/store'
import {
	TableRow,
	TableHeaderCell,
	TableHeader,
	TableFooter,
	TableCell,
	TableBody,
	MenuItem,
	Icon,
	Label,
	Menu,
	Table,
	Button,
	Input,
	Popup,
} from 'semantic-ui-react'
import type { TUser } from '../../@types/user'
import { createUser, loginUser, logout } from '../../@store/slices/user'
import { getMigrations } from '../../@store/slices/migrations/thunks/getMigrations'
import { runMigrations } from '../../@store/slices/migrations/thunks/runMigrations'
import { revertMigration } from '../../@store/slices/migrations/thunks/revertMigration'
export const Migrations = () => {
	const { migrations, migrationsLoading, migrationsRunning } = useAppSelector(state => state.migrationsReducer)
	const dispatch = useAppDispatch()
	useEffect(() => {
		void dispatch(getMigrations())
	}, [dispatch])

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')

	// if (migrationsLoading) {
	// 	return <Label color="blue">Loading...</Label>
	// }

	const dummyUser: Partial<TUser> = {
		email: 'test@test.com',
		username: 'test' + (Math.random() * 1000).toString(),
		password: 'test',
	}

	return (
		<>
			<Button loading={migrationsLoading} onClick={() => void dispatch(getMigrations())}>
				Refresh
			</Button>
			<Button loading={migrationsRunning} onClick={() => void dispatch(runMigrations())}>
				Run Migrations
			</Button>

			<Button onClick={() => void dispatch(createUser(dummyUser))}>Create User</Button>
			<Button
				onClick={() => {
					console.log('logout')
					void dispatch(logout())
				}}
			>
				logout
			</Button>

			<br />

			<Input type="username" placeholder="Username" onChange={e => setUsername(e.target.value)} />
			<Input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
			<Button
				onClick={() =>
					void dispatch(
						loginUser({
							username,
							password,
						}),
					)
				}
			>
				login
			</Button>

			<Table celled>
				<TableHeader>
					<TableRow>
						<TableHeaderCell>ID</TableHeaderCell>
						<TableHeaderCell>Migration</TableHeaderCell>
						<TableHeaderCell>Batch</TableHeaderCell>
						<TableHeaderCell>Migration Date</TableHeaderCell>
						<TableHeaderCell>Actions</TableHeaderCell>
					</TableRow>
				</TableHeader>
				<TableBody>
					{migrations.map((migration, index) => (
						<TableRow key={index}>
							<TableCell>{migration.key}</TableCell>
							<TableCell>{migration.name}</TableCell>
							<TableCell>{migration.origional_commit}</TableCell>
							<TableCell>{migration.ran ? 'yes' : 'no'}</TableCell>
							<TableCell>
								{migration.ran && (
									<Button
										onClick={() =>
											void dispatch(revertMigration(migration.name)).then(() => void dispatch(getMigrations()))
										}
									>
										Revert
									</Button>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
				{/* <TableFooter>
					<TableRow>
						<TableHeaderCell colSpan="4">
							<Menu floated="right" pagination>
								<MenuItem as="a" icon>
									<Icon name="chevron left" />
								</MenuItem>
								<MenuItem as="a">1</MenuItem>
								<MenuItem as="a">2</MenuItem>
								<MenuItem as="a">3</MenuItem>
								<MenuItem as="a">4</MenuItem>
								<MenuItem as="a" icon>
									<Icon name="chevron right" />
								</MenuItem>
							</Menu>
						</TableHeaderCell>
					</TableRow>
				</TableFooter> */}
			</Table>
		</>
	)
}

export default Migrations
