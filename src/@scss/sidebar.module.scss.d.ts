export type Styles = {
	active: string
	label: string
	link: string
	logo: string
	main: string
}

export type ClassNames = keyof Styles

declare const styles: Styles

export default styles
