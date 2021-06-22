// Access the callback-based API
var amqp = require('amqplib/callback_api');
var amqpConn = null;
var CLOUDAMQP_URL = process.env.CLOUDAMQP_URL;

//stablish a connection to RabbitMQ. If the connection is closed or fails to be established, it will try to reconnect. amqpConn will hold the connection and channels will be set up in the connection.
function start() {
    amqp.connect(CLOUDAMQP_URL + "?heartbeat=60", function(err, conn) { 
        if (err) { 
            console.error("[AMQP]", err.message);
            return setTimeout(start, 1000);
        }

        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message); 
            }
        });

        conn.on("close", function() {
            console.error("[AMQP] reconnecting");
            return setTimeout(start, 1000);
        });

        console.log("[AMQP] consumer connected");
        amqpConn = conn;
        startConsumer();
    });
}

// A worker that acks messages only if processed succesfully
// the worker is the consumer
function startConsumer() {
    // amqpConn.createChannel creates a channel on the connection
    amqpConn.createChannel(function(err, ch) { 
        if (closeOnErr(err)) return;

        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message); 
        });

        ch.on("close", function() { 
            console.log("[AMQP] channel closed"); 
        });
        
        ch.prefetch(10); 

        // creates a queue if it does not already exist
        ch.assertQueue("jobs", { durable: true }, function(err, _ok) {
             if (closeOnErr(err)) return; 

             //ch.consume sets up a consumer with a callback to be invoked with each message it receives.
             ch.consume("jobs", processMsg, { noAck: false }); 
             console.log("Worker is started"); 
        });

        function processMsg(msg) { 
            work(msg, function(ok) { 
                try {
                    if (ok) ch.ack(msg);
                    else 
                        ch.reject(msg, true); 
                } catch (e) { 
                    closeOnErr(e); 
                } 
            });
        } 
    });
}

function work(msg, cb) { 
    console.log("Got msg: ", msg.content.toString()); 
    cb(true);
} 

function closeOnErr(err) { 
    if (!err) return false; 
    console.error("[AMQP] error", err); 
    amqpConn.close(); 
    return true;
}

module.exports = {start}
