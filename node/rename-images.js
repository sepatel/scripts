var fs = require('fs');
var path = require('path');
var exif = require('exif').ExifImage;

var args = process.argv.splice(2);
if (args.length == 0) {
  args.push('.');
}

args.forEach(convertPath);

function convertPath(pathname) {
  pathname = path.normalize(pathname);
  fs.stat(pathname, function(error, stat) {
    if (error) {
      console.info("Unable to process", pathname);
      return;
    }

    if (stat.isDirectory()) {
      fs.readdir(pathname, function(error, files) {
        files.forEach(function(file) {
          convertPath(pathname + '/' + file);
        })
      });
    } else {
      new exif({image: pathname}, function(error, exifData) {
        if (error) {
          console.error("Ignoring", pathname, error);
          return;
        }

        var dateCreationString = exifData.exif.DateTimeOriginal || exifData.image.ModifyDate;
        if (dateCreationString == null) {
          console.info("Unable to handle renaming", pathname);
          return;
        }
        var timestamp = dateCreationString.replace(/(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/, function(matcher, year, month, day, hour, minute, second) {
          return year + "-" + month + "-" + day + " " + hour + "." + minute + "." + second;
        });

        if (pathname.indexOf(timestamp) != -1) { // already in the correct format. Don't rename it
          return;
        }

        var newImageName = path.dirname(pathname) + '/' + timestamp + '.jpg';
        if (fs.existsSync(newImageName)) {
          for (var i = 0; i < 1000; i++) {
            newImageName = path.dirname(pathname) + '/' + timestamp + '_' + i + '.jpg';
            if (!fs.existsSync(newImageName)) {
              break;
            }
          }
        }

        fs.renameSync(pathname, newImageName);
      });
    }
  });
}

