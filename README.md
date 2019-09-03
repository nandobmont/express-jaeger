# express-jaeger

A simple Jaeger middleware to tracing requests for your Express JS app.

# Installation

```sh
$ npm i --save express-jaeger
```

# Using it as a Middleware

### Setup using Environment Variables


```
process.env.JAEGER_COLLECTOR_ENDPOINT = "http://192.168.0.1:14268/api/traces";
process.env.JAEGER_SERVICE_NAME = "express-jaeger-example";
process.env.JAEGER_AGENT_HOST = "192.168.0.1";
process.env.JAEGER_AGENT_PORT = "6831";

const { track } = require("express-jaeger");
const express = require("express");
const server = express();

server.use(track("/operationName1"));
server.use(track("/operationName2"));
server.use(track("/operationName3"));

server.get("/home", track("/home"), (req, res) => {
    res.status(200).send("Welcome!")
})

server.listen(3000);

```

### Setup using Custom Objects


```
// TracingOptions

const options = {
  logger: {
    info: msg => {
      console.log("INFO ", msg);
    },
    error: msg => {
      console.log("ERROR", msg);
    }
  }
}

// TracingConfig

const config = {
  serviceName: "MyService",
  sampler: {
    type: "const",
    param: 1
  },
  reporter: {
    collectorEndpoint: "http://192.168.0.1:14268/api/traces",
    agentHost: "192.168.0.1",
    agentPort: "6831",
    logSpans: true
  }
};

const { track } = require("express-jaeger");
const express = require("express");
const server = express();

server.use(track("/operationName1", config, options));
server.use(track("/operationName2", config, options));
server.use(track("/operationName3", config, options));

server.get("/home", track("/home", config, options), (req, res) => {
    res.status(200).send("Welcome!")
})

server.listen(3000);

```

# Running

### Starting a Jaeger Server using Docker

```sh
$ docker run -d --name jaeger -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 -p 5775:5775/udp -p 6831:6831/udp -p 6832:6832/udp -p 5778:5778 -p 16686:16686 -p 14268:14268 -p 9411:9411 jaegertracing/all-in-one:1.8
```

Once the Jaeger Server is active...

### Starting your Express app

```sh
$ npm start

or

$ node /path/to/your/server.js
```

### That's it

1. Open your browser in http://localhost:3000/home
2. In another tab, open http://localhost:16686 to see the Jaeger UI
3. On the left menu select your service by the name ( *process.env.JAEGER_SERVICE_NAME* )
4. Click on the **Find Traces** button and _voilá_.
