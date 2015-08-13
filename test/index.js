var tape = require("tape"),
    Vector = require("..");


function createArray(size) {
    var array = new Array(size),
        i = size;

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

    assert.end();
});

tape("Vector size() should return size of the Vector", function(assert) {
    assert.equal(new Vector().size(), 0);
    assert.equal(new Vector([1, 2]).size(), 2);
    assert.equal(new Vector([1, 2], 3).size(), 2);
    assert.equal(new Vector(1).size(), 1);
    assert.end();
});

tape("Vector conj(...values) should add values to font of Vector", function(assert) {
    var a = new Vector(0, 1),
        b = a.conj(2),
        c = b.conj(3, 4, 5);

    assert.deepEqual(b.toArray(), [0, 1, 2]);
    assert.deepEqual(c.toArray(), [0, 1, 2, 3, 4, 5]);

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

tape("Vector toString() should return toString representation of Vector", function(assert) {
    assert.equal((new Vector(0, 1, 2)).toString(), "[0 1 2]");
    assert.end();
});
