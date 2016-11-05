var express = require('express')
var server = express();

server.get('/', function(req, res){
  res.send('ready');
});

const mockPublicResponse = require('./test/mockPublicResponse.json');
const mockPublicModifiedResponse = require('./test/mockPublicModifiedResponse.json');
server.get('/v2/public', function(req, res){
  if (req.query.modified){
    res.send(mockPublicModifiedResponse)
  }else{
    res.send(mockPublicResponse)
  }
});

const mockPublicItemsResponse = require('./test/mockPublicItemsResponse.json');
const mockPublicItemsModifiedResponse = require('./test/mockPublicItemsModifiedResponse.json');
server.get('/v2/public/timo', function(req, res){
  if (req.query.modified){
    res.send(mockPublicItemsModifiedResponse);
  }else{
    res.send(mockPublicItemsResponse);
  }
});

const mockInfoResponse = require('./test/mockInfoResponse.json');
const mockInfoLatestResponse = require('./test/mockInfoLatestResponse.json');
const mockInfoLatestHistoryResponse = require('./test/mockInfoLatestHistoryResponse.json');
server.get('/info', function(req, res){
  if (req.query.latest === "true" && req.query.history !== "true"){
    res.send(mockInfoLatestResponse);
  }else if (req.query.latest === "true" && req.query.history === "true"){
    res.send(mockInfoLatestHistoryResponse);
  }else {
    res.send(mockInfoResponse);
  }
});

server.listen(3004, function () {
  console.log('Minimal express server is running at port 3004')
});