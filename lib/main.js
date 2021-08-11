(function() {
  'use strict';
  var CND, Dba, E, FS, PATH, SQL, badge, createRequire, debug, def, echo, freeze, glob, got, help, info, isa, lets, misfit, rpr, semver_cmp, semver_satisfies, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'DPAN';

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

  misfit = Symbol('misfit');

  E = require('./errors');

  ({createRequire} = require('module'));

  def = Object.defineProperty;

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
  types.declare('dpan_fs_fetch_pkg_json_info_cfg', {
    tests: {
      '@isa.object x': function(x) {
        return this.isa.object(x);
      },
      '@isa.nonempty_text x.pkg_fspath': function(x) {
        return this.isa.nonempty_text(x.pkg_fspath);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dpan_fs_resolve_dep_fspath_cfg', {
    tests: {
      '@isa.object x': function(x) {
        return this.isa.object(x);
      },
      '@isa.nonempty_text x.pkg_fspath': function(x) {
        return this.isa.nonempty_text(x.pkg_fspath);
      },
      '@isa.nonempty_text x.dep_name': function(x) {
        return this.isa.nonempty_text(x.dep_name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dpan_fs_walk_dep_infos_cfg', {
    tests: {
      '@isa.object x': function(x) {
        return this.isa.object(x);
      },
      '@isa.nonempty_text x.pkg_fspath': function(x) {
        return this.isa.nonempty_text(x.pkg_fspath);
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
    },
    dpan_fs_fetch_pkg_json_info_cfg: {
      pkg_fspath: null,
      fallback: misfit
    },
    dpan_fs_resolve_dep_fspath_cfg: {
      pkg_fspath: null,
      dep_name: null
    },
    dpan_fs_walk_dep_infos_cfg: {
      pkg_fspath: null,
      fallback: misfit
    }
  };

  //===========================================================================================================
  this.Dpan = class Dpan {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var dba;
      validate.dpan_constructor_cfg(this.cfg = {...types.defaults.dpan_constructor_cfg, ...cfg});
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
      //.......................................................................................................
      /* NOTE avoid to make cache displayable as it contains huge objects that block the process for
         minutes when printed to console */
      def(this, '_cache', {
        enumerable: false,
        value: {}
      });
      this._cache.custom_requires = {};
      if (this.cfg.recreate) {
        //.......................................................................................................
        this._clear_db();
      }
      this._create_db_structure();
      this._compile_sql();
      this._create_sql_functions();
      return void 0;
    }

    //=========================================================================================================
    // DDL
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

    //=========================================================================================================
    // FS
    //---------------------------------------------------------------------------------------------------------
    async fs_fetch_pkg_json_info(cfg) {
      var RPKGUP, pkg_deps, pkg_description, pkg_json, pkg_json_fspath, pkg_json_info, pkg_keywords, pkg_name, pkg_version, ref, ref1;
      validate.dpan_fs_fetch_pkg_json_info_cfg(cfg = {...types.defaults.dpan_fs_fetch_pkg_json_info_cfg, ...cfg});
      RPKGUP = (await import('read-pkg-up'));
      pkg_json_info = (await RPKGUP.readPackageUpAsync({
        cwd: cfg.pkg_fspath,
        normalize: true
      }));
      if (pkg_json_info == null) {
        if (cfg.fallback !== misfit) {
          return cfg.fallback;
        }
        throw new E.Dba_fs_pkg_json_not_found('^fs_fetch_pkg_json_info@1^', cfg.pkg_fspath);
      }
      pkg_json = pkg_json_info.packageJson;
      pkg_name = pkg_json.name;
      pkg_version = pkg_json.version;
      pkg_description = pkg_json.description;
      pkg_keywords = (ref = pkg_json.keywords) != null ? ref : [];
      pkg_deps = (ref1 = pkg_json.dependencies) != null ? ref1 : {};
      pkg_json_fspath = pkg_json_info.path;
      // pkg_json
      return {pkg_name, pkg_version, pkg_description, pkg_keywords, pkg_deps, pkg_json_fspath};
    }

    //---------------------------------------------------------------------------------------------------------
    fs_resolve_dep_fspath(cfg) {
      var base, path, rq/* pkg_fspath points to pkg folder, must be one element deeper */;
      validate.dpan_fs_resolve_dep_fspath_cfg(cfg = {...types.defaults.dpan_fs_resolve_dep_fspath_cfg, ...cfg});
      path = PATH.join(cfg.pkg_fspath, 'whatever');
      rq = ((base = this._cache.custom_requires)[path] != null ? base[path] : base[path] = createRequire(path));
      return rq.resolve(cfg.dep_name);
    }

    //---------------------------------------------------------------------------------------------------------
    async * fs_walk_dep_infos(cfg) {
      var dep_fspath, dep_json_info, dep_name, dep_svrange, fallback, pkg_fspath, pkg_info, ref, ref1;
      validate.dpan_fs_walk_dep_infos_cfg(cfg = {...types.defaults.dpan_fs_walk_dep_infos_cfg, ...cfg});
      ({pkg_fspath, fallback} = cfg);
      pkg_info = (await this.fs_fetch_pkg_json_info({pkg_fspath}));
      ref1 = (ref = pkg_info.pkg_deps) != null ? ref : {};
      // { pkg_json    }             = await @fs_fetch_pkg_json_info { pkg_fspath, }
      for (dep_name in ref1) {
        dep_svrange = ref1[dep_name];
        dep_fspath = this.fs_resolve_dep_fspath({pkg_fspath, dep_name});
        dep_json_info = (await this.fs_fetch_pkg_json_info({
          pkg_fspath: dep_fspath,
          fallback
        }));
        /* TAINT `dep_svrange` is a property of the depending package, not the dependency */
        dep_json_info.dep_svrange = dep_svrange;
        yield dep_json_info;
      }
      return null;
    }

  };

}).call(this);

//# sourceMappingURL=main.js.map