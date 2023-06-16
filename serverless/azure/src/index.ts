import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getZxy } from "./get";
import { FetchSource } from "../../../js";

export async function httpTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (!process.env["PMTILES_PATH"]) return { status: 500 };

  return getZxy(request, new FetchSource(process.env["PMTILES_PATH"]));
}

app.http("tiles", {
  route: "{name}/{z:int}/{x:int}/{y:int}.pbf",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: httpTrigger,
});
