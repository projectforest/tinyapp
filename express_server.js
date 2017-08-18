var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");




var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  let str = generateRandomString();
  if (urlDatabase[str]){
    while (urlDatabase[str]) {
      str = generateRandomString();
    }
  }
  urlDatabase[str] = req.body['longURL'];
  res.redirect('/urls/' + str);
});

app.get("/urls/new", (req,res) => {
  res.render("urls_new");
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id, urls: urlDatabase };
  res.render("urls_show", templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL];
  let protocol = 'http://';
  if (!longURL.includes('http://')){
    longURL = protocol +longURL;
  }
  res.redirect(longURL);
});
//request, response
/*app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
*/
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);


});

function generateRandomString() {
  let chars = 'abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
  let str = '';
  for (let x = 0; x < 6; x++) {
    let letter = Math.ceil(Math.random() * chars.length - 1);
    str += chars[letter];
  }
  return str;
}