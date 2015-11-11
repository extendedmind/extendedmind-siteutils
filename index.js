'use strict'

const koaNunjucks = require('./lib/koa-nunjucks-2.js');
const koaRoute = require('./lib/koa-route.js');
const koaSendfile = require('./lib/koa-sendfile.js');
const extendedmind = require('./lib/extendedmind.js');
const extendedmindData = require('./lib/extendedmind-data.js');

exports = module.exports = {
  koaNunjucks: koaNunjucks,
  koaRoute: koaRoute,
  koaSendfile: koaSendfile,
  extendedmind: extendedmind,
  extendedmindData: extendedmindData
}
