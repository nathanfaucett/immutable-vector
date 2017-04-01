var freeze = require("@nathanfaucett/freeze"),
    Iterator = require("@nathanfaucett/iterator"),
    isNull = require("@nathanfaucett/is_null"),
    isUndefined = require("@nathanfaucett/is_undefined"),
    isNumber = require("@nathanfaucett/is_number"),
    isArrayLike = require("@nathanfaucett/is_array_like"),
    fastBindThis = require("@nathanfaucett/fast_bind_this"),
    fastSlice = require("@nathanfaucett/fast_slice"),
    defineProperty = require("@nathanfaucett/define_property"),
    isEqual = require("@nathanfaucett/is_equal");


var INTERNAL_CREATE = {},

    ITERATOR_SYMBOL = typeof(Symbol) === "function" ? Symbol.iterator : false,
    IS_VECTOR = "_ImmutableVector_",

    SHIFT = 5,
    SIZE = 1 << SHIFT,
    MASK = SIZE - 1,

    EMPTY_ARRAY = freeze(createArray()),
    EMPTY_VECTOR = freeze(new Vector(INTERNAL_CREATE)),

    IteratorValue = Iterator.Value,

    VectorPrototype = Vector.prototype;


module.exports = Vector;


function Vector(value) {
    if (!(this instanceof Vector)) {
        throw new Error("Vector() must be called with new");
    }

    this._root = EMPTY_ARRAY;
    this._tail = EMPTY_ARRAY;
    this._size = 0;
    this._shift = SHIFT;

    if (value !== INTERNAL_CREATE) {
        return Vector_createVector(this, value, arguments);
    } else {
        return this;
    }
}

Vector.EMPTY = EMPTY_VECTOR;

function Vector_createVector(_this, value, args) {
    var length = args.length,
        tail;

    if (length > SIZE) {
        return Vector_conjArray(_this, args);
    } else if (length > 1) {
        _this._tail = cloneArray(args, length);
        _this._size = length;
        return freeze(_this);
    } else if (length === 1) {
        if (isVector(value)) {
            return value;
        } else if (isArrayLike(value)) {
            return Vector_conjArray(_this, value.toArray ? value.toArray() : value);
        } else {
            tail = _this._tail = createArray();
            tail[0] = value;
            _this._size = 1;
            return freeze(_this);
        }
    } else {
        return EMPTY_VECTOR;
    }
}

Vector.fromArray = function(array) {
    if (array.length > 0) {
        return Vector_createVector(new Vector(INTERNAL_CREATE), array[0], array);
    } else {
        return EMPTY_VECTOR;
    }
};

Vector.of = function() {
    return Vector_createVector(new Vector(INTERNAL_CREATE), arguments[0], arguments);
};

function isVector(value) {
    return !!(value && value[IS_VECTOR]);
}

Vector.isVector = isVector;

defineProperty(VectorPrototype, IS_VECTOR, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: true
});

VectorPrototype.size = function() {
    return this._size;
};

if (defineProperty.hasGettersSetters) {
    defineProperty(VectorPrototype, "length", {
        get: VectorPrototype.size
    });
}

VectorPrototype.count = VectorPrototype.size;

VectorPrototype.isEmpty = function() {
    return this._size === 0;
};

function tailOff(size) {
    if (size < SIZE) {
        return 0;
    } else {
        return ((size - 1) >>> SHIFT) << SHIFT;
    }
}

function Vector_getArray(_this, index) {
    var array, level;

    if (index >= tailOff(_this._size)) {
        return _this._tail;
    } else {
        array = _this._root;
        level = _this._shift;

        while (level > 0) {
            array = array[(index >>> level) & MASK];
            level = level - SHIFT;
        }

        return array;
    }
}

function Vector_get(_this, index) {
    return Vector_getArray(_this, index)[index & MASK];
}

VectorPrototype.get = function(index, notSetValue) {
    if (!isNumber(index) || index < 0 || index >= this._size) {
        return notSetValue;
    } else {
        return Vector_get(this, index);
    }
};

VectorPrototype.nth = VectorPrototype.get;

VectorPrototype.first = function(notSetValue) {
    var size = this._size;

    if (size === 0) {
        return notSetValue;
    } else {
        return Vector_get(this, 0);
    }
};

VectorPrototype.last = function(notSetValue) {
    var size = this._size;

    if (size === 0) {
        return notSetValue;
    } else {
        return this._tail[(size - 1) & MASK];
    }
};

VectorPrototype.indexOf = function(value) {
    var size = this._size,
        i = -1,
        il = size - 1;

    while (i++ < il) {
        if (isEqual(Vector_get(this, i), value)) {
            return i;
        }
    }

    return -1;
};

