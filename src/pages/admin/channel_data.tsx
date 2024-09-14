import { Alert, Button, Result, Spin, Table } from 'antd'
import Search from 'antd/es/input/Search'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../@store/store'
import { get_channel_data } from '../../@store/slices/channels'
import { LoadingOutlined } from '@ant-design/icons'
import Title from 'antd/es/typography/Title'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { getCronJobs } from '../../@store/slices/cronJobs/thunks/getCronJob'
import type { TCronJob } from '../../@store/slices/cronJobs/types/cronJobs'
import { parseExpression } from 'cron-parser'

const CronJobs = () => {
	const [availableChannels, setAvailableChannels] = useState<string[]>([])
	const [search, setSearch] = useState<string>('')
	const { get_data_error, get_data_loading, get_data_success } = useAppSelector(state => state.channelsSlice)
	const dispatch = useAppDispatch()

	const { cronJobs } = useAppSelector(state => state.cronJobReducer)

	useEffect(() => {
		void dispatch(getCronJobs())
		return function unmount() {
			setAvailableChannels([])
			setSearch('')
		}
	}, [dispatch])

	const filteredChannels = useMemo(
		() => availableChannels.filter(channel => channel.toLowerCase().includes(search.toLowerCase())),
		[availableChannels, search],
	)

	const columns = useMemo<MRT_ColumnDef<TCronJob>[]>(
		() => [
			{
				accessorKey: 'id', //access nested data with dot notation
				header: 'First Name',
				size: 150,
			},
			{
				accessorKey: 'name',
				header: 'Last Name',
				size: 150,
			},
			{
				accessorKey: 'cron',
				header: 'Cron',
				Cell: ({ row }) => {
					return <span>{parseExpression(row.original.cron).next().toDate().toLocaleString()}</span>
				},
			},
		],
		[],
	)

	const table = useMaterialReactTable({
		columns,
		data: cronJobs, //data must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
	})

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px' }}>
				{/* <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
				 */}
				<Title>Run Channel Data</Title>
			</div>
			<MaterialReactTable table={table} />
		</div>
	)
}

export default CronJobs
