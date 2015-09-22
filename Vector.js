(function(dependencies, undefined, global) {
    var cache = [];

    function require(index) {
        var module = cache[index],
            callback, exports;

        if (module !== undefined) {
            return module.exports;
        } else {
            callback = dependencies[index];
            exports = {};

            cache[index] = module = {
                exports: exports,
                require: require
            };

            callback.call(exports, require, exports, module, global);
            return module.exports;
        }
    }

    require.resolve = function(path) {
        return path;
    };

    if (typeof(define) === "function" && define.amd) {
        define([], function() {
            return require(0);
        });
    } else if (typeof(module) !== "undefined" && module.exports) {
        module.exports = require(0);
    } else {

        global.ImmutableVector = require(0);

    }
}([
function(require, exports, module, global) {

var isNull = require(1),
    isUndefined = require(2),
    isArrayLike = require(3),
    fastBindThis = require(9),
    fastSlice = require(10),
    defineProperty = require(12),
    isEqual = require(20);


var INTERNAL_CREATE = {},
    VectorPrototype = Vector.prototype,

    HAS_SYMBOL = typeof(Symbol) === "function",
    ITERATOR_SYMBOL = HAS_SYMBOL ? Symbol.iterator : false,
    IS_VECTOR = HAS_SYMBOL ? Symbol("Vector") : "__ImmutableVector__",

    SHIFT = 5,
    SIZE = 1 << SHIFT,
    MASK = SIZE - 1,

    EMPTY_ARRAY = createArray(),
    EMPTY_NODE = createNode(),
    EMPTY_VECTOR = new Vector(INTERNAL_CREATE);


module.exports = Vector;


function Vector(value) {
    if (!(this instanceof Vector)) {
        throw new Error("Vector() must be called with new");
    }

    this.__root = EMPTY_NODE;
    this.__tail = EMPTY_ARRAY;
    this.__size = 0;
    this.__shift = SHIFT;

    if (value !== INTERNAL_CREATE) {
        return Vector_createVector(this, value, arguments);
    } else {
        return this;
    }
}

function Vector_createVector(_this, value, args) {
    var length = args.length,
        tail;

    if (length > 32) {
        return Vector_conjArray(_this, args);
    } else if (length > 1) {
        _this.__tail = copyArray(args, createArray(), length);
        _this.__size = length;
        return _this;
    } else if (length === 1) {
        if (isArrayLike(value)) {
            return Vector_conjArray(_this, value.toArray ? value.toArray() : value);
        } else {
            tail = _this.__tail = createArray();
            tail[0] = value;
            _this.__size = 1;
            return _this;
        }
    } else {
        return EMPTY_VECTOR;
    }
}

Vector.of = function(value) {
    if (arguments.length > 0) {
        return Vector_createVector(new Vector(INTERNAL_CREATE), value, arguments);
    } else {
        return EMPTY_VECTOR;
    }
};

Vector.isVector = function(value) {
    return value && value[IS_VECTOR] === true;
};

if (HAS_SYMBOL) {
    VectorPrototype[IS_VECTOR] = true;
} else if (Object.defineProperty) {
    defineProperty(VectorPrototype, IS_VECTOR, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: true
    });
} else {
    VectorPrototype[IS_VECTOR] = true;
}

VectorPrototype.size = function() {
    return this.__size;
};

if (defineProperty.hasGettersSetters) {
    defineProperty(VectorPrototype, "length", {
        get: VectorPrototype.size
    });
}

VectorPrototype.count = VectorPrototype.size;

function tailOff(size) {
    if (size < 32) {
        return 0;
    } else {
        return ((size - 1) >>> SHIFT) << SHIFT;
    }
}

function Vector_getNode(_this, index) {
    var node = _this.__root,
        level = _this.__shift;

    while (level > 0) {
        node = node.array[(index >>> level) & MASK];
        level = level - SHIFT;
    }

    return node;
}

function Vector_getArrayFor(_this, index) {
    if (index >= tailOff(_this.__size)) {
        return _this.__tail;
    } else {
        return Vector_getNode(_this, index).array;
    }
}

function Vector_get(_this, index) {
    return Vector_getArrayFor(_this, index)[index & MASK];
}

VectorPrototype.get = function(index) {
    if (index < 0 || index >= this.__size) {
        return undefined;
    } else {
        return Vector_get(this, index);
    }
};

VectorPrototype.nth = VectorPrototype.get;

VectorPrototype.first = function() {
    var size = this.__size;

    if (size === 0) {
        return undefined;
    } else {
        return Vector_get(this, 0);
    }
};

VectorPrototype.last = function() {
    var size = this.__size;

    if (size === 0) {
        return undefined;
    } else {
        return this.__tail[(size - 1) & MASK];
    }
};

VectorPrototype.indexOf = function(value) {
    var size = this.__size,
        i = -1,
        il = size - 1;

    while (i++ < il) {
        if (isEqual(Vector_get(this, i), value)) {
            return i;
        }
    }

    return -1;
};

function newPathSet(node, size, index, value, level) {
    var newNode = cloneNode(node, ((size - 1) >>> level) & MASK),
        subIndex;

    if (level === 0) {
        newNode.array[index & MASK] = value;
    } else {
        subIndex = (index >>> level) & MASK;
        newNode.array[subIndex] = newPathSet(node.array[subIndex], size, index, value, level - SHIFT);
    }

    return newNode;
}

function Vector_set(_this, index, value) {
    var size = _this.__size,
        tail, maskedIndex, vector;

    if (index >= tailOff(size)) {
        tail = _this.__tail;
        maskedIndex = index & MASK;

        if (isEqual(tail[maskedIndex], value)) {
            return _this;
        } else {
            tail = cloneArray(tail, (size + 1) & MASK);
            tail[maskedIndex] = value;
            vector = Vector_clone(_this);
            vector.__tail = tail;
            return vector;
        }
    } else if (isEqual(Vector_get(_this, index), value)) {
        return _this;
    } else {
        vector = Vector_clone(_this);
        vector.__root = newPathSet(_this.__root, size, index, value, _this.__shift);
        return vector;
    }
}

VectorPrototype.set = function(index, value) {
    if (index < 0 || index >= this.__size) {
        throw new Error("Vector set(index, value) index out of bounds");
    } else {
        return Vector_set(this, index, value);
    }
};


function Vector_insert(_this, index, values) {
    var size = _this.__size,
        length = values.length,
        newSize = size + length,
        results = new Array(newSize),
        j = 0,
        k = 0,
        i, il;

    i = -1;
    il = index - 1;
    while (i++ < il) {
        results[i] = Vector_get(_this, k++);
    }

    i = index - 1;
    il = index + length - 1;
    while (i++ < il) {
        results[i] = values[j++];
    }

    i = index + length - 1;
    il = newSize - 1;
    while (i++ < il) {
        results[i] = Vector_get(_this, k++);
    }

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results);
}

VectorPrototype.insert = function(index) {
    if (index < 0 || index >= this.__size) {
        throw new Error("Vector set(index, value) index out of bounds");
    } else {
        return Vector_insert(this, index, fastSlice(arguments, 1));
    }
};

function Vector_remove(_this, index, count) {
    var size = _this.__size,
        results = new Array(size - count),
        j = 0,
        i, il;

    i = -1;
    il = index - 1;
    while (i++ < il) {
        results[j++] = Vector_get(_this, i);
    }

    i = index + count - 1;
    il = size - 1;
    while (i++ < il) {
        results[j++] = Vector_get(_this, i);
    }

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results);
}

VectorPrototype.remove = function(index, count) {
    var size = this.__size;

    count = count || 1;

    if (index < 0 || index >= size) {
        throw new Error("Vector remove(index[, count=1]) index out of bounds");
    } else if (count > 0) {
        return Vector_remove(this, index, count);
    } else {
        return this;
    }
};

function newPath(node, level) {
    var newNode;

    if (level === 0) {
        return node;
    } else {
        newNode = createNode();
        newNode.array[0] = newPath(node, level - SHIFT);
        return newNode;
    }
}

function pushTail(parentNode, tailNode, size, level) {
    var subIndex = ((size - 1) >>> level) & MASK,
        newNode = cloneNode(parentNode, subIndex),
        nodeToInsert;

    if (level === SHIFT) {
        nodeToInsert = tailNode;
    } else {
        child = parentNode.array[subIndex];

        if (isUndefined(child)) {
            nodeToInsert = newPath(tailNode, level - SHIFT);
        } else {
            nodeToInsert = pushTail(child, tailNode, size, level - SHIFT);
        }
    }

    newNode.array[subIndex] = nodeToInsert;

    return newNode;
}

function Vector_conj(_this, value) {
    var root = _this.__root,
        size = _this.__size,
        shift = _this.__shift,
        tailNode, newShift, newRoot, newTail;

    if (size - tailOff(size) < SIZE) {
        _this.__tail[size & MASK] = value;
    } else {
        tailNode = new Node(_this.__tail);
        newShift = shift;

        if ((size >>> SHIFT) > (1 << shift)) {
            newRoot = createNode();
            newRoot.array[0] = root;
            newRoot.array[1] = newPath(tailNode, shift);
            newShift += SHIFT;
        } else {
            newRoot = pushTail(root, tailNode, size, shift);
        }

        newTail = createArray();
        newTail[0] = value;
        _this.__tail = newTail;

        _this.__root = newRoot;
        _this.__shift = newShift;
    }

    _this.__size = size + 1;

    return _this;
}

function Vector_conjArray(_this, values) {
    var tail = _this.__tail,
        size = _this.__size,
        i = -1,
        il = values.length - 1;

    if (tail === EMPTY_ARRAY) {
        _this.__tail = createArray();
    } else if (size - tailOff(size) < SIZE) {
        _this.__tail = cloneArray(tail, (size + 1) & MASK);
    }

    while (i++ < il) {
        Vector_conj(_this, values[i]);
    }

    return _this;
}

function Vector_clone(_this) {
    var vector = new Vector(INTERNAL_CREATE);
    vector.__root = _this.__root;
    vector.__tail = _this.__tail;
    vector.__size = _this.__size;
    vector.__shift = _this.__shift;
    return vector;
}

VectorPrototype.conj = function() {
    if (arguments.length !== 0) {
        return Vector_conjArray(Vector_clone(this), arguments);
    } else {
        return this;
    }
};

VectorPrototype.push = VectorPrototype.conj;

function Vector_unshift(_this, values) {
    var size = _this.__size,
        length = values.length,
        newSize = size + length,
        results = new Array(newSize),
        j = length - 1,
        k = 0,
        i, il;

    i = -1;
    il = length - 1;
    while (i++ < il) {
        results[k++] = values[j--];
    }

    i = -1;
    il = size - 1;
    while (i++ < il) {
        results[k++] = Vector_get(_this, i);
    }

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results);
}

