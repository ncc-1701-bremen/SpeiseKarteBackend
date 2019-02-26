class AuthentificationManager {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.fs = require('fs');
  }

  checkAuthorization(userData, callback, authToken) {
    const {name, password} = userData;
    this.redisClient.get(name, (err, response) => {
      const currentTime = new Date().getTime();
      const responseJson = response ? JSON.parse(response) : false;
      if(!responseJson || responseJson.validity < currentTime) {
        this.fs.readFile('users.json', 'utf8', (err, data) => {
          
        })
      } else  {
        if(authToken.key === responseJson.key) {
          // authorization token still exists and is valid, so send it back
          callback(true, responseJson);
        } else {
          callback(false);
        }
      }
    })
  }
}

module.exports =  AuthentificationManager;
