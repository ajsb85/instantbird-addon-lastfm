/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this file,
* You can obtain one at http://mozilla.org/MPL/2.0/. */

let debug = false;
const MY_STATUS_PREF_BRANCH = "extensions.mystatus.";
const LAST_FM_PREF_BRANCH = "extensions.lastfm.";

let {interfaces: Ci, utils: Cu, classes: Cc} = Components;

Cu.import("resource:///modules/imXPCOMUtils.jsm");
Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource://gre/modules/Http.jsm");

let timer = Cc["@mozilla.org/timer;1"]
                     .createInstance(Ci.nsITimer);
let mObserver = {
  observe: function(subject, topic, data) {
    if (lastfm.enable) {
      lastfm.now();
    }else{
      timer.cancel();
      myStatus.restore();
    }
  }
}

let myStatus = {
  LOG: function(aMsg) {
    if (debug)
      Services.console.logStringMessage(aMsg);
  },
  ERROR: function(aMsg) {
    Cu.reportError(aMsg)
  },
  _prefs: Services.prefs.getBranch(MY_STATUS_PREF_BRANCH),
  _currentType: 0,
  _currentStatus: "",
  loaded: false,
  lock: false,
  statusMessageChange: function ms_statusMessageChange() {
    let newStatus = Services.core.globalUserStatus.statusText;
    let newType = Services.core.globalUserStatus.statusType;
    this.updateSavedStatus(newType, newStatus);
  },
  updateSavedStatus: function ms_updateSavedStatus(newType, newStatus) {
    if (newStatus.indexOf("\u266b") > -1)
      return;
    if (this._currentStatus != newStatus || this._currentType != newType) {
      this._prefs.setIntPref("type", newType);
      this._prefs.setCharPref("value", newStatus);
      this._currentType = newType;
      this._currentStatus = newStatus;
    }
  },
  observe: function(aSubject, aTopic, aMsg) {
    if (aTopic == "status-changed" /* #1 < */ || aTopic == "account-connected" /* > */)
	  this.statusMessageChange();
  },
  load: function() {
    this.loaded = true;
    this._currentType = this._prefs.prefHasUserValue("type") ?
                        this._prefs.getIntPref("type") : 0;
    this._currentStatus = this._prefs.prefHasUserValue("value") ?
                          this._prefs.getCharPref("value") : "";
    if (this._currentType < 0 || this._currentType > 7) {
      this._currentType = 0;
      this._currentStatus = "";
    }
    try {
      Services.core.globalUserStatus.setStatus(this._currentType, this._currentStatus);
    } catch (e) {}
    Services.obs.addObserver(myStatus, "status-changed", false);
    Services.obs.addObserver(myStatus, "account-connected", false);   // possible fix ref. #1
	},
  restore: function() {
    Services.core.globalUserStatus.setStatus(this._currentType, this._currentStatus);
  },
  setStatus: function(aStatus) {
    Services.core.globalUserStatus.setStatus(
            Services.core.globalUserStatus.statusType, aStatus);
  }
};


let lastfm = {
  LOG: function(aMsg) {
    if (debug)
      Services.console.logStringMessage(aMsg);
  },
  ERROR: function(aMsg) {
    Cu.reportError(aMsg)
  },
  _prefs: Services.prefs.getBranch(LAST_FM_PREF_BRANCH),
  get userName () {
    if (this._prefs.prefHasUserValue("username"))
      if (this._prefs.getCharPref("username") != "")
        return this._prefs.getCharPref("username")
    return null;
  },
  get enable () {
    if (this._prefs.prefHasUserValue("enable")) {
      if (this.userName == null) {
        this.ERROR("Need a username to enable.");
        this._prefs.setBoolPref("enable", false);
        return false;
      }
      return this._prefs.getBoolPref("enable");
    }
    return false;
  },
  now: function() {
    let options = {
      postData: null,
      onLoad: null,
      onError: this.ERROR.bind(this),
      logger: {log: this.LOG.bind(this),
               debug: this.LOG.bind(this)}
    }
    let url = "https://ws.audioscrobbler.com/2.0/" +
    "?method=user.getrecenttracks&user=" + this.userName +
    "&api_key=c1797de6bf0b7e401b623118120cd9e1&limit=1&format=json"
    timer.initWithCallback((function () {
      try {
        let ajax = httpRequest(url, options);
        let artist = "";
        ajax.onload = function (aRequest) {
          let data = JSON.parse(aRequest.target.responseText);
          if (data.recenttracks.track[0]["@attr"].nowplaying) {
            if (typeof data.track.artist !== 'undefined')
              artist = " - " + data.track.artist.name;
            myStatus.setStatus("\u266b " + data.track.name + artist + " \u266a");
          } else
            myStatus.restore();
        }
      } catch (e) {
        timer.cancel();
        this.ERROR(e);
      }
    }).bind(this), 2000, timer.TYPE_REPEATING_SLACK);
  }
}

function startup(aData, aReason) {
  Services.obs.addObserver(mObserver, "addon-options-hidden", false);
  myStatus.lock = false;
  if (lastfm.enable) {
    setTimeout((function() {
      myStatus.load();
      lastfm.now();
    }).bind(this), 1000);
  }

}

function shutdown(aData, aReason) {
  try {
    Services.obs.removeObserver(mObserver, "addon-options-hidden");
    if (myStatus.loaded) {
      myStatus.lock = true;
      myStatus.restore();
      Services.obs.removeObserver(myStatus, "status-changed");
      Services.obs.removeObserver(myStatus, "account-connected");
    }
    timer.cancel();
  } catch (e){

  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
  Services.prefs.deleteBranch(LAST_FM_PREF_BRANCH),
  Services.prefs.deleteBranch(MY_STATUS_PREF_BRANCH),
  delete timer;
  delete mObserver;
  delete lastfm;
  delete myStatus;
  delete debug;
}
