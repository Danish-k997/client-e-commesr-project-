/* eslint @typescript-eslint/no-require-imports: "off" */

const { createServer } = require("http");
const next = require("next");

const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((req, res) => {
      Promise.resolve(handle(req, res)).catch((error) => {
        console.error("Request error:", error);

        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
    }).listen(port, hostname, () => {
      console.log(`Next.js running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Next.js:", error);
    process.exit(1);
  });
