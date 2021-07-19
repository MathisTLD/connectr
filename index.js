module.exports = function (app) {
  return new Connectr(app);
};

class Connectr {
  constructor(app) {
    this.app = app;

    this.stack = app.stack || (app._router ? app._router.stack : null);
    if (!this.stack) {
      // sometimes app._router has not been set yet
      this.app.use((req, res, next) => next());
      this.stack = app.stack || (app._router ? app._router.stack : null);

      if (!this.stack) throw new Error("Cannot find stack");
    }
  }
  // lookup connect.stack if there is a fn with before or after properties
  // and move it at right place
  orderStack(stack = this.stack) {
    const n = stack.length;
    // ensure at first of the stack
    const first = [];
    const last = [];
    for (let i = 0; i < stack.length; i++) {
      const handle = stack[i].handle;
      if (handle._first) {
        first.push(...stack.splice(i, 1));
        i--;
      } else if (handle._last) {
        last.push(...stack.splice(i, 1));
        i--;
      }
    }
    stack.unshift(...first);
    stack.push(...last);
    // Find a handle with a before or after property
    for (let i = 0; i < n; i++) {
      const handle = stack[i].handle;
      if (handle._before || handle._after) {
        const pos = handle._before ? "_before" : "_after";
        // already moved
        if (handle["_moved" + pos]) break;
        const find = handle[pos];
        const index = stack.findIndex(find, this);
        if (index >= 0) {
          // move handle in new position
          // http://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
          stack.splice(
            index + (pos === "_after" ? 1 : 0),
            0,
            ...stack.splice(i, 1)
          );
          // item at stack[i] should also be ordered so prevent for loop to increase
          // FIXME: can this provoke endless loop ?
          if (index > i) i--;
          handle["_moved" + pos] = find;
        }
      }
    }
  }
  use() {
    const path = typeof arguments[0] !== "function" ? arguments[0] : null;

    // checking args
    const fns = Array.from(arguments)
      .flat()
      .filter((f) => typeof f === "function");
    if (!fns.length) throw new TypeError("Please provide a middleware");

    // save current handles in case there is a .as call after .use
    this._current = fns;

    // forward call to app.use
    const args = [];
    if (path !== null) args.push(path);
    args.push(...fns);
    this.app.use.apply(this.app, args);

    this.orderStack();
    return this;
  }
  /**
   * Removes middleware labeled `label`
   *
   * @param {String} label
   */
  remove(f) {
    const find =
      typeof f === "string" ? (layer) => layer.handle.label === f : f;
    if (typeof find !== "function")
      throw new TypeError("please provide a function or a middleware label");
    const i = this.stack.findIndex(find, this);
    if (i >= 0) this.stack.splice(i, 1);
    return this;
  }
  index(index) {
    this._current = [this.stack[index].handle];
    return this;
  }
  as(...labels) {
    if (this._current) {
      if (labels.length > this._current.length)
        throw new Error("too many labels");
      else labels.forEach((label, i) => (this._current[i].label = label));
    } else {
      throw new Error(".as() must be used after a .use() call.");
    }
    this.orderStack();
    return this;
  }
  /**
   * Adds a middleware at the beginning of the stack
   */
  first() {
    if (this._current) {
      this._current.forEach((fn, i) => {
        fn._first = true;
      });
      this.orderStack();
    } else {
      throw new Error(".first() must be called after .use()");
    }
    return this;
  }
  /**
   * Adds a middleware at the end of the stack and make sure it will stay there
   */
  last() {
    if (this._current) {
      this._current.forEach((fn, i) => {
        fn._last = true;
      });
      this.orderStack();
    } else {
      throw new Error(".first() must be called after .use()");
    }
    return this;
  }
  before(f) {
    let find;
    switch (typeof f) {
      case "function":
        find = f;
        break;
      case "string":
        find = (layer) => layer.handle.label === f;
        find.label = f; // used for debug
        break;
      default:
        throw new TypeError("please provide a function or a middleware label");
    }
    if (this._current) {
      this._current.forEach((fn, i) => {
        if (i === 0) {
          fn._before = find;
        } else {
          fn._after = (layer) => layer.handle === this._current[i - 1];
        }
      });
      this.orderStack();
    } else {
      throw new Error(".before() must be called after .use()");
    }

    return this;
  }
  after(f) {
    let find;
    switch (typeof f) {
      case "function":
        find = f;
        break;
      case "string":
        find = (layer) => layer.handle.label === f;
        find.label = f; // used for debug
        break;
      default:
        throw new TypeError("please provide a function or a middleware label");
    }
    if (this._current) {
      this._current.forEach((fn, i) => {
        if (i === 0) {
          fn._after = find;
        } else {
          fn._after = (layer) => layer.handle === this._current[i - 1];
        }
      });
      this.orderStack();
    } else {
      throw new Error(".after() must be called after .use()");
    }
    return this;
  }
}
