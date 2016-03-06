var _ = require('underscore');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;

module.exports = function(mongoUrl) {
  var me = this;

  Q.ninvoke(MongoClient, 'connect', mongoUrl).then(function(db) {
    me.db = db;
  }).catch(function(e) {
    console.error("Failed to connect to db: ", e.message);
    process.exit(1);
  });

  me.find = function(collectionName, query, fields, options) {
    var collection = me.db.collection(collectionName);
    return Q.ninvoke(collection, 'find', query, fields, options).then(function(cursor) {
      return Q.ninvoke(cursor, 'toArray');
    });
  };

  me.findCursor = function(collectionName, query, fields, options) {
    var collection = me.db.collection(collectionName);
    return Q.ninvoke(collection, 'find', query, fields, options);
  };

  me.findOne = function(collectionName, query, fields, options) {
    var collection = me.db.collection(collectionName);
    return Q.ninvoke(collection, 'findOne', query, fields, options).then(function(doc) {
      if (doc == null) {
        throw "Not found";
      }
      return doc;
    });
  };

  me.toMongo = function(src) {
    if (_.isArray(src)) {
      _.forEach(src, me.toMongo);
    } else if (src.hasOwnProperty('id')) {
      src._id = src.id;
      delete src.id;
    }

    return src;
  };

  me.fromMongo = function(src) {
    if (_.isArray(src)) {
      _.forEach(src, me.fromMongo);
    } else if (src.hasOwnProperty('_id')) {
      if (src._id.str) {
        srd.id = src._id.str;
      } else {
        src.id = src._id;
      }
      delete src._id;
    }

    return src;
  };

  return me;
};
