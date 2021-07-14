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
    let firstFirst = -1,
      lastFirst = -1,
      firstLast = -1,
      lastLast = -1;
    for (let i = 0; i < n; i++) {
      const handle = stack[i].handle;
      if (handle._first) {
        if (firstFirst < 0) firstFirst = i;
        lastFirst = i;
      }
      if (handle._last) {
        if (firstLast < 0) firstLast = i;
        lastLast = i;
      }
    }

    if (firstFirst > 0) {
      stack.splice(
        lastFirst - firstFirst + 1,
        0,
        ...stack.splice(0, firstFirst)
      );
    }
    if (lastLast >= 0 && lastLast < n - 1) {
      stack.splice(firstLast, 0, ...stack.splice(lastLast + 1));
    }
    // Find a handle with a before or after property
    for (let i = 0; i < n; i++) {
      const handle = stack[i].handle;
      if (handle._first) {
        // properly order handles with _first flag
        if (!handle._moved_first) {
          if (i > 0) {
            // insert after last handle with _first tag
            for (let j = i - 1; j >= 0; j--) {
              if (stack[j].handle._moved_first) {
                stack.splice(j + 1, 0, ...stack.splice(i, 1));
                break;
              } else if (j === 0) stack.unshift(stack.splice(i, 1)[0]);
            }
          }
          handle._moved_first = true;
        }
      } else if (handle._last) {
        // properly order handles with _last flag
        if (!handle._moved_last) {
          if (i !== n - 1) {
            // insert last
            stack.splice(n - 1, 0, ...stack.splice(i, 1));
          }
          handle._moved_last = true;
        }
      } else if (handle._before || handle._after) {
        const pos = handle._before ? "_before" : "_after";
        // already moved
        if (handle["_moved" + pos]) break;
        const find = handle[pos];
        const new_index =
          stack.findIndex(find, this) + (pos === "_before" ? -1 : 1);
        if (new_index >= 0) {
          // move handle in new position
          // http://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
          stack.splice(new_index, 0, ...stack.splice(i, 1));
          // item at stack[i] should also be ordered so prevent for loop to increase
          // FIXME: can this provoke endless loop ?
          if (new_index > i) i--;
          handle["_moved" + pos] = find;
        }
      }
    }
  }
  use(...args) {
    // checking args
    const fns = args.filter((f) => typeof f === "function");
    if (!fns.length) throw new TypeError("Please provide a middleware");

    // save current handles in case there is a .as call after .use
    this._current = fns;
    // console.log(
    //   this._current,
    //   Object.fromEntries(
    //     ["_first", "_last", "_before", "_after"].map((key) => [key, this[key]])
    //   )
    // );
    // save before/after as properties attached to the fns
    fns.forEach((fn, i) => {
      if (this._first) fn._first = true;
      if (this._last) fn._last = true;
      if (i === 0) {
        if (this._before) fn._before = this._before;
        if (this._after) fn._after = this._after;
      } else {
        fn._after = (layer) => layer.handle === fns[i - 1];
      }
    });
    delete this._first;
    delete this._last;
    delete this._before;
    delete this._after;

    // forward call to app.use
    this.app.use.apply(this.app, arguments);

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
    if (typeof f !== "function")
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
    return this;
  }
  /**
   * Adds a middleware at the beginning of the stack
   */
  first() {
    this._first = true;
    return this;
  }
  /**
   * Adds a middleware at the end of the stack and make sure it will stay there
   */
  last() {
    this._last = true;
    return this;
  }
  before(f) {
    switch (typeof f) {
      case "function":
        this._before = f;
        break;
      case "string":
        this._before = (layer) => layer.handle.label === f;
        break;
      default:
        throw new TypeError("please provide a function or a middleware label");
    }
    return this;
  }
  after(f) {
    switch (typeof f) {
      case "function":
        this._after = f;
        break;
      case "string":
        this._after = (layer) => layer.handle.label === f;
        break;
      default:
        throw new TypeError("please provide a function or a middleware label");
    }
    return this;
  }
}
