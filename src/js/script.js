var udp = require('dgram');
var child_process = require('child_process');
var Promise = require('bluebird');
var objectAssign = require('object-assign');
var osc = require('osc-min');

var App = {};

App.CLIENT_PORT= 3000;

App.SERVER_PORT = 3001;

App.NORMAL_TIMEOUT = 1 * 1000;

App.RENDER_TIMEOUT = 10 * 1000;

App.csInterface = new CSInterface();

App.state = 'pause';

App.routes = {
  pause: {
    setup: true,
    render: true,
  },
  setup: {
    pause: true,
  },
  render: {
    pause: true
  }
};

App.transition = function(state) {
  if (App.state === state || !App.routes[App.state][state]) {
    return;
  }
  App.state = state;
  App.execute[state]();
};

App.encode = function (str) {
  return encodeURIComponent(JSON.stringify(str));
};

App.decode = function (str) {
  return JSON.parse(decodeURIComponent(str));
};

App.evalScript = function(method, arg) {
  if (arg) {
    arg = App.encode(arg);
  } else {
    arg = '';
  }
  arg = arg || '';
  return new Promise(function(resolve, reject) {
    App.csInterface.evalScript('$._ext.' + method + '(\'' + arg + '\')', function(result) {
      result = App.decode(result);
      if (result.err) {
        return reject(result.err);
      }
      resolve(result.data);
    });
  });
};

App.setupParameters = function(data) {
  return new Promise(function(resolve, reject) {
    function createTimer() {
      timer = setTimeout(function() {
        if (data.executable) {
          var child = child_process.spawn(data.executable, [], {
            detached: true,
          });
          child.unref();
          App.server.removeAllListeners('message');
          return reject('Cannot connect to a Cinder application and try to run an executable');
        }

        App.server.removeAllListeners('message');
        reject('Cannot connect to a Cinder application');
      }, App.NORMAL_TIMEOUT);
    }

    function createUpdateTimer() {
      update_timer = setTimeout(function () {
        update++;
        var rate = update * 100 / App.NORMAL_TIMEOUT;
        if (rate < 1) {
          App.updateInfo(rate * 100, 'try to connect');
          update_timer = createUpdateTimer();
        }
      }, 100);
    }

    function createBuffer() {
      var buffer = osc.toBuffer({
        address: '/cinder/setup',
        args: [{
          type: 'string',
          value: data.folder
        }, {
          type: 'string',
          value: data.file
        }, {
          type: 'integer',
          value: +data.cache
        }, {
          type: 'integer',
          value: +data.write
        }, {
          type: 'integer',
          value: +data.fbo
        }, {
          type: 'float',
          value: data.fps
        }, {
          type: 'integer',
          value: data.duration
        }, {
          type: 'integer',
          value: data.width
        }, {
          type: 'integer',
          value: data.height
        }, {
          type: 'string',
          value: data.source
        }, {
          type: 'float',
          value: data.sourceTime
        }]
      });

      return buffer;
    }

    function parseArgs(args) {
      var result = {
        useCamera: !!args.shift().value,
        parameterCached: !!args.shift().value,
        parameters: []
      };

      while (args.length > 0) {
        var name = args.shift().value,
        type = args.shift().value,
        value;
        switch (type) {
          case 'checkbox':
            value = args.shift().value;
            break;
          case 'slider':
            value = args.shift().value;
            break;
          case 'point':
            value = [args.shift().value, args.shift().value];
            break;
          case 'point3d':
            value = [args.shift().value, args.shift().value, args.shift().value];
            break;
          case 'color':
            value = [args.shift().value, args.shift().value, args.shift().value];
            break;
        }
        result.parameters.push({
          name: name,
          type: type,
          value: value
        });
      }

      return result;
    }

    var timer,
    update = 0,
    update_timer;

    App.server.once('message', function(msg) {
      clearTimeout(timer);
      clearTimeout(update_timer);
      msg = osc.fromBuffer(msg);

      var paths = msg.address.split('/').filter(function(path) {
        return path !== '';
      });

      if (paths.length < 2 || !(paths[0] === 'cinder' && paths[1] === 'setup')) {
        return reject('Invalid osc message');
      }

      objectAssign(data, parseArgs(msg.args));

      resolve(data);
    });

    var buffer = createBuffer();
    createTimer();
    createUpdateTimer();
    App.client.send(buffer, 0, buffer.length, App.CLIENT_PORT, 'localhost');
  });
};

