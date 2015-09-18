var tape = require("tape"),
    Vector = require("..");


function createArray(size) {
    var array = new Array(size);

    while (size--) {
        array[size] = size;
    }

    return array;
}

tape("Vector() should create new Vector from passed arguments", function(assert) {
    assert.deepEqual(new Vector(0, 1, 2).toArray(), [0, 1, 2]);
    assert.deepEqual(new Vector([0, 1, 2]).toArray(), [0, 1, 2]);
    assert.deepEqual(new Vector([0, 1, 2], 1, 2).toArray(), [
        [0, 1, 2], 1, 2
    ]);
    assert.deepEqual(new Vector(createArray(1057)).size(), 1057);
    assert.deepEqual(new Vector(createArray(31)).size(), 31);

    assert.end();
});

tape("Vector.isVector(value) should return true if the object is a Vector", function(assert) {
    var vector = new Vector(0, 1, 2),
        notVector = [];

    assert.equal(Vector.isVector(vector), true);
    assert.equal(Vector.isVector(notVector), false);

    assert.end();
});

tape("Vector size() should return size of the Vector", function(assert) {
    assert.equal(new Vector().size(), 0);
    assert.equal(new Vector([1, 2]).size(), 2);
    assert.equal(new Vector([1, 2], 3).size(), 2);
    assert.equal(new Vector(1).size(), 1);
    assert.end();
});

tape("Vector conj(...values) should add values to end of Vector", function(assert) {
    var a = new Vector(0, 1),
        b = a.conj(2),
        c = b.conj(3, 4, 5);

    assert.deepEqual(b.toArray(), [0, 1, 2]);
    assert.deepEqual(c.toArray(), [0, 1, 2, 3, 4, 5]);

    assert.end();
});

tape("Vector unshift(...values) should add values to front of list", function(assert) {
    var a = new Vector(1, 2),
        b = a.unshift(0),
        c = a.unshift(0, 1, 2);

    assert.deepEqual(b.toArray(), [0, 1, 2]);
    assert.deepEqual(c.toArray(), [2, 1, 0, 1, 2]);

    assert.end();
});

tape("Vector pop() should return Vector without last element of Vector", function(assert) {
    var v = new Vector(createArray(1057));

    while (v.size() !== 0) {
        v = v.pop();
    }

    assert.equal(v.size(), 0);
    assert.end();
});

tape("Vector shift() should return list without first element of list", function(assert) {
    var a = new Vector(1, 2, 3),
        b = a.shift(),
        c = b.shift(),
        d = c.shift(),
        e = d.shift();

    assert.deepEqual(b.toArray(), [2, 3]);
    assert.deepEqual(c.toArray(), [3]);
    assert.equal(b.size(), 2);
    assert.equal(c.size(), 1);
    assert.equal(d.size(), 0);
    assert.equal(d, e);

    assert.end();
});

tape("Vector get(index : Int) should return nth element in vector undefined if out of bounds", function(assert) {
    var vector = new Vector(1, 2, 3);

    assert.equal(vector.get(0), 1);
    assert.equal(vector.get(1), 2);
    assert.equal(vector.get(2), 3);
    assert.equal(vector.get(3), undefined);

    assert.end();
});

tape("Vector first() should return first element from vector", function(assert) {
    var a = new Vector(1, 2, 3);
    assert.equal(a.first(), 1);
    assert.end();
});

tape("Vector last() should return last element from vector", function(assert) {
    var a = new Vector(1, 2, 3);
    assert.equal(a.last(), 3);
    assert.end();
});

tape("Vector set(index : Int, value : Any) should return a new Vector with the updated element at index if value is not the same", function(assert) {
    var a = new Vector(createArray(33)),
        b = a.set(0, 32),
        c = b.set(0, 32),
        d = c.set(32, 0),
        e = d.set(32, 0);

    assert.equal(b.get(0), 32);
    assert.equal(b, c);

    assert.equal(d.get(32), 0);
    assert.equal(d, e);

    assert.end();
});

tape("Vector insert(index : Int, ...values : Any) should return new Vector with inserted values at index", function(assert) {
    var a = new Vector(0, 1, 2),
        b = a.insert(0, 1),
        c = a.insert(2, 3),
        d = a.insert(1, 1, 2);

    assert.deepEqual(b.toArray(), [1, 0, 1, 2]);
    assert.deepEqual(c.toArray(), [0, 1, 3, 2]);
    assert.deepEqual(d.toArray(), [0, 1, 2, 1, 2]);

    assert.end();
});

tape("Vector remove(index : Int[, count = 1 : int]) should return new Vector with the removed count from index", function(assert) {
    var a = new Vector(0, 1, 2),
        b = a.remove(0),
        c = a.remove(1),
        d = a.remove(2),
        e = a.remove(0, 2),
        f = e.remove(0);

    assert.deepEqual(b.toArray(), [1, 2]);
    assert.deepEqual(c.toArray(), [0, 2]);
    assert.deepEqual(d.toArray(), [0, 1]);
    assert.deepEqual(e.toArray(), [2]);
    assert.deepEqual(f.toArray(), []);

    assert.end();
});

