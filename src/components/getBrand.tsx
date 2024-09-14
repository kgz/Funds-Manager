import { useMemo } from 'react'
import Espn from './brands/espn'

export const getBrand = (brand: string) => {
	// const el = {
	// 	ESPN: Espn,
	// 	ESPN2: Espn,
	// }[brand.toUpperCase()]

	const el = (brand: string) => {
		switch (brand.toUpperCase()) {
			case 'ESPN':
			case 'ESPN2':
			case 'ESPNU':
			case 'ESPNEWS':
				return Espn
			default:
				return null
		}
	}
	const element = el(brand)

	if (!element) {
		console.error('Brand not found', brand)
		return <div>Brand not found {brand}</div>
	}

	return element(brand)
}
