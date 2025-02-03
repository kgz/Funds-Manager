import { useEffect, useMemo, useRef, useState } from 'react'
import s from './calender.module.css'
import { DateTime } from 'luxon'
import type { ZShow } from '../../../@types/show'
import axios from 'axios'
import type { z } from 'zod'
import { getBrand } from '../../../components/getBrand'
const px_per_hour = 200

function decodeEntities(encodedString: string) {
	const translate_re = /&(nbsp|amp|quot|lt|gt);/g
	const translate = {
		nbsp: ' ',
		amp: '&',
		quot: '"',
		lt: '<',
		gt: '>',
	}
	return encodedString
		.replace(translate_re, function (_, entity: keyof typeof translate) {
			return translate[entity]
		})
		.replace(/&#(\d+);/gi, function (_, numStr: string) {
			const num = parseInt(numStr, 10)
			return String.fromCharCode(num)
		})
}

const Calender = () => {
	const nowRef = useRef<HTMLDivElement>(null)
	const container_ref = useRef<HTMLDivElement>(null)
	const [data, setData] = useState<z.infer<typeof ZShow>[]>([])
	const [nowMarkerLoop, setNowMarkerLoop] = useState<NodeJS.Timeout | null>(null)
	const [channelsToCheck, setChannelsToCheck] = useState<string[]>([])
	useEffect(() => {
		fetch('/chaos/api/admin/channels/')
			.then(response => response.json())
			.then(setChannelsToCheck)
			.catch(console.error)

		return () => {
			setChannelsToCheck([])
		}
	}, [])

	useEffect(() => {
		// set luxon to use utc
		console.log({ channelsToCheck })
		const promises: PromiseLike<z.infer<typeof ZShow>[]>[] = []
		for (const channel of channelsToCheck) {
			promises.push(
				new Promise<z.infer<typeof ZShow>[]>(
					resolve =>
						void axios
							.get<z.infer<typeof ZShow>[]>('/chaos/api/data/' + channel)
							.then(response => response.data)
							.then(data => {
								// add +0000 to the end of the date string to make it a valid iso string
								data.forEach(item => {
									item.start = item.start + '+0000'
									item.end = item.end + '+0000'
								})
								resolve(data)
							}),
				),
			)
		}

		Promise.allSettled(promises)
			.then(data => {
				const succeeded_data = data.filter(x => x.status === 'fulfilled').map(x => x.value)
				const data_ = succeeded_data.flat()
				setData(data_)

				const failed_data = data.filter(x => x.status === 'rejected').map(x => x.reason as unknown)
				console.error(failed_data)
			})
			.catch(console.error)

		return () => {
			setData([])
		}
	}, [channelsToCheck])

	type TItem = (typeof data)[0]

	const startDate = useMemo(() => {
		if (!data.length) {
			// start of today
			return DateTime.local().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
		}
		const start = data
			.sort((a, b) => DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis())
			.at(0)?.start
		if (!start) {
			// start of today
			return DateTime.local().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
		}
		return DateTime.fromISO(start)
	}, [data])

	const endDate = useMemo(() => {
		if (!data.length) {
			// end of today
			return DateTime.local().set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
		}
		const end = data.sort((a, b) => DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis()).at(0)?.end
		if (!end) {
			// end of today
			return DateTime.local().set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
		}
		return DateTime.fromISO(end)
	}, [data])

	useEffect(() => {
		if (!nowRef.current) {
			setNowMarkerLoop(null)
			console.warn('nowRef is null')
			return
		}

		if (nowMarkerLoop) {
			console.warn('nowMarkerLoop is not null')
			return
		}
		if (!startDate) return

		console.log(DateTime.local().diff(startDate, 'hours').hours)
		setTimeout(() => {
			if (!nowRef.current) {
				setNowMarkerLoop(null)
				console.warn('nowRef is null')
				return
			}
			nowRef.current.style.marginLeft = DateTime.local().diff(startDate, 'hours').hours * px_per_hour + 200 + 'px'
		}, 100)
		const loop = setInterval(() => {
			if (nowRef.current) {
				// silly ts, we already checked if it was null
				nowRef.current.style.marginLeft = DateTime.local().diff(startDate, 'hours').hours * px_per_hour + 200 + 'px'
			} else {
				clearInterval(loop)
				console.warn('nowRef is null')
				return
			}
		}, 60 * 1000)
		setNowMarkerLoop(loop)

		return () => {
			if (nowMarkerLoop) {
				clearInterval(nowMarkerLoop)
			}
		}
	}, [startDate, nowMarkerLoop])

	useEffect(() => {
		// container scroll to DateTime.local().diff(DateTime.fromISO(startDate?.start), 'hours').hours * px_per_hour + 200 + 'px'
		if (!container_ref.current) return
		if (!startDate) return
		let scroll = DateTime.local().diff(startDate, 'hours').hours * px_per_hour + 200
		scroll = scroll - container_ref.current.clientWidth / 2

		console.log({ scroll })
		setTimeout(() => {
			if (!container_ref.current) return
			container_ref.current.scrollLeft = scroll
		}, 100)
	}, [startDate])

	const hours = useMemo(() => {
		if (!startDate || !endDate) return []
		let start = startDate
		const end = endDate

		// round start to the nearest 30 min block before
		start = start.set({ minute: start.minute - (start.minute % 30) })

		const hours = end.diff(start, 'hours').hours
		console.log({ start: start.toISO(), end: end.toISO(), hours })
		return Array.from({ length: hours * 2 + 1 }, (_, i) => {
			return start.plus({ minute: i * 30 })
		})
	}, [endDate, startDate])

	const days = useMemo(() => {
		if (!startDate || !endDate) return []
		const start = startDate
		const end = endDate

		const days = end.diff(start, 'days').days

		const days_ = Array.from({ length: days + 1 }, (_, i) => {
			return {
				start: start.plus({ days: i }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
				end: start.plus({ days: i }).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }),
			}
		})

		// set to closest 30 min block before and after
		days_[0].start = start
		days_[0].start = days_[0].start.set({ minute: days_[0].start.minute - (days_[0].start.minute % 30) })
		days_[days_.length - 1].end = end
		days_[days_.length - 1].end = days_[days_.length - 1].end.set({
			minute: days_[days_.length - 1].end.minute - (days_[days_.length - 1].end.minute % 30),
		})

		return days_
	}, [endDate, startDate])

	return (
		<div className={s.container} ref={container_ref}>
			{/* div required for children to span across all the way */}
			<div style={{ position: 'relative' }}>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: 0,
						height: '100%',
						zIndex: 1,
					}}
				>
					<div
						className={s.nowLine}
						ref={nowRef}
						style={{
							position: 'relative',
							width: 2,
							backgroundColor: 'red',
							height: '100%',
						}}
					></div>
				</div>
				<div
					style={{
						display: 'flex',
						width: '100%',
						position: 'sticky',
						top: 0,
						zIndex: 5,
					}}
				>
					<div className={s.channel} style={{ position: 'sticky', left: 0, right: 0, width: 200, height: 20 }}></div>
					{days.map((day, index) => {
						return (
							<div
								key={'f_56%' + index.toString()}
								style={{
									width: day.end.diff(day.start, 'hours').hours * px_per_hour,
									textAlign: 'center',
									// border: '1px solid #000',
									position: 'relative',
									display: 'flex',
									justifyContent: 'flex-start',
									backgroundColor: '#222',
									padding: '0 10px',
								}}
							>
								<div
									style={{
										width: 80,
										position: 'sticky',
										left: 200,
										right: 10,
										textAlign: 'left',
									}}
								>
									{day.start.toFormat('dd/MM/yyyy')}
								</div>
							</div>
						)
					})}
				</div>

				<div
					style={{
						width: '100%',
						position: 'sticky',
						zIndex: 5,
						top: 20,
					}}
				>
					{
						<div className={s.day} style={{ marginLeft: 0, width: '100%', border: '1px solid #ccc' }}>
							<div
								className={s.channel}
								style={{ position: 'sticky', left: 0, right: 0, width: 200, height: 20 }}
							></div>
							{hours.map((hour, index) => {
								return (
									<div
										key={'h' + index.toString()}
										style={{
											width: px_per_hour / 2,
											textAlign: 'center',
											marginLeft: index === 0 ? -px_per_hour / 4 : 0,
										}}
									>
										{/* as am pm 12 hour */}
										{hour.toFormat('h') +
											(hour.toFormat('m') !== '0' ? ':' + hour.toFormat('m') : '') +
											' ' +
											hour.toFormat('a')}
									</div>
								)
							})}
						</div>
					}
				</div>

				{channelsToCheck
					.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', ignorePunctuation: true }))
					.map(channel => {
						const channel_data = data.filter(x => x.channel === channel)
						if (!channel_data.length) {
							channel_data.push({
								channel,
								title: 'No Data',
								start: startDate.toISO() ?? '',
								end: endDate.toISO() ?? '',
								id: -1,
								description: 'No Data',
							})
						}
						return (
							<div key={channel} className={s.channelContainer}>
								{/* {channel} */}
								<div className={s.channel} style={{ position: 'sticky', left: 0, right: 0, width: 200 }}>
									{/* {channel} */}
									{getBrand(channel)}
								</div>
								<div className={s.channelData}>
									{channel_data
										.sort((a: TItem, b: TItem) => Date.parse(a.end) - Date.parse(b.end))
										.map((item, index) => {
											// const reference_start = new Date(
											// 	data.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0].start,
											// )

											// clamp the start and end times to the current day
											const start = DateTime.fromISO(item.start)
											const end = DateTime.fromISO(item.end)

											let width: number | string = end.diff(start, 'hours').hours * px_per_hour

											width = width + 'px'

											const last = data
												.filter(x => x.channel === channel)
												.sort((a: TItem, b: TItem) => Date.parse(a.end) - Date.parse(b.end))
												.at(index - 1)

											let marginLeft = 0

											if (last && index !== 0) {
												// const last_end = DateTime.fromISO(last.end)
												const first_time = DateTime.fromISO(last.end)
												marginLeft = start.diff(first_time, 'hours').hours * px_per_hour
											} else {
												let first_time = DateTime.fromISO(days[0]?.start.toISO() || '')
												first_time = first_time.set({ hour: hours[0].hour, minute: hours[0].minute })
												marginLeft = start.diff(first_time, 'hours').hours * px_per_hour
											}

											const has_overlaps = data.filter((x, i) => {
												if (i === index || i >= index) return false
												const x_start = DateTime.fromISO(x.start).plus({ seconds: 1 })
												const x_end = DateTime.fromISO(x.end).minus({ seconds: 1 })
												return (start < x_end && end > x_start) || (start > x_start && end < x_end)
											})

											let marginTop = 0
											if (has_overlaps.length) {
												marginTop = has_overlaps.length * 20
											}
											return (
												<div
													data-id={item.id}
													key={'#$___3' + item.id}
													className={s.item}
													style={{ marginLeft, width, marginTop }}
													{...(process.env.NODE_ENV === 'development'
														? {
																'data-start': DateTime.fromISO(item.start).toISO(),
																'data-end': DateTime.fromISO(item.end).toISO(),
																'data-last': last?.end,
																'data-overlaps': has_overlaps.length,
															}
														: {})}
												>
													{decodeEntities(item.title)}
												</div>
											)
										})}
								</div>
							</div>
						)
					})}
			</div>
		</div>
	)
}

export default Calender