VectorPrototype.unshift = function() {
    if (arguments.length !== 0) {
        return Vector_unshift(this, arguments);
    } else {
        return this;
    }
};

function popTail(node, size, level) {
    var subIndex = ((size - 2) >>> level) & MASK,
        newChild, newNode;

    if (level > 5) {
        newChild = popTail(node.array[subIndex], size, level - SHIFT);

        if (isUndefined(newChild) && subIndex === 0) {
            return null;
        } else {
            newNode = cloneNode(node, subIndex);
            newNode.array[subIndex] = newChild;
            return newNode;
        }
    } else if (subIndex === 0) {
        return null;
    } else {
        return cloneNode(node, subIndex);
    }
}

function Vector_pop(_this) {
    var vector = new Vector(INTERNAL_CREATE),
        size = _this.__size,
        shift, newTail, newRoot, newShift;

    if (size - tailOff(size) > 1) {
        newTail = _this.__tail.slice(0, (size - 1) & MASK);
        newRoot = _this.__root;
        newShift = _this.__shift;
    } else {
        newTail = Vector_getArrayFor(_this, size - 2);

        shift = _this.__shift;
        newRoot = popTail(_this.__root, size, shift);
        newShift = shift;

        if (isNull(newRoot)) {
            newRoot = EMPTY_NODE;
        } else if (shift > SHIFT && isUndefined(newRoot.array[1])) {
            newRoot = newRoot.array[0];
            newShift -= SHIFT;
        }
    }

    vector.__root = newRoot;
    vector.__tail = newTail;
    vector.__size = size - 1;
    vector.__shift = newShift;

    return vector;
}

