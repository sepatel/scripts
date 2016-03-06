var Q = require('q');
var Request = require('request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // ignore self signed certs

module.exports = {
  delete: function(url, headers) {
    return wrapRequest('DELETE', url, null, headers);
  },
  get: function(url, headers) {
    return wrapRequest('GET', url, null, headers);
  },
  post: function(url, body, headers) {
    return wrapRequest('POST', url, body, headers);
  },
  put: function(url, body, headers) {
    return wrapRequest('PUT', url, body, headers);
  }
};

function wrapRequest(method, url, body, headers) {
  var defer = Q.defer();

  var options = {
    url: url,
    method: method,
    followRedirects: false
  };

  if (body) {
    options.json = body;
  }
  if (headers) {
    options.headers = headers;
  }

  Request(options, function(error, response, body) {
    if (error) {
      if (error.code && error.code == 'ECONNREFUSED') {
        return defer.reject('Connection Refused to ' + url);
      }
      return defer.reject(error);
    }

    if (response.statusCode != 200) {
      return defer.reject(body);
    }

    defer.resolve(body);
  });

  return defer.promise;
}

