'use strict'

const koaNunjucks = require('./lib/koa-nunjucks-2.js');
const koaRoute = require('./lib/koa-route.js');
const koaSendfile = require('./lib/koa-sendfile.js');

exports = module.exports = {
  koaNunjucks: koaNunjucks,
  koaRoute: koaRoute,
  koaSendfile: koaSendfile
}
