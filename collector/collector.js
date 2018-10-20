const compression = require("compression");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const useragent = require("useragent");
let session = require("express-session");
const Forecast = require("forecast");
const axios = require('axios');
const mongodb = require("mongodb");
const mongoose = require('mongoose');
let MongoStore = require('connect-mongo')(session);
var uniqueValidator = require('mongoose-unique-validator');
const morgan = require('morgan');
const httpa = require('http');

const countriesData = require("country-data").countries;
const useragents = require("ua-parser");
const uuid = require("node-uuid");
const geoip = require("geoip-lite");
const path = require("path");
const fs = require("fs");

const http = require('request');
const bcrypt = require('bcrypt');

////////////////////////////////////////////////////////
//
//        CONFIG FILES
//
const Conf = require("./configuration/server.json");
const APIKEYS = require("./configuration/apikeys.json"); // done

////////////////////////////////////////////////////////
//
//      Seed for Session: secretServiceID and security seeding
//
//
const secretServiceID = genuuid("Secret Service ID creation");
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

////////////////////////////////////////////////////////
//
//              log4js   setup
//
const log4js = require('log4js');
log4js.configure({
  appenders: {
    out: {type: 'stdout'},
    app: {type: 'file', filename: Conf.logFile}
  },
  categories: {
    default: {appenders: ['out', 'app'], level: 'debug'}
  }
});
const logger = log4js.getLogger();
logger.level = Conf.logLevel[Conf.env]; // default level is OFF - which means no logs at all.

////////////////////////////////////////////////////////
//
//              Weather API
//
const foreCastOptions = {
    service: "darksky",
    key: APIKEYS.foreCastAPIKey,
    units: Conf.foreCastunits,
    exclude: Conf.foreCastexclude,
    cache: false,
    timeout: Conf.foreCasttimeout
  },
  forecast = new Forecast(foreCastOptions);

////////////////////////////////////////////////////////
//
//              MongoDB and Persistent Connection
//
const mongooseOptions = {
  autoIndex: false, // Don't build indexes
  reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0
};

mongoose.connect('mongodb://localhost:27017/lifemesh', mongooseOptions);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("Database is up and we are connected");
});

let app = express();
/////////////////////////////////////////////
//
//   Session setup
//
app.use(
  session({
    name: Conf.sessionName,
    secret: secretServiceID, // generated before we get here above;
    resave: true,
    cookie: {secure: false},
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
  })
);


////////////////////////////////////////////////////////
//
//              Express settings, routes,  etc.
//

//CORS middleware
const allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Max-Age', '86400');
  next();
};
app.use(allowCrossDomain);
////////////////////////////////////////////////////////
// init the base express

app.locals.title = Conf.title;

app.use(compression());
app.set("views", path.join(__dirname, "views"));
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true); //
  next();
});
app.engine("html", require("ejs").renderFile);
app.engine("insert", require("ejs").renderFile);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());


app.use(morgan('dev'));


app.get("/activityData", function (request, response) {

  console.log('glboal data get \n\n\n\n');
  let data = {};
  data.raw = [];
  data.browser = [];
  data.os = [];
  let countryKey;
  db.collection("activityLog").find({
    $and: [{"city.country": {$exists: true}}, {
      "city.city": {$exists: true},
      $where: "this.city.city.length > 1"
    }], activity: '/'
  }).toArray(function (error, result) {
    if (error) {
      console.log('database error of some sort', error);
      response.json("Systems issues come back later");
    } else if (result === null) {
      console.log('empty result');
      response.json({});
    } else {
      for (let i = 0; i < result.length; i++) {
        let rowDate = new Date(parseInt(result[i]._id.toString().substring(0, 8), 16) * 1000);
        let visitorInfo = parseuserAgents(result[i].rawbrowserinfo["user-agent"]);
        let positionOf;
        if (typeof visitorInfo === "undefined" || result[i].city.city.length === 0) {
          continue;
        }
        if (visitorInfo.os === "Other" && visitorInfo.browser === "Other") {
          continue;
        }

        if (result[i].city.city !== "Unknown") {
          countryKey = countriesData[result[i].city.country].name;
          data.raw.push({
            latitude: result[i].city.ll[0],
            longitude: result[i].city.ll[1],
            city: result[i].city.city,
            country: result[i].city.country,
            date: rowDate,
            browser: visitorInfo.browser,
            os: visitorInfo.os
          });
        }


        if (typeof data[countryKey] === "undefined") {
          data[countryKey] = {

            countryShortCode: data[result[i].city.country],
            browser: [
              {
                name: visitorInfo.browser,
                count: 1
              }
            ],
            os: [
              {
                name: visitorInfo.os,
                count: 1
              }
            ],
            cities: [
              {
                name: result[i].city.city,
                location: result[i].city.ll,
                count: 1
              }

            ],
          }
        } else {
          if (typeof visitorInfo.browser !== "undefined") {
            positionOf = arrayObjectIndexOf(data[countryKey].browser, visitorInfo.browser, "name");
            //console.log (positionOf);
            if (positionOf >= 0) {
              data[countryKey].browser[positionOf].count++;
            } else {
              data[countryKey].browser.push({
                name: visitorInfo.browser,
                count: 1
              });
            }
          }

          if (typeof visitorInfo.os !== "undefined") {
            positionOf = arrayObjectIndexOf(data[countryKey].os, visitorInfo.os, "name");
            if (positionOf >= 0) {
              data[countryKey].os[positionOf].count++;
            } else {
              data[countryKey].os.push({
                name: visitorInfo.os,
                count: 1
              });
            }
          }
          if (typeof result[i].city.city !== "undefined") {
            positionOf = arrayObjectIndexOf(data[countryKey].cities, result[i].city.city, "name");
            if (positionOf >= 0) {
              data[countryKey].cities[positionOf].count++;
            } else {
              data[countryKey].cities.push({
                name: result[i].city.city,
                count: 1,
                location: result[i].city.ll
              });
            }
          }
          if (result[i].city.city.length === 0) {
            // console.log ("short city");
          }
        }
      }
      response.json(data);
    }
  });
});

