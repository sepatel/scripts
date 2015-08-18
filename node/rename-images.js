var Q = require('q');
var FS = require('fs');
var Path = require('path');
var Exif = require('exif').ExifImage;

var args = process.argv.splice(2);
if (args.length == 0) {
  args.push('.');
}

var qList = [];
args.forEach(function(pathname) {
  convertPath(pathname).then(function(files) {
    files.forEach(function(file) {
      qList.push(renameImage(file));
    });
  });
});
Q.allSettled(qList).then(function(results) {
  results.forEach(function(result) {
    if (result.state == 'rejected') {
      console.error(result.reason);
    }
  });
}).done();

function convertPath(pathname) {
  var imagePaths = [];
  pathname = Path.normalize(pathname);
  var stat = FS.statSync(pathname);

  if (stat.isDirectory()) {
    FS.readdirSync(pathname).forEach(function(file) {
      // convertPath is synchronous not asynchronous
      convertPath(pathname + '/' + file).then(function(imageFiles) {
        imageFiles.forEach(function(image) {
          imagePaths.push(image);
        });
      });
    });
  } else {
    imagePaths.push(pathname);
  }

  return Q(imagePaths);
}

function renameImage(filename) {
  if (!filename.match(/\.jpg/i)) {
    return Q.reject({filename: filename, error: "Not a .jpg extension"});
  }

  var defer = Q.defer();
  new Exif({image: filename}, function(error, exifData) {
    if (error) {
      return defer.reject({filename: filename, error: error});
    }

    var dateCreationString = exifData.exif.DateTimeOriginal || exifData.image.ModifyDate;
    if (dateCreationString == null) {
      return defer.reject({filename: filename, error: "Unable to handle renaming"});
    }
    var timestamp = dateCreationString.replace(/(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/, function(matcher, year, month, day, hour, minute, second) {
      return year + "-" + month + "-" + day + " " + hour + "." + minute + "." + second;
    });

    if (filename.indexOf(timestamp) != -1) { // already in the correct format. Don't rename it
      return defer.reject({filename: filename, error: "Already in the correct format"});
    }

    var newImageName = Path.dirname(filename) + '/' + timestamp + '.jpg';
    if (FS.existsSync(newImageName)) {
      for (var i = 0; i < 1000; i++) {
        newImageName = Path.dirname(filename) + '/' + timestamp + '_' + i + '.jpg';
        if (!FS.existsSync(newImageName)) {
          break;
        }
      }
    }

    try {
      console.info("Renaming", filename, "to", newImageName);
      FS.renameSync(filename, newImageName);
      defer.resolve({original: filename, destination: newImageName});
    } catch (e) {
      defer.reject({filename: filename, error: e});
    }
  });

  return defer.promise;
}

