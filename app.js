const express = require('express'), app = express(), fs = require("fs"), cors = require("cors"), config = require("./config.json");

app.use(cors({
  'allowedHeaders': ['sessionId', 'Content-Type'],
  'exposedHeaders': ['sessionId'],
  'origin': '*',
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  'preflightContinue': false
}));

app.listen(config.port);

app.get("/", (request, response) => response.redirect(301, "https://github.com/kjellervolla/skkvapi")); // redirect them to the documentation instead
app.get("/ping", (request, response) => response.json({ "online": true })) // if we use a ping service, like UptimeRobot, we use this to say it's online.

for (var code of fs.readdirSync("./codes/")) require("./codes/" + code)(app, config); // start all the code modules