VectorPrototype.pop = function() {
    var size = this.__size;

    if (size === 0) {
        return this;
    } else if (size === 1) {
        return EMPTY_VECTOR;
    } else {
        return Vector_pop(this);
    }
};

function Vector_shift(_this) {
    var size = _this.__size,
        newSize = size - 1,
        results = new Array(newSize),
        j = 0,
        i = 0,
        il = size - 1;

    while (i++ < il) {
        results[j++] = Vector_get(_this, i);
    }

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results);
}

VectorPrototype.shift = function() {
    var size = this.__size;

    if (size === 0) {
        return this;
    } else if (size === 1) {
        return EMPTY_VECTOR;
    } else {
        return Vector_shift(this);
    }
};

function VectorIteratorValue(done, value) {
    this.done = done;
    this.value = value;
}

function VectorIterator(next) {
    this.next = next;
}

function Vector_iterator(_this) {
    var index = 0,
        size = _this.__size;

    return new VectorIterator(function next() {
        if (index >= size) {
            return new VectorIteratorValue(true, undefined);
        } else {
            return new VectorIteratorValue(false, Vector_get(_this, index++));
        }
    });
}

function Vector_iteratorReverse(_this) {
    var index = _this.__size - 1;

    return new VectorIterator(function next() {
        if (index < 0) {
            return new VectorIteratorValue(true, undefined);
        } else {
            return new VectorIteratorValue(false, Vector_get(_this, index--));
        }
    });
}

