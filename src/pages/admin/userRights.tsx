import { Table, Transfer, type TableColumnsType, type TransferProps } from 'antd'
import type { Key, TableRowSelection } from 'antd/es/table/interface'
import type { TransferItem } from 'antd/es/transfer'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

type TUserHasRight = {
	right: string
	user_has_right: boolean
	key: number
}

interface TableTransferProps extends TransferProps<TransferItem> {
	dataSource: TUserHasRight[]
	leftColumns: TableColumnsType<TUserHasRight>
	rightColumns: TableColumnsType<TUserHasRight>
}

const UserRights = ({ id }: { id: number }) => {
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
		console.log('targetKeys:', nextTargetKeys)
		console.log('direction:', direction)
		console.log('moveKeys:', moveKeys)

		// setTargetKeys(nextTargetKeys)
		switch (direction) {
			case 'right':
				updateRights(moveKeys.map(String))
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
				removeRights(moveKeys.map(String))
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
		void axios.get<TUserHasRight[]>(`/chaos/api/admin/user/${id}/rights`).then(res => {
			setData(res.data)
			const f = res.data.filter(item => item.user_has_right)
			setTargetKeys(f.map(item => item.right))
		})
	}, [id, right])

	const updateRights = async (rights: string[]) => {
		await axios.post(`/chaos/api/admin/user/${id}/rights`, { rights })
		console.log('updated')
	}

	const removeRights = async (rights: string[]) => {
		await axios.delete(`/chaos/api/admin/user/${id}/rights`, { data: { rights } })
		console.log('removed')
	}

	const columns: TableColumnsType<TUserHasRight> = [
		{
			title: 'Right',
			dataIndex: 'right',
			key: 'user',
			sorter: true,
		},
	]

	const onItemSelectAll = (selectedKeys: React.Key[], selected: boolean) => {
		console.log('onItemSelectAll:', selectedKeys, selected)
	}

	useEffect(() => {
		console.log({ targetKeys })
	}, [targetKeys])
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
				filterOption={(inputValue, item) => item.right.toLowerCase().includes(inputValue.toLowerCase())}
			>
				{({
					direction,
					filteredItems,
					onItemSelect,
					onItemSelectAll,
					selectedKeys: listSelectedKeys,
					disabled: listDisabled,
				}) => {
					console.log('filteredItems:', filteredItems, { direction })
					const rowSelection: TableRowSelection<TUserHasRight> = {
						onChange(selectedRowKeys) {
							console.log('onChange:', selectedRowKeys)
							onItemSelectAll(selectedRowKeys, 'replace')
						},
						selectedRowKeys: listSelectedKeys,
						selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
						onSelect: (record, selected) => {
							console.log('onSelect:', record, selected)
							onItemSelect(record.right, selected)
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
							onRow={({ right }) => ({
								onClick: () => {
									console.log('onRow:', right)
									onItemSelect(right, !listSelectedKeys.includes(right))
								},
								onSelect: e => {
									e.preventDefault()
									console.log('onSelect:', right)
									onItemSelect(right, !listSelectedKeys.includes(right))
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

export default UserRights
