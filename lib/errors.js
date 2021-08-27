(function() {
  'use strict';
  var CND, badge, debug, rpr;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/ERRORS';

  debug = CND.get_logger('debug', badge);

  // warn                      = CND.get_logger 'warn',      badge
  // info                      = CND.get_logger 'info',      badge
  // urge                      = CND.get_logger 'urge',      badge
  // help                      = CND.get_logger 'help',      badge
  // whisper                   = CND.get_logger 'whisper',   badge
  // echo                      = CND.echo.bind CND

  //-----------------------------------------------------------------------------------------------------------
  this.Dba_error = class Dba_error extends Error {
    constructor(ref, message) {
      super();
      this.message = `${ref} (${this.constructor.name}) ${message}`;
      this.ref = ref;
      return void 0/* always return `undefined` from constructor */;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  this.Dba_fs_pkg_json_not_found = class Dba_fs_pkg_json_not_found extends this.Dba_error {
    constructor(ref, pkg_fspath) {
      super(ref, `unable to locate package.json for path ${pkg_fspath}`);
    }

  };

  this.Dba_git_not_a_repo = class Dba_git_not_a_repo extends this.Dba_error {
    constructor(ref, pkg_fspath) {
      super(ref, `not a git repository: ${pkg_fspath}`);
    }

  };

}).call(this);

//# sourceMappingURL=errors.js.map