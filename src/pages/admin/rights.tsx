import type { GetProp, TableColumnsType } from 'antd'
import { Table } from 'antd'
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table'
import type { TUser } from '../../@types/user'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import type { TRight } from '../../@types/admin/rights'
import { useAppDispatch } from '../../@store/store'
import { channelActions } from '../../@store/slices/channels'

type TCol = {
	name: TRight
	id: string
}

interface TableParams {
	pagination?: TablePaginationConfig
	sortField?: string
	sortOrder?: string
	filters?: Parameters<GetProp<TableProps, 'onChange'>>[1]
}

const RightsTable = () => {
	const [data, setData] = useState<TRight[]>([])
	const [loading, setLoading] = useState(false)
	const [tableParams, setTableParams] = useState<TableParams>({
		pagination: {
			current: 1,
			pageSize: 10,
		},
	})

	const navigate = useNavigate()

	const dispatch = useAppDispatch()

	useEffect(() => {
		void dispatch(channelActions.getChannels)
		// console.log(channelActions.getChannels)
	})

	const columns: TableColumnsType<TCol> = [
		{
			title: 'Id',
			dataIndex: 'id',
			sorter: true,
		},
		{
			title: 'Name',
			dataIndex: 'name',
			sorter: true,
		},
		{
			title: 'Manage',
			key: 'id',
			render: (text, record) => (
				<>
					<a
						onClick={() => {
							navigate(`/admin/right/${record.name}`)
						}}
					>
						Edit
					</a>
				</>
			),
		},
	]

	const fetchData = useCallback(() => {
		setLoading(true)
		// fetch(`https://randomuser.me/api?${qs.stringify(getRandomuserParams(tableParams))}`)
		// 	.then(res => res.json())
		// 	.then(({ results }) => {
		// 		setData(results)
		// 		setLoading(false)
		// 		setTableParams({
		// 			...tableParams,
		// 			pagination: {
		// 				...tableParams.pagination,
		// 				total: 200,
		// 				// 200 is mock data, you should read it from server
		// 				// total: data.totalCount,
		// 			},
		// 		})
		// 	})
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

		void axios.get<TRight[]>(`/chaos/api/admin/rights`).then(response => {
			setData(response.data)
			setLoading(false)
		})
	}, [tableParams])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const data_as_json = useMemo(() => {
		return data.map((item, index) => ({ name: item, id: index }))
	}, [data])

	return (
		<Table
			//@ts-ignore >> i dont understand this error
			columns={columns}
			rowKey={record => record.id}
			dataSource={data_as_json}
			loading={loading}
			bordered
			// onRow={() => ({
			// })}
		/>
	)
}

export default RightsTable
