import type { GetProp } from 'antd'
import { Table } from 'antd'
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table'
import type { TUser } from '../../@types/user'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../@store/store'

const columns: ColumnsType<TUser> = [
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
	},
	{
		title: 'Active',
		dataIndex: 'enabled',
		render: enabled => (enabled ? 'Active' : 'Inactive'),
	},
]

interface TableParams {
	pagination?: TablePaginationConfig
	sortField?: string
	sortOrder?: string
	filters?: Parameters<GetProp<TableProps, 'onChange'>>[1]
}

const Users = () => {
	const { current, rights } = useAppSelector(state => state.userSliceSlice)
	const navigate = useNavigate()

	useEffect(() => {
		if (!rights.includes('UserManagement')) {
			void navigate('/')
		}
	})

	const [data, setData] = useState<TUser[]>()
	const [loading, setLoading] = useState(false)
	const [tableParams, setTableParams] = useState<TableParams>({
		pagination: {
			current: 1,
			pageSize: 10,
		},
	})

	const fetchData = useCallback(() => {
		setLoading(true)
		console.log(tableParams)
		let params_as_url: { [key: string]: string } = {
			pagination_current: tableParams.pagination?.current?.toString() ?? '1',
			pagination_page_size: tableParams.pagination?.pageSize?.toString() ?? '10',
		}

		if (tableParams.sortField) {
			params_as_url = {
				...params_as_url,
				sort_field: tableParams.sortField,
			}
		}

		if (tableParams.sortOrder) {
			params_as_url = {
				...params_as_url,
				sort_dir: tableParams.sortOrder,
			}
		}

		const as_url = new URLSearchParams(params_as_url).toString()

		void axios.get<{ data: TUser[]; total: number }>(`/chaos/api/admin/users?${as_url}`).then(response => {
			setData(response.data.data)
			setLoading(false)
			// setTableParams((oldTableParams: TableParams) => ({
			// 	...oldTableParams,
			// 	pagination: {
			// 		...oldTableParams.pagination,
			// 		total: response.data.total,
			// 	},
			// }))
		})
	}, [tableParams])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const handleTableChange: TableProps['onChange'] = (pagination, filters, sorter) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		setTableParams({
			pagination,
			filters,
			...sorter,
		})

		// `dataSource` is useless since `pageSize` changed
		if (pagination.pageSize !== tableParams.pagination?.pageSize) {
			setData([])
		}
	}

	return (
		<Table
			columns={columns}
			rowKey={record => record.id}
			dataSource={data}
			pagination={tableParams.pagination}
			loading={loading}
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
