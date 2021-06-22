# POC-SSE-AMQPLIB

Steps to execute the POC:
1. Run 'npm i' to install the dependencies
2. Run 'CLOUDAMQP_URL="YOUR URL FOR RABBITMQ instance" node index.js'
3. Run 'curl -H Accept:text/event-stream http://localhost:3000/events' in other terminal to suscribe to the events sent by the server
4. On another command line run 'curl -X POST \
 -H "Content-Type: application/json" \
 -d '{"info": "Shark teeth are embedded in the gums rather than directly affixed to the jaw, and are constantly replaced throughout life.", "source": "https://en.wikipedia.org/wiki/Shark"}'\
 -s http://localhost:3000/fact'
