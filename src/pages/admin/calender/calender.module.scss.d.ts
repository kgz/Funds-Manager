export type Styles = {
	channel: string
	channelContainer: string
	channelData: string
	container: string
	day: string
	item: string
	nowLine: string
}

export type ClassNames = keyof Styles

declare const styles: Styles

export default styles
