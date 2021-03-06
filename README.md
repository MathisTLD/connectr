# Connectr for [Connect](https://github.com/senchalabs/connect) (Node.js)

[![NPM version](https://badge.fury.io/js/connectr.png)](http://badge.fury.io/js/connectr)

Connectr is a layer on top of [Connect](https://github.com/senchalabs/connect) that allows the insertion/removal of middlewares
after the stack has been built. This is especially useful when you don't
have access to the code that sets up your Connect stack (a third party
module for example).

This module also supports Express.

## Install

    npm install connectr

## Usage

```javascript
var connectr = require("@mathistld/connectr")(app);

// you can also monkey patch app directly:
// app = require('connectr').patch(app)

// Add labeled middleware
connectr.use(middleware).as(label);

// Label middleware which is at a specific position on the stack
// This should be used only if you don't have access to the code
// that builds the stack.
//
// Tip: use `app.stack` to inspect the stack
connectr.index(index).as(label);

// Insert before middleware
connectr.use(middleware).as(label).before(label);

// Insert after middleware
connectr.use(middleware).after(label);

// Insert at beginning of stack
connectr.use(middleware).first();

// Insert at end of stack
connectr.use(middleware).last();

// Remove middleware
connectr.remove(label);

// Assign a label to middleware already in the stack
connectr.index(i).as(label);

// the .as, .before and .after calls are optional

// have a problem? try console.log(app.stack)
```

## Simple Example

```javascript
var connect = require('connect'),
var app = connect();
var connectr = require('@mathistld/connectr')(app);

connectr.use(connect.cookieParser).as('cookieParser');

/* ... */

connectr.use(function (req, res, next) {
  console.log('Before cookie parser...');
  next();
}).before('cookieParser').as('log before cookie parser');

```

## Kitchen Sink Example

```javascript
var http = require("http"),
  connect = require("connect"),
  app = connect(),
  connectr = require("connectr")(app);

var cookieParser = connect.cookieParser();

// we need to manually label middlewares
cookieParser.label = "cookieParser";

app.use(cookieParser);

connectr
  .use(function (req, res, next) {
    console.log("Middleware before cookie parser.");
    next();
  })
  .before("cookieParser");

connectr
  .use(function (req, res, next) {
    console.log("Middleware after cookie parser.");
    next();
  })
  .after("cookieParser");

// you can also use connectr to label your middlewares
// instead of labeling them manually as above

connectr.use(connect.bodyParser()).as("bodyParser");

connectr.use(function (req, res, next) {
  console.log("Last middleware");
  res.end("Done!");
});

connectr
  .use(function (req, res, next) {
    console.log("Before body parser");
    next();
  })
  .before("bodyParser")
  .as("beforeBodyParser");

connectr
  .use(function (req, res, next) {
    console.log(
      "I should be called after beforeBodyParser but before bodyParser"
    );
    next();
  })
  .after("beforeBodyParser")
  .as("betweenBeforeBodyParserAndBodyParser");

connectr
  .use(function (req, res, next) {
    console.log("After body parser");
    next();
  })
  .after("bodyParser")
  .as("afterBodyParser");

//console.log(app.stack);

http.createServer(app).listen(3000);
```

## License

MIT: [http://olalonde.mit-license.org](http://olalonde.mit-license.org)
