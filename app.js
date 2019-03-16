
// ======================================
//   DEPENDENCIES
// ======================================
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const router = express.Router();

var mongourl = "mongodb://localhost:27017/";


// ======================================
//   ROUTING
// ======================================
router.get('/',function(request, response)
{
  response.sendFile(path.join(__dirname + '/html/index.html'));
});
router.get('/create',function(request, response)
{
    response.sendFile(path.join(__dirname + '/html/create.html'));
});
router.get('/login',function(request, response)
{
    response.sendFile(path.join(__dirname + '/html/login.html'));
});

//make all resources avaliable on same level
app.use(express.static(__dirname + '/html/'));
app.use(express.static(__dirname + '/js/angularjs/'));
app.use(express.static(__dirname + '/js/angularjs/controllers/'));
app.use(express.static(__dirname + '/js/backstretch/'));
app.use(express.static(__dirname + '/js/cors/'));
app.use(express.static(__dirname + '/js/mine/'));
app.use(express.static(__dirname + '/images/'));
app.use(express.static(__dirname + '/css/'));
app.use('/', router);


// ======================================
//   USER ACCOUNT REQUESTS
// ======================================

app.get('/login', function (request, resp) 
{
    var username = request.query.username;
    var password = request.query.password;

    // logic

    return true;
});

app.get('/create', function (request, resp) 
{
    var email = request.query.email;
    var username = request.query.username;
    var password = request.query.password;

    // logic

    return true;
});


// ======================================
//   MAIN REQUESTS
// ======================================

// yelp data for each mongo datapoint on load
app.get('/init', function (request, resp) 
{
    pullmongo(function callback() 
    { 
        yelpDataList = [];
        for (i = 0; i < mongoData.length; i++)
        {
            //console.log(mongoData[i]);
            term = mongoData[i].name;
            loc = mongoData[i].city + ", " + mongoData[i].state;
            yelp(term, loc, function callback2()
            {
                yelpDataList.push(yelpData);
            });
        }
        //wait and then send list off    // MAKE BETTER!!!!!!!!!!!!!!!!!!!!!!!!1
        proxy(1200, function callback3()
        {
            //console.log(yelpDataList);
            resp.send(yelpDataList);
        });
    });
});


// sends off yelp data on params passed in
app.get('/yelp', function (request, resp) 
{
  var term = request.query.term;
  var location = request.query.location;
  yelp(term, location, function callback() 
  {
        resp.send(yelpData);

  });
});

// sends off yelp data on params passed in
app.get('/places', function (request, resp) 
{
    var lat = request.query.lat;
    var long = request.query.long;
    var range = request.query.range;
  yelps(lat, long, range, function callback() 
  {
        resp.send(yelpArray);
  });
});


// GET method route pushes to mongo
app.get('/favorite', function (request, resp) 
{
  var term = request.query.term;
  var location = request.query.location;
  yelp(term, location, function callback() 
  { 
      pullmongo(function callback2()
      {
          // make sure not in there
          var alreadySaved = false;
          for (i = 0; i < mongoData.length; i++)
          {
              if(mongoData[i].name == yelpData.name && 
                 mongoData[i].city == yelpData.location.city &&
                 mongoData[i].state == yelpData.location.state)
              {
                  console.log("already saved");
                  alreadySaved = true;
              }
          }
          if(!alreadySaved) // favorite
          {
              pushmongo({"name": yelpData.name, "city": yelpData.location.city, "state": yelpData.location.state});
          }
          else // unfavorite
          {
              removemongo({"name": yelpData.name, "city": yelpData.location.city, "state": yelpData.location.state});
          }
          resp.send([alreadySaved, yelpData]);
      });
  });
});



function proxy(time, cb)
{
    setTimeout(cb, time);
}


// ======================================
//   MONGO
// ======================================
function pushmongo(json)
{
    var database = "foodfinder";
    var collection = "stars";
    MongoClient.connect(mongourl, { useNewUrlParser: true }, function(err, db) 
    {
        if (err) 
            throw err;
        var dbo = db.db(database);
        dbo.collection(collection).insertOne(json, function(err, res) 
        {
            if (err) 
                throw err;
            console.log("mongo data pushed");
            db.close();
        });
    });
}

function pullmongo(callback)
{
    var database = "foodfinder";
    var collection = "stars";
    MongoClient.connect(mongourl, { useNewUrlParser: true }, function(err, db)
    {
        if (err) 
            throw err;
        var dbo = db.db(database);
        dbo.collection(collection).find({}).toArray(function(err, res)
        {
            if (err) 
                throw err;
            mongoData = res;
            console.log("mongo data pulled");
            db.close();
            callback();
        });
    });
}

function removemongo(json)
{
    var database = "foodfinder";
    var collection = "stars";
    MongoClient.connect(mongourl, { useNewUrlParser: true }, function(err, db) {
        if (err) 
            throw err;
        var dbo = db.db(database);
        dbo.collection(collection).deleteOne(json, function(err, obj) 
        {
            if (err) 
                throw err;
            console.log("1 document deleted");
            db.close();
        });
    });
} 


// ======================================
//   YELP API
// ======================================
function yelp(term, loc, callmemaybe)
{
    const yelp = require('yelp-fusion');

    // from https://www.yelp.com/developers/v3/manage_app
    const apiKey = '4dIx9HKv-klKh_nvUWaHAZqe_a-wQqi49uoJICQIfxdWFj0VS-8uw1TfrFoe2CVsKJeX7BRv0nntSA4svU-G_qiSkfHxYIfk_D83YWoAjRMfuz21UMnzT5_PPA53XHYx';

    const searchRequest = 
    {
        term: term, //'Four Barrel Coffee',
        location:  loc //'san francisco, ca'
    };

    var client = yelp.client(apiKey);
    client.search(searchRequest).then(response => {
        yelpData = response.jsonBody.businesses[0];
        prettyJson = JSON.stringify(yelpData, null, 4);
    
        //console.log(prettyJson);
        console.log("yelp data pulled");
        callmemaybe();

      }).catch(e => {
        console.log(e);
    });

}

// ======================================
//   YELP API
// ======================================
function yelps(lat, long, range, callmemaybe)
{
    const yelp = require('yelp-fusion');

    // from https://www.yelp.com/developers/v3/manage_app
    const apiKey = '4dIx9HKv-klKh_nvUWaHAZqe_a-wQqi49uoJICQIfxdWFj0VS-8uw1TfrFoe2CVsKJeX7BRv0nntSA4svU-G_qiSkfHxYIfk_D83YWoAjRMfuz21UMnzT5_PPA53XHYx';

    const searchRequest = 
    {
        term: 'food',
        latitude: lat,
        longitude: long,
        radius: range   // meters
    };

    var client = yelp.client(apiKey);
    client.search(searchRequest).then(response => {
        yelpArray = response.jsonBody.businesses;
        // console.log(yelpArray);
        // yelpData = yelpArray[0];
        // prettyJson = JSON.stringify(yelpData, null, 4);

        //console.log(prettyJson);
        console.log("yelp data pulled");
        callmemaybe();

      }).catch(e => {
        console.log("yelp data not found");
    });

}


// ======================================
//   HTTPS Certificate
// ======================================
const privateKey = fs.readFileSync('/etc/letsencrypt/live/foodfinder.xyz/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/foodfinder.xyz/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/foodfinder.xyz/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};


// ======================================
//   Starting both http & https servers
// ======================================
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
 	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
 	console.log('HTTPS Server running on port 443');
});
