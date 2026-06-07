export function readThunkRejectMessage(err: unknown, fallback: string): string {
	if (typeof err === "string") {
		return err;
	}
	if (!err || typeof err !== "object") {
		return fallback;
	}
	const message = Reflect.get(err, "message");
	if (typeof message === "string" && message.length > 0) {
		return message;
	}
	return fallback;
}

export function readAxiosRejectPayload(data: unknown, fallback: string): string {
	if (typeof data === "string" && data.length > 0) {
		return data;
	}
	if (data && typeof data === "object") {
		const message = Reflect.get(data, "message");
		if (typeof message === "string" && message.length > 0) {
			return message;
		}
		const error = Reflect.get(data, "error");
		if (typeof error === "string" && error.length > 0) {
			return error;
		}
	}
	return fallback;
}
