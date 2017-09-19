var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

const cookieParser = require('cookie-parser');
app.use(cookieParser());


var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


app.get("/urls", (req, res) => {
  let templateVars = { username: req.cookies['username'], urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.post('/login', (req, res) => {
  //res.cookieParser('cookie', 'test');
  let username = req.body['username'];
  res.cookie('username', username);
  res.redirect('/urls');
});

app.post("/urls", (req, res) => {
  //if user submittion does not include https://, include it
  let str = generateRandomString();
  if (urlDatabase[str]){
    while (urlDatabase[str]) {
      str = generateRandomString();
    }
  }
  let longURL = prependHTTP(req.body['longURL']);
  urlDatabase[str] = longURL;

  res.redirect('/urls/' + str);
});

app.get("/urls/new", (req,res) => {
  
  res.render("urls_new", { username: request.cookies['username']});
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  let templateVars = { 
    shortURL: req.params.id, 
    urls: urlDatabase,
    username: req.cookies['username'] 
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let updatedURL = prependHTTP(req.body['updatedURL']);
  urlDatabase[req.params.id] = updatedURL;
  res.redirect('/urls/' + req.params.id);
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]){
    
    res.redirect(404, '/urls');
  }
  let longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});
//request, response
/*app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
*/

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.post('/logout', (req,res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

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

function prependHTTP(str){
  if (str){
    let beginURL = 'http://';
    if (!str.includes(beginURL)){
      str = beginURL + str;
    }
    return str;
  }
}