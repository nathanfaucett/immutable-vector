var Benchmark = require("benchmark"),
    mori = require("mori"),
    Immutable = require("immutable"),
    Vector = require("..");


var suite = new Benchmark.Suite();


suite.add("immutable-vector", function() {
    var a = new Vector(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

    return function() {
        a.conj(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    };
}());

suite.add("Immutable", function() {
    var a = Immutable.List.of([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    return function() {
        a.push(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    };
}());

suite.add("mori vector", function() {
    var a = mori.vector(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

    return function() {
        mori.conj(a, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    };
}());

suite.on("cycle", function(event) {
    console.log(String(event.target));
});

suite.on("complete", function() {
    console.log("Fastest is " + this.filter("fastest").map("name"));
    console.log("==========================================\n");
});

console.log("\n= push ===================================");
suite.run();
