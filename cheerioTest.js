var http = require('http');
var cheerio = require('cheerio');
http.createServer(function(req, res) {
var $ = cheerio.load(html);
  $ = cheerio.load('<h3 class = "title">Hello world</h3>');

  $('h3.title').text('Hello there!');
  $('h3').addClass('welcome');

  $.html();

}).listen(3456);
