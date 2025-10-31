(function() {
  'use strict';
  var CND, DBay, E, FS, PATH, SQL, badge, createRequire, debug, echo, freeze, glob, got, guy, help, info, isa, isa_list_of, isa_optional, lets, misfit, rpr, semver_cmp, semver_satisfies, type_of, types, urge, validate, validate_list_of, warn, whisper;

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

  ({isa, isa_list_of, isa_optional, type_of, validate, validate_list_of} = types.export());

  // { to_width }              = require 'to-width'
  SQL = String.raw;

  ({lets, freeze} = require('letsfreezethat'));

  ({DBay} = require('dbay'));

  glob = require('glob');

  PATH = require('path');

  FS = require('fs');

  got = require('got');

  semver_satisfies = require('semver/functions/satisfies');

  semver_cmp = require('semver/functions/cmp');

  misfit = Symbol('misfit');

  E = require('./errors');

  ({createRequire} = require('module'));

  guy = require('guy');

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
      },
      "( @type_of x.dba ) is 'dbay'": function(x) {
        return (this.type_of(x.dba)) === 'dbay';
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dpan_fs_fetch_pkg_info_cfg', {
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

  // #-----------------------------------------------------------------------------------------------------------
  // types.declare 'dpan_db_add_pkg_info_cfg', tests:
  //   # '@isa.object x':                                  ( x ) -> @isa.object x
  //   '@isa.dpan_pkg_info x':                           ( x ) -> @isa.dpan_pkg_info x

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dpan_pkg_info', {
    tests: {
      '@isa.object x': function(x) {
        return this.isa.object(x);
      },
      '@isa.nonempty_text x.pkg_name': function(x) {
        return this.isa.nonempty_text(x.pkg_name);
      },
      '@isa.nonempty_text x.pkg_version': function(x) {
        return this.isa.nonempty_text(x.pkg_version);
      },
      '@isa_optional.nonempty_text x.pkg_fspath': function(x) {
        return this.isa_optional.nonempty_text(x.pkg_fspath);
      },
      '@isa_optional.nonempty_text x.pkg_url': function(x) {
        return this.isa_optional.nonempty_text(x.pkg_url);
      },
      '@isa_optional.nonempty_text x.pkg_fspath': function(x) {
        return this.isa_optional.nonempty_text(x.pkg_fspath);
      },
      '@isa_optional.nonempty_text x.pkg_description': function(x) {
        return this.isa_optional.nonempty_text(x.pkg_description);
      },
      '@isa_list_of.nonempty_text x.pkg_keywords': function(x) {
        return this.isa_list_of.nonempty_text(x.pkg_keywords);
      },
      '@isa.object x.pkg_deps': function(x) {
        return this.isa.object(x.pkg_deps);
      },
      '@isa.nonempty_text x.pkg_json_fspath': function(x) {
        return this.isa.nonempty_text(x.pkg_json_fspath);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dpan_git_fetch_pkg_status_cfg', {
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
  types.declare('dpan_git_get_dirty_counts_cfg', {
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
  types.declare('dpan_git_get_staged_file_paths_cfg', {
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
    dpan_fs_fetch_pkg_info_cfg: {
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
    },
    // dpan_db_add_pkg_info_cfg:
    // dpan_pkg_info:    null
    dpan_pkg_info: {
      // pkg_json:       null
      pkg_name: null,
      pkg_version: null,
      pkg_url: null,
      pkg_fspath: null,
      pkg_description: null,
      pkg_keywords: null,
      pkg_deps: null,
      pkg_json_fspath: null
    },
    dpan_git_fetch_pkg_status_cfg: {
      pkg_fspath: null
    },
    dpan_git_get_staged_file_paths_cfg: {
      pkg_fspath: null
    },
    dpan_git_get_dirty_counts_cfg: {
      pkg_fspath: null,
      fallback: misfit
    }
  };

  //===========================================================================================================
  this.Dpan = class Dpan {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      validate.dpan_constructor_cfg(this.cfg = {...types.defaults.dpan_constructor_cfg, ...cfg});
      //.......................................................................................................
      guy.props.def(this, 'dba', {
        enumerable: false,
        value: cfg.dba
      });
      delete this.cfg.dba;
      this.cfg = freeze(this.cfg);
      if (this.cfg.recreate) {
        //.......................................................................................................
        this._clear_db();
      }
      // @vars = new Dbv   { dba: @dba, prefix: @cfg.prefix, } ### create table `dpan_variables` ###
      // @tags = new Dtags { dba: @dba, prefix: @cfg.prefix, } ### create tagging tables ###
      //.......................................................................................................
      /* NOTE avoid to make cache displayable as it contains huge objects that block the process for
         minutes when printed to console */
      guy.props.def(this, '_cache', {
        enumerable: false,
        value: {}
      });
      this._cache.custom_requires = {};
      //.......................................................................................................
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
    pkg_description   text,
    pkg_url           text,
    pkg_fspath        text,
  primary key ( pkg_name, pkg_version ) );
create unique index if not exists ${prefix}pkgs_vname_idx on ${prefix}pkgs ( pkg_vname );
create table if not exists ${prefix}deps (
    pkg_name          text    not null references ${prefix}pkg_names    ( pkg_name    ),
    pkg_version       text    not null references ${prefix}pkg_versions ( pkg_version ),
    dep_name          text    not null references ${prefix}pkg_names    ( pkg_name    ),
    dep_svrange       text    not null references ${prefix}pkg_svranges ( pkg_svrange ),
  primary key ( pkg_name, pkg_version, dep_name ) );
create table if not exists ${prefix}pkg_names (
    pkg_name          text not null primary key );
create table if not exists ${prefix}pkg_versions (
    pkg_version       text not null primary key );
create table if not exists ${prefix}pkg_svranges (
    pkg_svrange       text not null primary key );`);
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
drop table if exists ${prefix}pkg_svranges;
drop table if exists ${prefix}pkg_versions;
-- ...................................................................................................
drop table if exists ${prefix}variables;
-- ...................................................................................................
drop view  if exists ${prefix}_potential_inflection_points;
drop view  if exists ${prefix}tags_and_rangelists;
drop table if exists ${prefix}contiguous_ranges;
drop table if exists ${prefix}tagged_ranges;
-- drop table if exists ${prefix}tags;`);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _compile_sql() {
      var prefix, sql;
      prefix = this.cfg.prefix;
      sql = {
        add_pkg_name: SQL`insert into ${prefix}pkg_names ( pkg_name )
  values ( $pkg_name )
  on conflict do nothing;`,
        add_pkg_version: SQL`insert into ${prefix}pkg_versions ( pkg_version )
  values ( $pkg_version )
  on conflict do nothing;`,
        add_pkg_svrange: SQL`insert into ${prefix}pkg_svranges ( pkg_svrange )
  values ( $pkg_svrange )
  on conflict do nothing;`,
        add_pkg: SQL`insert into ${prefix}pkgs ( pkg_name, pkg_version, pkg_description, pkg_url, pkg_fspath )
  values ( $pkg_name, $pkg_version, $pkg_description, $pkg_url, $pkg_fspath )
  on conflict do nothing;`,
        add_pkg_dep: SQL`insert into ${prefix}deps ( pkg_name, pkg_version, dep_name, dep_svrange )
values ( $pkg_name, $pkg_version, $dep_name, $dep_svrange )
on conflict do nothing;`
      };
      guy.props.def(this, 'sql', {
        enumerable: false,
        value: sql
      });
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
    // DB
    //---------------------------------------------------------------------------------------------------------
    db_add_pkg_info(cfg) {
      var dep_name, dep_svrange, pkg_info, ref;
      validate.dpan_pkg_info(cfg = {...types.defaults.dpan_pkg_info, ...cfg});
      pkg_info = cfg;
      this.dba.run(this.sql.add_pkg_name, pkg_info);
      this.dba.run(this.sql.add_pkg_version, pkg_info);
      this.dba.run(this.sql.add_pkg, pkg_info);
      ref = pkg_info.pkg_deps;
      //.......................................................................................................
      for (dep_name in ref) {
        dep_svrange = ref[dep_name];
        this.dba.run(this.sql.add_pkg_name, {
          pkg_name: dep_name
        });
        this.dba.run(this.sql.add_pkg_svrange, {
          pkg_svrange: dep_svrange
        });
        this.dba.run(this.sql.add_pkg_dep, {...pkg_info, dep_name, dep_svrange});
      }
      //.......................................................................................................
      return null;
    }

    //=========================================================================================================
    // FS
    //---------------------------------------------------------------------------------------------------------
    async fs_fetch_pkg_info(cfg) {
      var RPKGUP, pkg_deps, pkg_description, pkg_fspath, pkg_json, pkg_json_fspath, pkg_json_info, pkg_keywords, pkg_name, pkg_url, pkg_version, ref, ref1;
      validate.dpan_fs_fetch_pkg_info_cfg(cfg = {...types.defaults.dpan_fs_fetch_pkg_info_cfg, ...cfg});
      RPKGUP = (await import('read-pkg-up'));
      ({pkg_fspath} = cfg);
      pkg_json_info = (await RPKGUP.readPackageUpAsync({
        cwd: pkg_fspath,
        normalize: true
      }));
      if (pkg_json_info == null) {
        if (cfg.fallback !== misfit) {
          return cfg.fallback;
        }
        throw new E.Dba_fs_pkg_json_not_found('^fs_fetch_pkg_info@1^', cfg.pkg_fspath);
      }
      pkg_json = pkg_json_info.packageJson;
      pkg_name = pkg_json.name;
      pkg_version = pkg_json.version;
      pkg_url = this._pkg_url_from_pkg_json(pkg_json);
      pkg_description = pkg_json.description;
      if (pkg_description === '') {
        pkg_description = null;
      }
      pkg_keywords = (ref = pkg_json.keywords) != null ? ref : [];
      pkg_deps = (ref1 = pkg_json.dependencies) != null ? ref1 : {};
      pkg_json_fspath = pkg_json_info.path;
      // pkg_json
      return {pkg_name, pkg_version, pkg_url, pkg_fspath, pkg_description, pkg_keywords, pkg_deps, pkg_json_fspath};
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
      pkg_info = (await this.fs_fetch_pkg_info({pkg_fspath}));
      ref1 = (ref = pkg_info.pkg_deps) != null ? ref : {};
      // { pkg_json    }             = await @fs_fetch_pkg_info { pkg_fspath, }
      for (dep_name in ref1) {
        dep_svrange = ref1[dep_name];
        dep_fspath = this.fs_resolve_dep_fspath({pkg_fspath, dep_name});
        dep_json_info = (await this.fs_fetch_pkg_info({
          pkg_fspath: dep_fspath,
          fallback
        }));
        /* TAINT `dep_svrange` is a property of the depending package, not the dependency */
        dep_json_info.dep_svrange = dep_svrange;
        yield dep_json_info;
      }
      return null;
    }

    //=========================================================================================================
    // RETRIEVING CANONICAL PACKAGE URL
    //---------------------------------------------------------------------------------------------------------
    _url_from_pkg_json_homepage(pkg_json) {
      var R, ref;
      if ((R = (ref = pkg_json.homepage) != null ? ref : null) != null) {
        return R.replace(/#readme$/, '');
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _url_from_pkg_json_repository(pkg_json) {
      var R, ref, ref1;
      if ((R = (ref = (ref1 = pkg_json.repository) != null ? ref1.url : void 0) != null ? ref : null) != null) {
        return R.replace(/^(git\+)?(.+?)(\.git)?$/, '$2');
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _url_from_pkg_json_bugs(pkg_json) {
      var R, ref, ref1;
      if ((R = (ref = (ref1 = pkg_json.bugs) != null ? ref1.url : void 0) != null ? ref : null) != null) {
        return R.replace(/\/issues$/, '');
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _pkg_url_from_pkg_json(pkg_json) {
      var R;
      if ((R = this._url_from_pkg_json_homepage(pkg_json)) != null) {
        return R;
      }
      if ((R = this._url_from_pkg_json_repository(pkg_json)) != null) {
        return R;
      }
      if ((R = this._url_from_pkg_json_bugs(pkg_json)) != null) {
        return R;
      }
      return null;
    }

    //=========================================================================================================
    // RETRIEVE GIT INFOS
    //---------------------------------------------------------------------------------------------------------
    git_fetch_pkg_status(cfg) {
      var pkg_fspath;
      throw new E.Dba_not_implemented('^git_fetch_pkg_status@1^', 'git_fetch_pkg_status()');
      validate.dpan_git_fetch_pkg_status_cfg(cfg = {...types.defaults.dpan_git_fetch_pkg_status_cfg, ...cfg});
      ({pkg_fspath} = cfg);
      return debug('^8878^', cfg);
    }

    //---------------------------------------------------------------------------------------------------------
    git_get_dirty_counts(cfg) {
      var Git, acc, bcc, dfc, error, repo, status;
      /* see hengist/dev/snippets/src/demo-node-git-modules */
      validate.dpan_git_get_dirty_counts_cfg(cfg = {...types.defaults.dpan_git_get_dirty_counts_cfg, ...cfg});
      ({Git} = require('kaseki'));
      try {
        repo = new Git({
          work_path: cfg.pkg_fspath,
          repo_path: cfg.pkg_fspath
        });
        status = repo.status();
      } catch (error1) {
        error = error1;
        warn(CND.reverse(error.message));
        if (cfg.fallback !== misfit) {
          return cfg.fallback;
        }
        throw new E.Dba_git_not_a_repo('^git_fetch_dirty_count@1^', cfg.pkg_fspath);
      }
      acc = status.ahead_count/* ACC, ahead-commit  count */
      bcc = status.behind_count/* BCC, behind-commit count */
      dfc = status.dirty_count/* DFC, dirty file    count */
      return {
        acc,
        bcc,
        dfc,
        sum: acc + bcc + dfc
      };
    }

    //---------------------------------------------------------------------------------------------------------
    git_get_log(cfg) {
      /* see hengist/dev/snippets/src/demo-node-git-modules */
      var Git, error, repo;
      ({Git} = require('kaseki'));
      try {
        repo = new Git({
          work_path: cfg.pkg_fspath,
          repo_path: cfg.pkg_fspath
        });
        return repo.log(cfg);
      } catch (error1) {
        error = error1;
        warn('Ωdpm___2', CND.reverse(error.message));
        if ((cfg != null ? cfg.fallback : void 0) !== misfit) {
          return cfg.fallback;
        }
        throw error;
      }
      // throw new E.Dba_git_not_a_repo '^git_fetch_dirty_count@1^', cfg.pkg_fspath
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    git_get_staged_file_paths(cfg) {
      var GU, path, repo, status;
      validate.dpan_git_get_staged_file_paths_cfg(cfg = {...types.defaults.dpan_git_get_staged_file_paths_cfg, ...cfg});
      GU = require('git-utils');
      repo = GU.open(cfg.pkg_fspath);
      if (repo == null) {
        if (cfg.fallback !== misfit) {
          return cfg.fallback;
        }
        throw new E.Dba_git_not_a_repo('^git_fetch_dirty_count@1^', cfg.pkg_fspath);
      }
      return (function() {
        var ref, results;
        ref = repo.getStatus();
        results = [];
        for (path in ref) {
          status = ref[path];
          if (repo.isStatusStaged(status)) {
            results.push(path);
          }
        }
        return results;
      })();
    }

  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0VBQUE7QUFBQSxNQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxhQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsZ0JBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxRQUFBLEVBQUEsZ0JBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQTs7O0VBS0EsR0FBQSxHQUE0QixPQUFBLENBQVEsS0FBUjs7RUFDNUIsR0FBQSxHQUE0QixHQUFHLENBQUM7O0VBQ2hDLEtBQUEsR0FBNEI7O0VBQzVCLEtBQUEsR0FBNEIsR0FBRyxDQUFDLFVBQUosQ0FBZSxPQUFmLEVBQTRCLEtBQTVCOztFQUM1QixJQUFBLEdBQTRCLEdBQUcsQ0FBQyxVQUFKLENBQWUsTUFBZixFQUE0QixLQUE1Qjs7RUFDNUIsSUFBQSxHQUE0QixHQUFHLENBQUMsVUFBSixDQUFlLE1BQWYsRUFBNEIsS0FBNUI7O0VBQzVCLElBQUEsR0FBNEIsR0FBRyxDQUFDLFVBQUosQ0FBZSxNQUFmLEVBQTRCLEtBQTVCOztFQUM1QixJQUFBLEdBQTRCLEdBQUcsQ0FBQyxVQUFKLENBQWUsTUFBZixFQUE0QixLQUE1Qjs7RUFDNUIsT0FBQSxHQUE0QixHQUFHLENBQUMsVUFBSixDQUFlLFNBQWYsRUFBNEIsS0FBNUI7O0VBQzVCLElBQUEsR0FBNEIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFULENBQWMsR0FBZCxFQWQ1Qjs7O0VBZ0JBLEtB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MUlBIiwic291cmNlc0NvbnRlbnQiOlsiXG4ndXNlIHN0cmljdCdcblxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuQ05EICAgICAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJ2NuZCdcbnJwciAgICAgICAgICAgICAgICAgICAgICAgPSBDTkQucnByXG5iYWRnZSAgICAgICAgICAgICAgICAgICAgID0gJ0RQQU4nXG5kZWJ1ZyAgICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ2RlYnVnJywgICAgIGJhZGdlXG53YXJuICAgICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ3dhcm4nLCAgICAgIGJhZGdlXG5pbmZvICAgICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ2luZm8nLCAgICAgIGJhZGdlXG51cmdlICAgICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ3VyZ2UnLCAgICAgIGJhZGdlXG5oZWxwICAgICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ2hlbHAnLCAgICAgIGJhZGdlXG53aGlzcGVyICAgICAgICAgICAgICAgICAgID0gQ05ELmdldF9sb2dnZXIgJ3doaXNwZXInLCAgIGJhZGdlXG5lY2hvICAgICAgICAgICAgICAgICAgICAgID0gQ05ELmVjaG8uYmluZCBDTkRcbiMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxudHlwZXMgICAgICAgICAgICAgICAgICAgICA9IG5ldyAoIHJlcXVpcmUgJ2ludGVydHlwZScgKS5JbnRlcnR5cGVcbnsgaXNhXG4gIGlzYV9saXN0X29mXG4gIGlzYV9vcHRpb25hbFxuICB0eXBlX29mXG4gIHZhbGlkYXRlXG4gIHZhbGlkYXRlX2xpc3Rfb2YgfSAgICAgID0gdHlwZXMuZXhwb3J0KClcbiMgeyB0b193aWR0aCB9ICAgICAgICAgICAgICA9IHJlcXVpcmUgJ3RvLXdpZHRoJ1xuU1FMICAgICAgICAgICAgICAgICAgICAgICA9IFN0cmluZy5yYXdcbnsgbGV0c1xuICBmcmVlemUgfSAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJ2xldHNmcmVlemV0aGF0J1xueyBEQmF5LCB9ICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJ2RiYXknXG5nbG9iICAgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnZ2xvYidcblBBVEggICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdwYXRoJ1xuRlMgICAgICAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuZ290ICAgICAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJ2dvdCdcbnNlbXZlcl9zYXRpc2ZpZXMgICAgICAgICAgPSByZXF1aXJlICdzZW12ZXIvZnVuY3Rpb25zL3NhdGlzZmllcydcbnNlbXZlcl9jbXAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdzZW12ZXIvZnVuY3Rpb25zL2NtcCdcbm1pc2ZpdCAgICAgICAgICAgICAgICAgICAgPSBTeW1ib2wgJ21pc2ZpdCdcbkUgICAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuL2Vycm9ycydcbnsgY3JlYXRlUmVxdWlyZSwgfSAgICAgICAgPSByZXF1aXJlICdtb2R1bGUnXG5ndXkgICAgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnZ3V5J1xuXG5cbiM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxudHlwZXMuZGVjbGFyZSAnZHBhbl9jb25zdHJ1Y3Rvcl9jZmcnLCB0ZXN0czpcbiAgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLm9iamVjdCB4XG4gICd4LnByZWZpeCBpcyBhIHByZWZpeCc6ICAgICAgICAgKCB4ICkgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEBpc2EudGV4dCB4LnByZWZpeFxuICAgIHJldHVybiB0cnVlIGlmIHgucHJlZml4IGlzICcnXG4gICAgcmV0dXJuICggL15bX2Etel1bX2EtejAtOV0qJC8gKS50ZXN0IHgucHJlZml4XG4gICdAaXNhLmJvb2xlYW4geC5yZWNyZWF0ZSc6ICAgICAgKCB4ICkgLT4gQGlzYS5ib29sZWFuIHgucmVjcmVhdGVcbiAgXCIoIEB0eXBlX29mIHguZGJhICkgaXMgJ2RiYXknXCI6ICggeCApIC0+ICggQHR5cGVfb2YgeC5kYmEgKSBpcyAnZGJheSdcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG50eXBlcy5kZWNsYXJlICdkcGFuX2ZzX2ZldGNoX3BrZ19pbmZvX2NmZycsIHRlc3RzOlxuICAnQGlzYS5vYmplY3QgeCc6ICAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLm9iamVjdCB4XG4gICdAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfZnNwYXRoJzogICggeCApIC0+IEBpc2Eubm9uZW1wdHlfdGV4dCB4LnBrZ19mc3BhdGhcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG50eXBlcy5kZWNsYXJlICdkcGFuX2ZzX3Jlc29sdmVfZGVwX2ZzcGF0aF9jZmcnLCB0ZXN0czpcbiAgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gQGlzYS5vYmplY3QgeFxuICAnQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aCc6ICAoIHggKSAtPiBAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfZnNwYXRoXG4gICdAaXNhLm5vbmVtcHR5X3RleHQgeC5kZXBfbmFtZSc6ICAgICggeCApIC0+IEBpc2Eubm9uZW1wdHlfdGV4dCB4LmRlcF9uYW1lXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudHlwZXMuZGVjbGFyZSAnZHBhbl9mc193YWxrX2RlcF9pbmZvc19jZmcnLCB0ZXN0czpcbiAgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gQGlzYS5vYmplY3QgeFxuICAnQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aCc6ICAoIHggKSAtPiBAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfZnNwYXRoXG5cbiMgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIHR5cGVzLmRlY2xhcmUgJ2RwYW5fZGJfYWRkX3BrZ19pbmZvX2NmZycsIHRlc3RzOlxuIyAgICMgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLm9iamVjdCB4XG4jICAgJ0Bpc2EuZHBhbl9wa2dfaW5mbyB4JzogICAgICAgICAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLmRwYW5fcGtnX2luZm8geFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnR5cGVzLmRlY2xhcmUgJ2RwYW5fcGtnX2luZm8nLCB0ZXN0czpcbiAgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLm9iamVjdCB4XG4gICdAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfbmFtZSc6ICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX25hbWVcbiAgJ0Bpc2Eubm9uZW1wdHlfdGV4dCB4LnBrZ192ZXJzaW9uJzogICAgICAgICAgICAgICAoIHggKSAtPiBAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfdmVyc2lvblxuICAnQGlzYV9vcHRpb25hbC5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aCc6ICAgICAgICggeCApIC0+IEBpc2Ffb3B0aW9uYWwubm9uZW1wdHlfdGV4dCB4LnBrZ19mc3BhdGhcbiAgJ0Bpc2Ffb3B0aW9uYWwubm9uZW1wdHlfdGV4dCB4LnBrZ191cmwnOiAgICAgICAgICAoIHggKSAtPiBAaXNhX29wdGlvbmFsLm5vbmVtcHR5X3RleHQgeC5wa2dfdXJsXG4gICdAaXNhX29wdGlvbmFsLm5vbmVtcHR5X3RleHQgeC5wa2dfZnNwYXRoJzogICAgICAgKCB4ICkgLT4gQGlzYV9vcHRpb25hbC5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aFxuICAnQGlzYV9vcHRpb25hbC5ub25lbXB0eV90ZXh0IHgucGtnX2Rlc2NyaXB0aW9uJzogICggeCApIC0+IEBpc2Ffb3B0aW9uYWwubm9uZW1wdHlfdGV4dCB4LnBrZ19kZXNjcmlwdGlvblxuICAnQGlzYV9saXN0X29mLm5vbmVtcHR5X3RleHQgeC5wa2dfa2V5d29yZHMnOiAgICAgICggeCApIC0+IEBpc2FfbGlzdF9vZi5ub25lbXB0eV90ZXh0IHgucGtnX2tleXdvcmRzXG4gICdAaXNhLm9iamVjdCB4LnBrZ19kZXBzJzogICAgICAgICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gQGlzYS5vYmplY3QgeC5wa2dfZGVwc1xuICAnQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2pzb25fZnNwYXRoJzogICAgICAgICAgICggeCApIC0+IEBpc2Eubm9uZW1wdHlfdGV4dCB4LnBrZ19qc29uX2ZzcGF0aFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnR5cGVzLmRlY2xhcmUgJ2RwYW5fZ2l0X2ZldGNoX3BrZ19zdGF0dXNfY2ZnJywgdGVzdHM6XG4gICdAaXNhLm9iamVjdCB4JzogICAgICAgICAgICAgICAgICAgICggeCApIC0+IEBpc2Eub2JqZWN0IHhcbiAgJ0Bpc2Eubm9uZW1wdHlfdGV4dCB4LnBrZ19mc3BhdGgnOiAgKCB4ICkgLT4gQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnR5cGVzLmRlY2xhcmUgJ2RwYW5fZ2l0X2dldF9kaXJ0eV9jb3VudHNfY2ZnJywgdGVzdHM6XG4gICdAaXNhLm9iamVjdCB4JzogICAgICAgICAgICAgICAgICAgICggeCApIC0+IEBpc2Eub2JqZWN0IHhcbiAgJ0Bpc2Eubm9uZW1wdHlfdGV4dCB4LnBrZ19mc3BhdGgnOiAgKCB4ICkgLT4gQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnR5cGVzLmRlY2xhcmUgJ2RwYW5fZ2l0X2dldF9zdGFnZWRfZmlsZV9wYXRoc19jZmcnLCB0ZXN0czpcbiAgJ0Bpc2Eub2JqZWN0IHgnOiAgICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gQGlzYS5vYmplY3QgeFxuICAnQGlzYS5ub25lbXB0eV90ZXh0IHgucGtnX2ZzcGF0aCc6ICAoIHggKSAtPiBAaXNhLm5vbmVtcHR5X3RleHQgeC5wa2dfZnNwYXRoXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudHlwZXMuZGVmYXVsdHMgPVxuICBkcGFuX2NvbnN0cnVjdG9yX2NmZzpcbiAgICBkYmE6ICAgICAgICAgICAgICBudWxsXG4gICAgcHJlZml4OiAgICAgICAgICAgJ2RwYW5fJ1xuICAgIGRiX3BhdGg6ICAgICAgICAgIFBBVEgucmVzb2x2ZSBQQVRILmpvaW4gX19kaXJuYW1lLCAnLi4vZHBhbi5zcWxpdGUnXG4gICAgcmVjcmVhdGU6ICAgICAgICAgZmFsc2VcbiAgICByZWdpc3RyeV91cmw6ICAgICAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcvJ1xuICBkcGFuX2ZzX2ZldGNoX3BrZ19pbmZvX2NmZzpcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gICAgZmFsbGJhY2s6ICAgICAgICAgbWlzZml0XG4gIGRwYW5fZnNfcmVzb2x2ZV9kZXBfZnNwYXRoX2NmZzpcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gICAgZGVwX25hbWU6ICAgICAgICAgbnVsbFxuICBkcGFuX2ZzX3dhbGtfZGVwX2luZm9zX2NmZzpcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gICAgZmFsbGJhY2s6ICAgICAgICAgbWlzZml0XG4gICMgZHBhbl9kYl9hZGRfcGtnX2luZm9fY2ZnOlxuICAgICMgZHBhbl9wa2dfaW5mbzogICAgbnVsbFxuICBkcGFuX3BrZ19pbmZvOlxuICAgICMgcGtnX2pzb246ICAgICAgIG51bGxcbiAgICBwa2dfbmFtZTogICAgICAgICBudWxsXG4gICAgcGtnX3ZlcnNpb246ICAgICAgbnVsbFxuICAgIHBrZ191cmw6ICAgICAgICAgIG51bGxcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gICAgcGtnX2Rlc2NyaXB0aW9uOiAgbnVsbFxuICAgIHBrZ19rZXl3b3JkczogICAgIG51bGxcbiAgICBwa2dfZGVwczogICAgICAgICBudWxsXG4gICAgcGtnX2pzb25fZnNwYXRoOiAgbnVsbFxuICBkcGFuX2dpdF9mZXRjaF9wa2dfc3RhdHVzX2NmZzpcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gIGRwYW5fZ2l0X2dldF9zdGFnZWRfZmlsZV9wYXRoc19jZmc6XG4gICAgcGtnX2ZzcGF0aDogICAgICAgbnVsbFxuICBkcGFuX2dpdF9nZXRfZGlydHlfY291bnRzX2NmZzpcbiAgICBwa2dfZnNwYXRoOiAgICAgICBudWxsXG4gICAgZmFsbGJhY2s6ICAgICAgICAgbWlzZml0XG5cblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5jbGFzcyBARHBhblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3RydWN0b3I6ICggY2ZnICkgLT5cbiAgICB2YWxpZGF0ZS5kcGFuX2NvbnN0cnVjdG9yX2NmZyBAY2ZnID0geyB0eXBlcy5kZWZhdWx0cy5kcGFuX2NvbnN0cnVjdG9yX2NmZy4uLiwgY2ZnLi4uLCB9XG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBndXkucHJvcHMuZGVmIEAsICdkYmEnLCB7IGVudW1lcmFibGU6IGZhbHNlLCB2YWx1ZTogY2ZnLmRiYSwgfVxuICAgIGRlbGV0ZSBAY2ZnLmRiYVxuICAgIEBjZmcgID0gZnJlZXplIEBjZmdcbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIEBfY2xlYXJfZGIoKSBpZiBAY2ZnLnJlY3JlYXRlXG4gICAgIyBAdmFycyA9IG5ldyBEYnYgICB7IGRiYTogQGRiYSwgcHJlZml4OiBAY2ZnLnByZWZpeCwgfSAjIyMgY3JlYXRlIHRhYmxlIGBkcGFuX3ZhcmlhYmxlc2AgIyMjXG4gICAgIyBAdGFncyA9IG5ldyBEdGFncyB7IGRiYTogQGRiYSwgcHJlZml4OiBAY2ZnLnByZWZpeCwgfSAjIyMgY3JlYXRlIHRhZ2dpbmcgdGFibGVzICMjI1xuICAgICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgIyMjIE5PVEUgYXZvaWQgdG8gbWFrZSBjYWNoZSBkaXNwbGF5YWJsZSBhcyBpdCBjb250YWlucyBodWdlIG9iamVjdHMgdGhhdCBibG9jayB0aGUgcHJvY2VzcyBmb3JcbiAgICBtaW51dGVzIHdoZW4gcHJpbnRlZCB0byBjb25zb2xlICMjI1xuICAgIGd1eS5wcm9wcy5kZWYgQCwgJ19jYWNoZScsIHsgZW51bWVyYWJsZTogZmFsc2UsIHZhbHVlOiB7fSwgfVxuICAgIEBfY2FjaGUuY3VzdG9tX3JlcXVpcmVzID0ge31cbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIEBfY3JlYXRlX2RiX3N0cnVjdHVyZSgpXG4gICAgQF9jb21waWxlX3NxbCgpXG4gICAgQF9jcmVhdGVfc3FsX2Z1bmN0aW9ucygpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuXG5cbiAgIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAjIERETFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIF9jcmVhdGVfZGJfc3RydWN0dXJlOiAtPlxuICAgICMjIyBUQUlOVCB1bmlmeSBuYW1lIC8gcGtnX25hbWUsIHZlcnNpb24gLyBwa2dfdmVyc2lvbiAjIyNcbiAgICBwcmVmaXggPSBAY2ZnLnByZWZpeFxuICAgIEBkYmEuZXhlY3V0ZSBTUUxcIlwiXCJcbiAgICAgIGNyZWF0ZSB0YWJsZSBpZiBub3QgZXhpc3RzICN7cHJlZml4fXBrZ3MgKFxuICAgICAgICAgIHBrZ19uYW1lICAgICAgICAgIHRleHQgICAgbm90IG51bGwgcmVmZXJlbmNlcyAje3ByZWZpeH1wa2dfbmFtZXMgICAgKCBwa2dfbmFtZSAgICApLFxuICAgICAgICAgIHBrZ192ZXJzaW9uICAgICAgIHRleHQgICAgbm90IG51bGwgcmVmZXJlbmNlcyAje3ByZWZpeH1wa2dfdmVyc2lvbnMgKCBwa2dfdmVyc2lvbiApLFxuICAgICAgICAgIHBrZ192bmFtZSAgICAgICAgIHRleHQgICAgZ2VuZXJhdGVkIGFsd2F5cyBhcyAoIHBrZ19uYW1lIHx8ICdAJyB8fCBwa2dfdmVyc2lvbiApIHZpcnR1YWwgbm90IG51bGwgdW5pcXVlLFxuICAgICAgICAgIHBrZ19kZXNjcmlwdGlvbiAgIHRleHQsXG4gICAgICAgICAgcGtnX3VybCAgICAgICAgICAgdGV4dCxcbiAgICAgICAgICBwa2dfZnNwYXRoICAgICAgICB0ZXh0LFxuICAgICAgICBwcmltYXJ5IGtleSAoIHBrZ19uYW1lLCBwa2dfdmVyc2lvbiApICk7XG4gICAgICBjcmVhdGUgdW5pcXVlIGluZGV4IGlmIG5vdCBleGlzdHMgI3twcmVmaXh9cGtnc192bmFtZV9pZHggb24gI3twcmVmaXh9cGtncyAoIHBrZ192bmFtZSApO1xuICAgICAgY3JlYXRlIHRhYmxlIGlmIG5vdCBleGlzdHMgI3twcmVmaXh9ZGVwcyAoXG4gICAgICAgICAgcGtnX25hbWUgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCByZWZlcmVuY2VzICN7cHJlZml4fXBrZ19uYW1lcyAgICAoIHBrZ19uYW1lICAgICksXG4gICAgICAgICAgcGtnX3ZlcnNpb24gICAgICAgdGV4dCAgICBub3QgbnVsbCByZWZlcmVuY2VzICN7cHJlZml4fXBrZ192ZXJzaW9ucyAoIHBrZ192ZXJzaW9uICksXG4gICAgICAgICAgZGVwX25hbWUgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCByZWZlcmVuY2VzICN7cHJlZml4fXBrZ19uYW1lcyAgICAoIHBrZ19uYW1lICAgICksXG4gICAgICAgICAgZGVwX3N2cmFuZ2UgICAgICAgdGV4dCAgICBub3QgbnVsbCByZWZlcmVuY2VzICN7cHJlZml4fXBrZ19zdnJhbmdlcyAoIHBrZ19zdnJhbmdlICksXG4gICAgICAgIHByaW1hcnkga2V5ICggcGtnX25hbWUsIHBrZ192ZXJzaW9uLCBkZXBfbmFtZSApICk7XG4gICAgICBjcmVhdGUgdGFibGUgaWYgbm90IGV4aXN0cyAje3ByZWZpeH1wa2dfbmFtZXMgKFxuICAgICAgICAgIHBrZ19uYW1lICAgICAgICAgIHRleHQgbm90IG51bGwgcHJpbWFyeSBrZXkgKTtcbiAgICAgIGNyZWF0ZSB0YWJsZSBpZiBub3QgZXhpc3RzICN7cHJlZml4fXBrZ192ZXJzaW9ucyAoXG4gICAgICAgICAgcGtnX3ZlcnNpb24gICAgICAgdGV4dCBub3QgbnVsbCBwcmltYXJ5IGtleSApO1xuICAgICAgY3JlYXRlIHRhYmxlIGlmIG5vdCBleGlzdHMgI3twcmVmaXh9cGtnX3N2cmFuZ2VzIChcbiAgICAgICAgICBwa2dfc3ZyYW5nZSAgICAgICB0ZXh0IG5vdCBudWxsIHByaW1hcnkga2V5ICk7XG4gICAgICBcIlwiXCJcbiAgICByZXR1cm4gbnVsbFxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgX2NsZWFyX2RiOiAtPlxuICAgICMjIyBUQUlOVCBzaG91bGQgYmUgYSBtZXRob2Qgb2YgSUNRTC9EQiAjIyNcbiAgICBwcmVmaXggPSBAY2ZnLnByZWZpeFxuICAgIEBkYmEuZXhlY3V0ZSBTUUxcIlwiXCJcbiAgICAgIGRyb3AgaW5kZXggaWYgZXhpc3RzICN7cHJlZml4fXBrZ3Nfdm5hbWVfaWR4O1xuICAgICAgZHJvcCB0YWJsZSBpZiBleGlzdHMgI3twcmVmaXh9ZGVwcztcbiAgICAgIGRyb3AgdGFibGUgaWYgZXhpc3RzICN7cHJlZml4fXBrZ3M7XG4gICAgICBkcm9wIHRhYmxlIGlmIGV4aXN0cyAje3ByZWZpeH1wa2dfbmFtZXM7XG4gICAgICBkcm9wIHRhYmxlIGlmIGV4aXN0cyAje3ByZWZpeH1wa2dfc3ZyYW5nZXM7XG4gICAgICBkcm9wIHRhYmxlIGlmIGV4aXN0cyAje3ByZWZpeH1wa2dfdmVyc2lvbnM7XG4gICAgICAtLSAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgIGRyb3AgdGFibGUgaWYgZXhpc3RzICN7cHJlZml4fXZhcmlhYmxlcztcbiAgICAgIC0tIC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgZHJvcCB2aWV3ICBpZiBleGlzdHMgI3twcmVmaXh9X3BvdGVudGlhbF9pbmZsZWN0aW9uX3BvaW50cztcbiAgICAgIGRyb3AgdmlldyAgaWYgZXhpc3RzICN7cHJlZml4fXRhZ3NfYW5kX3JhbmdlbGlzdHM7XG4gICAgICBkcm9wIHRhYmxlIGlmIGV4aXN0cyAje3ByZWZpeH1jb250aWd1b3VzX3JhbmdlcztcbiAgICAgIGRyb3AgdGFibGUgaWYgZXhpc3RzICN7cHJlZml4fXRhZ2dlZF9yYW5nZXM7XG4gICAgICAtLSBkcm9wIHRhYmxlIGlmIGV4aXN0cyAje3ByZWZpeH10YWdzO1xuICAgICAgXCJcIlwiXG4gICAgcmV0dXJuIG51bGxcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIF9jb21waWxlX3NxbDogLT5cbiAgICBwcmVmaXggPSBAY2ZnLnByZWZpeFxuICAgIHNxbCA9XG4gICAgICBhZGRfcGtnX25hbWU6IFNRTFwiXCJcIlxuICAgICAgICBpbnNlcnQgaW50byAje3ByZWZpeH1wa2dfbmFtZXMgKCBwa2dfbmFtZSApXG4gICAgICAgICAgdmFsdWVzICggJHBrZ19uYW1lIClcbiAgICAgICAgICBvbiBjb25mbGljdCBkbyBub3RoaW5nO1wiXCJcIlxuICAgICAgYWRkX3BrZ192ZXJzaW9uOiBTUUxcIlwiXCJcbiAgICAgICAgaW5zZXJ0IGludG8gI3twcmVmaXh9cGtnX3ZlcnNpb25zICggcGtnX3ZlcnNpb24gKVxuICAgICAgICAgIHZhbHVlcyAoICRwa2dfdmVyc2lvbiApXG4gICAgICAgICAgb24gY29uZmxpY3QgZG8gbm90aGluZztcIlwiXCJcbiAgICAgIGFkZF9wa2dfc3ZyYW5nZTogU1FMXCJcIlwiXG4gICAgICAgIGluc2VydCBpbnRvICN7cHJlZml4fXBrZ19zdnJhbmdlcyAoIHBrZ19zdnJhbmdlIClcbiAgICAgICAgICB2YWx1ZXMgKCAkcGtnX3N2cmFuZ2UgKVxuICAgICAgICAgIG9uIGNvbmZsaWN0IGRvIG5vdGhpbmc7XCJcIlwiXG4gICAgICBhZGRfcGtnOiBTUUxcIlwiXCJcbiAgICAgICAgaW5zZXJ0IGludG8gI3twcmVmaXh9cGtncyAoIHBrZ19uYW1lLCBwa2dfdmVyc2lvbiwgcGtnX2Rlc2NyaXB0aW9uLCBwa2dfdXJsLCBwa2dfZnNwYXRoIClcbiAgICAgICAgICB2YWx1ZXMgKCAkcGtnX25hbWUsICRwa2dfdmVyc2lvbiwgJHBrZ19kZXNjcmlwdGlvbiwgJHBrZ191cmwsICRwa2dfZnNwYXRoIClcbiAgICAgICAgICBvbiBjb25mbGljdCBkbyBub3RoaW5nO1wiXCJcIlxuICAgICAgYWRkX3BrZ19kZXA6IFNRTFwiXCJcImluc2VydCBpbnRvICN7cHJlZml4fWRlcHMgKCBwa2dfbmFtZSwgcGtnX3ZlcnNpb24sIGRlcF9uYW1lLCBkZXBfc3ZyYW5nZSApXG4gICAgICAgIHZhbHVlcyAoICRwa2dfbmFtZSwgJHBrZ192ZXJzaW9uLCAkZGVwX25hbWUsICRkZXBfc3ZyYW5nZSApXG4gICAgICAgIG9uIGNvbmZsaWN0IGRvIG5vdGhpbmc7XCJcIlwiXG4gICAgZ3V5LnByb3BzLmRlZiBALCAnc3FsJywgeyBlbnVtZXJhYmxlOiBmYWxzZSwgdmFsdWU6IHNxbCwgfVxuICAgIHJldHVybiBudWxsXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBfY3JlYXRlX3NxbF9mdW5jdGlvbnM6IC0+XG4gICAgQGRiYS5jcmVhdGVfZnVuY3Rpb24gbmFtZTogJ3NlbXZlcl9zYXRpc2ZpZXMnLCBjYWxsOiAoIHZlcnNpb24sIHBhdHRlcm4gKSA9PlxuICAgICAgcmV0dXJuIDEgaWYgc2VtdmVyX3NhdGlzZmllcyB2ZXJzaW9uLCBwYXR0ZXJuXG4gICAgICByZXR1cm4gMFxuXG5cbiAgIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAjIERCXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGJfYWRkX3BrZ19pbmZvOiAoIGNmZyApIC0+XG4gICAgdmFsaWRhdGUuZHBhbl9wa2dfaW5mbyBjZmcgPSB7IHR5cGVzLmRlZmF1bHRzLmRwYW5fcGtnX2luZm8uLi4sIGNmZy4uLiwgfVxuICAgIHBrZ19pbmZvID0gY2ZnXG4gICAgQGRiYS5ydW4gQHNxbC5hZGRfcGtnX25hbWUsICAgICBwa2dfaW5mb1xuICAgIEBkYmEucnVuIEBzcWwuYWRkX3BrZ192ZXJzaW9uLCAgcGtnX2luZm9cbiAgICBAZGJhLnJ1biBAc3FsLmFkZF9wa2csICAgICAgICAgIHBrZ19pbmZvXG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBmb3IgZGVwX25hbWUsIGRlcF9zdnJhbmdlIG9mIHBrZ19pbmZvLnBrZ19kZXBzXG4gICAgICBAZGJhLnJ1biBAc3FsLmFkZF9wa2dfbmFtZSwgICAgIHsgcGtnX25hbWU6IGRlcF9uYW1lLCB9XG4gICAgICBAZGJhLnJ1biBAc3FsLmFkZF9wa2dfc3ZyYW5nZSwgIHsgcGtnX3N2cmFuZ2U6IGRlcF9zdnJhbmdlLCB9XG4gICAgICBAZGJhLnJ1biBAc3FsLmFkZF9wa2dfZGVwLCAgICAgIHsgcGtnX2luZm8uLi4sIGRlcF9uYW1lLCBkZXBfc3ZyYW5nZSwgfVxuICAgICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgcmV0dXJuIG51bGxcblxuXG4gICM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIyBGU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGZzX2ZldGNoX3BrZ19pbmZvOiAoIGNmZyApIC0+XG4gICAgdmFsaWRhdGUuZHBhbl9mc19mZXRjaF9wa2dfaW5mb19jZmcgY2ZnID0geyB0eXBlcy5kZWZhdWx0cy5kcGFuX2ZzX2ZldGNoX3BrZ19pbmZvX2NmZy4uLiwgY2ZnLi4uLCB9XG4gICAgUlBLR1VQICAgICAgICAgICAgPSBhd2FpdCBpbXBvcnQoICdyZWFkLXBrZy11cCcgKVxuICAgIHsgcGtnX2ZzcGF0aCB9ICAgID0gY2ZnXG4gICAgcGtnX2pzb25faW5mbyAgICAgPSBhd2FpdCBSUEtHVVAucmVhZFBhY2thZ2VVcEFzeW5jIHsgY3dkOiBwa2dfZnNwYXRoLCBub3JtYWxpemU6IHRydWUsIH1cbiAgICB1bmxlc3MgcGtnX2pzb25faW5mbz9cbiAgICAgIHJldHVybiBjZmcuZmFsbGJhY2sgdW5sZXNzIGNmZy5mYWxsYmFjayBpcyBtaXNmaXRcbiAgICAgIHRocm93IG5ldyBFLkRiYV9mc19wa2dfanNvbl9ub3RfZm91bmQgJ15mc19mZXRjaF9wa2dfaW5mb0AxXicsIGNmZy5wa2dfZnNwYXRoXG4gICAgcGtnX2pzb24gICAgICAgICAgPSBwa2dfanNvbl9pbmZvLnBhY2thZ2VKc29uXG4gICAgcGtnX25hbWUgICAgICAgICAgPSBwa2dfanNvbi5uYW1lXG4gICAgcGtnX3ZlcnNpb24gICAgICAgPSBwa2dfanNvbi52ZXJzaW9uXG4gICAgcGtnX3VybCAgICAgICAgICAgPSBAX3BrZ191cmxfZnJvbV9wa2dfanNvbiBwa2dfanNvblxuICAgIHBrZ19kZXNjcmlwdGlvbiAgID0gcGtnX2pzb24uZGVzY3JpcHRpb25cbiAgICBwa2dfZGVzY3JpcHRpb24gICA9IG51bGwgaWYgcGtnX2Rlc2NyaXB0aW9uIGlzICcnXG4gICAgcGtnX2tleXdvcmRzICAgICAgPSBwa2dfanNvbi5rZXl3b3JkcyAgICAgPyBbXVxuICAgIHBrZ19kZXBzICAgICAgICAgID0gcGtnX2pzb24uZGVwZW5kZW5jaWVzID8ge31cbiAgICBwa2dfanNvbl9mc3BhdGggICA9IHBrZ19qc29uX2luZm8ucGF0aFxuICAgIHJldHVybiB7XG4gICAgICAjIHBrZ19qc29uXG4gICAgICBwa2dfbmFtZVxuICAgICAgcGtnX3ZlcnNpb25cbiAgICAgIHBrZ191cmxcbiAgICAgIHBrZ19mc3BhdGhcbiAgICAgIHBrZ19kZXNjcmlwdGlvblxuICAgICAgcGtnX2tleXdvcmRzXG4gICAgICBwa2dfZGVwc1xuICAgICAgcGtnX2pzb25fZnNwYXRoIH1cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGZzX3Jlc29sdmVfZGVwX2ZzcGF0aDogKCBjZmcgKSAtPlxuICAgIHZhbGlkYXRlLmRwYW5fZnNfcmVzb2x2ZV9kZXBfZnNwYXRoX2NmZyBjZmcgPSB7IHR5cGVzLmRlZmF1bHRzLmRwYW5fZnNfcmVzb2x2ZV9kZXBfZnNwYXRoX2NmZy4uLiwgY2ZnLi4uLCB9XG4gICAgcGF0aCAgPSBQQVRILmpvaW4gY2ZnLnBrZ19mc3BhdGgsICd3aGF0ZXZlcicgIyMjIHBrZ19mc3BhdGggcG9pbnRzIHRvIHBrZyBmb2xkZXIsIG11c3QgYmUgb25lIGVsZW1lbnQgZGVlcGVyICMjI1xuICAgIHJxICAgID0gKCBAX2NhY2hlLmN1c3RvbV9yZXF1aXJlc1sgcGF0aCBdID89IGNyZWF0ZVJlcXVpcmUgcGF0aCApXG4gICAgcmV0dXJuIHJxLnJlc29sdmUgY2ZnLmRlcF9uYW1lXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBmc193YWxrX2RlcF9pbmZvczogKCBjZmcgKSAtPlxuICAgIHZhbGlkYXRlLmRwYW5fZnNfd2Fsa19kZXBfaW5mb3NfY2ZnIGNmZyA9IHsgdHlwZXMuZGVmYXVsdHMuZHBhbl9mc193YWxrX2RlcF9pbmZvc19jZmcuLi4sIGNmZy4uLiwgfVxuICAgIHsgcGtnX2ZzcGF0aFxuICAgICAgZmFsbGJhY2sgICAgfSAgICAgICAgICAgICA9IGNmZ1xuICAgIHBrZ19pbmZvICAgICAgICAgICAgICAgICAgICA9IGF3YWl0IEBmc19mZXRjaF9wa2dfaW5mbyB7IHBrZ19mc3BhdGgsIH1cbiAgICAjIHsgcGtnX2pzb24gICAgfSAgICAgICAgICAgICA9IGF3YWl0IEBmc19mZXRjaF9wa2dfaW5mbyB7IHBrZ19mc3BhdGgsIH1cbiAgICBmb3IgZGVwX25hbWUsIGRlcF9zdnJhbmdlIG9mIHBrZ19pbmZvLnBrZ19kZXBzID8ge31cbiAgICAgIGRlcF9mc3BhdGggICAgICAgICAgICAgICAgPSBAZnNfcmVzb2x2ZV9kZXBfZnNwYXRoIHsgcGtnX2ZzcGF0aCwgZGVwX25hbWUsIH1cbiAgICAgIGRlcF9qc29uX2luZm8gICAgICAgICAgICAgPSBhd2FpdCBAZnNfZmV0Y2hfcGtnX2luZm8geyBwa2dfZnNwYXRoOiBkZXBfZnNwYXRoLCBmYWxsYmFjaywgfVxuICAgICAgIyMjIFRBSU5UIGBkZXBfc3ZyYW5nZWAgaXMgYSBwcm9wZXJ0eSBvZiB0aGUgZGVwZW5kaW5nIHBhY2thZ2UsIG5vdCB0aGUgZGVwZW5kZW5jeSAjIyNcbiAgICAgIGRlcF9qc29uX2luZm8uZGVwX3N2cmFuZ2UgPSBkZXBfc3ZyYW5nZVxuICAgICAgeWllbGQgZGVwX2pzb25faW5mb1xuICAgIHJldHVybiBudWxsXG5cbiAgIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAjIFJFVFJJRVZJTkcgQ0FOT05JQ0FMIFBBQ0tBR0UgVVJMXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgX3VybF9mcm9tX3BrZ19qc29uX2hvbWVwYWdlOiAoIHBrZ19qc29uICkgLT5cbiAgICBpZiAoIFIgPSBwa2dfanNvbi5ob21lcGFnZSA/IG51bGwgKT9cbiAgICAgIHJldHVybiBSLnJlcGxhY2UgLyNyZWFkbWUkLywgJydcbiAgICByZXR1cm4gbnVsbFxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgX3VybF9mcm9tX3BrZ19qc29uX3JlcG9zaXRvcnk6ICggcGtnX2pzb24gKSAtPlxuICAgIGlmICggUiA9IHBrZ19qc29uLnJlcG9zaXRvcnk/LnVybCAgPyBudWxsICk/XG4gICAgICByZXR1cm4gUi5yZXBsYWNlIC9eKGdpdFxcKyk/KC4rPykoXFwuZ2l0KT8kLywgJyQyJ1xuICAgIHJldHVybiBudWxsXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBfdXJsX2Zyb21fcGtnX2pzb25fYnVnczogKCBwa2dfanNvbiApIC0+XG4gICAgaWYgKCBSID0gcGtnX2pzb24uYnVncz8udXJsICAgICAgICA/IG51bGwgKT9cbiAgICAgIHJldHVybiBSLnJlcGxhY2UgL1xcL2lzc3VlcyQvLCAnJ1xuICAgIHJldHVybiBudWxsXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBfcGtnX3VybF9mcm9tX3BrZ19qc29uOiAoIHBrZ19qc29uICkgLT5cbiAgICByZXR1cm4gUiBpZiAoIFIgPSBAX3VybF9mcm9tX3BrZ19qc29uX2hvbWVwYWdlICAgIHBrZ19qc29uICk/XG4gICAgcmV0dXJuIFIgaWYgKCBSID0gQF91cmxfZnJvbV9wa2dfanNvbl9yZXBvc2l0b3J5ICBwa2dfanNvbiApP1xuICAgIHJldHVybiBSIGlmICggUiA9IEBfdXJsX2Zyb21fcGtnX2pzb25fYnVncyAgICAgICAgcGtnX2pzb24gKT9cbiAgICByZXR1cm4gbnVsbFxuXG5cbiAgIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAjIFJFVFJJRVZFIEdJVCBJTkZPU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGdpdF9mZXRjaF9wa2dfc3RhdHVzOiAoIGNmZyApIC0+XG4gICAgdGhyb3cgbmV3IEUuRGJhX25vdF9pbXBsZW1lbnRlZCAnXmdpdF9mZXRjaF9wa2dfc3RhdHVzQDFeJywgJ2dpdF9mZXRjaF9wa2dfc3RhdHVzKCknXG4gICAgdmFsaWRhdGUuZHBhbl9naXRfZmV0Y2hfcGtnX3N0YXR1c19jZmcgY2ZnID0geyB0eXBlcy5kZWZhdWx0cy5kcGFuX2dpdF9mZXRjaF9wa2dfc3RhdHVzX2NmZy4uLiwgY2ZnLi4uLCB9XG4gICAgeyBwa2dfZnNwYXRoIH0gICAgPSBjZmdcbiAgICBkZWJ1ZyAnXjg4NzheJywgY2ZnXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBnaXRfZ2V0X2RpcnR5X2NvdW50czogKCBjZmcgKSAtPlxuICAgICMjIyBzZWUgaGVuZ2lzdC9kZXYvc25pcHBldHMvc3JjL2RlbW8tbm9kZS1naXQtbW9kdWxlcyAjIyNcbiAgICB2YWxpZGF0ZS5kcGFuX2dpdF9nZXRfZGlydHlfY291bnRzX2NmZyBjZmcgPSB7IHR5cGVzLmRlZmF1bHRzLmRwYW5fZ2l0X2dldF9kaXJ0eV9jb3VudHNfY2ZnLi4uLCBjZmcuLi4sIH1cbiAgICB7IEdpdCB9ID0gcmVxdWlyZSAna2FzZWtpJ1xuICAgIHRyeVxuICAgICAgcmVwbyAgICA9IG5ldyBHaXQgeyB3b3JrX3BhdGg6IGNmZy5wa2dfZnNwYXRoLCByZXBvX3BhdGg6IGNmZy5wa2dfZnNwYXRoLCB9XG4gICAgICBzdGF0dXMgID0gcmVwby5zdGF0dXMoKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICB3YXJuIENORC5yZXZlcnNlIGVycm9yLm1lc3NhZ2VcbiAgICAgIHJldHVybiBjZmcuZmFsbGJhY2sgdW5sZXNzIGNmZy5mYWxsYmFjayBpcyBtaXNmaXRcbiAgICAgIHRocm93IG5ldyBFLkRiYV9naXRfbm90X2FfcmVwbyAnXmdpdF9mZXRjaF9kaXJ0eV9jb3VudEAxXicsIGNmZy5wa2dfZnNwYXRoXG4gICAgYWNjICAgICAgICAgPSBzdGF0dXMuYWhlYWRfY291bnQgICAgIyMjIEFDQywgYWhlYWQtY29tbWl0ICBjb3VudCAjIyNcbiAgICBiY2MgICAgICAgICA9IHN0YXR1cy5iZWhpbmRfY291bnQgICAjIyMgQkNDLCBiZWhpbmQtY29tbWl0IGNvdW50ICMjI1xuICAgIGRmYyAgICAgICAgID0gc3RhdHVzLmRpcnR5X2NvdW50ICAgICMjIyBERkMsIGRpcnR5IGZpbGUgICAgY291bnQgIyMjXG4gICAgcmV0dXJuIHsgYWNjLCBiY2MsIGRmYywgc3VtOiAoIGFjYyArIGJjYyArIGRmYyApLCB9XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBnaXRfZ2V0X2xvZzogKCBjZmcgKSAtPlxuICAgICMjIyBzZWUgaGVuZ2lzdC9kZXYvc25pcHBldHMvc3JjL2RlbW8tbm9kZS1naXQtbW9kdWxlcyAjIyNcbiAgICB7IEdpdCB9ID0gcmVxdWlyZSAna2FzZWtpJ1xuICAgIHRyeVxuICAgICAgcmVwbyAgICA9IG5ldyBHaXQgeyB3b3JrX3BhdGg6IGNmZy5wa2dfZnNwYXRoLCByZXBvX3BhdGg6IGNmZy5wa2dfZnNwYXRoLCB9XG4gICAgICByZXR1cm4gcmVwby5sb2cgY2ZnXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIHdhcm4gJ86pZHBtX19fMicsIENORC5yZXZlcnNlIGVycm9yLm1lc3NhZ2VcbiAgICAgIHJldHVybiBjZmcuZmFsbGJhY2sgaWYgKCBjZmc/LmZhbGxiYWNrIGlzbnQgbWlzZml0IClcbiAgICAgIHRocm93IGVycm9yXG4gICAgICAjIHRocm93IG5ldyBFLkRiYV9naXRfbm90X2FfcmVwbyAnXmdpdF9mZXRjaF9kaXJ0eV9jb3VudEAxXicsIGNmZy5wa2dfZnNwYXRoXG4gICAgcmV0dXJuIG51bGxcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGdpdF9nZXRfc3RhZ2VkX2ZpbGVfcGF0aHM6ICggY2ZnICkgLT5cbiAgICB2YWxpZGF0ZS5kcGFuX2dpdF9nZXRfc3RhZ2VkX2ZpbGVfcGF0aHNfY2ZnIGNmZyA9IHsgdHlwZXMuZGVmYXVsdHMuZHBhbl9naXRfZ2V0X3N0YWdlZF9maWxlX3BhdGhzX2NmZy4uLiwgY2ZnLi4uLCB9XG4gICAgR1UgICAgICAgICAgPSByZXF1aXJlICdnaXQtdXRpbHMnXG4gICAgcmVwbyAgICAgICAgPSBHVS5vcGVuIGNmZy5wa2dfZnNwYXRoXG4gICAgdW5sZXNzIHJlcG8/XG4gICAgICByZXR1cm4gY2ZnLmZhbGxiYWNrIHVubGVzcyBjZmcuZmFsbGJhY2sgaXMgbWlzZml0XG4gICAgICB0aHJvdyBuZXcgRS5EYmFfZ2l0X25vdF9hX3JlcG8gJ15naXRfZmV0Y2hfZGlydHlfY291bnRAMV4nLCBjZmcucGtnX2ZzcGF0aFxuICAgIHJldHVybiAoIHBhdGggZm9yIHBhdGgsIHN0YXR1cyBvZiByZXBvLmdldFN0YXR1cygpIHdoZW4gcmVwby5pc1N0YXR1c1N0YWdlZCggc3RhdHVzICkgKVxuXG5cblxuXG4iXX0=