app.post("/searchGeoData", function (request, response) {

  console.log(request.query);

  db.collection("activityLog").find({"city.country": {$exists: true}, activity: "/"}).toArray(function (error, result) {
    if (error) {
      console.log('database error of some sort', error);
      response.json("Systems issues come back later");
    } else if (result === null) {
      console.log('empty result');
      response.json({});
    } else {
      respond.json({});
    }
  })
});

app.get("/", function (request, response) {
  console.log('server front ');
  request.session.user = "frontdoor"

  let ip = (request.headers["x-real-ip"] || request.connection.remoteAddress);
  if (ip === '127.0.0.1') {
    if (Conf.fakeipFlag === true) {
      ip = Conf.fakeaddress;
    }
    else {
      return;
    }
  }

  let geo = ipGeoData(ip);
  let base = "<base href=\"http://" + Conf.webHost[Conf.env] + ":" + Conf.serverPort[Conf.env] + "/\">";


  if (geo) {
    let theirlocation = geo.city + " " + geo.region + " " + geo.country;
    //response.render('index.html', {title : Conf.title, session : session, baseref : base, city : theirlocation, geo : geo.ll});
  }
  else {
    //response.render('index.html', {title : Conf.title, session : session, baseref : base});
  }
  response.json({});
});


app.get('/getlocation', function (request, response) {

  console.log('get location');
  if (request.session.user) {
    session = 1;
  } else {
    session = 0;
  }
  let ip = (request.headers['x-real-ip'] || request.connection.remoteAddress);

  if (ip === '127.0.0.1') {
    if (Conf.fakeipFlag === true) {
      ip = Conf.fakeaddress
    }
    else {
      return;
    }
  }
  let geo = ipGeoData(ip);

  if (geo) {
    response.json(geo);
    //console.log('geo data', geo);
  }
  else {
    //console.log('no geo data');
    response.json({});
  }
});



app.get(/^\/(img|css|js|images|music|wav|png|data|lib)\/.+$/, function (request, response) {
  request.session.data++;

  response.sendFile(getPath(request));
});


app.get('/getWeather', function (request, response) {
  console.log('weather please');
  let ip = (request.headers["x-real-ip"] || request.connection.remoteAddress);

  if (ip === '127.0.0.1') {
    if (Conf.fakeipFlag === true) {
      ip = Conf.fakeaddress;
    }
    else {
      return;
    }
  }
  let geo = ipGeoData(ip);

  if (geo) {
    forecast.get([geo.ll[0], geo.ll[1]], true, function (error, weather) {
      //console.log(weather.currently);
      if (error) {
        response.json(error);
      }
      else {
        response.json(weather);
      }
    });
  }
  else {
    return;
  }
});
app.get('/getWeatherCurrent', function (request, response) {
  console.log('weather please');
  let ip = (request.headers["x-real-ip"] || request.connection.remoteAddress);


  if (ip === '127.0.0.1') {
    if (Conf.fakeipFlag === true) {
      ip = Conf.fakeaddress;
    }
    else {
      return;
    }
  }
  let geo = ipGeoData(ip);
  if (geo) {
    forecast.get([geo.ll[0], geo.ll[1]], true, function (error, weather) {
      if (error) {
        logger.debug('error during get forecast %o', error);
        return;
      }
      else {
        response.json(weather.currently);
      }
    });
  }
  else {
    return;
  }
});

app.get('/checkWeatherAlert', function (request, response) {
  console.log('weather please');
  let ip = (request.headers["x-real-ip"] || request.connection.remoteAddress);

  if (ip === '127.0.0.1') {
    if (Conf.fakeipFlag === true) {
      ip = Conf.fakeaddress
    }
    else {
      return;
    }
  }
  let geo = ipGeoData(ip);


  if (geo) {
    forecast.get([geo.ll[0], geo.ll[1]], true, function (error, weather) {
      if (error) {
        logger.debug('error during get forecast %o', error);
        return;
      }
      else {
        response.json(weather.alerts);
      }
    });
  }
  else {
    return;
  }
});

