#!/usr/bin/env nodejs

var http = require('http'); //Required for 'serving' webpages the way we currently are

// The POST header seen on data being sent from our Particle microcontroller
var postHTML =
    '<html><head><title>CyberPowered-Home-Prototype</title></head>' +
    '<body>' +
    '<h2> Incoming Data: </h2>' +
    '<ul class="dataList"> </ul>' +
    '</body></html>';

// Code below is all for linking to the Particle microcontroller
var Particle = require('particle-api-js');
var particle = new Particle();
var token;

// Allen will find a way to avoid having this data hardcoded into the server
// code, for now this can be ignored
var usr = 'allennikka@gmail.com';
var pass = 'atoughparticlepass123'; //FIXME: put actual login form!!

particle.login({
    username: usr,
    password: pass
}).then(
    function(data) {
        token = data.body.access_token;
    },
    function(err) {
        console.log("particle connection error: ", err)
    }
);

// Require the packages we will use:
var http = require("http"),
    socketio = require("socket.io"),
    mysql = require('mysql'),
    fs = require("fs"),
    url = require('url');


// Listen for HTTP connections.
// Creating a mini static file server serving our faux sign-in page, and our current landing page (landingV4.html)
var app = http.createServer(function(req, resp) {
    var pathname = url.parse(req.url).pathname; // parse path based on URL
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
    // serve the file according to above pathname
    fs.readFile("files" + pathname, function(err, data) {



        if (err) return resp.writeHead(500);
        resp.writeHead(200);
        resp.end(data);
    });


});
app.listen(3454);
// app.listen(app.get('port'));



// create SQL database connection to CPH database, ideally we don't have these
// passwords etc. hard coded into our web server code
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
particleApp.listen(3455);

function storeIncomingData(dataArray, labelArray) {
    // console.log("Incoming data: ")
    // for (i = 0; i < dataArray.length - 1; i++) {
    //   // dataArray[i].replace(/[=]/g,"");
    //   // dataArray[i].replace(/[C]/g,"");
    //   console.log(labelArray[i] + '= ' + dataArray[i]);
    // }
    //FIXME: don't log readings of less than 100 mA, need to up sensitivity of hardware
    // console.log("Incoming current is: " + dataArray[0]);

    if (dataArray[0] <= 0.1) {
        for (var i = 0; i < 12; i++) {
            dataArray[i] = 0
        }
    }
    var databaseName = "timeEntryuserA2_Vect"; //+data.user;
    var sql = "SELECT * FROM " + databaseName + " ORDER BY time DESC LIMIT 1";
    var atZero = false;
    con.query(sql, function(err1, result1) {
        if (err1) throw err1;
        // console.log("if at zero current should be: " + result1[0].current);
        var incomingDiff;
        if (result1.length > 0) {
            if (result1[0].current) {
                incomingDiff = Math.abs(result1[0].current - dataArray[0])
            }
        } else {
            incomingDiff = 1;
        }
        if (incomingDiff >= 0.04) {
            sql = "INSERT INTO " + databaseName +
                " (current, voltage, Pfactor, apparentP, realP, reactiveP, x1, x2, x3, x4, x5, x6) VALUES (" +
                dataArray[0] + ", " + dataArray[1] + ", " + dataArray[2] + ", " + dataArray[3] +
                ", " + dataArray[4] + ", " + dataArray[5] + ", " + dataArray[6] + ", " + dataArray[7] +
                ", " + dataArray[8] + ", " + dataArray[9] + ", " + dataArray[10] + ", " + dataArray[11] + ")";

            con.query(sql, function(err, result) {
                if (err) throw err;
                io.sockets.emit("changeLogged", {
                    user: "autoData"
                });
            });
            measureChange(databaseName);
        }

    });



}

