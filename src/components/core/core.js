// Copyright 2014 Globo.com Player authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * The Core is responsible to manage Containers, the mediator, MediaControl
 * and the player state.
 */

var _ = require('underscore');
var $ = require('jquery');

var UIObject = require('../../base/ui_object');
var PlaybackHandler = require('../playback_handler');
var Fullscreen = require('../../base/utils').Fullscreen;
var GlobalPluginsHandler = require('../global_plugins_handler');
var Loader = require('../loader');
var Styler = require('../../base/styler');
var MediaControl = require('../media_control');

var Core = UIObject.extend({
  events: {
    'webkitfullscreenchange': 'exit',
    'mouseover[data-controls]': 'mediaControlTimeout',
    'mouseleave[data-controls]': 'hideMediaControl',
    'mousemove': 'mediaControlTimeout'
  },
  attributes: {
    'data-player': ''
  },
  initialize: function(params) {
    this.params = params;
    this.parentElement = params.parentElement;
    this.loader = new Loader(params);
    this.playbackHandler = new PlaybackHandler(params, this.loader);
    this.playbackHandler.createContainers().then(this.onContainersCreated.bind(this));
    //FIXME fullscreen api sucks
    window['document'].addEventListener('mozfullscreenchange', this.exit.bind(this));
  },
  load: function(params) {
    _(this.containers).each(function(container) {
      container.destroy();
    });
    this.playbackHandler.params = _(this.params).extend(params);
    this.playbackHandler.createContainers().then(this.onContainersCreated.bind(this));
  },
  exit: function() {
    if(!Fullscreen.isFullscreen()) {
      this.$el.removeClass('fullscreen');
    }
  },
  onContainersCreated: function(containers) {
    this.containers = containers;
    this.createMediaControl(this.getCurrentContainer());
    this.render();
    this.$el.appendTo(this.parentElement);
    this.globalPluginsHandler = new GlobalPluginsHandler(this);
    this.globalPluginsHandler.loadPlugins();
  },
  createMediaControl: function(container) {
    this.mediaControl = new MediaControl({container: container});
    this.listenTo(this.mediaControl, 'mediacontrol:fullscreen', this.toggleFullscreen);
  },
  getCurrentContainer: function() {
    return this.containers[0];
  },
  toggleFullscreen: function() {
    if (!Fullscreen.isFullscreen()) {
      Fullscreen.requestFullscreen(this.el);
      this.$el.addClass('fullscreen');
    } else {
      Fullscreen.cancelFullscreen();

      this.$el.removeClass('fullscreen nocursor');
    }
    setTimeout(this.hideMediaControl.bind(this), 1000);
  },
  showMediaControl: function() {
    this.mediaControl.fadeIn();
    this.$el.removeClass('nocursor');
  },
  hideMediaControl: function() {
    if (this.$el.find('[data-controls]:hover').length === 0) {
      this.mediaControl.fadeOut();
      this.$el.addClass('nocursor');
    }
  },
  mediaControlTimeout: function(event) {
    if (event.clientX !== this.lastMouseX && event.clientY !== this.lastMouseY) {
      if (this.hideId) {
        clearTimeout(this.hideId);
      }
      this.showMediaControl();
      this.hideId = setTimeout(function() {
        this.hideMediaControl();
      }.bind(this), 2000);
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  },
  render: function() {
    var style = Styler.getStyleFor('core');
    this.$el.html('');
    this.$el.append(style);

    _.each(this.containers, function(container) {
      this.$el.append(container.render().el);
    }, this);

    this.$el.append(this.mediaControl.render().el);
    this.hideId = setTimeout(function() {
      this.hideMediaControl();
    }.bind(this), 2000);
    return this;
  }
});

module.exports = Core;
