import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	INodePropertyOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
} from 'n8n-workflow';

// Interface in Typeform
export interface ITypeformDefinition {
	fields: ITypeformDefinitionField[];
}

export interface ITypeformDefinitionField {
	id: string;
	title: string;
}

export interface ITypeformAnswer {
	field: ITypeformAnswerField;
	type: string;
	[key: string]: string | ITypeformAnswerField | object;
}

export interface ITypeformAnswerField {
	id: string;
	type: string;
	ref: string;
	[key: string]: string | object;
}

/**
 * Make an API request to Typeform
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs: query,
		uri: `https://api.typeform.com/${endpoint}`,
		json: true,
	};

	query = query || {};

	try {
		if (authenticationMethod === 'accessToken') {
			return await this.helpers.requestWithAuthentication.call(this, 'typeformApi',options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'typeformOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


/**
 * Make an API request to paginated Typeform endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKey?: string): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}

	query.page_size = 200;
	query.page = 0;

	const returnData = {
		items: [] as IDataObject[],
	};

	let responseData;

	do {
		query.page += 1;

		responseData = await apiRequest.call(this, method, endpoint, body, query);

		returnData.items.push.apply(returnData.items, responseData.items);
	} while (
		responseData.page_count !== undefined &&
		responseData.page_count > query.page
	);

	return returnData;
}


/**
 * Returns all the available forms
 *
 * @export
 * @param {ILoadOptionsFunctions} this
 * @returns {Promise<INodePropertyOptions[]>}
 */
export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'forms';
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {});

	if (responseData.items === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const baseData of responseData.items) {
		returnData.push({
			name: baseData.title,
			value: baseData.id,
		});
	}

	return returnData;
}
