//node set-up

var http = require('http');
var postHTML =
  '<html><head><title>CyberPowered-Home-Prototype</title></head>' +
  '<body>' +
  '<h1>Setting Relay 1</h1>' +
  '<form method="post">' +
  '<input type="radio" name="setRelay1" value="on"> Circuit On<br>' +
  '<input type="radio" name="setRelay1" value="off"> Circuit Off<br>' +
  '</form>' +
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
  function(err) {
  }
);

// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	mysql = require('mysql'),
	fs = require("fs");
 
	// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
	var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	fs.readFile("files/Landing.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
 
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
	
		
});
app.listen(4567);


http.createServer(function(req, res) {
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
            "apparent power", "real power", "reactive power", "error"
          ];
          for (i = 0; i < dataArray.length - 1; i++) {
            // dataArray[i].replace(/[=]/g,"");
            // dataArray[i].replace(/[C]/g,"");
            console.log(labelArray[i] + '= ' + dataArray[i]);
          }
          var dateStamp = body.match(/[0-9]{4}[-][0-9]{2}[-][0-9]{2}/);
          var timeStamp = body.match(/[0-9]{2}%3A[0-9]{2}%3A[0-9]{2}/);
          var newTimeStamp = timeStamp[0].replace(/%3A/g,":");
          console.log(newTimeStamp + " " + dateStamp[0]);
          storeIncomingData(dataArray,labelArray);
        }
			  console.log('Original: ' + body);
			  res.writeHead(200);
			  res.end(postHTML);
		  
        
      
			  // $(body).insertBefore(".dataList") //FIXME
			});
		}).listen(3456);
 
//create SQL database connection
var con = mysql.createConnection({
  host: "localhost",
  user: "CPH",
  password: "secretSAUCE",
  database : 'CPHSQL',
});
con.connect(function(err) {
	if (err) throw err;
	console.log("Connected!");
});

 


//Bring data in from particle and store in database
function storeIncomingData(dataArray,labelArray){
    
    var databaseName = "timeEntryuserA1";//+data.user;
		var sql = "INSERT INTO "+databaseName+ " (current, voltage, Pfactor, apparentP, realP, reactiveP) VALUES ("+dataArray[0]+", "+dataArray[1]+", "+dataArray[2]+", "+dataArray[3]+", "+dataArray[4]+", "+dataArray[5]+")";
		con.query(sql, function (err, result) {
			 if (err) throw err;
			io.sockets.emit("changeLogged",{user:"autoData"});
		});
 }

//must run on each new point and across all points at start-up
function totalOnDevice(){
    var onDevices =[];
    
}



    //calculate change in data to new point (how is new point different from most recent previous point)
    
    //compare change to all devices recorded (and their inverse if negative)
    
    //if match then add (positive) or remove (negative) device from current device list
    
    //if no match, learning mode, and not on start-up then ask for device/change identification




//SEPRATE

//must take total data and estimate total energy use across day/week/month

//must make meaningful graphs(use or power overtime)
