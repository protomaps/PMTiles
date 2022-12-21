import {
	Context,
	APIGatewayProxyResult,
	APIGatewayProxyEventV2,
} from "aws-lambda";
import { TileType } from "../../js/index";
import { handlerRaw } from "../aws/src/index";
import { parseAttributes, vtfilter } from "./vtfilter";

export const handler = async (
	event: APIGatewayProxyEventV2,
	context: Context
): Promise<APIGatewayProxyResult> => {
	let attributes = event.queryStringParameters?.attributes;

	function tilePostprocess(a: ArrayBuffer, t: TileType) {
		return vtfilter(new Uint8Array(a), attributes);
	}

	return handlerRaw(event, context, tilePostprocess);
};
