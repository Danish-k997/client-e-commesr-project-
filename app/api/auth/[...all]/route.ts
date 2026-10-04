import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../lib/auth";
import { connectMongo } from "../../../lib/auth-db";

const handlers = toNextJsHandler(auth);

export const GET = async (...args: Parameters<typeof handlers.GET>) => {
  await connectMongo();
  return handlers.GET(...args);
};

export const POST = async (...args: Parameters<typeof handlers.POST>) => {
  await connectMongo();
  return handlers.POST(...args);
};