App.execute = {
  pause: function() {
  },
  setup: function() {
    App.$setup.disabled = true;
    App.$render.disabled = true;

    App.evalScript('getSelectedLayer').then(function(data) {
      if (data.folder) {
        App.$folder.value = data.folder;
      }
      if (data.file) {
        App.$file.value = data.file;
      }
      App.$comp.value = data.comp;
      App.$layer.value = data.layer;

      objectAssign(data, {
        folder: App.$folder.value,
        file: App.$file.value,
        cache: App.$cache.checked,
        write: App.$write.checked,
        fbo: App.$fbo.checked,
      });

      return data;
    }).then(App.setupParameters).then(function(data) {
      return App.evalScript('createParameters', data);
    }).catch(function(err) {
      alert(err);
    }).finally(function() {
      App.$setup.disabled = false;
      App.$render.disabled = false;
      App.clearInfo();
      App.transition('pause');
    });
  },
  render: function() {
    function sendPameterValue(data, parameter) {
      var NORMAL_MAX_ARG_SIZE = 150;
      var CAMERA_MAX_ARG_SIZE = 30;

      var obj = {
        comp: data.comp,
        layer: data.layer,
        fps: data.fps,
        duration: data.duration,
        parameter: parameter
      };

      return new Promise(function(resolve, reject) {
        App.csInterface.evalScript('$._ext.getPameterValue(\'' + App.encode(obj) + '\')', function(result) {
          result = App.decode(result);
          if (result.err) {
            return reject(result.err);
          }

          //osc
          function createTimer() {
            timer = setTimeout(function() {
              App.server.removeAllListeners('message');
              reject('Cannot connect to a Cinder application');
            }, App.NORMAL_TIMEOUT);
          }

          function createBuffer() {
            var args = [],
              values = parameter_values.splice(0, arg_size),
              last = values.length < arg_size;

            values.forEach(function(value) {
              switch (parameter_type) {
                case 'checkbox':
                  args.push({
                    type: 'integer',
                    value: +value
                  });
                  break;
                case 'slider':
                  args.push({
                    type: 'float',
                    value: value
                  });
                  break;
                case 'point':
                  args.push({
                    type: 'float',
                    value: value[0]
                  }, {
                    type: 'float',
                    value: value[1]
                  });
                  break;
                case 'point3d':
                  args.push({
                    type: 'float',
                    value: value[0]
                  }, {
                    type: 'float',
                    value: value[1]
                  }, {
                    type: 'float',
                    value: value[2]
                  });
                  break;
                case 'color':
                  args.push({
                    type: 'float',
                    value: value[0]
                  }, {
                    type: 'float',
                    value: value[1]
                  }, {
                    type: 'float',
                    value: value[2]
                  });
                  break;
                case 'camera':
                  for (var i = 0; i < 13; i++) {
                    args.push({
                      type: 'float',
                      value: value[i]
                    });
                  }
                  break;
              }
            });

            var buffer = osc.toBuffer({
              address: '/cinder/prerender/' + parameter_name + '/' + (last ? 'last' : times++),
              args: args
            });

            return buffer;
          }

          function sendOsc() {
            var buffer;
            if (!begin) {
              begin = true;
              buffer = osc.toBuffer({
                address: '/cinder/prerender/' + parameter_name + '/begin',
                args: []
              });
            } else {
              buffer = createBuffer();
            }
            createTimer();
            App.client.send(buffer, 0, buffer.length, App.CLIENT_PORT, 'localhost');
          }

          var parameter_data = result.data,
            parameter_name = parameter_data.name,
            parameter_type = parameter_data.type,
            parameter_values = parameter_data.values,
            arg_size = parameter_type === 'camera' ? CAMERA_MAX_ARG_SIZE : NORMAL_MAX_ARG_SIZE,
            begin = false,
            times = 0,
            total_time = Math.ceil(parameter_values.length / arg_size),
            timer;

          App.server.on('message', function(msg) {
            clearTimeout(timer);
            msg = osc.fromBuffer(msg);

            var paths = msg.address.split('/').filter(function(path) {
              return path !== '';
            });

            if (paths.length < 4 || !(paths[0] === 'cinder' && paths[1] === 'prerender')) {
              App.server.removeAllListeners('message');
              return reject('Invalid osc message');
            }

            var err = msg.args[0].value;
            if (err !== '') {
              App.server.removeAllListeners('message');
              return reject(err);
            }

            var current_time = paths[3];
            if (current_time === 'last') {
              App.server.removeAllListeners('message');
              App.updateInfo(100, 'prerender(' + parameter_name + '): end');
              return resolve(data);
            } else {
              App.updateInfo(current_time / total_time * 100, 'prerender(' + parameter_name + '): ' + current_time + '/' + total_time);
            }

            sendOsc();
          });

          sendOsc();
        });
      });
    }

    function render(data) {
      return new Promise(function(resolve, reject) {
        function createTimer() {
          timer = setTimeout(function() {
            App.server.removeAllListeners('message');
            reject('Cannot connect to a Cinder application');
          }, App.RENDER_TIMEOUT);
        }

        function startRendering() {
          var buffer = osc.toBuffer({
            address: '/cinder/render',
            args: []
          });
          App.client.send(buffer, 0, buffer.length, App.CLIENT_PORT, 'localhost');
        }

        function quitRendering() {
          var buffer = osc.toBuffer({
            address: '/cinder/quit',
            args: []
          });
          App.client.send(buffer, 0, buffer.length, App.CLIENT_PORT, 'localhost');
        }

        //enable quit button
        App.$quit.disabled = false;
        App.$quit.addEventListener('mousedown', function () {
          App.$quit.removeEventListener('mousedown');
          result.abort = true;
          quitRendering();
        });

        var timer,
        result = {
          setters: {},
          sequencePath: '',
          executablePath: '',
          source: '',
          sourceTime: 0,
          abort: false
        };

        App.server.on('message', function(msg) {
          clearTimeout(timer);
          msg = osc.fromBuffer(msg);

          var paths = msg.address.split('/').filter(function(path) {
            return path !== '';
          });

          if (paths.length < 2 || paths[0] !== 'cinder') {
            App.server.removeAllListeners('message');
            return reject('Invalid osc message');
          }

          switch (paths[1]) {
            case 'render':
              if (paths.length.length < 3) {
                App.server.removeAllListeners('message');
                return reject('Invalid osc message');
              }
              var frame = paths[2];
              if (frame === 'write') {
                App.updateInfo(100, 'write images');
              } else {
                App.updateInfo(frame / data.duration * 100, 'render: ' + frame + '/' + data.duration);
              }
              createTimer();
              break;
            case 'setdown':
              if (paths.length.length < 4) {
                App.server.removeAllListeners('message');
                return reject('Invalid osc message');
              }
              var parameter_name = paths[2],
              index = paths[3];

              if (index === 'begin') {
                result.setters[parameter_name] = {
                  type: msg.args[0].value,
                  total: msg.args[1].value,
                  args: []
                };
              } else {
                App.updateInfo(index / result.setters[parameter_name].total * 100, 'setdown(' + parameter_name + '): ' + index + '/' + result.setters[parameter_name].total);
                Array.prototype.push.apply(result.setters[parameter_name].args, msg.args);
              }
              createTimer();
              break;
            case 'renderend':
              App.server.removeAllListeners('message');
              result.sequencePath = msg.args[0].value;
              result.executablePath = msg.args[1].value;
              result.source = msg.args[2].value;
              result.sourceTime = msg.args[3].value;
              return resolve(result);
          }
        });

        createTimer();
        startRendering();
      });
    }

    App.$setup.disabled = true;
    App.$render.disabled = true;

    App.evalScript('validateInputs', {
      folder: App.$folder.value,
      file: App.$file.value,
      comp: App.$comp.value,
      layer: App.$layer.value,
      cache: App.$cache.checked,
      write: App.$write.checked,
      fbo: App.$fbo.checked,
    }).then(App.setupParameters).then(function(data) {
      if (data.cache && data.parameterCached) {
        return data;
      }

      var parameters = data.parameters;
      if (data.useCamera) {
        parameters.push({
          name: 'CameraAE',
          type: 'camera'
        });
      }

      return parameters.reduce(function(current, parameter) {
        return current.then(function(data) {
          return sendPameterValue(data, parameter);
        });
      }, Promise.resolve(data));

    }).then(render).then(function (data) {
      if (App.$write.checked && !data.abort) {
        objectAssign(data, {
          folder: App.$folder.value,
          file: App.$file.value,
          comp: App.$comp.value,
          layer: App.$layer.value,
        });

        return App.evalScript('bakePrameterValues', data);
      }
    }).then(function (data) {
      if (data) {
        if (App.$layer.value !== data.layer) {
          App.$layer.value = data.layer;
        }
      }
    }).catch(function(err) {
      alert(err);
    }).finally(function() {
      App.$setup.disabled = false;
      App.$render.disabled = false;
      App.$quit.disabled = true;
      App.clearInfo();
      App.transition('pause');
    });
  }
};

