const crypto = require('crypto');

function requestObservability(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    if (res.statusCode < 400) return;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.warn(JSON.stringify({
      event: 'api_response',
      requestId,
      method: req.method,
      route: req.route?.path || 'unmatched',
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    }));
  });
  next();
}

module.exports = { requestObservability };
