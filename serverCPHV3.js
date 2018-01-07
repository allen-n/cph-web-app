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
  for (i = 0; i < dataArray.length - 1; i++) {
    // dataArray[i].replace(/[=]/g,"");
    // dataArray[i].replace(/[C]/g,"");
    console.log(labelArray[i] + '= ' + dataArray[i]);
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
      for (var key in current){
        if (current.hasOwnProperty(key)) {
          diff[key] = current[key] - prev[key];
        }
      }
    }

    var posChange = diff.apparentP > 0; //FIXME: for determing whether device turned on or off
    for (var k2 in diff) {
      if (diff.hasOwnProperty(k2)) {
        diff[k2] = Math.abs(diff[k2]);
        // console.log(k2 + ' : ' + diff[k2])
      }
    }
    databaseName = "devicesA1";
    sql = 'SELECT deviceName FROM ' + databaseName + ' WHERE';
    var hi = 1.05; var lo = .95; // threshold positive/negative of 5%
    // so that we aren't comparing on non-comparison keys
    var badKeys = {"event_id":0,"time":0, "text1":0, "text2":0, "text3":0};

    for (var k in diff) {
      if (diff.hasOwnProperty(k) && !(badKeys.hasOwnProperty(k))) {
        sql += ' ' + k + ' >= ' + (diff[k] * lo).toFixed(2) + ' AND ' +
        k + ' <= ' + (diff[k] * hi).toFixed(2) + ' AND '
      }
    }
    sql = sql.substr(0, sql.lastIndexOf('AND'));
    con.query(sql, function(err, devices) {
      if (err) throw err;
      for (var i = 0; i < devices.length; i++) {
        io.sockets.emit("devicesPowered", {
          user: user,
          deviceName: devices[i].deviceName,
          error: null
        });
      }
    });
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

  //log a submitted change in energy
  socket.on('logEnergy', function(data) {

    var databaseName = "timeEntry" + data.user;
    var sql = "INSERT INTO " + databaseName + " (current,voltage,realP) VALUES (" + data.current + ", " + data.voltage + ", " + data.watts + ")";
    con.query(sql, function(err, result) {
      if (err) throw err;
      io.sockets.emit("changeLogged", {
        user: data.user
      });
    });
  });

  //response to creating device
  socket.on('createDevice', function(data) {
    createDevice(data.deviceName, data.user);
  });

  // response to user input to create new device profile
  function createDevice(deviceName, user) {
    if(currentDeviceInfo){
      var databaseName = "devicesA1";
      var sql = 'SELECT * FROM ' + databaseName + ' WHERE deviceName = \'' + deviceName + '\'';
      con.query(sql, function(err, result) { //check if the device already exists
        if (err) throw err;
        if(result.length === 0) {
          let cdi = currentDeviceInfo;
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
          });
        } else {
          io.sockets.emit("deviceCreated", {
            user: user,
            deviceName: deviceName,
            error: 'Device name take, try again.'
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

  //pulling devices for use on client side
  socket.on('pullDevices', function(data) {
    //pulls all devices from database and adds to global scope array

    if (firstLoad) {
      firstLoad = false;
      readInDevices();
    } else {
      incrementalCompare(data.learningModeOn);
    }

  });

  //displaying previously recorded devices from database
  function readInDevices() {
    con.query("SELECT * FROM devices", function(err, result, fields) {
      if (err) throw err;
      var tempDevices = [];
      for (var i = 0; i < result.length; i++) {
        var device = {
          deviceName: result[i].text1,
          current: result[i].current,
          voltage: result[i].voltage,
          power: result[i].realP
        };
        tempDevices.push(device);
      }
      devices = tempDevices;

    });
    fullReadIN();
  }

  function incrementalCompare(learningMode) {
    //pulling all change events
    var databaseName = "timeEntryuserA1";
    var sql = "SELECT * FROM " + databaseName;
    con.query(sql, function(err, result) {
      if (err) throw err;

      var obCurrent = result[result.length - 1].current - result[result.length - 2].current;
      var obVoltage = result[result.length - 1].voltage - result[result.length - 2].voltage;
      var obPower = result[result.length - 1].realP - result[result.length - 2].realP;

      mostRecent = {
        current: obCurrent,
        voltage: obVoltage,
        power: obPower
      };

      var returned = compareLoadsDevices(mostRecent.current, mostRecent.voltage, mostRecent.realP);

      if ((!returned) && learningMode) {
        io.sockets.emit("requestName", {
          requestName: "requestName",
          mostRecent: mostRecent
        });
      }

      deviceInfoPush();

    });
  }


  function fullReadIN() {
    //pulling all change events
    var databaseName = "timeEntryuserA1";
    var sql = "SELECT * FROM " + databaseName;
    con.query(sql, function(err, result) {
      if (err) throw err;

      compareLoadsDevices(result[0].current, result[0].voltage, result[0].realP);

      for (var i = 1; i < result.length; i++) {

        compareLoadsDevices((result[i].current - result[i - 1].current), (result[i].realP - result[i - 1].realP), (result[i].reactiveP - result[i - 1].reactiveP));

      }
      deviceInfoPush();

    });
  }


  //comparing loads to eachother so as to identified loads used in circuit
  function compareLoadsDevices(current, voltage, power) {
    //need to add recognition of device removal, (i.e check negatives
    var currentSuccess = false;
    var voltageSuccess = false;
    var powerSuccess = false;

    successDevices = [];
    var count = 0;

    for (var i = 0; i < devices.length; i++) {
      if ((devices[i].current > (current * 0.95)) && (devices[i].current < current * 1.05)) {
        currentSuccess = true;
        if ((devices[i].voltage > (voltage * 0.95)) && (devices[i].voltage < voltage * 1.05)) {
          voltageSuccess = true;
          if ((devices[i].power > (power * 0.95)) && (devices[i].power < power * 1.05)) {
            powerSuccess = true;
            count++;
            device = {
              deviceName: devices[i].deviceName,
              current: devices[i].current,
              voltage: devices[i].voltage,
              power: devices[i].power,
              count: count
            };
            successDevices.push(device);
            return true;
          }
        }
      }
    }

    for (var i = 0; i < successDevices.length; i++) {
      negCurrent = (successDevices[i].current * -1);
      negVoltage = (successDevices[i].voltage * -1);
      negPower = (successDevices[i].power * -1);

      var ncurrentSuccess = false;
      var nvoltageSuccess = false;
      var npowerSuccess = false;


      if ((negCurrent > (current * 0.95)) && (negCurrent < current * 1.05)) {
        ncurrentSuccess = true;
        if ((negVoltage > (voltage * 0.95)) && (negVoltage < voltage * 1.05)) {
          nvoltageSuccess = true;
          if ((negPower > (power * 0.95)) && (negPower < power * 1.05)) {
            npowerSuccess = true;
            successDevices.splice(i, 1);
            return true;

          }
        }
      }
    }
    return false;

  }

  //push device info to client side for display
  function deviceInfoPush() {
    var databaseName = "devicesA1";
    var sql = 'SELECT deviceName FROM ' + databaseName;
    con.query(sql, function (err, devices) {
      console.log("Sending device data, length: "+ devices.length )
      if (err) throw err;
      for (var i = 0; i < devices.length; i++) {
        if (i === 0) {
          io.sockets.emit("devicesUpdate", {
            deviceName: devices[i].deviceName,
            // current: devices[i].current,
            // voltage: devices[i].voltage,
            // power: devices[i].power,
            first: true
          });
        } else {
          io.sockets.emit("devicesUpdate", {
            deviceName: devices[i].deviceName,
            // current: devices[i].current,
            // voltage: devices[i].voltage,
            // power: devices[i].power,
            first: false
          });
        }
      }
    });

    //
    // for (i = 0; i < successDevices.length; i++) {
    //   if (i === 0) {
    //     io.sockets.emit("successDevicesUpdate", {
    //       deviceName: successDevices[i].deviceName,
    //       current: successDevices[i].current,
    //       voltage: successDevices[i].voltage,
    //       power: successDevices[i].power,
    //       count: successDevices[i].count,
    //       first: true
    //     });
    //   } else {
    //     io.sockets.emit("successDevicesUpdate", {
    //       deviceName: successDevices[i].deviceName,
    //       current: successDevices[i].current,
    //       voltage: successDevices[i].voltage,
    //       power: successDevices[i].power,
    //       count: successDevices[i].count,
    //       first: false
    //     });
    //   }
    //
    // }

  }

  //updating the data, for display in graphs
  socket.on('updateDisplay', function(data) {
    deviceInfoPush();
    console.log('change data below');
    measureChange("timeEntryuserA1"); //FIXME, this is just for testing
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
       sql+= " " + data.dimension;
    } else {
      sql+= " " + 'year';
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
        if(prevDate && prevPower) {
          intervalE = (Date.parse(currentDate) - Date.parse(prevDate))*prevPower/(1000); //energy in Joules
        }
        intervalE = intervalE/(3600); //energy in Watt-Hours
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
        y:  [],
        xH:  [],
        yH:  [],
        final: true,
        clearGraphs: true
      });
    }
  });

  });

});
