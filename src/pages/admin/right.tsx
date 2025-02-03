import type { TableColumnsType } from 'antd'
import { Table, Transfer } from 'antd'
import type { Key, TableRowSelection } from 'antd/es/table/interface'
import type { TransferItem, TransferProps } from 'antd/es/transfer'
import { useParams } from 'react-router-dom'
import type { TUser } from '../../@types/user'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAppDispatch } from '../../@store/store'

type TUserHasRight = {
	user: TUser
	has_right: boolean
	key: number
}

interface TableTransferProps extends TransferProps<TransferItem> {
	dataSource: TUserHasRight[]
	leftColumns: TableColumnsType<TUserHasRight>
	rightColumns: TableColumnsType<TUserHasRight>
}

const Right = () => {
	const params = useParams()

	const { right } = params as { right: string }
	const [data, setData] = useState<TUserHasRight[]>([])
	const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([])
	const [loading, setLoading] = useState(false)

	const onChange: TableTransferProps['onChange'] = (
		nextTargetKeys: TransferProps['targetKeys'],
		direction: string,
		moveKeys: Key[],
	) => {
		setLoading(true)

		// setTargetKeys(nextTargetKeys)
		switch (direction) {
			case 'right':
				updateRights(moveKeys.map(Number))
					.then(() => {
						setTargetKeys(nextTargetKeys)
					})
					.catch(() => {
						console.log('error')
					})
					.finally(() => {
						setLoading(false)
					})
				break
			case 'left':
				removeRights(moveKeys.map(Number))
					.then(() => {
						setTargetKeys(nextTargetKeys)
					})
					.catch(() => {
						console.log('error')
					})
					.finally(() => {
						setLoading(false)
					})
				break
			default:
				setLoading(false)
				throw new Error('unknown direction')
		}
	}

	useEffect(() => {
		void axios.get<TUserHasRight[]>('/chaos/api/admin/users/right/' + right).then(res => {
			setData(res.data.map(item => ({ ...item, key: item.user.id })))
			const f = res.data.filter(item => item.has_right)
			setTargetKeys(f.map(item => item.user.id))
		})
	}, [right])

	const updateRights = async (ids: number[]) => {
		await axios.post('/chaos/api/admin/users/right/' + right, { user_ids: ids })
	}

	const removeRights = async (ids: number[]) => {
		await axios.delete('/chaos/api/admin/users/right/' + right, { data: { user_ids: ids } })
		console.log('removed')
	}

	const columns: TableColumnsType<TUserHasRight> = [
		{
			title: 'Id',
			dataIndex: 'user',
			key: 'key',
			sorter: true,
			render: ({ id }: TUser) => id,
		},
		{
			title: 'Username',
			dataIndex: 'user',
			key: 'user',
			sorter: true,
			render: ({ username }: TUser) => username,
		},
	]

	const onItemSelectAll = (selectedKeys: React.Key[], selected: boolean) => {
		console.log('onItemSelectAll:', selectedKeys, selected)
	}

	return (
		<div>
			<h1>Right {right}</h1>
			<Transfer
				disabled={loading}
				dataSource={data}
				targetKeys={targetKeys}
				showSearch
				// onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
				// 	console.log('onSelectChange:', sourceSelectedKeys, targetSelectedKeys)
				// }}
				showSelectAll={false}
				onChange={onChange}
				filterOption={(inputValue, item) =>
					item.user.username.toLowerCase().includes(inputValue.toLowerCase()) ||
					item.user.id.toString().toLowerCase().includes(inputValue.toLowerCase())
				}
			>
				{({
					direction,
					filteredItems,
					onItemSelect,
					onItemSelectAll,
					selectedKeys: listSelectedKeys,
					disabled: listDisabled,
				}) => {
					const rowSelection: TableRowSelection<TUserHasRight> = {
						onChange(selectedRowKeys) {
							onItemSelectAll(selectedRowKeys, 'replace')
						},
						selectedRowKeys: listSelectedKeys,
						selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
						onSelect: (record, selected) => {
							onItemSelect(record.user.id, selected)
						},
					}

					return (
						<Table
							loading={loading}
							rowSelection={rowSelection}
							columns={columns}
							dataSource={filteredItems}
							size="small"
							style={{ pointerEvents: listDisabled ? 'none' : undefined }}
							onRow={({ user }) => ({
								onClick: () => {
									onItemSelect(user.id, !listSelectedKeys.includes(user.id))
								},
								onSelect: e => {
									e.preventDefault()
									onItemSelect(user.id, !listSelectedKeys.includes(user.id))
								},
								style: { cursor: 'pointer' },
							})}
						/>
					)
				}}
			</Transfer>
		</div>
	)
}

export default Right