function newPathSet(array, size, index, value, level) {
    var newArray = cloneArray(array, ((size - 1) >>> level) & MASK),
        subIndex;

    if (level === 0) {
        newArray[index & MASK] = value;
    } else {
        subIndex = (index >>> level) & MASK;
        newArray[subIndex] = newPathSet(array[subIndex], size, index, value, level - SHIFT);
    }

    return newArray;
}

function Vector_set(_this, index, value) {
    var size = _this._size,
        tail, maskedIndex, vector;

    if (index >= tailOff(size)) {
        tail = _this._tail;
        maskedIndex = index & MASK;

        if (isEqual(tail[maskedIndex], value)) {
            return _this;
        } else {
            tail = cloneArray(tail, (size + 1) & MASK);
            tail[maskedIndex] = value;
            vector = Vector_clone(_this);
            vector._tail = tail;
            return freeze(vector);
        }
    } else if (isEqual(Vector_get(_this, index), value)) {
        return _this;
    } else {
        vector = Vector_clone(_this);
        vector._root = newPathSet(_this._root, size, index, value, _this._shift);
        return freeze(vector);
    }
}

VectorPrototype.set = function(index, value) {
    if (index < 0 || index >= this._size) {
        throw new Error("Vector set(index, value) index out of bounds");
    } else {
        return Vector_set(this, index, value);
    }
};


function Vector_insert(_this, index, values) {
    var size = _this._size,
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
    if (index < 0 || index >= this._size) {
        throw new Error("Vector set(index, value) index out of bounds");
    } else {
        return Vector_insert(this, index, fastSlice(arguments, 1));
    }
};

function Vector_remove(_this, index, count) {
    var size = _this._size,
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
    var size = this._size;

    count = count || 1;

    if (index < 0 || index >= size) {
        throw new Error("Vector remove(index[, count=1]) index out of bounds");
    } else if (count > 0) {
        return Vector_remove(this, index, count);
    } else {
        return this;
    }
};

function newPath(array, level) {
    var newArray;

    if (level === 0) {
        return array;
    } else {
        newArray = createArray();
        newArray[0] = newPath(array, level - SHIFT);
        return newArray;
    }
}

function pushTail(parentArray, tailArray, size, level) {
    var subIndex = ((size - 1) >>> level) & MASK,
        newArray = cloneArray(parentArray, subIndex),
        arrayToInsert;

    if (level === SHIFT) {
        arrayToInsert = tailArray;
    } else {
        child = parentArray[subIndex];

        if (isUndefined(child)) {
            arrayToInsert = newPath(tailArray, level - SHIFT);
        } else {
            arrayToInsert = pushTail(child, tailArray, size, level - SHIFT);
        }
    }

    newArray[subIndex] = arrayToInsert;

    return newArray;
}

function Vector_conj(_this, value) {
    var root = _this._root,
        size = _this._size,
        shift = _this._shift,
        tailArray, newShift, newRoot, newTail;

    if (size - tailOff(size) < SIZE) {
        _this._tail[size & MASK] = value;
    } else {
        tailArray = _this._tail;
        newShift = shift;

        if ((size >>> SHIFT) > (1 << shift)) {
            newRoot = createArray();
            newRoot[0] = root;
            newRoot[1] = newPath(tailArray, shift);
            newShift += SHIFT;
        } else {
            newRoot = pushTail(root, tailArray, size, shift);
        }

        newTail = createArray();
        newTail[0] = value;
        _this._tail = newTail;

        _this._root = newRoot;
        _this._shift = newShift;
    }

    _this._size = size + 1;

    return _this;
}

function Vector_conjArray(_this, values) {
    var tail = _this._tail,
        size = _this._size,
        i = -1,
        il = values.length - 1;

    if (tail === EMPTY_ARRAY) {
        _this._tail = createArray();
    } else if (size - tailOff(size) < SIZE) {
        _this._tail = cloneArray(tail, (size + 1) & MASK);
    }

    while (i++ < il) {
        Vector_conj(_this, values[i]);
    }

    return freeze(_this);
}

function Vector_clone(_this) {
    var vector = new Vector(INTERNAL_CREATE);
    vector._root = _this._root;
    vector._tail = _this._tail;
    vector._size = _this._size;
    vector._shift = _this._shift;
    return vector;
}

VectorPrototype.conj = function() {
    return this.pushArray(arguments);
};

VectorPrototype.pushArray = function(array) {
    if (array.length !== 0) {
        return Vector_conjArray(Vector_clone(this), array);
    } else {
        return this;
    }
};

