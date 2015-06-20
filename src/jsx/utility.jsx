//json2
if(typeof JSON!=="object"){JSON={}}(function(){"use strict";function f(e){return e<10?"0"+e:e}function quote(e){escapable.lastIndex=0;return escapable.test(e)?'"'+e.replace(escapable,function(e){var t=meta[e];return typeof t==="string"?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function str(e,t){var n,r,i,s,o=gap,u,a=t[e];if(a&&typeof a==="object"&&typeof a.toJSON==="function"){a=a.toJSON(e)}if(typeof rep==="function"){a=rep.call(t,e,a)}switch(typeof a){case"string":return quote(a);case"number":return isFinite(a)?String(a):"null";case"boolean":case"null":return String(a);case"object":if(!a){return"null"}gap+=indent;u=[];if(Object.prototype.toString.apply(a)==="[object Array]"){s=a.length;for(n=0;n<s;n+=1){u[n]=str(n,a)||"null"}i=u.length===0?"[]":gap?"[\n"+gap+u.join(",\n"+gap)+"\n"+o+"]":"["+u.join(",")+"]";gap=o;return i}if(rep&&typeof rep==="object"){s=rep.length;for(n=0;n<s;n+=1){if(typeof rep[n]==="string"){r=rep[n];i=str(r,a);if(i){u.push(quote(r)+(gap?": ":":")+i)}}}}else{for(r in a){if(Object.prototype.hasOwnProperty.call(a,r)){i=str(r,a);if(i){u.push(quote(r)+(gap?": ":":")+i)}}}}i=u.length===0?"{}":gap?"{\n"+gap+u.join(",\n"+gap)+"\n"+o+"}":"{"+u.join(",")+"}";gap=o;return i}}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(){return this.valueOf()}}var cx,escapable,gap,indent,meta,rep;if(typeof JSON.stringify!=="function"){escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;meta={"\b":"\\b","	":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};JSON.stringify=function(e,t,n){var r;gap="";indent="";if(typeof n==="number"){for(r=0;r<n;r+=1){indent+=" "}}else if(typeof n==="string"){indent=n}rep=t;if(t&&typeof t!=="function"&&(typeof t!=="object"||typeof t.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":e})}}if(typeof JSON.parse!=="function"){cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;JSON.parse=function(text,reviver){function walk(e,t){var n,r,i=e[t];if(i&&typeof i==="object"){for(n in i){if(Object.prototype.hasOwnProperty.call(i,n)){r=walk(i,n);if(r!==undefined){i[n]=r}else{delete i[n]}}}}return reviver.call(e,t,i)}var j;text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(e){return"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}})()

function encode(str) {
  return encodeURIComponent(JSON.stringify(str));
}

function decode(str) {
  return JSON.parse(decodeURIComponent(str));
}

function isFileItem(item) {
  return item instanceof FootageItem && item.mainSource instanceof FileSource;
}

function isAVLayer(layer) {
  return (layer instanceof AVLayer && layer.hasVideo) || layer instanceof TextLayer || layer instanceof ShapeLayer;
}

function getActiveComp() {
  var item = app.project.activeItem;
  if (item && item instanceof CompItem) {
    return item;
  }
  return null;
}

function getCompByName(comp_name) {
  var project = app.project;
  for (var i = 1, l = project.numItems; i <= l; i++) {
    var item = project.item(i);
    if (item instanceof CompItem && item.name === comp_name) {
      return item;
    }
  }
  return null;
}

function getItemByURI(uri) {
  var project = app.project;
  for (var i = 1, l = project.numItems; i <= l; i++) {
    var item = project.item(i);
    if (isFileItem(item) && item.file.absoluteURI === uri) {
      return item;
    }
  }
  return null;
}

function extractSource(layer) {
  var source = layer.source;
  if (!isFileItem(source)) {
    return null;
  }
  var main_source = source.mainSource;
  return {
    path: main_source.file.fsName,
    time: layer.inPoint - layer.startTime
  };
}

function getSelectedAVLayer() {
  var comp = getActiveComp();
  if (!comp) {
    return null;
  }
  var layers = comp.selectedLayers.slice();
  if (!layers.length && !isAVLayer(layers[0])) {
    return null;
  }
  return {
    comp: comp,
    layer: layers[0]
  };
}

function getLayerByName(comp_name, layer_name) {
  var comp = getCompByName(comp_name);
  if (!comp) {
    return null;
  }
  return comp.layers.byName(layer_name);
}

function hasEffect(layer, match_name) {
  var effects = layer.Effects;
  return effects.canAddProperty(match_name);
}

function addEffect(layer, name, match_name) {
  var effects = layer.Effects,
  effect,
  found = false;
  for (var i = 1, l = effects.numProperties; i <= l; i++) {
    effect = effects.property(i);
    if (effect.name === name && effect.matchName === match_name) {
      found = true;
      break;
    }
  }

  if (!found) {
    effect = effects.addProperty(match_name);
    effect.name = name;
  }

  effect.enabled = false;

  return {
    found: found,
    effect: effect
  };
}

function getEffect(layer, name, match_name) {
  var effects = layer.Effects;
  for (var i = 1, l = effects.numProperties; i <= l; i++) {
    var effect = effects.property(i);
    if (effect.name === name && effect.matchName === match_name) {
      return effect;
    }
  }

  return null;
}

function convertType(type) {
  switch (type) {
    case 'checkbox':
      return 'ADBE Checkbox Control';
    case 'slider':
      return 'ADBE Slider Control';
    case 'point':
      return 'ADBE Point Control';
    case 'point3d':
      return 'ADBE Point3D Control';
    case 'color':
      return 'ADBE Color Control';
    case 'camera':
      return 'Atarabi CameraAE';
  }
}

function processArgs(type, args) {
  var result = [],
  index,
  value;

  switch (type) {
    case 'checkbox':
      while (args.length) {
        index = args.shift().value;
        value = !!args.shift().value;
        result.push({
          index: index,
          value: value,
        });
      }
      break;
    case 'slider':
      while (args.length) {
        index = args.shift().value;
        value = args.shift().value;
        result.push({
          index: index,
          value: value,
        });
      }
      break;
    case 'point':
      while (args.length) {
        index = args.shift().value;
        value = [args.shift().value, args.shift().value];
        result.push({
          index: index,
          value: value,
        });
      }
      break;
    case 'point3d':
      while (args.length) {
        index = args.shift().value;
        value = [args.shift().value, args.shift().value, args.shift().value];
        result.push({
          index: index,
          value: value,
        });
      }
      break;
    case 'color':
      while (args.length) {
        index = args.shift().value;
        value = [args.shift().value, args.shift().value, args.shift().value];
        result.push({
          index: index,
          value: value,
        });
      }
      break;
    case 'camera':
      while (args.length) {
        index = args.shift().value;
        result.push({
          index: index,
          value: {
            position: [args.shift().value, args.shift().value, args.shift().value],
            orientation: [args.shift().value, args.shift().value, args.shift().value],
            zoom: args.shift().value,
          },
        });
      }
      break;
  }
  return result;
}

function readComment(layer) {
  var comment = {};
  try {
    comment = JSON.parse(layer.comment);
    comment = comment['Cinder'] || {};
  } catch (e) {
    //pass
  }
  return comment;
}

function writeComment(layer, obj) {
  var comment = layer.comment;
  try {
    comment = JSON.parse(comment);
  } catch (e) {
    if (comment) {
      comment.comment = comment;
    } else {
      comment = {};
    }
  }
  comment['Cinder'] = obj;
  layer.comment = JSON.stringify(comment);
}

$._ext = {
  getSelectedLayer: function () {
    var obj = getSelectedAVLayer();
    if (!obj) {
      return encode({
        err: 'Select an av layer.',
        data: null
      });
    }
    var comp = obj.comp,
    layer = obj.layer,
    comment = readComment(layer),
    source = comment.source || '',
    source_time = comment.sourceTime || 0;

    if (!source) {
      var layer_source = extractSource(layer);
      if (layer_source) {
        source = layer_source.path;
        source_time = layer_source.time;
      }
    }

    return encode({
      err: null,
      data:  {
        folder: comment.folder || '',
        file: comment.file || '',
        comp: comp.name,
        layer: layer.name,
        fps: comp.frameRate,
        duration: Math.floor((layer.outPoint - layer.inPoint) * comp.frameRate),
        width: layer.width,
        height: layer.height,
        source: source,
        sourceTime: source_time,
        executable: comment.executable || '',
      }
    });
  },
  validateInputs: function (data) {
    data = decode(data);

    var folder_path = data.folder;
    if (folder_path === '') {
      return encode({
        err: 'Input a folder path',
        data: null
      });
    }

    var folder = Folder(folder_path);
    if (folder instanceof File || (!folder.exists && !folder.create())) {
      return encode({
        err: 'Folder doesn\'t exist',
        data: null
      });
    }

    var file = data.file;
    if (file === '') {
      return encode({
        err: 'Input a file name',
        data: null
      });
    }

    var layer = getLayerByName(data.comp, data.layer);
    if (!layer) {
      return encode({
        err: 'Layer doesn\'t exists',
        data: null
      });
    }

    var comp = layer.containingComp,
    comment = readComment(layer),
    source = comment.source || '',
    source_time = comment.sourceTime || 0;

    if (!source) {
      var layer_source = extractSource(layer);
      if (layer_source) {
        source = layer_source.path;
        source_time = layer_source.time;
      }
    }

    //set data
    data.comp = comp.name;
    data.layer = layer.name;
    data.fps = comp.frameRate;
    data.duration = Math.floor((layer.outPoint - layer.inPoint) * comp.frameRate);
    data.width = layer.width;
    data.height = layer.height;
    data.source = source;
    data.sourceTime = source_time;
    data.executable = comment.executable || '';

    return encode({
      err: null,
      data: data
    });
  },
  createParameters: function (data) {
    data = decode(data);

    var layer = getLayerByName(data.comp, data.layer);
    if (!layer) {
      return encode({
        err: 'Cannot find a layer',
        data: null
      });
    }

    app.beginUndoGroup('Cinder: create parameters');

    //camera
    if (data.useCamera) {
      var has_aecamera = hasEffect(layer, convertType('camera'));
      if (!has_aecamera) {
        return encode({
          err: 'Install a CameraAE plugin',
          data: null
        });
      }

      var obj = addEffect(layer, 'CameraAE', convertType('camera'));
      obj.effect.enabled = false;
    }

    var parameters = data.parameters;
    for (var i = 0, l = parameters.length; i < l; i++) {
      var parameter = parameters[i],
      name = parameter.name,
      type = parameter.type,
      value = parameter.value;
      if (type === 'point') {
        value[0] *= layer.width;
        value[1] *= layer.height;
      } else if (type === 'point3d') {
        value[0] *= layer.width;
        value[1] *= layer.height;
        value[2] *= layer.width;
      }

      var obj = addEffect(layer, name, convertType(type));
      if (!obj.found) {
        var effect = obj.effect;
        effect.property(1).setValue(value);
      }
    }

    app.endUndoGroup();

    return encode({
      err: null,
      data: null
    });
  },
  getPameterValue: function (data) {
    data = decode(data);

    var layer = getLayerByName(data.comp, data.layer),
    name = data.parameter.name,
    type = data.parameter.type;

    var effect = getEffect(layer, name, convertType(type));
    if (!effect) {
      return encode({
        err: 'Cannot find an effect: ' + name,
        data: null
      });
    }

    var fps = data.fps,
    frame_duration = 1 / fps,
    duration = data.duration,
    in_point = layer.inPoint,
    values = [];

    if (type !== 'camera') {
      var property = effect.property(1);
      for (var i = 0; i < duration; i++) {
        var time = in_point + i * frame_duration,
        value = property.valueAtTime(time, false);
        values.push(value);
      }
    } else {
      var fov = effect.property(1),
      row1 = effect.property(2),
      row2 = effect.property(3),
      row3 = effect.property(4),
      row4 = effect.property(5);

      for (var i = 0; i < duration; i++) {
        var time = in_point + i * frame_duration,
        fov_value = fov.valueAtTime(time, false),
        row1_value = row1.valueAtTime(time, false),
        row2_value = row2.valueAtTime(time, false),
        row3_value = row3.valueAtTime(time, false),
        row4_value = row4.valueAtTime(time, false);
        values.push([
          fov_value,
          row1_value[0], row1_value[1], row1_value[2],
          row2_value[0], row2_value[1], row2_value[2],
          row3_value[0], row3_value[1], row3_value[2],
          row4_value[0], row4_value[1], row4_value[2]
        ]);
      }
    }

    return encode({
      err: null,
      data: {
        name: name,
        type: type,
        values: values
      }
    });
  },
  bakePrameterValues: function (data) {
    data = decode(data);

    var sequence_path = data.sequencePath,
    file = File(sequence_path),
    file_uri = file.absoluteURI,
    item = getItemByURI(file_uri);

    if (!item) {
      var import_options = new ImportOptions();
      import_options.file = file;
      import_options.sequence = true;
      item = app.project.importFile(import_options);
    }

    var layer = getLayerByName(data.comp, data.layer),
    comment = readComment(layer);

    comment.folder = data.folder;
    comment.file = data.file;
    comment.executable = data.executablePath;
    if (data.source) {
      comment.source = data.source;
      comment.sourceTime = data.sourceTime;
    }

    app.beginUndoGroup('Cinder: bake parameter values');

    var source = layer.source;
    if (!(source && isFileItem(source) && source.file.absoluteURI === file_uri)) {
      var in_point = layer.inPoint,
      out_point = layer.outPoint;
      layer.replaceSource(item, true);
      layer.startTime = in_point;
      layer.inPoint = in_point;
      layer.outPoint = out_point;
    }

    writeComment(layer, comment);
    layer.source.mainSource.reload();

    var setters = data.setters,
    comp = layer.containingComp,
    frame_duration = comp.frameDuration,
    in_point = layer.inPoint;

    for (var name in setters) {
      var type = setters[name].type,
      args = processArgs(type, setters[name].args);

      if (type === 'camera') {
        var camera = comp.layers.addCamera('Cinder Camera', [0.5 * comp.width, 0.5 * comp.height]),
        transform = camera.property('ADBE Transform Group'),
        position = transform.property('ADBE Position'),
        orientation = transform.property('ADBE Orientation'),
        camera_options = camera.property('ADBE Camera Options Group'),
        zoom = camera_options.property('ADBE Camera Zoom');

        camera.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
        camera.inPoint = layer.inPoint;
        camera.outPoint = layer.outPoint;

        for (var i = 0, l = args.length; i < l; i++) {
          var arg = args[i],
          index = arg.index,
          time = in_point + index * frame_duration,
          value = arg.value;
          position.setValueAtTime(time, value.position);
          orientation.setValueAtTime(time, value.orientation);
          zoom.setValueAtTime(time, value.zoom);
        }

      } else {
        var effect = addEffect(layer, name, convertType(type)).effect,
        property = effect.property(1);

        for (var i = 0, l = args.length; i < l; i++) {
          var arg = args[i],
          index = arg.index,
          time = in_point + index * frame_duration,
          value = arg.value;
          property.setValueAtTime(time, value);
        }
      }
    }

    app.endUndoGroup();

    return encode({
      err: null,
      data: {
        layer: layer.name
      }
    });
  }
};
