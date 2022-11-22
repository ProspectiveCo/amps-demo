const { Client } = require("amps");

var SECURITIES = [
    "AAPL.N",
    "AMZN.N",
    "QQQ.N",
    "NVDA.N",
    "TSLA.N",
    "FB.N",
    "MSFT.N",
    "TLT.N",
    "XIV.N",
    "YY.N",
    "CSCO.N",
    "GOOGL.N",
    "PCLN.N",
];

var CLIENTS = [
    "Homer",
    "Marge",
    "Bart",
    "Lisa",
    "Maggie",
    "Moe",
    "Lenny",
    "Carl",
    "Krusty",
];

let id = 0;

function gen_input() {
    var rows = [];
    for (var x = 0; x < 50; x++) {
        rows.push({
            id: id++,
            name: SECURITIES[Math.floor(Math.random() * SECURITIES.length)],
            client: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
            lastUpdate: new Date(),
            chg: Math.random() * 20 - 10,
            bid: Math.random() * 10 + 90,
            ask: Math.random() * 10 + 100,
            vol: Math.random() * 10 + 100,
        });
    }
    return rows;
}

function push_input(client) {
    const input = gen_input();
    for (p of input) {
        client.publish("orders", p);
    }

    setTimeout(push_input, 2500, client);
}

async function kickoff() {
    const client = new Client("xxx");
    await client.connect("ws://localhost:8009/amps/json");
    return client;
}

kickoff().then((client) => {
    push_input(client);
});
