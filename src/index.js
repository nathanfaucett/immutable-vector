var isNull = require("is_null"),
    isUndefined = require("is_undefined"),
    isArrayLike = require("is_array_like"),
    fastSlice = require("fast_slice"),
    isEqual = require("is_equal");


var INTERNAL_CREATE = {},
    VectorPrototype = Vector.prototype,
    ITERATOR_SYMBOL = typeof(Symbol) === "function" ? Symbol.iterator : false,

    SHIFT = 5,
    SIZE = 1 << SHIFT,
    MASK = SIZE - 1,

    emptyNode = createNode(),
    emptyVector = new Vector(INTERNAL_CREATE);


module.exports = Vector;


function Vector(value) {
    if (!(this instanceof Vector)) {
        throw new Error("Vector() must be called with new");
    }

    this.__root = emptyNode;
    this.__tail = createArray();
    this.__size = 0;
    this.__shift = SHIFT;

    if (value !== INTERNAL_CREATE) {
        return Vector_createVector(this, value, arguments);
    } else {
        return this;
    }
}

function Vector_createVector(_this, value, values) {
    var length = values.length;

    if (isArrayLike(value) && length === 1) {
        return Vector_conjArray(_this, value, true);
    } else if (length >= 1) {
        return Vector_conjArray(_this, values, true);
    } else {
        return emptyVector;
    }
}

Vector.of = function(value) {
    if (arguments.length > 0) {
        return Vector_createVector(new Vector(INTERNAL_CREATE), value, arguments);
    } else {
        return emptyVector;
    }
};

Vector.isVector = function(value) {
    return value && value.__Vector__ === true;
};

VectorPrototype.__Vector__ = true;

VectorPrototype.size = function() {
    return this.__size;
};

if (Object.defineProperty) {
    Object.defineProperty(VectorPrototype, "length", {
        get: VectorPrototype.size
    });
}

VectorPrototype.count = VectorPrototype.size;

function Vector_tailOff(_this) {
    var size = _this.__size;

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
    if (index >= Vector_tailOff(_this)) {
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

function newPathSet(node, index, value, level) {
    var newNode = cloneNode(node),
        subIndex;

    if (level === 0) {
        newNode.array[index & MASK] = value;
    } else {
        subIndex = (index >>> level) & MASK;
        newNode.array[subIndex] = newPathSet(node.array[subIndex], index, value, level - 5);
    }

    return newNode;
}

function Vector_set(_this, index, value) {
    var tail, maskedIndex, vector;

    if (index >= Vector_tailOff(_this)) {
        tail = _this.__tail;
        maskedIndex = index & MASK;

        if (isEqual(tail[maskedIndex], value)) {
            return _this;
        } else {
            tail = cloneArray(tail);
            tail[maskedIndex] = value;
            vector = Vector_clone(_this);
            vector.__tail = tail;
            return vector;
        }
    } else if (isEqual(Vector_get(_this, index), value)) {
        return _this;
    } else {
        vector = Vector_clone(_this);
        vector.__root = newPathSet(_this.__root, index, value, _this.__shift);
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

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results, true);
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

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results, true);
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
        newNode = cloneNode(parentNode),
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

    if (size - Vector_tailOff(_this) < SIZE) {
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

function Vector_conjArray(_this, values, mutable) {
    var i = -1,
        il = values.length - 1;

    if (!mutable) {
        if (_this.__size - Vector_tailOff(_this) < SIZE) {
            _this.__tail = cloneArray(_this.__tail);
        }
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
        return Vector_conjArray(Vector_clone(this), arguments, false);
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

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results, true);
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
            newNode = cloneNode(node);
            newNode.array[subIndex] = newChild;
            return newNode;
        }
    } else if (subIndex === 0) {
        return null;
    } else {
        return cloneNode(node);
    }
}

function Vector_pop(_this) {
    var vector = new Vector(INTERNAL_CREATE),
        size = _this.__size,
        shift, newTail, newRoot, newShift;

    if (size - Vector_tailOff(_this) > 1) {
        newTail = _this.__tail.slice(0, (size - 1) & MASK);
        newRoot = _this.__root;
        newShift = _this.__shift;
    } else {
        newTail = Vector_getArrayFor(_this, size - 2);

        shift = _this.__shift;
        newRoot = popTail(_this.__root, size, shift);
        newShift = shift;

        if (isNull(newRoot)) {
            newRoot = emptyNode;
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
        return emptyVector;
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

    return Vector_conjArray(new Vector(INTERNAL_CREATE), results, true);
}

VectorPrototype.shift = function() {
    var size = this.__size;

    if (size === 0) {
        return this;
    } else if (size === 1) {
        return emptyVector;
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

function copyArray(a, b) {
    var i = -1,
        il = MASK;

    while (i++ < il) {
        b[i] = a[i];
    }

    return b;
}

function createArray() {
    return new Array(SIZE);
}

function cloneArray(a) {
    return copyArray(a, createArray());
}

function copyNode(from, to) {
    copyArray(from.array, to.array);
    return to;
}

function cloneNode(node) {
    return copyNode(node, createNode());
}
