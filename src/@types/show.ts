import { z } from 'zod'

export const ZShow = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string(),
	channel: z.string(),
	start: z.string(),
	end: z.string(),
})
