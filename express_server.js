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
  templateVars.user = req.session.user_id;
  if (checkLoggedIn(req)){
    templateVars.loggedIn = true;
    templateVars['user_urls'] = userURLS(req.session.user_id);
    res.render('urls_index', templateVars);
    return;
  }
  else{
    templateVars.error = "Error: must be logged in to access this page";
    res.status(401).render('urls_index', templateVars);
    templateVars.error = false;
    return;
  }
  
});

app.get('/register', (req, res) =>{
  if (checkLoggedIn(req)) {
    res.redirect('/');
    return;
  }
  res.render('urls_register');
});

app.post('/register', (req, res) => {
  if (!req.body['email'] || !req.body['password']){
    templateVars.error = "Error: Email addrress/password were empty";
    res.status(400).render('urls_index', templateVars);
    templateVars.error = false;
    return;
  }

  Object.keys(users).forEach(id => {
    if (users[id]['email'] === req.body['email']){
      templateVars.error = "Error: email address already in use";
      res.status(400).render('urls_index', templateVars);
      templateVars.error = false;
      return;
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
  if (checkLoggedIn(req)){
    res.redirect('/');
    return;
  }
  res.render('urls_login');
});

app.post('/login', (req, res) => {
  if (!req.body['email'] || !req.body['password']) {
    templateVars.error = 'Error: Email address/password were empty';
    res.status(400).render('urls_index', templateVars);
    templateVars.error = false;
    return;
  }

  Object.keys(users).forEach(id => {
    if (users[id]['email'] === req.body['email']) {
      if (bcrypt.compareSync(req.body['password'], users[id]['password'])) {
        res.cookie('user_id', users[id]['id']);
        res.redirect('/urls');
        return;
      }
    }
  });
  templateVars.error = 'Error: Login credentials does not exist in database';
  res.status(401).render('urls', templateVars);
  templateVars.error = false;
  return;
  
});

app.post('/urls', (req, res) => {
  if (isLoggedIn(req)) {
    let str = generateRandomString();
    if (urlDatabase[str]){
      while (urlDatabase[str]) {
        str = generateRandomString();
      }
    }
    let longURL = prependHTTP(req.body['longURL']);
    let user_id = req.session.user_id;

    let d = new Date();
    let today = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

    let visits = {
      visits: 0,
      unique: 0,
      ip_address: req.connection.remoteAddress
    }

    urlDatabase[str] = {
      longURL: longURL, 
      user_id: user_id,
      date: today,
      visits: visits
    };
    res.redirect('/urls/' + str);
  }
  res.status(401).send('Error: must be logged in to access this page');
});

app.get('/urls/new', (req,res) => {
  templateVars.user = req.session.user_id;
  if(!checkLoggedIn(req)) {
    templateVars.error = "Error: mus be logged in to access this page".
    res.status(401).render('urls_show', templateVars);
    templateVars.error = false;
    return;
  }
  res.render('urls_new', templateVars);
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  templateVars.shortURL = req.params.id;
  templateVars.user = req.session.user_id;
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    templateVars.error = "Error: this short URL does not exist".
    res.status(404).render('urls_show', templateVars);
    templateVars.error = false;
    return;
  }
  else if (!checkLoggedIn(req)) {
    templateVars.error = "Error: must be logged in to access this page".
    res.status(401).render('urls_show', templateVars);
    templateVars.error = false;
  }
  else if (urlDatabase[req.params.id].user_id !== req.session.user_id) {
    templateVars.error = "Error: Insufficient credentials to access this short URL".
    res.status(403).render('urls_show', templateVars);
    templateVars.error = false;
  }
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  if(!urlDatabase.hasOwnProperty(req.params.id)) {
    templateVars.error = 'Error: This short URL does not exist';
    res.status(404).render('urls_show', templateVars);
    templateVars.error = false;
    return;
  } 
  else if(!isLoggedIn(req)) {
    templateVars.error = 'Error: Must be logged into access this page';
    res.status(401).render('urls_show', templateVars);
    templateVars.error = false;
    return;
  } 
  else if(urlDatabase[req.params.id].userID !== req.session.user_id) {
    templateVars.error = 'Error: Insufficient credentials to access this short URL';
    res.status(403).render('urls_show', templateVars);
    templateVars.error = false;
    return;
  }
  let updatedURL = prependHTTP(req.body['updatedURL']);
  urlDatabase[req.params.id]['longURL'] = updatedURL;
  res.redirect('/urls/' + req.params.id);
  return;
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]){
    if(req.connection.remoteAddress !== urlDatabase[shortURL].visits.ip_address) {
      urlDatabase[shortURL].visits.unique++;
    }
    urlDatabase[shortURL].visits.visits++;
    let longURL = urlDatabase[shortURL].longURL;
    res.redirect(longURL);
    return;
  }
  templateVars.error = 'Error: This short URL has not yet been created';
  res.status(404).render('urls_index', templateVars);
  templateVars.error = false;
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
  console.log(`TinyApp listening on port ${PORT}!`);


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
      user_urls.push({
        url_id: user, 
        url: urlDatabase[user].longURL,
        date: urlDatabase[user].date,
        visits: urlDatabase[user].visits
      });
    }
  }
  return user_urls;
}