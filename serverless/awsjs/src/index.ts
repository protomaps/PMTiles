import "../../../js";

import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

export const handler = async (
	event: APIGatewayEvent,
	context: Context
): Promise<APIGatewayProxyResult> => {
	const response = {
		statusCode: 200,
		body: JSON.stringify("Hello from Lambda!"),
	};
	return response;
};