function measureChange(databaseName) {
    var sql = "SELECT * FROM " + databaseName + " ORDER BY event_id DESC LIMIT 2";

    con.query(sql, function(err, result) {
        if (err) throw err;
        var noChange = false;
        if (result.length === 2) {
            var current = result[0]; //FIXME: may need to reverse if I got the order wrong
            var prev = result[1];
            var diff = {};
            var diffStr = "";
            for (var key in current) {
                if (current.hasOwnProperty(key)) {
                    diff[key] = current[key] - prev[key];
                    diffStr += key + " : " + diff[key];
                }
            }
            // if(diff['current'] <= 0.04) noChange = true;
            // console.log("Diff: " + diffStr);
        }
        // console.log("Had change? " + noChange + " prev at: " + prev.current + " now at: " + current.current);
        if (!noChange) {
            var posChange = diff.apparentP > 0; //FIXME: for determing whether device turned on or off
            for (var k2 in diff) {
                if (diff.hasOwnProperty(k2)) {
                    diff[k2] = Math.abs(diff[k2]);
                    // console.log(k2 + ' : ' + diff[k2])
                }
            }
            databaseName = "devicesA2";
            sql = 'SELECT * FROM ' + databaseName + ' WHERE';
            var lims = {
                "current": 0.07,
                "Pfactor": 0.02,
                "reactiveP": 0.07,
                "x2": 0.02,
                "x3": 0.68,
                "x4": 0.99
            };
            for (var k in diff) {
                if (diff.hasOwnProperty(k) && (lims.hasOwnProperty(k))) {
                    sql += ' ' + k + ' >= ' + (diff[k] * (0.9 - lims[k])).toFixed(2) + ' AND ' +
                        k + ' <= ' + (diff[k] * (lims[k] + 1)).toFixed(2) + ' AND'
                }
            }
            sql = sql.substr(0, sql.lastIndexOf(' AND'));
            // console.log("posChange = " + posChange);
            // console.log("Active device query: " + sql);
            con.query(sql, function(err, devices) {
                if (err) throw err;
                // console.log("devices.length = " + devices.length);
                if (devices.length > 0) {
                    for (var i = 0; i < devices.length; i++) {
                        io.sockets.emit("devicesPowered", {
                            user: 'FIXME',
                            deviceName: devices[i].deviceName,
                            realP: devices[i].realP,
                            Pfactor: devices[i].Pfactor,
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
                Pfactor: "",
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
        if (data.changePrompt && data.changeData) createDevice(data.deviceName, data.user, data.changePrompt, data.changeData, data.posChange);
        // else createDevice(data.deviceName, data.user);
    });

    // response to user input to create new device profile
    function createDevice(deviceName, user, changePrompt = false, changeData = null, posChange = null) {
        if (currentDeviceInfo) {
            var databaseName = "devicesA2";
            var sql = 'SELECT * FROM ' + databaseName + ' WHERE deviceName = \'' + deviceName + '\'';
            con.query(sql, function(err, result) { //check if the device already exists
                if (err) throw err;
                if (result.length === 0) {
                    let cdi = changeData;
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
                        console.log("adding " + deviceName)
                        io.sockets.emit("devicesPowered", {
                            user: 'FIXME',
                            deviceName: deviceName,
                            realP: changeData.realP,
                            Pfactor: changeData.Pfactor,
                            posChange: posChange,
                            error: null
                        });
                        io.sockets.emit("refreshDisplay");
                    });
                } else {
                    console.log("prompting device add from error on " + deviceName)
                    io.sockets.emit("promptDeviceAdd", {
                        user: 'FIXME',
                        diff: changeData,
                        posChange: posChange,
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
        var databaseName = "devicesA2";
        var sql = 'SELECT * FROM ' + databaseName;
        con.query(sql, function(err, devices) {
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

    // object to store previous datapoints:

    //updating the data, for display in graphs
    function updateServerDisplay(data) {
        deviceInfoPush();
        // console.log('change data below');
        // measureChange("timeEntryuserA2_Vect"); //FIXME, this is just for testing
        var databaseName = "timeEntryuserA2_Vect";
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

        let win_length;
        if (data.win_length) {
            win_length = data.win_length;
        } else {
            win_length = 1;
        }
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
                parseDataPoints(result, data);


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

var maxSteps = 3; //time in hours
maxSteps = maxSteps * 3600000; //time in milli seconds

function parseDataPoints(result, data) {
    //The abreviations here may not all be correct, they are guesses.
    var monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Nov", "Dec"];

<<<<<<< HEAD
    if (data.numSteps) maxSteps = data.numSteps; //get max number of datapoints to display
    var stepSize = Math.ceil(result.length / maxSteps);
=======
    // if (data.numSteps) maxSteps = data.numSteps; //get max number of datapoints to display
    // var stepSize = Math.ceil(result.length / maxSteps);
>>>>>>> 112ad4171451cf9567242a8f7c7b92a8a7038c33
    var intervalE = 0;
    var totalPower = null;

    var i = 0; //index
    while (i < result.length) {
        // console.log("in loop 1, i is: " + i);
        totalPower = 0;
        var prevDate, prevPower, currentPower, preIntervalE = null;
        var k = i;
        var denom = 0;
        var initDate = new Date(result[k].time);
        var currentDate = initDate;
        // for (var k = i; k < stopPoint; k++) {
        while ((Date.parse(currentDate) - Date.parse(initDate)) < maxSteps && k < result.length) {
            // console.log('in loop 2, k is: ' + k + " / " + result.length);
            currentDate = new Date(result[k].time);
            currentPower = result[k].realP;
            totalPower += currentPower;
            if (k > 0) {
                prevPower = result[k - 1].realP;
                prevDate = new Date(result[k - 1].time);
                preIntervalE += (Date.parse(currentDate) - Date.parse(prevDate)) * prevPower; //energy in w-h, extra 100
            }
            k++;
            denom++;
        }
<<<<<<< HEAD
        intervalE = preIntervalE / (1000 * 3600); //energy in Watt-Hours
=======
        // console.log('out of loop , i is: ' + i);
        intervalE = preIntervalE / 3600000; //energy in Watt-Hours
>>>>>>> 112ad4171451cf9567242a8f7c7b92a8a7038c33
        // intervalE += tempE / (stopPoint - i);
        // console.log(k + ": IntervalE is " + intervalE + " With prev p = " + prevPower + " date = " + currentDate);
        totalPower = totalPower / denom; //need to normalize for number of datapoints
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
        i += denom;
        console.log('in pre graph i is: ' + i + " / " + result.length);
        if (i == 0 && data.resize) clearGraphs = true;
        if (i < result.length) {
            io.sockets.emit("updateResult", {
                user: data.userName,
                x: timeStringF,
                y: totalPower,
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
                y: totalPower,
                y2: intervalE,
                xH: frequencies,
                yH: harmonics,
                final: true,
                clearGraphs: false
            });
        }

    }
}