App.initialize = function() {
  function loadJSX() {
    var extensionRoot = App.csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/';
    App.csInterface.evalScript('$._ext.evalFiles("' + extensionRoot + '")');
  }

  function changeUIColor() {
    function colorToHex(color) {
      function toHex(ch) {
        var hex = (~~ch).toString(16);
        return hex.length === 0 ? '0' + hex : hex;
      }
      return '#' + toHex(color.red) + toHex(color.green) + toHex(color.blue);
    }

    var background_color = colorToHex(App.csInterface.getHostEnvironment().appSkinInfo.panelBackgroundColor.color);
    $('input[type="text"], input[type="button"]:hover').css('color', background_color);
    $('body').css('background', background_color);
  }

  loadJSX();
  changeUIColor();

  App.csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, changeUIColor);

  App.$folder = document.getElementsByName('folder')[0];
  App.$dialog = document.getElementsByName('dialog')[0];
  App.$file = document.getElementsByName('file')[0];
  App.$comp = document.getElementsByName('comp')[0];
  App.$layer = document.getElementsByName('layer')[0];
  App.$cache = document.getElementsByName('cache')[0];
  App.$write = document.getElementsByName('write')[0];
  App.$fbo = document.getElementsByName('fbo')[0];
  App.$setup = document.getElementsByName('setup')[0];
  App.$render = document.getElementsByName('render')[0];
  App.$quit = document.getElementsByName('quit')[0];
  App.$progress = document.getElementsByClassName('progress')[0];
  App.$info = document.getElementsByClassName('info')[0];
  App.updateInfo = function (progress, info) {
    App.$progress.style.width = progress + '%';
    App.$info.textContent = info;
  };
  App.clearInfo = function () {
    App.$progress.style.width = '0';
    App.$info.textContent = '';
  };

  App.$dialog.addEventListener('mouseup', function() {
    var result = window.cep.fs.showOpenDialog(false, true, 'Select Folder.', App.$folder.value);
    if (result.err == window.cep.fs.NO_ERROR) {
      var folder = result.data;
      if (folder.length) {
        App.$folder.value = folder[0];
      }
    }
  });

  App.$write.addEventListener('mouseup', function () {
    App.$fbo.disabled = App.$write.checked;
  });

  App.$setup.addEventListener('mouseup', function() {
    App.transition('setup');
  });

  App.$render.addEventListener('mouseup', function() {
    App.transition('render');
  });

  App.server = udp.createSocket('udp4');
  App.client = udp.createSocket('udp4');

  App.server.bind(App.SERVER_PORT, 'localhost');
};

App.initialize();