VectorPrototype.push = VectorPrototype.conj;

function Vector_concat(a, b) {
    var asize = a._size,
        bsize = b._size;

    if (asize === 0) {
        return b;
    } else if (bsize === 0) {
        return a;
    } else {
        return Vector_conjArray(Vector_clone(a), b.toArray());
    }
}

VectorPrototype.concatArray = function(array) {
    var length = array.length,
        i, il, vector;

    if (length !== 0) {
        i = -1;
        il = length - 1;
        vector = this;

        while (i++ < il) {
            vector = Vector_concat(vector, array[i]);
        }

        return vector;
    } else {
        return this;
    }
};

VectorPrototype.concat = function() {
    return this.concatArray(arguments);
};

function Vector_unshift(_this, values) {
    var size = _this._size,
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

VectorPrototype.unshiftArray = function(array) {
    if (array.length !== 0) {
        return Vector_unshift(this, array);
    } else {
        return this;
    }
};

VectorPrototype.unshift = function() {
    return this.unshiftArray(arguments);
};

function popTail(array, size, level) {
    var subIndex = ((size - 2) >>> level) & MASK,
        newChild, newArray;

    if (level > 5) {
        newChild = popTail(array[subIndex], size, level - SHIFT);

        if (isUndefined(newChild) && subIndex === 0) {
            return null;
        } else {
            newArray = cloneArray(array, subIndex);
            newArray[subIndex] = newChild;
            return newArray;
        }
    } else if (subIndex === 0) {
        return null;
    } else {
        return cloneArray(array, subIndex);
    }
}

function Vector_pop(_this) {
    var vector = new Vector(INTERNAL_CREATE),
        size = _this._size,
        shift, newTail, newRoot, newShift;

    if (size - tailOff(size) > 1) {
        newTail = _this._tail.slice(0, (size - 1) & MASK);
        newRoot = _this._root;
        newShift = _this._shift;
    } else {
        newTail = Vector_getArray(_this, size - 2);

        shift = _this._shift;
        newRoot = popTail(_this._root, size, shift);
        newShift = shift;

        if (isNull(newRoot)) {
            newRoot = EMPTY_ARRAY;
        } else if (shift > SHIFT && isUndefined(newRoot[1])) {
            newRoot = newRoot[0];
            newShift -= SHIFT;
        }
    }

    vector._root = newRoot;
    vector._tail = newTail;
    vector._size = size - 1;
    vector._shift = newShift;

    return freeze(vector);
}

VectorPrototype.pop = function() {
    var size = this._size;

    if (size === 0) {
        return this;
    } else if (size === 1) {
        return EMPTY_VECTOR;
    } else {
        return Vector_pop(this);
    }
};

function Vector_shift(_this) {
    var size = _this._size,
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
    var size = this._size;

    if (size === 0) {
        return this;
    } else if (size === 1) {
        return EMPTY_VECTOR;
    } else {
        return Vector_shift(this);
    }
};

function Vector_iterator(_this) {
    var index = 0,
        size = _this._size;

    return new Iterator(function next() {
        if (index >= size) {
            return Iterator.createDone();
        } else {
            return new IteratorValue(Vector_get(_this, index++), false);
        }
    });
}

function Vector_iteratorReverse(_this) {
    var index = _this._size - 1;

    return new Iterator(function next() {
        if (index < 0) {
            return Iterator.createDone();
        } else {
            return new IteratorValue(Vector_get(_this, index--), false);
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
        index = _this._size;

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
        results = new Array(_this._size),
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
        index = _this._size;

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
    var size = this._size,
        array = new Array(size),
        i = -1,
        il = size - 1;

    while (i++ < il) {
        array[i] = Vector_get(this, i);
    }

    return array;
};

VectorPrototype.join = function(separator) {
    var size = this._size,
        result = "",
        i = -1,
        il = size - 1;

    separator = separator || " ";

    while (i++ < il) {
        if (i !== il) {
            result += Vector_get(this, i) + separator;
        } else {
            result += Vector_get(this, i);
        }
    }

    return result;
};

VectorPrototype.toString = function() {
    return "[" + this.join() + "]";
};

VectorPrototype.inspect = VectorPrototype.toString;

VectorPrototype.toJSON = VectorPrototype.toArray;
Vector.fromJSON = Vector.fromArray;

Vector.equal = function(a, b) {
    var i;

    if (a === b) {
        return true;
    } else if (!a || !b || a._size !== b._size) {
        return false;
    } else {
        i = a._size;

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