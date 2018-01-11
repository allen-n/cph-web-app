#!/usr/bin/env nodejs
//FIXME: maybe the line above will fix the node modules thing?
var http = require('http');
var postHTML =
  '<html><head><title>CyberPowered-Home-Prototype</title></head>' +
  '<body>' +
  '<h2> Incoming Data: </h2>' +
  '<ul class="dataList"> </ul>' +
  '</body></html>';


var Particle = require('particle-api-js');
var particle = new Particle();
var token;

var usr = 'allennikka@gmail.com';
var pass = 'atoughparticlepass123'; //FIXME: put actual login form!!

particle.login({
  username: usr,
  password: pass
}).then(
  function(data) {
    token = data.body.access_token;
  },
  function(err) {console.log("particle connection error: ", err)}
);

// Require the packages we will use:
var http = require("http"),
  socketio = require("socket.io"),
  mysql = require('mysql'),
  fs = require("fs"),
  url = require('url');


// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp) {
  // This callback runs when a new connection is made to our HTTP server.
  // fs.readFile("files/LandingV3.html", function(err, data) {

  var pathname = url.parse(req.url).pathname;
  switch (pathname) {
    case '/signinV4.html':
      break;
    case '/landingV4.html':
      break;
    case '/LandingV3.html':
      break;
    default:
      pathname = '/signinV4.html';
      break;
  }
  // console.log(pathname)
  fs.readFile("files"+ pathname, function(err, data) {
  // This callback runs when the client.html file has been read from the filesystem.


  if (err) return resp.writeHead(500);
  resp.writeHead(200);
  resp.end(data);
  });


});
app.listen(4567);
// app.listen(app.get('port'));



//create SQL database connection
var con = mysql.createConnection({
  host: "localhost",
  user: "CPH",
  password: "secretSAUCE",
  database: 'CPHSQL',
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});


//recieving data from particle
var particleApp = http.createServer(function(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    var patt = /event=send-i%2Cv%2Cpf%2Cs%2Cp%2Cq&data=/;
    if (patt.test(body)) {
      // var dataArray = body.match(/[2C|data=][0-9]*[.][0-9]*[%]/g);
      var dataArray = body.match(/[0-9]*[.][0-9]*/g);
      var labelArray = ["current", "voltage", "power factor",
        "apparent power", "real power", "reactive power", "h1",
        "h2", "h3", "h4", "h5", "h6", "error"
      ];
      // for (i = 0; i < dataArray.length - 1; i++) {
      //   // dataArray[i].replace(/[=]/g,"");
      //   // dataArray[i].replace(/[C]/g,"");
      //   console.log(labelArray[i] + '= ' + dataArray[i]);
      // }
      var dateStamp = body.match(/[0-9]{4}[-][0-9]{2}[-][0-9]{2}/);
      var timeStamp = body.match(/[0-9]{2}%3A[0-9]{2}%3A[0-9]{2}/);
      var newTimeStamp = timeStamp[0].replace(/%3A/g, ":");
      // console.log(newTimeStamp + " " + dateStamp[0]);
      storeIncomingData(dataArray, labelArray);
    }
    // console.log('Original: ' + body);
    res.writeHead(200);
    res.end(postHTML);

    // $(body).insertBefore(".dataList") //FIXME
  });
});
particleApp.listen(3456);

