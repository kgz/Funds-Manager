import type { GetProp } from 'antd'
import { Table } from 'antd'
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../@store/store'
import { getUsers } from '../../@store'
import { CodeSandboxCircleFilled } from '@ant-design/icons'
import type { SorterResult } from 'antd/es/table/interface'
import type { Users } from '../../Api'

interface TableParams {
	pagination?: TablePaginationConfig
	sortField?: string
	sortOrder?: string
	filters?: Parameters<GetProp<TableProps, 'onChange'>>[1]
}

const Users = () => {
	const { current, rights } = useAppSelector(state => state.userSliceSlice)
	const { adminUsers, adminUsersLoading, total, filters } = useAppSelector(state => state.adminUserReducer)

	const columns: ColumnsType<Users> = [
		{
			title: 'Id',
			dataIndex: 'id',
			sorter: true,
			width: '20%',
		},
		{
			title: 'User',
			dataIndex: 'username',
			sorter: true,
			width: '20%',
		},
		{
			title: 'Gender',
			dataIndex: 'gender',
			filters: [
				{ text: 'Male', value: 'male' },
				{ text: 'Female', value: 'female' },
			],
			width: '20%',
		},
		{
			title: 'Email',
			dataIndex: 'email',
			sorter: true,
		},
		{
			title: 'Active',
			dataIndex: 'enabled',
			render: enabled => (enabled ? 'Active' : 'Inactive'),
			filters: [
				{ text: 'Active', value: true },
				{ text: 'Inactive', value: false },
			],
		},
	]

	const navigate = useNavigate()
	const dispatch = useAppDispatch()
	useEffect(() => {
		if (!rights.includes('UserManagement')) {
			void navigate('/')
		}
	})

	const [data, setData] = useState<typeof adminUsers>()
	// const [tableParams, setTableParams] = useState<TableParams>({
	// 	pagination: {
	// 		current: 1,
	// 		pageSize: 10,
	// 		total: total,
	// 	},
	// })

	const tableParams = useMemo<TableParams>(() => {
		return {
			pagination: {
				current: filters.pagination_current ?? 1,
				pageSize: filters.pagination_page_size ?? 10,
				total,
			},
		}
	}, [filters.pagination_current, filters.pagination_page_size, total])

	const fetchData = useCallback(
		(tableParams: TableParams) => {
			console.log(tableParams)
			const params_as_url = {
				paginationCurrent: tableParams.pagination?.current?.toString() ?? '1',
				paginationPageSize: tableParams.pagination?.pageSize?.toString() ?? '10',
				...tableParams,
				...tableParams.filters,
			} as const

			// if (tableParams.sortField) {
			// 	params_as_url = {
			// 		...params_as_url,
			// 		sort_field: tableParams.sortField,
			// 	}
			// }

			// if (tableParams.sortOrder) {
			// 	params_as_url = {
			// 		...params_as_url,
			// 		sort_dir: tableParams.sortOrder,
			// 	}
			// }

			console.log({ params_as_url })

			void dispatch(getUsers(params_as_url))
		},
		[dispatch],
	)

	useEffect(() => {
		fetchData({
			pagination: {
				current: 1,
				pageSize: 10,
				total: 0,
			},
		})
	}, [fetchData])

	const handleTableChange: TableProps<Users>['onChange'] = (pagination, filters, sorter) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		// setTableParams({
		// 	pagination,
		// 	filters,
		// 	...sorter,
		// })
		fetchData({
			pagination,
			filters,
			sortField: sorter['field'],
			sortOrder: sorter['order'],
		})

		// `dataSource` is useless since `pageSize` changed
		if (pagination.pageSize !== tableParams.pagination?.pageSize) {
			setData([])
		}
	}

	return (
		<Table
			columns={columns}
			dataSource={adminUsers}
			pagination={tableParams.pagination}
			loading={adminUsersLoading}
			//@ts-ignore
			onChange={handleTableChange}
			// virtual
			bordered
			onRow={record => {
				return {
					onClick: () => {
						// console.log(record)
						void navigate(`/admin/user/${record.id}`)
						console.log(record)
					},
					style: { cursor: 'pointer' },
				}
			}}
		/>
	)
}

export default Users
