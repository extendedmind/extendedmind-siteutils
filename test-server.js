var express = require('express')
var server = express();

var extraPublicOwner;
var extraPublicOwnerContent;
if (process.argv.length > 3) {
  console.info("loading extra public return value for path /public/" + process.argv[2] + " from file: " + process.argv[3]);
  extraPublicOwner = process.argv[2];
  extraPublicOwnerContent = require(process.argv[3]);
}

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

const mockTimoPublicItemsResponse = require('./test/mockTimoPublicItemsResponse.json');
const mockTimoPublicItemsModifiedResponse = require('./test/mockTimoPublicItemsModifiedResponse.json');
server.get('/v2/public/timo', function(req, res){
  if (req.query.modified){
    res.send(mockTimoPublicItemsModifiedResponse);
  }else{
    res.send(mockTimoPublicItemsResponse);
  }
});

const mockLauriPublicItemsResponse = require('./test/mockLauriPublicItemsResponse.json');
const mockEmptyResponse = require('./test/mockEmptyResponse.json');
server.get('/v2/public/lauri', function(req, res){
  if (req.query.modified){
    res.send(mockEmptyResponse);
  }else{
    res.send(mockLauriPublicItemsResponse);
  }
});

const mockJPPublicItemsResponse = require('./test/mockJPPublicItemsResponse.json');
const mockJPPublicItemsModifiedResponse = require('./test/mockJPPublicItemsModifiedResponse.json');
server.get('/v2/public/jp', function(req, res){
  if (req.query.modified){
    res.send(mockJPPublicItemsModifiedResponse);
  }else{
    res.send(mockJPPublicItemsResponse);
  }
});

const mockTCPublicItemsResponse = require('./test/mockTCPublicItemsResponse.json');
server.get('/v2/public/tc', function(req, res){
  if (req.query.modified){
    res.send(mockEmptyResponse);
  }else{
    res.send(mockTCPublicItemsResponse);
  }
});

const mockInfoResponse = require('./test/mockInfoResponse.json');
const mockInfoLatestResponse = require('./test/mockInfoLatestResponse.json');
const mockInfoLatestHistoryResponse = require('./test/mockInfoLatestHistoryResponse.json');
server.get('/v2/info', function(req, res){
  if (req.query.latest === "true" && req.query.history !== "true"){
    res.send(mockInfoLatestResponse);
  }else if (req.query.latest === "true" && req.query.history === "true"){
    res.send(mockInfoLatestHistoryResponse);
  }else {
    res.send(mockInfoResponse);
  }
});

if (extraPublicOwner && extraPublicOwnerContent){
  server.get('/v2/public/' + extraPublicOwner, function(req, res){
    if (req.query.modified){
      res.send(mockEmptyResponse);
    }else{
      res.send(extraPublicOwnerContent);
    }
  });
}

server.get('/v2/short/:id', function(req, res){
  if (req.params.id === "1"){
    res.send({
      handle: "timo",
    });
  } else if (req.params.id === "2"){
    res.send({
      handle: "lauri",
    });
  } else if (req.params.id === "3"){
    res.send({
      handle: "jp",
    });
  } else if (req.params.id === "4"){
    res.send({
      handle: "tc",
    });
  } else if (req.params.id === "421"){
    res.send({
      handle: "timo",
      path: "productivity",
    });
  } else if (req.params.id === "521"){
    res.send({
      handle: "timo",
      path: "timo-test-note",
    });
  } else if (req.params.id === "930"){
    res.send({
      handle: "tc",
      path: "list-of-servers",
    });
  } else if (req.params.id === "939"){
    res.send({
      handle: "tc",
      path: "authored-note",
    });
  } else if (req.params.id === "938"){
    res.send({
      handle: "tc",
      path: "authored-note-2",
    });
  } else if (req.params.id === "521"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note",
    });
  } else if (req.params.id === "522"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note-2",
    });
  } else if (req.params.id === "523"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note-3",
    });
  } else if (req.params.id === "524"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note-4",
    });
  } else if (req.params.id === "525"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note-5",
    });
  } else if (req.params.id === "526"){
    res.send({
      handle: "lauri",
      path: "lauri-test-note-6",
    });
  // Skip other lauri notes
  } else if (req.params.id === "1021"){
    res.send({
      handle: "jp",
      path: "jp-testing",
    });
  }
});

const mockPreviewResponse = require('./test/mockTimoPreviewItemResponse.json');
server.get('/v2/owners/55449eb6-2fb3-41d5-b806-b4e3be5692cc/data/c876628e-1d67-411a-84f9-5dfedbed8872/preview/1', function(req, res){
  res.send(mockPreviewResponse);
});

server.listen(3004, function () {
  console.log('Minimal express server is running at port 3004')
});
