const {Client} = require("amps");
const WebSocket = require("ws");

const client = new Client("xxx");
const conn = client.connect("ws://localhost:9008/amps/json");

let id = 0;
const SCHEMA = {exchange: "string", timestamp: "datetime", price: "float", size: "float", side: "string"};

class FTX {
    async subscribe() {
        this.parsed = [];
        this.websocket = new WebSocket("wss://ftx.com/ws/");

        console.log("Connecting to FTX");
        this.websocket.onopen = () => {
            console.log("Creating BTC-PERP Subscription");
            this.websocket.send(
                JSON.stringify({
                    op: "subscribe",
                    channel: "orderbook",
                    market: "BTC-PERP",
                })
            );
        };

        this.websocket.onclose = () => {
            this.websocket.send(
                JSON.stringify({
                    op: "unsubscribe",
                    channel: "orderbook",
                    market: "BTC-PERP",
                })
            );
        };

        this.websocket.onmessage = this.onmessage.bind(this);
        return new Promise((resolve) => {
            this.resolver = resolve;
        });
    }

    onmessage(event) {
        if (!event.data) {
            return;
        }

        if (this.resolver) {
            this.resolver(this.table);
            this.resolver = undefined;
        }

        const message = JSON.parse(event.data);
        const message_type = message.type;
        const init = this.parsed.length === 0;
        this.total_length = this.total_length || 0;

        if (message_type === "update") {
            const book = message.data;
            for (const bid of book.bids) {
                this.parsed.push(this.parse("bid", book.time, bid));
            }

            for (const ask of book.asks) {
                this.parsed.push(this.parse("ask", book.time, ask));
            }

            if (init && this.parsed.length > 0) {
                setTimeout(() => this.flush(), this.total_length < 10000 ? 50 : this.total_length < 100000 ? 500 : 1000);
            }
        } else if (message_type === "subscribed") {
            this.subscribed = true;
            console.debug("[FTX] successfully subscribed!");
        } else if (message_type === "unsubscribed") {
            this.subscribed = false;
            console.debug("[FTX] successfully unsubscribed!");
        } else if (message_type === "partial") {
            // don't read the initial state of the book, just feed updates.
            return;
        } else {
            throw new Error(`[FTX] Unknown message received: ${message}`);
        }
    }

    flush() {
        for (let p of this.parsed) {
            client.publish("orders", p);
        }

        this.total_length = this.total_length + this.parsed.length;
        this.parsed = [];
    }

    parse(side, timestamp, row) {
        const price = row[0];
        const size = row[1];
        return {
            id: id++,
            exchange: "BTC-PERP",
            price,
            size,
            timestamp: new Date(timestamp * 1000),
            side,
        };
    }
}

new FTX().subscribe();
