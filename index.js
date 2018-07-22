"use strict";

var defaults = require("lodash/object/defaults");
var fs = require("fs-extra");
var path = require("path");
var chokidar = require("chokidar");
var request = require("request")



module.exports = function (source, target, opts, notify) {
  opts = defaults(opts || {}, {
    "watch": false,
    "delete": false,
    "depth": Infinity
  });

  if (typeof opts.depth !== "number" || isNaN(opts.depth)) {
    notify("error", "Expected valid number for option 'depth'");
    return false;
  }

  // Initial mirror
  var mirrored = mirror(source, target, opts, notify, 0);

  if (!mirrored) {
    return false;
  }

  if (opts.watch) {
    // Watcher to keep in sync from that
    chokidar.watch(source, {
      "persistent": true,
      "depth": opts.depth,
      "ignoreInitial": true
      // TODO "ignore": opts.ignore
    })
    //.on("raw", console.log.bind(console, "raw"))
    .on("ready", notify.bind(undefined, "watch", source))
    .on("add", watcherCopy(source, target, opts, notify))
    .on("addDir", watcherCopy(source, target, opts, notify))
    .on("change", watchUploadFIle(source, target, opts, notify))
    .on("unlink", watcherDelete(source, target, opts, notify) )
    .on("unlinkDir", watcherDelete(source, target, opts, notify))
    .on("error", watcherError(opts, notify));
  }
};


function watchUploadFIle (source, target, opts, notify) {
  console.log("up1",[source, target, opts, notify])
  return function (f, stats) {
    up(f, path.join(target, path.relative(source, f)), notify);
  };
}

function watcherCopy (source, target, opts, notify) {
  return function (f, stats) {
    copy(f, path.join(target, path.relative(source, f)), notify);
  };
}

function watcherDelete (source, target, opts, notify) {
  return function (f, stats) {
    Delete(f, path.join(target, path.relative(source, f)), notify);
    watcherDestroy(f, path.join(target, path.relative(source, f)), notify);
  };
}

function watcherDestroy (source, target, opts, notify) {
  return function (f) {
    deleteExtra(path.join(target, path.relative(source, f)), opts, notify);
  };
}

function watcherError (opts, notify) {
  return function (err) {
    notify("error", err);
  };
}

function mirror (source, target, opts, notify, depth) {
  // Specifc case where the very source is gone
  var sourceStat;
  try {
    sourceStat = fs.statSync(source);
  } catch (e) {
    // Source not found: destroy target?
    if (fs.existsSync(target)) {
      return deleteExtra(target, opts, notify);
    }
  }

  var targetStat;
  try {
    targetStat = fs.statSync(target);
  } catch (e) {
    // Target not found? good, direct copy
    return copy(source, target, notify);
  }

  if (sourceStat.isDirectory() && targetStat.isDirectory()) {
    if (depth === opts.depth) {
      notify("max-depth", source);
      return true;
    }

    // copy from source to target
    var copied = fs.readdirSync(source).every(function (f) {
      return mirror(path.join(source, f), path.join(target, f), opts, notify, depth + 1);
    });

    // check for extraneous
    var deletedExtra = fs.readdirSync(target).every(function (f) {
      return fs.existsSync(path.join(source, f)) || deleteExtra(path.join(target, f), opts, notify);
    });

    return copied && deletedExtra;
  } else if (sourceStat.isFile() && targetStat.isFile()) {
    // compare update-time before overwriting
    if (sourceStat.mtime > targetStat.mtime) {
      return copy(source, target, notify);
    } else {
      return true;
    }
  } else if (opts.delete) {
    // incompatible types: destroy target and copy
    return destroy(target, notify) && copy(source, target, notify);
  } else if (sourceStat.isFile() && targetStat.isDirectory()) {
    // incompatible types
    notify("error", "Cannot copy file '" + source + "' to '" + target + "' as existing folder");
    return false;
  } else if (sourceStat.isDirectory() && targetStat.isFile()) {
    // incompatible types
    notify("error", "Cannot copy folder '" + source + "' to '" + target + "' as existing file");
    return false;
  } else {
    throw new Error("Unexpected case: WTF?");
  }
}

function deleteExtra (fileordir, opts, notify) {
  if (opts.delete) {
    return destroy(fileordir, notify);
  } else {
    notify("no-delete", fileordir);
    return true;
  }
}

function copy (source, target, notify) {
  notify("copy", [source, target]);
  try {
    uploadFIle(source)
    //fs.copySync(source, target);
    return true;
  } catch (e) {
    notify("error", e);
    return false;
  }
}

function up (source, target, notify) {
  console.log("up", [source, target]);
  try {
    uploadFIle(source)
    //fs.copySync(source, target);
    return true;
  } catch (e) {
    notify("error", e);
    return false;
  }
}

function Delete (source, target, notify) {
  console.log("Delete", [source, target]);
  try {
    unlink(source)
    //fs.copySync(source, target);
    return true;
  } catch (e) {
    notify("error", e);
    return false;
  }
}

function destroy (fileordir, notify) {
  notify("remove", fileordir);
  try {
    //fs.remove(fileordir);
    return true;
  } catch (e) {
    notify("error", e);
    return false;
  }
}

const syncPath = "/home/david/Documentos/sucre-cloud-sync"
const modifiPath=(path)=>{
  return path.split(syncPath)[1]
}

const unlink = (path) => {


  var r = request.post("http://orchi2:8080/api/", function(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
  });

  var form = r.form();
  form.append('args', JSON.stringify({
    path: "/testSync/"+modifiPath(path),
    op: "delete"
  }));
  //form.append('f', fs.createReadStream(path));
}

const uploadFIle = (path) => {

  //var fd = new FormData()
  /*fd.append("args", JSON.stringify({
    path: "/",
    op: "put"
  }));
  fd.append('f', fs.createReadStream(path));
  var formData = {
    my_field: 'f',
    my_file: fs.createReadStream(path),
  };*/
  var r = request.post("http://orchi2:8080/api/", function(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
  });

  var form = r.form();
  form.append('args', JSON.stringify({
    path: "/testSync"+getParent(modifiPath(path)),
    op: "put"
  }));
  form.append('f', fs.createReadStream(path));
}









  const getParent = (path = "/") => {
    let p = path.split("/").filter(x => x != "")

    let parentPath = p.slice(0, p.length - 1).join("/")
    var start = "/"
    if (parentPath[0] == "/") {
      start = ""
    } else if (parentPath != "") {
      start = ""
    }
    return isRoot(path) ? path : tryNormalize("/" + parentPath)
  }

  const getName = path => {
    let ps=path.split("/").filter( _ => _ != "")
    let name = ps.slice(ps.length-1,ps.length).join("");
    return name == "" ? null:name

  }

  const mergePath = (path1, path2) => {
    return  tryNormalize(path1 + "/" + path2)
  }

  const tryNormalize=(path)=>{
    return isRoot(path) ? path : (path.replace(/\/{2,}/ig, "/")).replace(/(\/?){1,}$/ig,"").replace(/(\/+)$/ig,"")
  }

  const isRoot = (path)=>{
    return path == "/"
  }

  const parsePath = (hashPath)=>{
    var p = hashPath;
  return p.substring(p.indexOf("#")+1);
    //return hashPath.split("#")[1]
  }