app.get('/isslocation', function (request, response) {

  axios.get('http://api.open-notify.org/iss-now.json')
    .then(resp => {
      console.log(resp.data);
      response.json(resp.data);
      })
    .catch(error => {
      console.log('error in iss grab');
      response.json({});
    });

});

app.post('/traveladvisory', function (request, response) {
  // get the two letter code
  // make sure it's a two letter alpha
  // covert to upper case
  console.log('get travel advistory');
  const country = request.query.countrycode.toUpperCase();
  const regEX = /^[A-Z]{2}$/;
  const found = country.match(regEX);

  if (found === null) {
    response.json({});
  }
  else {
    //http://data.international.gc.ca/travel-voyage/
    let jsonresp = {};
    const url = 'http://data.international.gc.ca/travel-voyage/cta-cap-' + country + '.json';

    http(url, {json: true}, (err, res, body) => {
      if(err) {
        return console.log(err);
      }
      response.json(body);
  } )
    ;


  }
});


///////////////////////////////////////////////
//
//		FUNCTIONS
//
function genuuid(whoCalledMe) {

  return uuid.v1({
    node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab],
    clockseq: 0x1234,
    msecs: new Date('2014-07-01').getTime(),
    nsecs: 5678
  });
}

// stackoverflow solution
function arrayObjectIndexOf(myArray, searchTerm, property) {
  for (let i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i][property] === searchTerm) {
      return i;
    }
  }
  return -1;
}

function isValidSession(req, res, next) {
  if (req.session && req.session.user === "frontdoor")
    return next();
  else
    return res.sendStatus(401);
};

function getPath(request) {
  return process.cwd() + "/public" + request.path;
}


function logActivity(request, response, next) {
  let ip = (request.headers['x-real-ip'] || request.connection.remoteAddress);


  if (ip === "99.254.218.212" || ip === "127.0.0.0") {
    next();
  }
  else {
    let geo = ipGeoData(ip);

    db.collection('activityLog').insert({
        user: null,
        activity: '/',
        remoteip: geo.ip,
        ip4: geo.ip,
        orginalUrl: request.orginaUrl,
        city: geo,
        server: request.hostname,
        rawbrowserinfo: request.headers,
      },
      function (error, records) {

      });

    next();
  }
}

function ipGeoData(data) {

  let ipfiltered = data;
  let geo = geoip.lookup(ipfiltered);
  if (geo == null) {
    geo = {};
    geo.ip = ipfiltered;
  }
  else {
    geo.ip = ipfiltered;
  }
  return geo;
}

function parseuserAgents(data) {
  let parseData = {};
  if (data == null) {
    return;
  }
  let r = useragents.parse(data);
  parseData.os = (r.os.family + " " + r.os.major + "." + r.os.minor).replace(/.null/g, "");
  parseData.browser = (r.ua.family + " " + r.ua.major + "." + r.ua.minor).replace(/.null/g, "");
  parseData.device = r.device.family;
  parseData.rawString = r.string;
  return parseData;
}


function filterHitData(data, property) {

  let bucketObject = {};
  for (let row in data) {
    if (data[row][property] === "Other") {
      // TODO: add abiolity to add oppitional filters like china etc
      continue;
    }
    if (typeof bucketObject[data[row][property]] === "undefined") {
      bucketObject[data[row][property]] = {
        type: data[row][property],
        tau: [data[row].unixtime],
        value: 1
      };
    }
    else {
      bucketObject[data[row][property]].tau.push(data[row].unixtime);
      bucketObject[data[row][property]].value += 1;
    }
  }
  return bucketObject;
}

function filterHitDataByTime(data, property, daysAgo) {
  // load up the bucketObject with data but only those in the
  // right timeline

  let bucketObject = {};
  for (let row in data) {
    if (data[row][property] === "Other") {
      // TODO: add abiolity to add oppitional filters like china etc
      continue;
    }
    let tautest = new Date().getTime() - (3600 * 24 * daysAgo * 1000);
    if (((data[row].unixtime * 1000) - tautest) > 0) {
      //console.log('now    timeframe %s', new Date(tautest));
      //console.log('bucket timeframe %s', new Date(data[row].unixtime * 1000));
      //console.log("one minus other  %s\n", (data[row].unixtime * 1000) - tautest);
    }
    else {
      continue;
    }


    if (typeof bucketObject[data[row][property]] === "undefined") {
      bucketObject[data[row][property]] = {
        type: data[row][property],
        tau: [data[row].unixtime],
        value: 1
      };
    }
    else {
      bucketObject[data[row][property]].tau.push(data[row].unixtime);
      bucketObject[data[row][property]].value += 1;
    }
  }
  return bucketObject;
}



///////////////////////////////////////////////////////////////////
//              SERVER START
let server = app.listen(Conf.serverPort[Conf.env], '0.0.0.0', function () {
  let host = server.address().address;
  let port = Conf.serverPort[Conf.env];
  console.log('server host %s is listening on port %s ', host, port);
});
module.exports = app;
