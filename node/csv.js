var FastCsv = require('fast-csv');
var Q = require('q');

module.exports = function(csvFile, lineFunction, finalizeFunction) {
  var future = Q.defer();

  var allRequests = [];
  FastCsv.fromPath(csvFile, {
    headers: true,
    trim: true,
    ignoreEmpty: true,
    discardUnmappedColumns: true
  }).on('data', function(data) {
    allRequests.push(lineFunction(data));
  }).on('end', function() {
    Q.allSettled(allRequests).then(function(results) {
      if (finalizeFunction) {
        results.forEach(function(result, index) {
          finalizeFunction(csvFile, result, index + 2); // ignore header and 0-based indexing
        });
      }
    }).done(function() {
      future.resolve();
    });
  });

  return future.promise;
};

