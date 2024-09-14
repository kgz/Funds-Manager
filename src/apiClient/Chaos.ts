/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { HttpClient, RequestParams } from './http-client'

export class Chaos<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
	/**
	 * No description
	 *
	 * @tags crate::routes::channels::all
	 * @name GetChannels
	 * @request GET:/chaos/api/admin/channels/
	 */
	getChannels = (params: RequestParams = {}) =>
		this.request<string[], any>({
			path: `/chaos/api/admin/channels/`,
			method: 'GET',
			format: 'json',
			...params,
		})
	/**
	 * No description
	 *
	 * @tags crate
	 * @name Openapi
	 * @request GET:/chaos/api/openapi.json
	 */
	openapi = (params: RequestParams = {}) =>
		this.request<any, any>({
			path: `/chaos/api/openapi.json`,
			method: 'GET',
			format: 'json',
			...params,
		})
}
