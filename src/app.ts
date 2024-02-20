import express from "express";
import AppRouter from "./router";
import { logWithDate, getAllEndpoints } from "./utils";

const app = express();
const appRouter = new AppRouter();

const endpoints = getAllEndpoints(appRouter.router, "/whatsapp");
endpoints.forEach((e) => logWithDate(`[ROUTE] ${e}`));

app.use("/whatsapp", appRouter.router);

app.listen(7000);



