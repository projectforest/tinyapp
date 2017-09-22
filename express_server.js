var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;
const bodyParser = require("body-parser");
const morgan = require('morgan');

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(morgan('dev'));


const urlDatabase = {
  "9sm5xK": { longURL : "http://www.google.com", user_id: 'ggle'
};

const users = {
};

app.get("/urls", (req, res) => {
  //let templateVars = { username: req.cookies['username'], urls: urlDatabase };
  let templateVars = {
    urls: urlDatabase, 
    users: users,
    user: req.cookies.user_id
  }
  console.log(templateVars);
  res.render("urls_index", templateVars);
});

app.get("/register", (req, res) =>{
  res.render('urls_register');
});

app.post('/register', (req, res) => {
  if (!req.body['email'] || !req.body['password']){
    res.send(400, 'Error: Email address/password empty');
  }

  Object.keys(users).forEach(id => {
    if (users[id]['email'] === req.body['email']){
      res.send(400, 'Error: Email already in use');
    }
  });

  let user_id = generateRandomString();
  if (users[user_id]) {
    while (users[user_id]) {
      users[user_id] = generateRandomString();
    }
  }
  else {
    users[user_id] = user_id;
  }

  users[user_id] = {
    id: user_id,
    email: req.body['email'],
    password: req.body['password']
  }
  res.cookie('user_id', user_id);
  res.redirect('/urls');

});
app.get('/login', (req, res) => {
  res.render('urls_login');
});

app.post('/login', (req, res) => {
  Object.keys(users).forEach(id => {
    console.log(users[id]['email']);
    if(users[id]['email'] === req.body['email'] && users[id]['password'] === req.body['password']) {
      res.cookie('user_id', users[id]['id']);
      res.redirect('/urls');
    }
  });
  res.send(403, 'Error: Login credentials does not exist');
  
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
  let user_id = req.cookies.user_id;
  urlDatabase[str] = {
    longURL: longURL, 
    user_id: user_id
  }
  console.log(urlDatabase);
  res.redirect('/urls/' + str);
});

app.get("/urls/new", (req,res) => {
  
  //res.render("urls_new", { user: req.cookies['username']});
  res.render("urls_new", { users: users, user: req.cookies['user_id']});
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  let templateVars = { 
    shortURL: req.params.id, 
    urls: urlDatabase,
    users: users,
    user: req.cookies.user_id
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let user_id = req.cookies.user_id;
  if(urlDatabase[req.params.id]['user_id'] === user_id) {
    let updatedURL = prependHTTP(req.body['updatedURL']);
    urlDatabase[req.params.id]['longURL'] = updatedURL;
    res.redirect('/urls/' + req.params.id);
  }
  res.send(400, 'attempt to modify link not authorized');
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]){
    
    res.redirect(404, '/urls');
  }
  let longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});
/*app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
*/

app.post("/urls/:id/delete", (req, res) => {
  let user_id = req.cookies.user_id;
  let url_id = req.params.id;
  if(urlDatabase[url_id]['user_id'] === user_id) {
    delete urlDatabase[url_id];
    res.redirect('/urls');
  }
  res.send(401, 'Error: attempt to delete link not authorized');
});

app.post('/logout', (req,res) => {
  res.clearCookie('user_id');
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