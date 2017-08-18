var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.end("<html><body><b>sup</b></body></html>\n");
});
//request, response
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);


});