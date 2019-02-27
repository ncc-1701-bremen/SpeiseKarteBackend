const jssha = require('jssha');
const randomString = require('randomstring');
const pepper = require('./conf.json').pepper;
const validity = 1800;

class AuthentificationManager {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.fs = require('fs');
  }

  checkAuthorization(userData, callback, authToken) {
    const {name, password} = userData;

    // Check if the auth token exists in the redis store
    this.redisClient.get(name, (err, response) => {
      const currentTime = new Date().getTime()/1000;
      const responseJson = response ? JSON.parse(response) : false;

      // Load the user data if no valid auth token exists
      if(!responseJson || responseJson.validity < currentTime) {
        this.fs.readFile('users.json', 'utf8', (err, data) => {
          const userData = JSON.parse(data)[name];
          // Check if the user exists and then proceed with authentification
          if(userData) {
            // Hash the password and compare it to the saved one
            const shaObj = new jssha("SHA3-512", "TEXT");
            shaObj.update(userData.salt + password + pepper);

            // If the password is correct, create an auth token and send it back
            if(shaObj.getHash("HEX") === userData.password) {
              const authToken = {
                key: randomString.generate(32),
                validity: currentTime + validity
              }
              this.redisClient.set(name, JSON.stringify(authToken));
              callback(true, authToken, "Authentification was sucessfull")
            } else {
              callback(false, null, "Wrong password")
            }
          } else {
            callback(false, null, "User does not exist")
          }
        })
      } else  {
        if(authToken && authToken.key === responseJson.key) {
          // authorization token still exists and is valid, so send it back
          callback(true, responseJson, "Token still valid");
        } else {
          callback(false, null, "The send token differs from the saved one");
        }
      }
    })
  }

  registerNewUser(userData, callback) {
    const {name, password} = userData;
    this.fs.readFile('users.json', 'utf8', (err, data) => {
      const users = JSON.parse(data);
      const existingUserData = users[name];
      if(existingUserData) {
        callback(false, "User does already exist");
      } else {
        const shaObj = new jssha("SHA3-512", "TEXT");
        const salt = randomString.generate(16);
        shaObj.update(salt + password + pepper);
        users[name] = {
          password: shaObj.getHash("HEX"),
          salt: salt
        }
        this.fs.writeFile('users.json', JSON.stringify(users), 'utf8',()=>{});
        callback(true, "User has been created")
      }
    })
  }
};



module.exports = AuthentificationManager;
