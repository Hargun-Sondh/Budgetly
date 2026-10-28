// Vercel serverless entry point. The same Express app is used locally and on Vercel.
const app = require("../server");
module.exports = app;