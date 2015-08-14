var Benchmark = require("benchmark"),
    mori = require("mori"),
    Immutable = require("immutable"),
    Vector = require("..");


var suite = new Benchmark.Suite();


suite.add("immutable-vector", function() {
    new Vector(0, 1, 2, 3);
});

suite.add("Immutable", function() {
    Immutable.List.of([0, 1, 2, 3]);
});

suite.add("mori vector", function() {
    mori.vector(0, 1, 2, 3);
});

suite.on("cycle", function(event) {
    console.log(String(event.target));
});

suite.on("complete", function() {
    console.log("Fastest is " + this.filter("fastest").pluck("name"));
    console.log("==========================================\n");
});

console.log("\n= create =================================");
suite.run();
