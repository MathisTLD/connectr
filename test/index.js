const Connectr = require("../index");
const app = require("express")();

const m = new Connectr(app);

const showStack = () => {
  console.log(m.stack.map((l) => l.handle));
};

const createMiddleware = () => (req, res, next) => next();

m.stack.forEach((el, i) => m.index(i).as((i + 2).toString()));
m.use(createMiddleware()).first().as("0");
m.use(createMiddleware(), createMiddleware()).last().as("9", "10");
m.use(createMiddleware()).as("7");
m.use(createMiddleware()).as("1").first();
m.use(createMiddleware(), createMiddleware()).as("5", "6").before("7");
m.use(createMiddleware()).after("7").as("8");

if (!m.stack.every((el, i) => el.handle.label === i.toString())) {
  console.error("❌ wrong stack order");
  showStack();
  process.exit(1);
}

// TODO: ensure nothing is logged in prod
console.log("✅ all tests passed");
