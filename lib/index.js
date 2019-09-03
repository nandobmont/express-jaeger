const { initTracer } = require("jaeger-client");
const { FORMAT_HTTP_HEADERS } = require("opentracing");

const defaultServiceName = process.env.JAEGER_SERVICE_NAME || "unknown_service";

const defaultSampler = {
  type: "const",
  param: 1
};

const defaultReporter = {
  collectorEndpoint: process.env.JAEGER_COLLECTOR_ENDPOINT || "http://localhost:14268/api/traces",
  agentHost: process.env.JAEGER_AGENT_HOST || "localhost",
  agentPort: process.env.JAEGER_AGENT_PORT || 6831,
  logSpans: true
};

const defaultLogger = {
  info: msg => {
    console.log("JAEGER INFO ", msg);
  },
  error: msg => {
    console.log("JAEGER ERROR", msg);
  }
};

const defaultOptions = { logger: defaultLogger };

const defaultConfig = (serviceName = defaultServiceName) => ({
  serviceName,
  reporter: defaultReporter,
  sampler: defaultSampler
});

const isValidConfig = config => {

  let hasReporterProperties = false
  let hasReporterEnvs = false

  if (config) {
    let { reporter } = config;
    if (reporter) {
      let { collectorEndpoint, agentHost, agentPort } = reporter;
      hasReporterProperties = (collectorEndpoint && agentHost && agentPort) ? true : false;
    }
  }

  let { JAEGER_COLLECTOR_ENDPOINT, JAEGER_AGENT_HOST, JAEGER_AGENT_PORT } = process.env;
  hasReporterEnvs = (JAEGER_AGENT_HOST && JAEGER_AGENT_PORT && JAEGER_COLLECTOR_ENDPOINT) ? true : false

  if (hasReporterEnvs || hasReporterProperties) {
    return true
  } else {
    return false
  }
}

const hasOwnService = (operationName, config = defaultConfig) => {
  if (operationName.includes(":")) {
    const serviceName = operationName.split(":")[0]
    const operation = operationName.split(":")[1]
    return { operation, configuration: { ...config, serviceName } }
  } else {
    return { operation: operationName, configuration: config }
  }
}

const track = (operationName, parent, config = defaultConfig(), options = defaultOptions) => (req, res, next) => {
  
  let { operation, configuration } = hasOwnService(operationName, config)
  
  operationName = operation
  config = configuration
  
  if (isValidConfig(config)) {
    let { headers, path, url, method, body, query, params } = req;
    const tracer = initTracer(config, options);
    const context = tracer.extract(FORMAT_HTTP_HEADERS, headers)
    
    const span = tracer.startSpan(operationName, { childOf: parent || context });
    span.setTag("http.request.url", url);
    span.setTag("http.request.method", method);
    span.setTag("http.request.path", path);
    span.log({ body }).log({ query }).log({ params });

    tracer.inject(span, FORMAT_HTTP_HEADERS, headers);
    req.headers = headers;
    next();

    res.once("finish", () => {
      span.setTag("http.response.status_code", res.statusCode);
      span.setTag("http.response.status_message", res.statusMessage);
      span.finish();
    });
  } else {
    next();
    throw new Error("Invalid configurations to the Jaeger Client. Please, be sure to pass a valid configuration by parameter or environment variables for express-jaeger middleware.")
  }
  
};

const Tracer = (config = defaultConfig(), options = defaultOptions) => {
  if (isValidConfig(config)) {
    return initTracer(config, options);
  } else {
    throw new Error("Invalid configurations to the Jaeger Client. Please, be sure to pass a valid configuration by parameter or environment variables for express-jaeger middleware.")
  }
}

const Span = (tracer, operationName, options) => {
  return tracer.startSpan(operationName, options)
}

const Context = {
  inject: (span, tracer, format = FORMAT_HTTP_HEADERS) => {
    let carrier = {}
    tracer.inject(span, format, carrier)
    return JSON.stringify(carrier)
  },
  extract: (carrier, tracer, format = FORMAT_HTTP_HEADERS) => {
    return tracer.extract(format, carrier)
  }  
}

module.exports = { track, Tracer, Span, Context }
