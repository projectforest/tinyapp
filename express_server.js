const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 8080;
app.set("view engine", "ejs");

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SECRET_KEY || 'developer']
}));

const urlDatabase = {
  '9sm5xK': { longURL: 'http://www.google.com', user_id: 'ggle'} 
};

const users = {
};

const templateVars = {
  urls: urlDatabase,
  users: users,
  user: '',
  error: ''
};

app.get('/', (req, res) => {
  if(checkLoggedIn(req)){
    res.redirect('/urls');
  }
  res.redirect('/login');
});

app.get('/urls', (req, res) => {
  //let templateVars = { username: req.cookies['username'], urls: urlDatabase };
  let templateVars = {
    urls: urlDatabase, 
    users: users,
    user: req.session.user_id,
    loggedIn: false
  }
  if (checkLoggedIn(req)){
    templateVars['loggedIn'] = true;
    templateVars['user_urls'] = userURLS(req.session.user_id);
  }
  else{
    res.status(401);
  }
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
  const email = req.body['email'];
  const password = bcrypt.hashSync(req.body['password'], 10);

  users[user_id] = {
    id: user_id,
    email: email,
    password: password
  }
  res.cookie('user_id', user_id);
  res.redirect('/urls');

});
app.get('/login', (req, res) => {
  res.render('urls_login');
});

app.post('/login', (req, res) => {
  Object.keys(users).forEach(id => {
    if (users[id]['email'] === req.body['email']) {
      if (bcrypt.compareSync(req.body['password'], users[id]['password'])) {
        res.cookie('user_id', users[id]['id']);
        res.redirect('/urls');
        return;
      }
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
  let user_id = req.session.user_id;
  urlDatabase[str] = {
    longURL: longURL, 
    user_id: user_id
  }
  console.log(urlDatabase);
  res.redirect('/urls/' + str);
});

app.get('/urls/new', (req,res) => {
  
  //res.render("urls_new", { user: req.cookies['username']});
  //res.render("urls_new", { users: users, user: req.cookies['user_id']});
  if(!checkLoggedIn(req)) {
    res.status(401);
    res.redirect('/urls');
    return;
  }
  let templateVars = { users: users, user: req.session.user_id };
  res.render('urls_new', templateVars);
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  let templateVars = { 
    shortURL: req.params.id, 
    urls: urlDatabase,
    users: users,
    user: req.session.user_id,
    errors: {}
  };
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    templateVars.errors.urlExists = false;
    res.status(401).render('urls_show', templateVars);
    return;
  }
  else if (!checkLoggedIn(req)) {
    templateVars.errors.loggedIn = false;
    res.status(401).render('urls_show', templateVars);
  }
  else if (urlDatabase[req.params.id].user_id !== req.session.user_id) {
    templateVars.errors.owner = false;
    res.status(403).render('urls_show', templateVars);
  }
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let user_id = req.session.user_id;
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
  let longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});
/*app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
*/

app.post("/urls/:id/delete", (req, res) => {
  if (checkLoggedIn(req)) {
    let user_id = req.session.user_id;
    let url_id = req.params.id;
    if (urlDatabase[url_id]['user_id'] === user_id) {
      delete urlDatabase[url_id];
      res.redirect('/urls');
    }
  }
  res.send(401, 'Error: attempt to delete link not authorized');
});

app.post('/logout', (req,res) => {
  delete req.session.user_id;
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

function checkLoggedIn(req) {
  if (req.session.user_id) {
    for (let user in users) {
      if (users[user]['id'] === req.session.user_id) {
        return true;
      }
    }
  }
  return false;
}

function userURLS(id) {
  let user_urls = [];
  Object.keys(urlDatabase).forEach(user, i) => {
    if (urlDatabase[user].user_id === id) {
      user_urls.push({url_id: u, url: urlDatabase[user].longURL});
    }
  }
  return user_urls;
}