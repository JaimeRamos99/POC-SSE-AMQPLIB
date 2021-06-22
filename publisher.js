// Access the callback-based API
var amqp = require('amqplib/callback_api');
var amqpConn = null;
var CLOUDAMQP_URL = process.env.CLOUDAMQP_URL;
var pubChannel = null;

//offlinePubQueue is an internal queue for messages that could not be sent when the application was offline.
// The application will keep an eye on this queue and try to resend any messages added to it.
var offlinePubQueue = [];
                                                                                                                                                               
//stablish a connection to RabbitMQ. If the connection is closed or fails to be established, 
//it will try to reconnect. amqpConn will hold the connection and channels will be set up in the connection.
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

        console.log("[AMQP] publisher connected");
        amqpConn = conn;
        startPublisher();
        console.log('publisher is started');
    });
}

// createConfirmChannel opens a channel which uses "confirmation mode". 
// A channel in confirmation mode requires each published message to be ‘acked’ or ‘nacked’ by the server, 
// thereby indicating that it has been handled.
function startPublisher() {
    amqpConn.createConfirmChannel(function(err, ch) {
        
        if (closeOnErr(err)) return;
        ch.on("error", function(err) { 
            console.error("[AMQP] channel error", err.message); 
        });
        
        ch.on("close", function() { 
            console.log("[AMQP] channel closed"); 
        });
        
        pubChannel = ch; 
        while (true) {
            var m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]); 
        }
    });
}

// method to publish a message, will queue messages internally if the connection is down and resend later

function publish(exchange, routingKey, content) {
    try {
        pubChannel.publish(exchange, routingKey, content, { persistent: true }, 
            function(err, ok) { 
                if (err) { 
                    console.error("[AMQP] publish", err);
                     offlinePubQueue.push([exchange, routingKey, content]);
                     pubChannel.connection.close(); 
                } 
            });
        
    } catch (e) { 
        console.error("[AMQP] publish", e.message); 
        offlinePubQueue.push([exchange, routingKey, content]); 
    }
        
}

function closeOnErr(err) { 
    if (!err) return false; 
    console.error("[AMQP] error", err); 
    amqpConn.close(); 
    return true;
}

module.exports = {start, publish}