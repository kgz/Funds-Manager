import { z } from 'zod'
import { parseExpression, type CronExpression } from 'cron-parser'

const parser = (value: string) => {
	return parseExpression(value)
}

export const ZCronJob = z.object({
	id: z.number(),
	name: z.string(),
	cron: z.string().transform(parser),
	last_run: z.coerce.date(),
	created_at: z.coerce.date(),
	deleted_at: z.coerce.date().optional(),
	deleted: z.boolean(),
})

export type TCronJob = z.infer<typeof ZCronJob>

export const ZCronJobs = z.array(ZCronJob)
export type TCronJobs = z.infer<typeof ZCronJobs>
