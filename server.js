const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Create a token from a payload
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Verify the token
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Check if the user exists in database
function isAuthenticated({email, password}){
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
}

function writeDataToFile(data) {
  var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {  // WRITE
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({status, message})
      return
    }
  });
}

function addUser(email, password) {
  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({status, message})
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length - 1].id;

    //Add new user
    data.users.push({id: last_item_id + 1, email: email, password: password}); //add some data

    writeDataToFile(data);
  });
}

// Register New User
server.post('/auth/register', (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;

  if(isAuthenticated({email, password}) === true) {
    const status = 401;
    const message = 'Email and Password already exist';
    res.status(status).json({status, message});
    return
  }

  addUser(email, password);

  // Create token for new user
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})

// Login to one of the users from ./users.json
server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;
  if (isAuthenticated({email, password}) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({status, message})
    return
  }
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})

server.use(/^(?!\/auth|\/products)\/?.*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Bearer token missing.'
    res.status(status).json({status, message})
    return
  }
  try {
    let verifyTokenResult;
     verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = verifyTokenResult.message;
       res.status(status).json({status, message})
       return
     }
     next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
})

//Get user by id
server.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log("GET users endpoint called; user id :"+ id);

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 500
      const message = err
      res.status(status).json({status, message})
      return
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    //find the user by id
    const user = data.users.find( u => u.id === id); //add some data

    if (user) {
      return res.status(200).json(user);
    }
    return res.status(404).json({});
  });

})

//PUT user
server.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log("PUT users endpoint called; user id :"+ id);
  const {email, password} = req.body;
  console.log('with data : \''+ email + ', password : XXXXXX ');

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 500
      const message = err
      res.status(status).json({status, message})
      return
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    //Find user to update
    const index = data.users.findIndex( u => u.id === id); //add some data

    if (index !== -1) {
      data.users[index].email = email;
      data.users[index].password = password;

      writeDataToFile(data);

      const user = data.users[index];
      if (user) {
        return res.status(200).json(user);
      }
    }
    return res.status(404).json({});
  });

})

server.use(router)

server.listen(8000, () => {
  console.log('Run Auth API Server')
})
