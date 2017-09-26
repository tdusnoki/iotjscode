/* Copyright 2015-present Samsung Electronics Co., Ltd. and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(["./util"], function(Util) {

  /**
   * File tab types.
   */
  const TABTYPE = {
    WELCOME : 0,
    WORK : 1,
  };

  /**
   * Contructor.
   *
   * @param {object} env The core enviroment object.
   * @param {object} surface The main Surface object.
   */
  function Session(env, surface) {
    if (!(this instanceof Session)) {
      throw new TypeError("Session constructor cannot be called as a function.");
    }

    this._enviroment = env;
    this._surface = surface;
    this._editor = env.editor;

    this._nextID = 0;
    this._activeID = 0;

    /**
     * data = {
     *   id,
     *   saved,
     *   scheduled,
     *   name,
     *   editSession
     * }
     */
    this._data = [];
    this._command = {
      list : [],
      counter : -1
    };
    this._breakpoint = {
      informationToChart : null,
      IDs : [],
      last : null
    };
    this._upload = {
      list : [],
      backupList : [],
      allowed : false,
      started : false
    };
    this._marker = {
      executed : null,
      lastMarked : null,
      breakpointLine : null,
      lastMarkedBreakpointLine : null
    };
    this._welcomeTab = true;
    this._contextReset = false;

    this.TABTYPE = TABTYPE;
  }

  /**
   * Returns the current nextID value.
   *
   * @return {integer}
   */
  Session.prototype.getNextID = function() {
    return this._nextID;
  };

  /**
   * Returns the current activeID value.
   *
   * @return {integer}
   */
  Session.prototype.getActiveID = function() {
    return this._activeID;
  };

  /**
   * Stores a new breakpoint row and index information.
   *
   * @param {integer} row Breakpoint's row.
   * @param {integer} index breakpount number (constantly growing).
   */
  Session.prototype.addBreakpointID = function(row, index) {
    this._breakpoint.IDs[row] = index;
  };

  /**
   * Returns a specific breakpoint index.
   *
   * @param  {integer} row A row number from the source.
   * @return {integer} Single stored breakpoint index.
   */
  Session.prototype.getBreakpointID = function(row) {
    return this._breakpoint.IDs[row];
  };

  /**
   * Returns the last catched breakpoint's ID.
   *
   * @return {integer} A single breakpoint identifier.
   */
  Session.prototype.getLastBreakpoint = function() {
    return this._breakpoint.last;
  };

  /**
   * Sets the lastBreakpoint to the given value.
   *
   * @param {integer} last A complete breakpoint from the debuggerObj.
   */
  Session.prototype.setLastBreakpoint = function(last) {
    this._breakpoint.last = last;
  };

  /**
   * Returns the chart specific brakpoint informations.
   *
   * @return {string} Formatted string.
   */
  Session.prototype.getBreakpointInfoToChart = function() {
    return this._breakpoint.informationToChart;
  };

  /**
   * Store the chart specific brakpoint informations.
   *
   * @param {string} value Breakpoint informations.
   */
  Session.prototype.setBreakpointInfoToChart = function(value) {
    this._breakpoint.informationToChart = value;
  };

  /**
   * Returns the command line input counter value.
   *
   * @return {integer}
   */
  Session.prototype.getCommandCounter = function() {
    return this._command.counter;
  };

  /**
   * Sets the command line input counter value.
   *
   * @param {integer} value New value of the counter.
   */
  Session.prototype.setCommandCounter = function(value) {
    this._command.counter = value;
  };

  /**
   * Returns the command line input list.
   *
   * @return {array} String array.
   */
  Session.prototype.getCommandList = function() {
    return this._command.list;
  };

  /**
   * Push a new command into the command list.
   *
   * @param {string} comm The last used command.
   */
  Session.prototype.addCommandToList = function(comm) {
    this._command.list.push(comm);
  };

  /**
   * Returns the actual state of the contextReset.
   *
   * @return {boolean} True if the context reset request active, false otherwise.
   */
  Session.prototype.isContextReset = function() {
    return this._contextReset;
  }

  /**
   * Sets the value of the contextReset.
   *
   * @param {boolean} value The new true or false value.
   */
  Session.prototype.setContextReset = function(value) {
    this._contextReset = value;
  }

  /**
   * Returns the state of the upload and run availability.
   *
   * @return {true} True, if the uplaod and run is activated, false otherwise.
   */
  Session.prototype.isUploadAndRunAllowed = function() {
    return this._upload.allowed;
  }

  /**
   * Changes the state of the upload and run.
   *
   * @param {boolean} value The new true or false value.
   */
  Session.prototype.allowUploadAndRun = function(value) {
    this._upload.allowed = value;
  }

  /**
   * Returns the state of the upload.started.
   *
   * @return {true} True, if the uplaod is started by the user, false otherwise.
   */
  Session.prototype.isUploadStarted = function() {
    return this._upload.started;
  }

  /**
   * Changes the state of the upload.started.
   *
   * @param {boolean} value The new true or false value.
   */
  Session.prototype.setUploadStarted = function(value) {
    this._upload.started = value;
  }

  /**
   * Removes everything from the upload list except the context reset signal.
   */
  Session.prototype.resetUploadList = function() {
    this._upload.list = [0];
  }

  /**
   * Add a session id to the upload list with a specified position.
   *
   * @param {integer} id The id of the session.
   * @param {integer} index Position of the session in the list.
   */
  Session.prototype.addFileToUploadList = function(id, index) {
    this.getDataById(id).scheduled = true;
    this._upload.list.splice(index, 0, id);

    // Store the changes in the backup list.
    this.createUploadBackupList();
  }

  /**
   * Move a session position in the upload list.
   *
   * @param {integer} from Old position of the session.
   * @param {integer} to New position of the session.
   */
  Session.prototype.moveFileInUploadList = function(from, to) {
    this._upload.list.splice(to, 0, this._upload.list.splice(from, 1)[0]);

    // Store the changes in the backup list.
    this.createUploadBackupList();
  }

  /**
   * Removes a session from the upload list.
   *
   * @param {integer} id Identifier of the selected session.
   */
  Session.prototype.removeFileFromUploadList = function(id) {
    if (this.getDataById(id)) {
      this.getDataById(id).scheduled = false;
    }
    this._upload.list.splice(this._upload.list.indexOf(id), 1);

    // Store the changes in the backup list.
    this.createUploadBackupList();
  }

  /**
   * Checks that is the given session id is in the upload list or not.
   *
   * @param {integer} id The identifier of the session.
   * @return {boolean} Returns true if the session is in the list, false otherwise.
   */
  Session.prototype.isFileInUploadList = function(id) {
    return (this._upload.list.indexOf(id) != -1) ? true : false;
  }

  /**
   * Copies the upload list into the backup list.
   */
  Session.prototype.createUploadBackupList = function() {
    this._upload.backupList = this._upload.list.slice();
  }

  /**
   * Returns the upload backup list.
   *
   * @return {array} Array of file id list.
   */
  Session.prototype.getUploadBackupList = function() {
    return this._upload.backupList;
  }

  /**
   * Returns the array of the selected session ids from the upload list.
   *
   * @return {array} The id list.
   */
  Session.prototype.getUploadList = function() {
    return this._upload.list;
  }

  /**
   * Removes the first element of the upload list.
   */
  Session.prototype.shiftUploadList = function() {
    this._upload.list.shift();
  }

  /**
   * Creates a new session based on the given parameters.
   *
   * @param {string} name The filename.
   * @param {string} cont The file content (the source code).
   * @param {integer} tab The tab type.
   * @param {boolean} saved The file saved status.
   */
  Session.prototype.createNewSession = function(name, cont, tab, saved) {
    var saved = saved || true;
    var tab = tab || TABTYPE.WORK;
    // Create a new document for the editor from the trimmed content.
    var doc = new this._enviroment.Document(cont);
    // Create a new javascript mode session from the document.
    var eSession = new this._enviroment.EditSession(doc, "ace/mode/javascript");

    // Store the edit session.
    this._data.push({
      id: ++this._nextID,
      saved: saved,
      scheduled: false,
      name: name,
      editSession: eSession
    });

    this.updateTabs(this._nextID, name, tab);
    this.switchSession(this._nextID);

    // Enable the save button.
    this._surface.toggleButton(true, "save-file-button");
  }

  /**
   * Sets a simple starting session into the editor.
   * This session can not be closed or modified.
   */
  Session.prototype.setWelcomeSession = function() {
    this._welcomeTab = true;

    // If this is a fresh start.
    if (this.getSessionById(0) == null) {
      var welcome = "/**\n" +
                    " * IoT.js Code\n" +
                    " * Browser based IDE including debugger for IoT.js.\n" +
                    " */\n";

      var eSession = new this._enviroment.EditSession(welcome, "ace/mode/javascript");
      this._data.push({
        id: 0,
        saved: true,
        scheduled: false,
        name: "welcome.js",
        editSession: eSession
      });
    }

    this.updateTabs(0, "welcome.js", TABTYPE.WELCOME);
    this.switchSession(0);

    // Enable the read only mode in the editor.
    this._editor.setReadOnly(true);
  }

  /**
   * Switches the editor session.
   *
   * @param {integer} id The id of the desired session.
   */
  Session.prototype.switchSession = function(id) {
    // Select the right tab on the tabs panel.
    this.selectTab(id);

    // Marked the selected session as an active session.
    this._activeID = id;
    // Change the currently session through the editor's API.
    this._editor.setSession(this.getSessionById(id));

    // Refresh the available breakpoint lines in the editor
    // based on the new sesison.
    if (this._breakpoint.last != null &&
      this._breakpoint.last.func.sourceName.endsWith(this.getSessionNameById(id))) {
      this.highlightCurrentLine(this._breakpoint.last.line);
    }

    if (this._breakpoint.last == null) {
      this.removeBreakpointLines();
    }

    // Disable the read only in the editor.
    if (this._editor.getReadOnly()) {
      this._editor.setReadOnly(false);
    }
  }

  /**
   * Returns a session name based on the given ID.
   *
   * @param {integer} id The searched session ID.
   * @return {mixed} Returns the session name as string if exists, null otherwise.
   */
  Session.prototype.getSessionNameById = function(id) {
    for (var i in this._data) {
      if (this._data[i].id == id) {
        return this._data[i].name;
      }
    }

    return null;
  }

  /**
   * Returns a id based on the given name.
   *
   * @param {string} name The searched session file name.
   * @return {mixed} Returns the session id if exists, null otherwise.
   */
  Session.prototype.getSessionIdbyName = function(name) {
    for (var i in this._data) {
      if (name.endsWith(this._data[i].name)) {
        return this._data[i].id;
      }
    }

    return null;
  }

  /**
   * Checks the given name is already taken or not.
   *
   * @param {string} name The new name of a session.
   * @return {boolean} True if the name is taken, false otherwise.
   */
  Session.prototype.isNameTaken = function(name) {
    for (var i in this._data) {
      if (name.localeCompare(this._data[i].name) == 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns an edit session based on the given id.
   *
   * @param {integer} id The searched session ID.
   * @return {mixed} Returns the session if exists, null otherwise.
   */
  Session.prototype.getSessionById = function(id) {
    for (var i in this._data) {
      if (this._data[i].id == id) {
        return this._data[i].editSession;
      }
    }

    return null;
  }

  /**
   * Removes a session from tha inner array,
   * based on a given attribute identifier and a value pair.
   *
   * @param {string} attr The name of the attribute.
   * @param {mixed} value The value of the attribute.
   */
  Session.prototype.deleteSessionByAttr = function(attr, value) {
    var i = this._data.length;
    while (i--) {
      if (this._data[i] &&
        this._data[i].hasOwnProperty(attr) &&
        this._data[i][attr] === parseInt(value)) {
        this._data.splice(i, 1);
        break;
      }
    }

    if (i === 1) {
      this._surface.toggleButton(false, "save-file-button");
    }
  }

  /**
   * Returns the left or the right neighbour of a session.
   * This is possible, because we store the sessions "in a straight line".
   * The 0 session is the welcome session.
   *
   * @param {integer} id The base session id.
   * @return {integer} Return the neighbour id if exists one, 0 otherwise.
   */
  Session.prototype.getSessionNeighbourById = function(id) {
    for (var i = 1; i < this._data.length; i++) {
      if (this._data[i].id === parseInt(id)) {
        if (this._data[i - 1] !== undefined && this._data[i - 1].id !== 0) {
          return this._data[i - 1].id;
        }
        if (this._data[i + 1] !== undefined) {
          return this._data[i + 1].id;
        }
      }
    }

    return 0;
  }

  /**
   * Returns every stored information about one data.
   *
   * @param {integer} id The selected session's id.
   * @return {mixed} Returns the data if exists, null otherwise.
   */
  Session.prototype.getDataById = function(id) {
    for (var i in this._data) {
      if (this._data[i].id == id) {
        return this._data[i];
      }
    }

    return null;
  }

  /**
   * Returns every stored session data with every stored information.
   *
   * @return {object} Returns the data array.
   */
  Session.prototype.getAllData = function() {
    return this._data;
  }

  /**
   * Searches the given name in the stored sessions.
   *
   * @param {string} name Searched session name.
   * @return {boolean} Returns true if the given name is exists, false otherwise.
   */
  Session.prototype.sessionNameCheck = function(name) {
    var log = log || false;
    if (this.getSessionIdbyName(name) === null) {
      return false;
    }

    return true;
  }

  /**
   * Marks every valid, available breakpoint line in the current session file.
   *
   * @param {object} debuggerObj Jerry client object.
   */
  Session.prototype.markBreakpointLines = function(debuggerObj) {
    if (debuggerObj && debuggerObj.isAlive()) {
      var lines = this.getLinesFromRawData(debuggerObj.getBreakpointLines());

      if (lines.length != 0) {
        lines.sort(function(a, b) {
          return a - b
        });

        for (var i = this._editor.session.getLength(); i > 0; i--) {
          if (lines.includes(i) === false) {
            this._editor.session.removeGutterDecoration(i - 1, "invalid-gutter-cell");
            this._editor.session.addGutterDecoration(i - 1, "invalid-gutter-cell");
          }
        }
      }
    }
  }

  /**
   * Removes the invalid gutter cell css class from the editor session.
   */
  Session.prototype.removeBreakpointLines = function() {
    for (var i = this._editor.session.getLength(); i > 0; i--) {
      this._editor.session.removeGutterDecoration(i - 1, "invalid-gutter-cell");
    }
  }

  /**
   * Returns every valid, available line in the currently active session.
   *
   * @param {object} raw Line informtion from the debuggerObj.
   * @return {array} Array of the file lines.
   */
  Session.prototype.getLinesFromRawData = function(raw) {
    var lines = [];
    var sessionName = this.getSessionNameById(this._activeID);

    for (var i in raw) {
      if (raw[i].sourceName.endsWith(sessionName)) {
        lines.push(raw[i].line);
      }
    }

    return lines;
  }

  /**
   * Highlights the current progress line in the editor session with a border.
   *
   * @param {integer} lineNumber Selected line.
   */
  Session.prototype.highlightCurrentLine = function(lineNumber) {
    lineNumber--;
    this.unhighlightLine();
    var Range = ace.require("ace/range").Range;
    this._marker.executed = this._editor.session.addMarker(new Range(lineNumber, 0, lineNumber, 1), "execute-marker", "fullLine");

    this._editor.session.addGutterDecoration(lineNumber, "execute-gutter-cell-marker");
    this._editor.scrollToLine(lineNumber, true, true, function() {});
    this._marker.lastMarked = lineNumber;
  }

  /**
   * Removes the highlight (border) from the last highlighted line.
   */
  Session.prototype.unhighlightLine = function() {
    this._editor.getSession().removeMarker(this._marker.executed);
    this._editor.session.removeGutterDecoration(this._marker.lastMarked, "execute-gutter-cell-marker");
  }

  /**
   * Highlights the current breakpoint line in the editor session with a border.
   *
   * @param {integer} lineNumber Selected line.
   */
  Session.prototype.highlightBreakPointLine = function(lineNumber) {
    lineNumber--;
    this.unhighlightBreakpointLine();
    var Range = ace.require("ace/range").Range;
    this._marker.breakpointLine = this._editor.session.addMarker(new Range(lineNumber, 0, lineNumber, 1), "breakpoint-marker", "fullLine");

    this._editor.session.addGutterDecoration(lineNumber, "breakpoint-gutter-cell-marker");
    this._editor.scrollToLine(lineNumber, true, true, function() {});
    this._marker.lastMarkedBreakpointLine = lineNumber;
  }

  /**
   * Removes the highlight (border) from the last highlighted breakpoint line.
   */
  Session.prototype.unhighlightBreakpointLine = function() {
    this._editor.getSession().removeMarker(this._marker.breakpointLine);
    this._editor.session.removeGutterDecoration(this._marker.lastMarkedBreakpointLine, "breakpoint-gutter-cell-marker");
  }

  /**
   * Deletes the breakpoints from the session and from the editor.
   */
  Session.prototype.deleteBreakpointsFromEditor = function() {
    this.setLastBreakpoint(null);

    for (var i in this._breakpoint.IDs) {
      this._editor.session.clearBreakpoint(i);
    }

    Util.clearElement($("#breakpoints-content"));
  }

  /**
   * Appends the given tab into the session tabs panel.
   *
   * @param {integer} id New tab ID.
   * @param {string} name New tab name (aka. file name).
   * @param {integer} type New tab type.
   */
  Session.prototype.updateTabs = function(id, name, type) {
    if (this._welcomeTab && type === TABTYPE.WORK) {
      $(".session-tabs").empty();
      this._welcomeTab = false;
    }

    var tab = "";

    tab += "<a href='javascript:void(0)' class='tablinks' id='tab-" + id + "'> " + name;
    if (type == TABTYPE.WORK) {
      tab += "<i class='fa fa-times' aria-hidden='true'></i>";
    }
    tab += "</a>";

    $(".session-tabs").append(tab);

    $("#tab-" + id).on("click", $.proxy(function() {
      this.switchSession(id);
    }, this));

    $("#tab-" + id + " i").on("click", $.proxy(function() {
      this.closeTab(id);
    }, this));
  }

  /**
   * Sets the selected tab to active state in the tab panel.
   *
   * @param {integer} id Selected tab ID.
   */
  Session.prototype.selectTab = function(id) {
    // Get all elements with class="tablinks" and remove the class "active"
    var tablinks = $(".tablinks");
    for (var i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Set the current tab active.
    $("#tab-" + id)[0].className += " active";
  }

  /**
   * Closes the selected tab and deletes that from the sessions.
   *
   * @param {integer} id Selected tab ID.
   */
  Session.prototype.closeTab = function(id) {
    // Remove the sesison tab from the session bar.
    $("#tab-" + id).remove();

    // If the selected session is the current session
    // let's switch to an other existing session.
    if (id == this._activeID) {
      var nID = this.getSessionNeighbourById(id);
      if (nID != 0) {
        this.switchSession(nID);
      } else {
        this.setWelcomeSession();
      }
    }

    // Delete the selected sesison.
    this.deleteSessionByAttr("id", id);

    // Remove the session from upload list if it was selected.
    if (this.isFileInUploadList(id)) {
      this.removeFileFromUploadList(id);
    }

    // Refresh the run panel list.
    if (this._surface.getPanelProperty("run.active")) {
      this._surface.updateRunPanel(this._surface.RUN_UPDATE_TYPE.ALL, null, this);
    }
  }

  /**
   * Removes the stored data and sets back the variables to the default value.
   */
  Session.prototype.reset = function() {
    Util.clearElement($("#backtrace-content"));
    this.deleteBreakpointsFromEditor();
    this.unhighlightLine();
    this.unhighlightBreakpointLine();
    this.removeBreakpointLines();

    this._breakpoint.informationToChart = null;
    this._breakpoint.IDs = [];
    this._breakpoint.last = null;

    this._upload.list = this._upload.backupList;
    this._upload.allowed = false;


    this._marker.executed = null;
    this._marker.lastMarked = null;
    this._marker.breakpointLine = null;
    this._marker.lastMarkedBreakpointLine = null;

    if (this.isFileInUploadList(0)) {
      this.removeFileFromUploadList(0);
    }
  }

  return Session;
});
