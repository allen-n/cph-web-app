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

  var cheerio = require('cheerio'),
      $ = cheerio.load('<h3 class = "title">Hello world</h3>');

  $('h3.title').text('Hello there!');
  $('h3').addClass('welcome');

  $.html();

// var particleSRC = '//cdn.jsdelivr.net/particle-api-js/5/particle.min.js';
// $.getScript(particleSRC, function() {

var Particle = require('particle-api-js');
var particle = new Particle();
var token;

var usr = 'allennikka@gmail.com';
var pass = 'atoughparticlepass123' //FIXME: put actual login form!!

particle.login({
  username: usr,
  password: pass
}).then(
  function(data) {
    token = data.body.access_token;
  },
  function(err) {
    console.log('Could not log in.', err);
  }
);

http.createServer(function(req, res) {
  var body = "";
  req.on('data', function(chunk) {
    body += chunk;
  });
  req.on('end', function() {
    console.log('POSTed: ' + body);
    res.writeHead(200);
    res.end(postHTML);
    // $(body).insertBefore(".dataList") //FIXME
  });
}).listen(3456);
// });
