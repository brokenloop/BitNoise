var txNodes = [];

var svg = d3.select("#bubbleCanvas"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
var centerX = width / 2.0;
var centerY = height / 2.0;
var counter = 0;

var node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle");

var bubbleSimulation = d3.forceSimulation(txNodes)
    .force("charge", d3.forceManyBody().strength(-3))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .force("collision", d3.forceCollide(function radius(d, i) {
        return d.scaledValue;
    }))
    .alphaTarget(1)
    .on("tick", bubblesTicked);

var websocket;

function init() {
    websocket = new WebSocket("wss://ws.blockchain.info/inv");

    websocket.onopen = function() {
        document.getElementById("status").innerHTML = "Connected";
    };

    websocket.onerror = function(event) {
        document.getElementById("status").innerHTML = "Error";
    };

    websocket.onmessage = function(event) {
        //message processing code goes here
        var msgData = JSON.parse(event.data);
        if (msgData.op == 'utx') {


            var txHash = msgData.x.hash;
            var outputs = msgData.x.out;
            var totalTxValue = 0;
            for (var j = 0; j < outputs.length; j++) {
                var output = outputs[j];
                totalTxValue += output.value;
            }
            // totalTxValue /= 100000000;
            totalTxValue /= 10000000;
            var newTx = {
                id: txHash,
                value: totalTxValue,
                scaledValue: 5 + Math.log(totalTxValue)
            };
            txNodes.push(newTx);
            if (txNodes.length > 400) {
                txNodes.shift();
            }
            bubblesRestart();

            document.getElementById("status").innerHTML = "tx: " + txHash;


            // make sounds
            console.log(totalTxValue);

            var frequency = 100 / totalTxValue;
            var ramp = totalTxValue * 100;
            var now = context.currentTime;
            kick.trigger(now, frequency, ramp, totalTxValue);

        }
    };
};

function sendMessage(message) {
    document.getElementById("output").innerHTML = message;
    websocket.send(message);
}

function bubblesRestart() {
    var updateSelection = node.data(txNodes, function(d) {
        return d.id;
    }); //updated transactions
    updateSelection.exit().remove(); //removed transactions
    var enterSelection = updateSelection.enter()
        .append("circle")
        .attr("r", function(d) {
            return d.scaledValue;
        })
        .attr("fill", function(d) {
            return d3.hsl(180 + Math.min(d.value * 4, 180), 1, 0.5);
        }); //new transactions
    node = updateSelection.merge(enterSelection);
    bubbleSimulation.nodes(txNodes);
    bubbleSimulation.alpha(1).restart();
}

function bubblesTicked() {
    node.attr("cx", function(d) {
            return d.x + centerX;
        })
        .attr("cy", function(d) {
            return d.y + centerY;
        });
}

function start() {
    websocket.send('{"op":"unconfirmed_sub"}');
    context = new AudioContext;
    kick = new Kick(context)
}

function stop() {
    websocket.send('{"op":"unconfirmed_unsub"}');
}

// ---- MY CODE ----

// var context = new AudioContext;
var context = null;
var kick = null;

function Kick(context) {
  this.context = context;
};

Kick.prototype.setup = function() {
  this.osc = this.context.createOscillator();
  this.gain = this.context.createGain();
  this.osc.connect(this.gain);
  this.gain.connect(this.context.destination)
};

Kick.prototype.trigger = function(time, frequency, ramp, totalTxValue) {
  this.setup();

  this.osc.frequency.setValueAtTime(frequency, time);
  this.gain.gain.setValueAtTime(1, time);

  this.osc.frequency.exponentialRampToValueAtTime(ramp, time + 0.5);
  this.gain.gain.exponentialRampToValueAtTime(ramp, time + 0.5);

  this.osc.start(time);

  this.osc.stop(time + 0.5);

};

// -----------------
window.addEventListener("load", init, false);
