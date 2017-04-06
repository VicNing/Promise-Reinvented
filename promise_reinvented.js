let PENDING = 0,
    FULLFILLED = 1,
    REJECTED = 2;

Promi.getThen = function getThen(value) {
    let t = typeof value;
    if (value && (t === 'object' || t === 'function')) {
        let then = value.then;
        if (typeof then === 'function') {
            return then;
        }
    }
    return null;
}

Promi.doResolve = function doResolve(fn, onFullfilled, onRejected) {
    let done = false;
    try {
        fn(function (value) {
            if (done) {
                return;
            }
            done = true;
            onFullfilled(value);
        }, function (reason) {
            if (done) {
                return;
            }
            done = true;
            onRejected(reason);
        })
    } catch (err) {
        if (done) {
            return;
        }
        done = true;
        onRejected(err);
    }
}

function Promi(fn) {
    let state = PENDING;
    let value = null;
    let handlers = [];

    function fullfill(result) {
        state = FULLFILLED;
        value = result;
        handlers.forEach(handle);
        handlers = null;
    }

    function reject(error) {
        state = REJECTED;
        value = error;
        handlers.forEach(handle);
        handlers = null;
    }

    function resolve(result) {
        try {
            let then = Promi.getThen(result);
            if (then) {
                Promi.doResolve(then.bind(result), resolve, reject);
                return;
            }
            fullfill(result);
        } catch (err) {
            reject(err);
        }
    }

    // 不同状态，进行不同的处理
    function handle(handler) {
        if (state === PENDING) {
            handlers.push(handler);
        } else {
            if (state === FULLFILLED &&
                typeof handler.onFulfilled === 'function') {
                handler.onFulfilled(value);
            }
            if (state === REJECTED && typeof handler.onRejected === 'function') {
                handler.onRejected(value);
            }
        }
    }

    this.done = function (onFulfilled, onRejected) {
        // 保证异步
        setTimeout(function () {
            handle({
                onFulfilled: onFulfilled,
                onRejected: onRejected
            });
        }, 0);
    }

    this.then = function (onFulfilled, onRejected) {
        var self = this;
        return new Promi(function (resolve, reject) {
            return self.done(
                function (result) {
                    if (typeof onFulfilled === 'function') {
                        try {
                            // onFulfilled方法要有返回值！
                            return resolve(onFulfilled(result));
                        } catch (ex) {
                            return reject(ex);
                        }
                    } else {
                        return resolve(result);
                    }
                },
                function (error) {
                    if (typeof onRejected === 'function') {
                        try {
                            return resolve(onRejected(error));
                        } catch (ex) {
                            return reject(ex);
                        }
                    } else {
                        return reject(error);
                    }
                });
        });
    }

    Promi.doResolve(fn, resolve, reject);
}

new Promi(function (resolve, reject) {
    resolve(123);
})
.done(function(value){
    console.log(value);
});