VectorPrototype.iterator = function(reverse) {
    if (reverse !== true) {
        return Vector_iterator(this);
    } else {
        return Vector_iteratorReverse(this);
    }
};

if (ITERATOR_SYMBOL) {
    VectorPrototype[ITERATOR_SYMBOL] = VectorPrototype.iterator;
}

function Vector_every(_this, it, callback) {
    var next = it.next(),
        index = 0;

    while (next.done === false) {
        if (!callback(next.value, index, _this)) {
            return false;
        }
        next = it.next();
        index += 1;
    }

    return true;
}

VectorPrototype.every = function(callback, thisArg) {
    return Vector_every(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

function Vector_filter(_this, it, callback) {
    var results = [],
        next = it.next(),
        index = 0,
        j = 0,
        value;

    while (next.done === false) {
        value = next.value;

        if (callback(value, index, _this)) {
            results[j++] = value;
        }

        next = it.next();
        index += 1;
    }

    return Vector.of(results);
}

VectorPrototype.filter = function(callback, thisArg) {
    return Vector_filter(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

function Vector_forEach(_this, it, callback) {
    var next = it.next(),
        index = 0;

    while (next.done === false) {
        if (callback(next.value, index, _this) === false) {
            break;
        }
        next = it.next();
        index += 1;
    }

    return _this;
}

VectorPrototype.forEach = function(callback, thisArg) {
    return Vector_forEach(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

VectorPrototype.each = VectorPrototype.forEach;

function Vector_forEachRight(_this, it, callback) {
    var next = it.next(),
        index = _this.__size;

    while (next.done === false) {
        index -= 1;
        if (callback(next.value, index, _this) === false) {
            break;
        }
        next = it.next();
    }

    return _this;
}

VectorPrototype.forEachRight = function(callback, thisArg) {
    return Vector_forEachRight(this, Vector_iteratorReverse(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

VectorPrototype.eachRight = VectorPrototype.forEachRight;

function Vector_map(_this, it, callback) {
    var next = it.next(),
        results = new Array(_this.__size),
        index = 0;

    while (next.done === false) {
        results[index] = callback(next.value, index, _this);
        next = it.next();
        index += 1;
    }

    return Vector.of(results);
}

VectorPrototype.map = function(callback, thisArg) {
    return Vector_map(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

function Vector_reduce(_this, it, callback, initialValue) {
    var next = it.next(),
        value = initialValue,
        index = 0;

    if (isUndefined(value)) {
        value = next.value;
        next = it.next();
        index = 1;
    }

    while (next.done === false) {
        value = callback(value, next.value, index, _this);
        next = it.next();
        index += 1;
    }

    return value;
}

VectorPrototype.reduce = function(callback, initialValue, thisArg) {
    return Vector_reduce(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 4), initialValue);
};

function Vector_reduceRight(_this, it, callback, initialValue) {
    var next = it.next(),
        value = initialValue,
        index = _this.__size;

    if (isUndefined(value)) {
        value = next.value;
        next = it.next();
        index -= 1;
    }

    while (next.done === false) {
        index -= 1;
        value = callback(value, next.value, index, _this);
        next = it.next();
    }

    return value;
}

VectorPrototype.reduceRight = function(callback, initialValue, thisArg) {
    return Vector_reduceRight(this, Vector_iteratorReverse(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 4), initialValue);
};

function Vector_some(_this, it, callback) {
    var next = it.next(),
        index = 0;

    while (next.done === false) {
        if (callback(next.value, index, _this)) {
            return true;
        }
        next = it.next();
        index += 1;
    }

    return false;
}

VectorPrototype.some = function(callback, thisArg) {
    return Vector_some(this, Vector_iterator(this), isUndefined(thisArg) ? callback : fastBindThis(callback, thisArg, 3));
};

VectorPrototype.toArray = function() {
    var size = this.__size,
        array = new Array(size),
        i = -1,
        il = size - 1;

    while (i++ < il) {
        array[i] = Vector_get(this, i);
    }

    return array;
};

VectorPrototype.toString = function() {
    return "[" + this.toArray().join(" ") + "]";
};

VectorPrototype.inspect = VectorPrototype.toString;

Vector.equal = function(a, b) {
    var i;

    if (a === b) {
        return true;
    } else if (!a || !b || a.__size !== b.__size) {
        return false;
    } else {
        i = a.__size;

        while (i--) {
            if (!isEqual(Vector_get(a, i), Vector_get(b, i))) {
                return false;
            }
        }

        return true;
    }
};

VectorPrototype.equals = function(b) {
    return Vector.equal(this, b);
};

function Node(array) {
    this.array = array;
}

function createNode() {
    return new Node(createArray());
}

function createArray() {
    return new Array(SIZE);
}

function copyArray(a, b, length) {
    var i = -1,
        il = length - 1;

    while (i++ < il) {
        b[i] = a[i];
    }

    return b;
}

function cloneArray(a, length) {
    return copyArray(a, createArray(), length);
}

function copyNode(from, to, length) {
    copyArray(from.array, to.array, length);
    return to;
}

function cloneNode(node, length) {
    return copyNode(node, createNode(), length);
}


},
function(require, exports, module, global) {

module.exports = isNull;


function isNull(value) {
    return value === null;
}


},
function(require, exports, module, global) {

module.exports = isUndefined;


function isUndefined(value) {
    return value === void(0);
}


},
function(require, exports, module, global) {

var isLength = require(4),
    isFunction = require(6),
    isObject = require(7);


module.exports = isArrayLike;


function isArrayLike(value) {
    return !isFunction(value) && isObject(value) && isLength(value.length);
}


},
function(require, exports, module, global) {

var isNumber = require(5);


var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;


module.exports = isLength;


function isLength(value) {
    return isNumber(value) && value > -1 && value % 1 === 0 && value <= MAX_SAFE_INTEGER;
}


},
function(require, exports, module, global) {

module.exports = isNumber;


function isNumber(value) {
    return typeof(value) === "number" || false;
}


},
function(require, exports, module, global) {

var objectToString = Object.prototype.toString,
    isFunction;


if (objectToString.call(function() {}) === "[object Object]") {
    isFunction = function isFunction(value) {
        return value instanceof Function;
    };
} else if (typeof(/./) === "function" || (typeof(Uint8Array) !== "undefined" && typeof(Uint8Array) !== "function")) {
    isFunction = function isFunction(value) {
        return objectToString.call(value) === "[object Function]";
    };
} else {
    isFunction = function isFunction(value) {
        return typeof(value) === "function" || false;
    };
}


module.exports = isFunction;


},
function(require, exports, module, global) {

var isNullOrUndefined = require(8);


module.exports = isObject;


function isObject(value) {
    var type = typeof(value);
    return type === "function" || (!isNullOrUndefined(value) && type === "object") || false;
}


},
function(require, exports, module, global) {

var isNull = require(1),
    isUndefined = require(2);


module.exports = isNullOrUndefined;

/**
  isNullOrUndefined accepts any value and returns true
  if the value is null or undefined. For all other values
  false is returned.

  @param {Any}        any value to test
  @returns {Boolean}  the boolean result of testing value

  @example
    isNullOrUndefined(null);   // returns true
    isNullOrUndefined(undefined);   // returns true
    isNullOrUndefined("string");    // returns false
**/
function isNullOrUndefined(value) {
    return isNull(value) || isUndefined(value);
}


},
function(require, exports, module, global) {

var isNumber = require(5);


module.exports = fastBindThis;


function fastBindThis(callback, thisArg, length) {
    switch (isNumber(length) ? length : (callback.length || -1)) {
        case 0:
            return function bound() {
                return callback.call(thisArg);
            };
        case 1:
            return function bound(a1) {
                return callback.call(thisArg, a1);
            };
        case 2:
            return function bound(a1, a2) {
                return callback.call(thisArg, a1, a2);
            };
        case 3:
            return function bound(a1, a2, a3) {
                return callback.call(thisArg, a1, a2, a3);
            };
        case 4:
            return function bound(a1, a2, a3, a4) {
                return callback.call(thisArg, a1, a2, a3, a4);
            };
        default:
            return function bound() {
                return callback.apply(thisArg, arguments);
            };
    }
}


},
function(require, exports, module, global) {

var clamp = require(11),
    isNumber = require(5);


module.exports = fastSlice;


function fastSlice(array, offset) {
    var length = array.length,
        newLength, i, il, result, j;

    offset = clamp(isNumber(offset) ? offset : 0, 0, length);
    i = offset - 1;
    il = length - 1;
    newLength = length - offset;
    result = new Array(newLength);
    j = 0;

    while (i++ < il) {
        result[j++] = array[i];
    }

    return result;
}


},
function(require, exports, module, global) {

module.exports = clamp;


function clamp(x, min, max) {
    if (x < min) {
        return min;
    } else if (x > max) {
        return max;
    } else {
        return x;
    }
}


},
function(require, exports, module, global) {

var isObject = require(7),
    isFunction = require(6),
    isPrimitive = require(13),
    isNative = require(14),
    has = require(18);


var nativeDefineProperty = Object.defineProperty;


module.exports = defineProperty;


function defineProperty(object, name, descriptor) {
    if (isPrimitive(descriptor) || isFunction(descriptor)) {
        descriptor = {
            value: descriptor
        };
    }
    return nativeDefineProperty(object, name, descriptor);
}

defineProperty.hasGettersSetters = true;

if (!isNative(nativeDefineProperty) || !(function() {
        var object = {};
        try {
            nativeDefineProperty(object, "key", {
                value: "value"
            });
            if (has(object, "key") && object.key === "value") {
                return true;
            }
        } catch (e) {}
        return false;
    }())) {

    defineProperty.hasGettersSetters = false;

    nativeDefineProperty = function defineProperty(object, name, descriptor) {
        if (!isObject(object)) {
            throw new TypeError("defineProperty(object, name, descriptor) called on non-object");
        }
        if (has(descriptor, "get") || has(descriptor, "set")) {
            throw new TypeError("defineProperty(object, name, descriptor) this environment does not support getters or setters");
        }
        object[name] = descriptor.value;
    };
}


},
function(require, exports, module, global) {

var isNullOrUndefined = require(8);


module.exports = isPrimitive;


function isPrimitive(obj) {
    var typeStr;
    return isNullOrUndefined(obj) || ((typeStr = typeof(obj)) !== "object" && typeStr !== "function") || false;
}


},
function(require, exports, module, global) {

var isFunction = require(6),
    isNullOrUndefined = require(8),
    escapeRegExp = require(15);


var reHostCtor = /^\[object .+?Constructor\]$/,

    functionToString = Function.prototype.toString,

    reNative = RegExp("^" +
        escapeRegExp(Object.prototype.toString)
        .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    ),

    isHostObject;


module.exports = isNative;


function isNative(value) {
    return !isNullOrUndefined(value) && (
        isFunction(value) ?
        reNative.test(functionToString.call(value)) : (
            typeof(value) === "object" && (
                (isHostObject(value) ? reNative : reHostCtor).test(value) || false
            )
        )
    ) || false;
}

try {
    String({
        "toString": 0
    } + "");
} catch (e) {
    isHostObject = function isHostObject() {
        return false;
    };
}

isHostObject = function isHostObject(value) {
    return !isFunction(value.toString) && typeof(value + "") === "string";
};


},
function(require, exports, module, global) {

var toString = require(16);


var reRegExpChars = /[.*+?\^${}()|\[\]\/\\]/g,
    reHasRegExpChars = new RegExp(reRegExpChars.source);


module.exports = escapeRegExp;


function escapeRegExp(string) {
    string = toString(string);
    return (
        (string && reHasRegExpChars.test(string)) ?
        string.replace(reRegExpChars, "\\$&") :
        string
    );
}


},
function(require, exports, module, global) {

var isString = require(17),
    isNullOrUndefined = require(8);


module.exports = toString;


function toString(value) {
    if (isString(value)) {
        return value;
    } else if (isNullOrUndefined(value)) {
        return "";
    } else {
        return value + "";
    }
}


},
function(require, exports, module, global) {

module.exports = isString;


function isString(value) {
    return typeof(value) === "string" || false;
}


},
function(require, exports, module, global) {

var isNative = require(14),
    getPrototypeOf = require(19),
    isNullOrUndefined = require(8);


var nativeHasOwnProp = Object.prototype.hasOwnProperty,
    baseHas;


module.exports = has;


function has(object, key) {
    if (isNullOrUndefined(object)) {
        return false;
    } else {
        return baseHas(object, key);
    }
}

if (isNative(nativeHasOwnProp)) {
    baseHas = function baseHas(object, key) {
        return nativeHasOwnProp.call(object, key);
    };
} else {
    baseHas = function baseHas(object, key) {
        var proto = getPrototypeOf(object);

        if (isNullOrUndefined(proto)) {
            return key in object;
        } else {
            return (key in object) && (!(key in proto) || proto[key] !== object[key]);
        }
    };
}


},
function(require, exports, module, global) {

var isObject = require(7),
    isNative = require(14),
    isNullOrUndefined = require(8);


var nativeGetPrototypeOf = Object.getPrototypeOf,
    baseGetPrototypeOf;


module.exports = getPrototypeOf;


function getPrototypeOf(value) {
    if (isNullOrUndefined(value)) {
        return null;
    } else {
        return baseGetPrototypeOf(value);
    }
}

if (isNative(nativeGetPrototypeOf)) {
    baseGetPrototypeOf = function baseGetPrototypeOf(value) {
        return nativeGetPrototypeOf(isObject(value) ? value : Object(value)) || null;
    };
} else {
    if ("".__proto__ === String.prototype) {
        baseGetPrototypeOf = function baseGetPrototypeOf(value) {
            return value.__proto__ || null;
        };
    } else {
        baseGetPrototypeOf = function baseGetPrototypeOf(value) {
            return value.constructor ? value.constructor.prototype : null;
        };
    }
}


},
function(require, exports, module, global) {

module.exports = isEqual;


function isEqual(a, b) {
    return !(a !== b && !(a !== a && b !== b));
}


}], void 0, (new Function("return this;"))()));