const express = require("express");
const AppRouter = require("./router.js");
const { logWithDate, getAllEndpoints } = require("./utils.js");

const app = express();
const appRouter = new AppRouter();

const endpoints = getAllEndpoints(appRouter.router, "/whatsapp");
endpoints.forEach((e) => logWithDate(`[ROUTE] ${e}`));
app.use("/whatsapp", appRouter.router);

app.listen(7000, () => {
    logWithDate("App is listening on PORT 7000");
}, 7000);



