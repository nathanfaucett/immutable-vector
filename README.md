immutable Vector
=======

immutable persistent vector for the browser and node.js


# Usage
```javascript
var ImmutableVector = require("immutable-vector");


var a = new ImmutableVector([0, 1, 2]),
    b = new ImmutableVector(0, 1, 2),
    c = ImmutableVector.of([0, 1, 2]),
    d = ImmutableVector.of(0, 1, 2);

var a0 = a.push(3),
    a1 = a.unshift(-1);
```

# Docs

## Members

#### length -> Number
    returns size of Vector, only available if Object.defineProperty is supported


## Static Functions

#### Vector.isVector(value: Any) -> Boolean
    returns true if value is a vector else false

#### Vector.of(...values: Array<Any>) -> Vector
    creates Vector from passed values same as new Vector(...values: Array<Any>)

#### Vector.equal(a: Vector, b: Vector) -> Boolean
    compares vectors by values


## Functions

#### size() -> Number
    returns size of Vector

#### get(index: UnsignedNumber) -> Any
    returns value at index

#### nth(index: UnsignedNumber) -> Any
    alias to get

#### first() -> Any
    returns first element

#### last() -> Any
    returns last element

#### indexOf(value: Any) -> Number
    returns index of value, -1 if not found

#### set(index: UnsignedNumber, value: Any) -> Vector
    returns new Vector if value at index is different

#### insert(index: UnsignedNumber, ...values: Array<Any>) -> Vector
    returns new Vector with inserted values at index

#### remove(index: UnsignedNumber[, count = 1: UnsignedNumber]) -> Vector
    returns new Vector without the values from index to index + count

#### conj(...values: Array<Any>) -> Vector
    returns new Vector with values pushed to end of the Vector

#### unshift(...values: Array<Any>) -> Vector
    returns new Vector with values pushed to front of the Vector

#### pop() -> Vector
    returns new Vector without last element

#### shift() -> Vector
    returns new Vector without first element

#### push(...values: Array<Any>) -> Vector
    returns new Vector with values pushed to end of the Vector

#### concat(...vectors: Array<Vector>) -> Vector
    returns new Vector with values from vectors pushed to end of the Vector

#### iterator([reverse = false: Boolean]) -> Iterator
    returns Iterator

#### every, filter, forEach, forEachRight, map, reduce, reduceRight, some
    common Array methods

#### toArray() -> Array<Any>
    returns Vector elements in an Array

#### join([separator = " "]) -> String
    join all elements of an Vector into a String

#### toString() -> String
    String representation of Vector

#### equals(other: Vector) -> Boolean
    compares this vector to other vector by values
