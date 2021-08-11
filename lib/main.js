(function() {
  'use strict';
  var CND, Dba, Dpan, FS, PATH, SQL, badge, debug, def, echo, freeze, glob, got, help, info, isa, lets, rpr, semver_cmp, semver_satisfies, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DEPENDENCY-ANALYZER';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  // { to_width }              = require 'to-width'
  SQL = String.raw;

  ({lets, freeze} = require('letsfreezethat'));

  ({Dba} = require('icql-dba'));

  def = Object.defineProperty;

  glob = require('glob');

  PATH = require('path');

  FS = require('fs');

  got = require('got');

  semver_satisfies = require('semver/functions/satisfies');

  semver_cmp = require('semver/functions/cmp');

  //===========================================================================================================
  types.declare('dpan_constructor_cfg', {
    tests: {
      '@isa.object x': function(x) {
        return this.isa.object(x);
      },
      'x.prefix is a prefix': function(x) {
        if (!this.isa.text(x.prefix)) {
          return false;
        }
        if (x.prefix === '') {
          return true;
        }
        return /^[_a-z][_a-z0-9]*$/.test(x.prefix);
      },
      '@isa.boolean x.recreate': function(x) {
        return this.isa.boolean(x.recreate);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.defaults = {
    dpan_constructor_cfg: {
      dba: null,
      prefix: 'dpan_',
      db_path: PATH.resolve(PATH.join(__dirname, '../dpan.sqlite')),
      recreate: false,
      registry_url: 'https://registry.npmjs.org/'
    }
  };

  //===========================================================================================================
  Dpan = class Dpan {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var dba;
      validate.dpan_constructor_cfg(this.cfg = {...types.defaults.dpan_constructor_cfg, ...cfg});
      debug('^4877^', this.cfg);
      //.......................................................................................................
      dba = this.cfg.dba != null ? this.cfg.dba : new Dba();
      def(this, 'dba', {
        enumerable: false,
        value: dba
      });
      delete this.cfg.dba;
      this.cfg = freeze(this.cfg);
      //.......................................................................................................
      if (this.cfg.db_path != null) {
        this.dba.open({
          path: this.cfg.db_path
        });
      }
      if (this.cfg.recreate) {
        //.......................................................................................................
        this._clear_db();
      }
      this._create_db_structure();
      this._compile_sql();
      this._create_sql_functions();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _create_db_structure() {
      /* TAINT unify name / pkg_name, version / pkg_version */
      var prefix;
      prefix = this.cfg.prefix;
      this.dba.execute(SQL`create table if not exists ${prefix}pkgs (
    pkg_name          text    not null references ${prefix}pkg_names    ( pkg_name    ),
    pkg_version       text    not null references ${prefix}pkg_versions ( pkg_version ),
    pkg_vname         text    generated always as ( pkg_name || '@' || pkg_version ) virtual not null unique,
    description       text,
    url               text,
    fspath            text,
  primary key ( pkg_name, pkg_version ) );
create unique index if not exists ${prefix}pkgs_vname_idx on ${prefix}pkgs ( pkg_vname );
create table if not exists ${prefix}deps (
    pkg_vname         text    not null references ${prefix}pkgs ( pkg_vname ),
    dep_vname         text    not null references ${prefix}pkgs ( pkg_vname ),
  primary key ( pkg_vname, dep_vname ) );
create table if not exists ${prefix}pkg_names (
    pkg_name          text not null primary key );
create table if not exists ${prefix}pkg_versions (
    pkg_version       text not null primary key );`);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _clear_db() {
      /* TAINT should be a method of ICQL/DB */
      var prefix;
      prefix = this.cfg.prefix;
      this.dba.execute(SQL`drop index if exists ${prefix}pkgs_vname_idx;
drop table if exists ${prefix}deps;
drop table if exists ${prefix}pkgs;
drop table if exists ${prefix}pkg_names;
drop table if exists ${prefix}pkg_versions;`);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _compile_sql() {
      var prefix;
      prefix = this.cfg.prefix;
      this.sql = {
        add_pkg_version: SQL`insert into ${prefix}pkg_versions ( pkg_version )
  values ( $pkg_version )
  on conflict do nothing;`,
        add_pkg_name: SQL`insert into ${prefix}pkg_names ( pkg_name )
  values ( $pkg_name )
  on conflict do nothing;`,
        add_pkg: SQL`insert into ${prefix}pkgs ( pkg_name, pkg_version, description, url, fspath )
  values ( $pkg_name, $pkg_version, $description, $url, $fspath )
  on conflict do nothing;`
      };
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _create_sql_functions() {
      return this.dba.create_function({
        name: 'semver_satisfies',
        call: (version, pattern) => {
          if (semver_satisfies(version, pattern)) {
            return 1;
          }
          return 0;
        }
      });
    }

  };

}).call(this);

//# sourceMappingURL=main.js.map