tape("Vector static equal(a : Vector, b : Vector) should return a deep equals of vector a and b", function(assert) {
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector(0, 1, 2)), true);
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector(1, 2, 3)), false);
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector(1, 2)), false);
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector()), false);
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector(0, 1, 3)), false);
    assert.equal(Vector.equal(new Vector(0, 1, 2), new Vector(0, 1, 2, 3)), false);

    assert.end();
});

tape("Vector iterator([reverse = false : Boolean]) (reverse = false) should return Iterator starting from the beginning", function(assert) {
    var a = new Vector(0, 1, 2),
        it = a.iterator();

    assert.equal(it.next().value, 0);
    assert.equal(it.next().value, 1);
    assert.equal(it.next().value, 2);
    assert.equal(it.next().done, true);

    assert.end();
});

tape("Vector iterator([reverse = false : Boolean]) (reverse = true) should return Iterator starting from the end", function(assert) {
    var a = new Vector(0, 1, 2),
        it = a.iterator(true);

    assert.equal(it.next().value, 2);
    assert.equal(it.next().value, 1);
    assert.equal(it.next().value, 0);
    assert.equal(it.next().done, true);

    assert.end();
});

tape("Vector every(callback[, thisArg])", function(assert) {
    assert.equals(
        Vector.of([0, 1, 2, 3, 4, 5]).every(function(value, index) {
            return value === index;
        }),
        true
    );
    assert.equals(
        Vector.of([0, 1, 2, 3, 4, 5]).every(function(value) {
            return value === 1;
        }),
        false
    );
    assert.end();
});

tape("Vector filter(callback[, thisArg])", function(assert) {
    assert.deepEquals(
        Vector.of([0, 0, 2, 2, 4, 4]).filter(function(value, index) {
            return value === index;
        }).toArray(), [0, 2, 4]
    );
    assert.end();
});

tape("Vector forEach(callback[, thisArg])", function(assert) {
    var count = 0,
        indices = [];

    Vector.of([0, 1, 2, 3, 4]).forEach(function(value, index) {
        indices[indices.length] = index;
        count += 1;
    });
    assert.deepEquals(indices, [0, 1, 2, 3, 4]);
    assert.equals(count, 5);

    count = 0;
    indices.length = 0;
    Vector.of([0, 1, 2, 3, 4]).forEach(function(value, index) {
        indices[indices.length] = index;
        count += 1;
        if (value === 2) {
            return false;
        }
    });
    assert.deepEquals(indices, [0, 1, 2]);
    assert.equals(count, 3);

    assert.end();
});

tape("Vector forEachRight(callback[, thisArg])", function(assert) {
    var count = 0,
        indices = [];

    Vector.of([0, 1, 2, 3, 4]).forEachRight(function(value, index) {
        indices[indices.length] = index;
        count += 1;
    });
    assert.deepEquals(indices, [4, 3, 2, 1, 0]);
    assert.equals(count, 5);

    count = 0;
    indices.length = 0;
    Vector.of([0, 1, 2, 3, 4]).forEachRight(function(value, index) {
        indices[indices.length] = index;
        count += 1;
        if (value === 2) {
            return false;
        }
    });
    assert.deepEquals(indices, [4, 3, 2]);
    assert.equals(count, 3);

    assert.end();
});

tape("Vector map(callback[, thisArg])", function(assert) {
    assert.deepEquals(
        Vector.of([0, 1, 2, 3, 4]).map(function(value, index) {
            return value + index;
        }).toArray(), [0, 2, 4, 6, 8]
    );
    assert.end();
});

tape("Vector reduce(callback[, thisArg])", function(assert) {
    assert.deepEquals(
        Vector.of([0, 1, 2, 3, 4]).reduce(function(currentValue, value) {
            return currentValue + value;
        }),
        10
    );
    assert.end();
});

tape("Vector reduceRight(callback[, thisArg])", function(assert) {
    assert.deepEquals(
        Vector.of([0, 1, 2, 3, 4]).reduceRight(function(currentValue, value) {
            return currentValue + value;
        }),
        10
    );
    assert.end();
});

tape("Vector some(callback[, thisArg])", function(assert) {
    assert.equals(
        Vector.of([0, 1, 2, 3, 4, 5]).some(function(value) {
            return value === 3;
        }),
        true
    );
    assert.equals(
        Vector.of([0, 1, 2, 3, 4, 5]).some(function(value) {
            return value === 6;
        }),
        false
    );
    assert.end();
});

tape("Vector toString() should return toString representation of Vector", function(assert) {
    assert.equal((new Vector(0, 1, 2)).toString(), "[0 1 2]");
    assert.end();
});
