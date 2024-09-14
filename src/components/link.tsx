import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppSelector } from '../@store/store'
import style_sidebar from '../@scss/sidebar.module.scss'
import { Rights, type TRight } from '../@types/admin/rights'

type TProps = {
	rights?: TRight[]
	paths?: { [index: number]: string }
	notPaths?: { [index: number]: string }
} & React.ComponentProps<typeof NavLink>

const LinkClass = ({ isActive }) => {
	return style_sidebar.link + (isActive ? ' ' + style_sidebar.active : '')
}

const ConditionalLink = ({ rights = [], paths = {}, notPaths = {}, ...props }: TProps) => {
	const current_paths = useLocation().pathname.split('/')
	const { rights: user_rights } = useAppSelector(state => state.userSliceSlice)

	for (const [index, val] of Object.entries(paths)) {
		if (!current_paths[index] || current_paths[index] !== val) {
			console.log({ index, val, current_paths })
			return null
		}
	}

	for (const [index, val] of Object.entries(notPaths)) {
		if (current_paths[index] && current_paths[index] === val) {
			console.log({ index, val, current_paths })
			return null
		}
	}

	if (rights.length) {
		const user_rights_as_RightsEnum = user_rights.map(right => Rights[right] as TRight | undefined)
		for (const right of rights) {
			if (!user_rights_as_RightsEnum.includes(right)) {
				console.log({ right, user_rights })
				return null
			}
		}
	}

	return (
		<NavLink className={LinkClass} {...props}>
			{props.children}
		</NavLink>
	)
}

export default ConditionalLink
