/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this file,
* You can obtain one at http://mozilla.org/MPL/2.0/. */

let {interfaces: Ci, utils: Cu, classes: Cc} = Components;
Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource://gre/modules/Http.jsm");

let timer = Cc["@mozilla.org/timer;1"]
                     .createInstance(Ci.nsITimer);
let mObserver = {
  observe: function(subject, topic, data) {
    if(lastfm.enable()){
      lastfm.now();
    }else{
      timer.cancel();
    }
  }
}

let lastfm = {
  enable: function(){
    let prefs = Services.prefs.getBranch("extensions.lastfm.")
    if(prefs.prefHasUserValue("enable"))
      return prefs.getBoolPref("enable")
    return false;
    },
  userName: function(){
    let prefs = Services.prefs.getBranch("extensions.lastfm.")
    if(prefs.prefHasUserValue("enable"))
      return prefs.getBoolPref("enable")
    return false;
    },
  now: function(){
    let statusValue = Ci.imIStatusInfo["STATUS_AVAILABLE"];
    let options = {
      postData: null,
      onLoad: null,
      onError: null,
      logger: {log: dump.bind(this),
               debug: dump.bind(this)}
    }
    let url = "http://ajax.last.fm/user/ajsb85/now"
    timer.initWithCallback((function () {
      try {

        
        // dump(Services.core.globalUserStatus.statusText+"\n");
        // dump(Services.core.globalUserStatus.statusType+"\n");
  /*
  {
    "_meta": {
      "url": "\/user\/ajsb85\/now",
      "subject": {
        "_type": "user",
        "name": "ajsb85",
        "url": "\/user\/ajsb85",
        "is_music": false
      }
    },
    "justlistened": true,
    "utc": 1422024998,
    "track": {
      "_type": "track",
      "name": "KOAN Sound & Asa - Tetsuo's Redemption",
      "url": "\/music\/KOAN+Sound\/_\/KOAN+Sound+&+Asa+-+Tetsuo%27s+Redemption",
      "is_music": true,
      "artist": {
        "_type": "artist",
        "name": "KOAN Sound",
        "url": "\/music\/KOAN+Sound",
        "is_music": true
      },
      "images": {
        "page": {
          "url": "http:\/\/userserve-ak.last.fm\/serve\/500\/74874752\/KOAN+Sound+KOANSOUND_HIGH_MARIANNEHARRIS_.jpg"
        },
        "mega": {
          "url": "http:\/\/userserve-ak.last.fm\/serve\/252\/74874752.jpg"
        }
      }
    }
  }

  */
        let ajax = httpRequest(url, options);
        ajax.onload = function (aRequest) {
          let data = JSON.parse(aRequest.target.responseText);
          Services.core.globalUserStatus.setStatus(
                Services.core.globalUserStatus.statusType, 
                "\u266b " + data.track.name + " \u266a");
        }
      } catch (e) {
        dump(e);
        timer.cancel();
      }
    }).bind(this), 2000, timer.TYPE_REPEATING_SLACK);
  }
}

function startup(aData, aReason) {
  Services.obs.addObserver(mObserver, "addon-options-hidden", false);
  if(lastfm.enable()){
    lastfm.now();
  }
}

function shutdown(aData, aReason) {
  Services.obs.removeObserver(mObserver, "addon-options-hidden", false);
  timer.cancel();
  delete timer;
  delete mObserver;
  delete lastfm;
  dump("ready");
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
  Services.obs.removeObserver(mObserver, "addon-options-hidden", false);
  timer.cancel();
  delete timer;
  delete mObserver;
  delete lastfm;
}