function storeIncomingData(dataArray, labelArray) {
  // console.log("Incoming data: ")
  // for (i = 0; i < dataArray.length - 1; i++) {
  //   // dataArray[i].replace(/[=]/g,"");
  //   // dataArray[i].replace(/[C]/g,"");
  //   console.log(labelArray[i] + '= ' + dataArray[i]);
  // }
  //FIXME: don't log readings of less than 100 mA, need to up sensitivity of hardware
  console.log("Incoming current is: " + dataArray[0]);
  if (dataArray[0] <= 0.1) {
    for (var i = 0; i < 12; i++) {
      dataArray[i] = 0
    }
  }
  var databaseName = "timeEntryuserA1"; //+data.user;
  var sql = "INSERT INTO " + databaseName +
    " (current, voltage, Pfactor, apparentP, realP, reactiveP, x1, x2, x3, x4, x5, x6) VALUES (" +
    dataArray[0] + ", " + dataArray[1] + ", " + dataArray[2] + ", " + dataArray[3] +
    ", " + dataArray[4] + ", " + dataArray[5] + ", " + dataArray[6] + ", " + dataArray[7] +
    ", " + dataArray[8] + ", " + dataArray[9] + ", " + dataArray[10] + ", " + dataArray[11] +")";
  con.query(sql, function(err, result) {
    if (err) throw err;
    io.sockets.emit("changeLogged", {
      user: "autoData"
    });
  });
  measureChange(databaseName);
}

function measureChange (databaseName){
  var sql = "SELECT * FROM "+ databaseName + " ORDER BY event_id DESC LIMIT 2";

  con.query(sql, function(err, result) {
    if (err) throw err;

    if (result.length === 2) {
      var current = result[0]; //FIXME: may need to reverse if I got the order wrong
      var prev = result[1];
      var diff = {};
      var diffStr = "";
      var atZero = true;
      for (var key in current){
        if (current.hasOwnProperty(key)) {
          diff[key] = current[key] - prev[key];
          diffStr += key+" : "+ diff[key];
          if(current[key] !== 0 && prev[key] === 0 && atZero) atZero = false;
        }
      }
      // console.log("Diff: " + diffStr);
    }
    console.log("at zero? " + atZero);
    if(!atZero){
      var posChange = diff.apparentP > 0; //FIXME: for determing whether device turned on or off
      for (var k2 in diff) {
        if (diff.hasOwnProperty(k2)) {
          diff[k2] = Math.abs(diff[k2]);
          // console.log(k2 + ' : ' + diff[k2])
        }
      }
      databaseName = "devicesA1";
      sql = 'SELECT * FROM ' + databaseName + ' WHERE';
      var hi = 1.10; var lo = 0.90; // threshold positive/negative of 5%
      // so that we aren't comparing on non-comparison keys
      var badKeys = {"event_id":0,"time":0, "text1":0, "text2":0, "text3":0};

      for (var k in diff) {
        if (diff.hasOwnProperty(k) && !(badKeys.hasOwnProperty(k))) {
          sql += ' ' + k + ' >= ' + (diff[k] * lo).toFixed(2) + ' AND ' +
          k + ' <= ' + (diff[k] * hi).toFixed(2) + ' AND'
        }
      }
      sql = sql.substr(0, sql.lastIndexOf(' AND'));
      console.log("posChange = " + posChange);
      // console.log("Active device query: " + sql
      con.query(sql, function(err, devices) {
        if (err) throw err;
        console.log("devices.length = " + devices.length);
        if (devices.length > 0) {
          for (var i = 0; i < devices.length; i++) {
            io.sockets.emit("devicesPowered", {
              user: 'FIXME',
              deviceName: devices[i].deviceName,
              realP: devices[i].realP,
              pFactor: devices[i].pFactor,
              posChange: posChange,
              error: null
            });
          }
        } else {
          io.sockets.emit("promptDeviceAdd", {
            user: 'FIXME',
            diff: diff,
            posChange: posChange,
            error: null
          });
        }

      });
    } else {
      io.sockets.emit("devicesPowered", {
        user: "FIXME",
        deviceName: "",
        realP: "",
        pFactor: "",
        posChange: "",
        error: null
      });
    }
    // console.log('SQL: ' + sql)
    // io.sockets.emit("changeLogged", {
    //   user: "autoData"
    // });
  });



}

//global vars
var devices = [];
var successDevices = [];
var firstLoad = true;
var mostRecent;
var currentDeviceInfo = null; //holds all database information about current device profile;

