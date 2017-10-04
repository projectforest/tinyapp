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
  sendError(401, res, "Error: must be logged in to access this page");
  
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
    sendError(400, res, "Error: Email addrress/password were empty");
    return;
  }

  Object.keys(users).forEach(id => {
    if (users[id]['email'] === req.body['email']){
      sendError(400, res, "Error: Email addrress already in use");
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
    sendError(400, res, "Error: Email addrress/password were empty");
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
  sendError(401, res, "Error: Login credentials does not exist in database");
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
      ip_address: []
    };
    console.log(visits);
    urlDatabase[str] = {
      longURL: longURL, 
      user_id: user_id,
      date: today,
      visits: visits
    };
    res.redirect('/urls/' + str);
  }
  sendError(401, res, "Error: must be logged in to access this page");
});

app.get('/urls/new', (req,res) => {
  templateVars.user = req.session.user_id;
  if(!checkLoggedIn(req)) {
    sendError(401, res, "Error: mus be logged in to access this page").

    return;
  }
  res.render('urls_new', templateVars);
});

//function(req, res)

app.get("/urls/:id", (req, res) => {
  templateVars.shortURL = req.params.id;
  templateVars.user = req.session.user_id;
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    sendError(404, res, "Error: This short URL does not exist");

    return;
  }
  else if (!checkLoggedIn(req)) {
    sendError(401, res, "Error: must be logged in to access this page");
    return;

  }
  else if (urlDatabase[req.params.id].user_id !== req.session.user_id) {
    sendError(403, res, "Error: Insufficient credentials to access this short URL");
    return;
  }
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  if(!urlDatabase.hasOwnProperty(req.params.id)) {
    sendError(404, res, "Error: This short URL does not exist");

    return;
  } 
  else if(!isLoggedIn(req)) {
    
    sendError(401, res, "Error: Must be logged into access this page'");
    return;
  } 
  else if(urlDatabase[req.params.id].userID !== req.session.user_id) {
    sendError(403, res, "Error: Insufficient credentials to access this short URL");
    return;
  }
  if (req.body['updatedURL']) {
    let updatedURL = prependHTTP(req.body['updatedURL']);
    urlDatabase[req.params.id]['longURL'] = updatedURL;
  }
  res.redirect('/urls/' + req.params.id);
  return;
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]){
    if(urlDatabase[shortURL].visits.ip_address.length === 0) {
      urlDatabase[shortURL].visits.ip_address.push(req.connection.remoteAddress);
    }
    else{
      urlDatabase[shortURL].visits.ip_address.forEach(ip => {
        if (req.connection.remoteAddress !== ip){
          urlDatabase[shortURL].visits.ip_address.push(req.connection.remoteAddress);
          urlDatabase[shortURL].visits.unique++;
        }
      });
    }
    urlDatabase[shortURL].visits.visits++;
    let longURL = urlDatabase[shortURL].longURL;
    res.redirect(longURL);
    return;
  }
  sendError(404, res, "Error: This short URL has not yet been created");
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
  sendError(401, 'Error: attempt to delete link not authorized');
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
    let output = '';
    let beginURL = 'http://';
    if (!str.includes(beginURL)){
      output = beginURL + str;
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

function sendError(status, res, error) {
  templateVars.error = error;
  res.status(status).render('urls_index', templateVars);
  templateVars.error = false;
  return;
}