// server interactions with client via socketio
var io = socketio.listen(app);
io.sockets.on("connection", function(socket) {

  //check if registered user
  socket.on('login_attempt', function(data) {

    con.query("SELECT * FROM users", function(err, result, fields) {
      if (err) throw err;
      var successUser = false;
      var successPass = false;
      for (var i = 0; i < result.length; i++) {
        if (data.userName == result[i].userName) {
          successUser = true;
          if (data.password == result[i].password) {
            successPass = true;
            deviceInfoPush(); //push the device list
          }
        }
      }
      io.sockets.emit("loginResult", {
        user: data.userName,
        password: data.password,
        successPass: successPass,
        successUser: successUser
      });
    });

  });

  //response to creating device
  socket.on('createDevice', function(data) {
    if(data.changePrompt && data.changeData) createDevice(data.deviceName, data.user, data.changePrompt, data.changeData, data.posChange);
    else createDevice(data.deviceName, data.user);
  });

  // response to user input to create new device profile
  function createDevice(deviceName, user, changePrompt = false, changeData = null, posChange = null) {
    if(currentDeviceInfo ){
      var databaseName = "devicesA1";
      var sql = 'SELECT * FROM ' + databaseName + ' WHERE deviceName = \'' + deviceName + '\'';
      con.query(sql, function(err, result) { //check if the device already exists
        if (err) throw err;
        if(result.length === 0) {
          let cdi;
          if(!changePrompt) cdi = currentDeviceInfo;
          else cdi = changeData;
          sql = "INSERT INTO " + databaseName + " ( current, voltage, Pfactor," +
    " apparentP, realP, reactiveP, x1, x2, x3, x4, x5, x6, deviceName) VALUES (" +
    cdi.current + ", " + cdi.voltage + ", " + cdi.Pfactor + ", " + cdi.apparentP + ", " + cdi.realP +
    ", " + cdi.reactiveP + ", " + cdi.x1 + ", " + cdi.x2 + ", " + cdi.x3 +
    ", " + cdi.x4 + ", " + cdi.x5 + ", " + cdi.x6 + ", \'" + deviceName + "\')";
          // console.log("SQL: " + sql);
          // for (var v in cdi) {
          //   if (cdi.hasOwnProperty(v)) {
          //     console.log(v + " : " + cdi[v]);
          //   }
          // }

          con.query(sql, function(err, result) {
            if (err) throw err;
            io.sockets.emit("deviceCreated", {
              user: user,
              deviceName: deviceName,
              error: null
            });
            io.sockets.emit("refreshDisplay");
          });
        } else if (changePrompt) {
          io.sockets.emit("promptDeviceAdd", {
            user: 'FIXME',
            diff: changeData,
            posChange: posChange,
            error: 'Device name taken, try again.'
          });
        } else {
          io.sockets.emit("deviceCreated", {
            user: user,
            deviceName: deviceName,
            error: 'Device name taken, try again.'
          });
        }
      });
    } else {
      io.sockets.emit("deviceCreated", {
        user: user,
        deviceName: deviceName,
        error: 'No devices currently detected, try changing time view.'
      });
    }
  }

  //response to user input on relay (circuit) control
  socket.on('setRelay', function(data) {

    var publishEventPr = particle.publishEvent({
      name: data.name,
      data: data.data,
      auth: token
    });

    publishEventPr.then(
      function(data) {
        if (data.body.ok) {
          console.log("Event setRelay1 published succesfully")
        }
      },
      function(err) {
        console.log("Failed to publish event setRelay1: " + err)
      }
    );

  });

  //push device info to client side for display
  function deviceInfoPush() {
    var databaseName = "devicesA1";
    var sql = 'SELECT * FROM ' + databaseName;
    con.query(sql, function (err, devices) {
      // console.log("Sending device data, length: "+ devices.length )
      if (err) throw err;
      for (var i = 0; i < devices.length; i++) {
        // console.log(devices[i]);
        if (i === 0) {
          io.sockets.emit("devicesUpdate", {
            deviceName: devices[i].deviceName,
            Pfactor: devices[i].Pfactor,
            realP: devices[i].realP,
            first: true
          });
        } else {
          io.sockets.emit("devicesUpdate", {
            deviceName: devices[i].deviceName,
            Pfactor: devices[i].Pfactor,
            realP: devices[i].realP,
            first: false
          });
        }
      }
    });


  }

  socket.on('updateDisplay', function(data) {
    updateServerDisplay(data);
  });

  //updating the data, for display in graphs
  function updateServerDisplay(data) {
    deviceInfoPush();
    // console.log('change data below');
    // measureChange("timeEntryuserA1"); //FIXME, this is just for testing
    var databaseName = "timeEntry" + data.user;
    var date = new Date();

    var year = "" + date.getFullYear();
    var month = "" + date.getMonth();
    var day = "" + date.getDate();
    var hour = "" + date.getHours();
    var sql;

    if (date.getDate() < 10) {
      day = "0" + day;
    }
    // console.log(date);
    // console.log("dimension is: "+data.dimension);
    sql = "SELECT * FROM " + databaseName;

    //FIXME: the sizing error isn't coming from here
    let win_length = 1;
    sql += " WHERE time >= now() - interval " + win_length;
    if (data.dimension) {
      sql += " " + data.dimension;
    } else {
      sql += " " + 'year';
    }

    con.query(sql, function(err, result, fields) {
      if (err) throw err;
      if (result.length > 0) {
        // console.log(result[1]);
        // console.log(result[1].time);

        //The abreviations here may not all be correct, they are guesses.
        var monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Nov", "Dec"];

        var prevDate, currentDate, prevPower, currentPower = null;
        var intervalE = 0;
        for (var i = 0; i < result.length; i++) {
          currentDate = new Date(result[i].time);
          currentPower = result[i].realP;
          if (prevDate && prevPower) {
            intervalE = (Date.parse(currentDate) - Date.parse(prevDate)) * prevPower / (1000); //energy in Joules
          }
          intervalE = intervalE / (3600); //energy in Watt-Hours
          prevDate = currentDate;
          prevPower = currentPower;

          // console.log("test intervalE: " + intervalE  )
          var timeString = "" + result[i].time;
          var timeArray = timeString.split(/[- :]/);

          var monthC = 0;
          for (var j = 0; j < monthArr.length; j++) {
            if (monthArr[j] == timeArray[1]) {
              // console.log(monthArr[j]);
              // console.log(timeArray[1]);
              monthC = j + 1;
            }
          }


          var timeStringF = "" + timeArray[3] + "-" + monthC + "-" + timeArray[2] + " " + timeArray[4] + ":" + timeArray[5] + ":" + timeArray[6];
          // console.log("timeStringF:" + timeStringF);
          // console.log("result[i].power:" + result[i].realP);
          var harmonics = [result[i].x1, result[i].x2, result[i].x3, result[i].x4, result[i].x5, result[i].x6];
          var frequencies = [0, 60, 120, 180, 240, 300];
          var clearGraphs = false;
          if (i == 0 && data.resize) clearGraphs = true;
          if (i < result.length - 1) {
            io.sockets.emit("updateResult", {
              user: data.userName,
              x: timeStringF,
              y: result[i].realP,
              y2: intervalE,
              xH: frequencies,
              yH: harmonics,
              final: false,
              clearGraphs: clearGraphs,
            });
          } else {
            currentDeviceInfo = result[i];
            io.sockets.emit("updateResult", {
              user: data.userName,
              x: timeStringF,
              y: result[i].realP,
              y2: intervalE,
              xH: frequencies,
              yH: harmonics,
              final: true,
              clearGraphs: false
            });
          }
        }
      } else {
        io.sockets.emit("updateResult", {
          user: data.userName,
          x: [],
          y: [],
          xH: [],
          yH: [],
          final: true,
          clearGraphs: true
        });
      }
    });


  }

});
