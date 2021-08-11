
'use strict'



############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'DPAN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
types                     = new ( require 'intertype' ).Intertype
{ isa
  isa_list_of
  isa_optional
  type_of
  validate
  validate_list_of }      = types.export()
# { to_width }              = require 'to-width'
SQL                       = String.raw
{ lets
  freeze }                = require 'letsfreezethat'
{ Dba, }                  = require 'icql-dba'
def                       = Object.defineProperty
glob                      = require 'glob'
PATH                      = require 'path'
FS                        = require 'fs'
got                       = require 'got'
semver_satisfies          = require 'semver/functions/satisfies'
semver_cmp                = require 'semver/functions/cmp'
misfit                    = Symbol 'misfit'
E                         = require './errors'
{ createRequire, }        = require 'module'
def                       = Object.defineProperty


#===========================================================================================================
types.declare 'dpan_constructor_cfg', tests:
  '@isa.object x':        ( x ) -> @isa.object x
  'x.prefix is a prefix': ( x ) ->
    return false unless @isa.text x.prefix
    return true if x.prefix is ''
    return ( /^[_a-z][_a-z0-9]*$/ ).test x.prefix
  '@isa.boolean x.recreate': ( x ) -> @isa.boolean x.recreate

#-----------------------------------------------------------------------------------------------------------
types.declare 'dpan_fs_fetch_pkg_info_cfg', tests:
  '@isa.object x':                    ( x ) -> @isa.object x
  '@isa.nonempty_text x.pkg_fspath':  ( x ) -> @isa.nonempty_text x.pkg_fspath

#-----------------------------------------------------------------------------------------------------------
types.declare 'dpan_fs_resolve_dep_fspath_cfg', tests:
  '@isa.object x':                    ( x ) -> @isa.object x
  '@isa.nonempty_text x.pkg_fspath':  ( x ) -> @isa.nonempty_text x.pkg_fspath
  '@isa.nonempty_text x.dep_name':    ( x ) -> @isa.nonempty_text x.dep_name

#-----------------------------------------------------------------------------------------------------------
types.declare 'dpan_fs_walk_dep_infos_cfg', tests:
  '@isa.object x':                    ( x ) -> @isa.object x
  '@isa.nonempty_text x.pkg_fspath':  ( x ) -> @isa.nonempty_text x.pkg_fspath

#-----------------------------------------------------------------------------------------------------------
types.declare 'dpan_db_add_pkg_info_cfg', tests:
  '@isa.object x':                                  ( x ) -> @isa.object x
  '@isa.dpan_pkg_info x.pkg_info':                  ( x ) -> @isa.dpan_pkg_info x.pkg_info

#-----------------------------------------------------------------------------------------------------------
types.declare 'dpan_pkg_info', tests:
  '@isa.object x':                                  ( x ) -> @isa.object x
  '@isa.nonempty_text x.pkg_version':               ( x ) -> @isa.nonempty_text x.pkg_version
  '@isa_optional.nonempty_text x.pkg_fspath':       ( x ) -> @isa_optional.nonempty_text x.pkg_fspath
  '@isa_optional.nonempty_text x.pkg_url':          ( x ) -> @isa_optional.nonempty_text x.pkg_url
  '@isa_optional.nonempty_text x.pkg_fspath':       ( x ) -> @isa_optional.nonempty_text x.pkg_fspath
  '@isa_optional.nonempty_text x.pkg_description':  ( x ) -> @isa_optional.nonempty_text x.pkg_description
  '@isa_list_of.nonempty_text x.pkg_keywords':      ( x ) -> @isa_list_of.nonempty_text x.pkg_keywords
  '@isa.object x.pkg_deps':                         ( x ) -> @isa.object x.pkg_deps
  '@isa.nonempty_text x.pkg_json_fspath':           ( x ) -> @isa.nonempty_text x.pkg_json_fspath

#-----------------------------------------------------------------------------------------------------------
types.defaults =
  dpan_constructor_cfg:
    dba:              null
    prefix:           'dpan_'
    db_path:          PATH.resolve PATH.join __dirname, '../dpan.sqlite'
    recreate:         false
    registry_url:     'https://registry.npmjs.org/'
  dpan_fs_fetch_pkg_info_cfg:
    pkg_fspath:       null
    fallback:         misfit
  dpan_fs_resolve_dep_fspath_cfg:
    pkg_fspath:       null
    dep_name:         null
  dpan_fs_walk_dep_infos_cfg:
    pkg_fspath:       null
    fallback:         misfit
  dpan_db_add_pkg_info_cfg:
    dpan_pkg_info:    null
  dpan_pkg_info:
    # pkg_json:       null
    pkg_name:         null
    pkg_version:      null
    pkg_url:          null
    pkg_fspath:       null
    pkg_description:  null
    pkg_keywords:     null
    pkg_deps:         null
    pkg_json_fspath:  null


#===========================================================================================================
class @Dpan

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    validate.dpan_constructor_cfg @cfg = { types.defaults.dpan_constructor_cfg..., cfg..., }
    #.......................................................................................................
    dba  = if @cfg.dba? then @cfg.dba else new Dba()
    def @, 'dba', { enumerable: false, value: dba, }
    delete @cfg.dba
    @cfg = freeze @cfg
    #.......................................................................................................
    if @cfg.db_path?
      @dba.open { path: @cfg.db_path, }
    #.......................................................................................................
    ### NOTE avoid to make cache displayable as it contains huge objects that block the process for
    minutes when printed to console ###
    def @, '_cache', { enumerable: false, value: {}, }
    @_cache.custom_requires = {}
    #.......................................................................................................
    @_clear_db() if @cfg.recreate
    @_create_db_structure()
    @_compile_sql()
    @_create_sql_functions()
    return undefined


  #=========================================================================================================
  # DDL
  #---------------------------------------------------------------------------------------------------------
  _create_db_structure: ->
    ### TAINT unify name / pkg_name, version / pkg_version ###
    prefix = @cfg.prefix
    @dba.execute SQL"""
      create table if not exists #{prefix}pkgs (
          pkg_name          text    not null references #{prefix}pkg_names    ( pkg_name    ),
          pkg_version       text    not null references #{prefix}pkg_versions ( pkg_version ),
          pkg_vname         text    generated always as ( pkg_name || '@' || pkg_version ) virtual not null unique,
          pkg_description   text,
          pkg_url           text,
          pkg_fspath        text,
        primary key ( pkg_name, pkg_version ) );
      create unique index if not exists #{prefix}pkgs_vname_idx on #{prefix}pkgs ( pkg_vname );
      create table if not exists #{prefix}deps (
          pkg_name          text    not null references #{prefix}pkg_names    ( pkg_name    ),
          pkg_version       text    not null references #{prefix}pkg_versions ( pkg_version ),
          dep_name          text    not null references #{prefix}pkg_names    ( pkg_name    ),
          dep_svrange       text    not null references #{prefix}pkg_svranges ( pkg_svrange ),
        primary key ( pkg_name, pkg_version, dep_name ) );
      create table if not exists #{prefix}pkg_names (
          pkg_name          text not null primary key );
      create table if not exists #{prefix}pkg_versions (
          pkg_version       text not null primary key );
      create table if not exists #{prefix}pkg_svranges (
          pkg_svrange       text not null primary key );
      """
    return null

  #---------------------------------------------------------------------------------------------------------
  _clear_db: ->
    ### TAINT should be a method of ICQL/DB ###
    prefix = @cfg.prefix
    @dba.execute SQL"""
      drop index if exists #{prefix}pkgs_vname_idx;
      drop table if exists #{prefix}deps;
      drop table if exists #{prefix}pkgs;
      drop table if exists #{prefix}pkg_names;
      drop table if exists #{prefix}pkg_svranges;
      drop table if exists #{prefix}pkg_versions;
      """
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_sql: ->
    prefix = @cfg.prefix
    @sql =
      add_pkg_name: SQL"""
        insert into #{prefix}pkg_names ( pkg_name )
          values ( $pkg_name )
          on conflict do nothing;"""
      add_pkg_version: SQL"""
        insert into #{prefix}pkg_versions ( pkg_version )
          values ( $pkg_version )
          on conflict do nothing;"""
      add_pkg_svrange: SQL"""
        insert into #{prefix}pkg_svranges ( pkg_svrange )
          values ( $pkg_svrange )
          on conflict do nothing;"""
      add_pkg: SQL"""
        insert into #{prefix}pkgs ( pkg_name, pkg_version, pkg_description, pkg_url, pkg_fspath )
          values ( $pkg_name, $pkg_version, $pkg_description, $pkg_url, $pkg_fspath )
          on conflict do nothing;"""
      add_pkg_dep: SQL"""insert into #{prefix}deps ( pkg_name, pkg_version, dep_name, dep_svrange )
        values ( $pkg_name, $pkg_version, $dep_name, $dep_svrange )
        on conflict do nothing;"""
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_sql_functions: ->
    @dba.create_function name: 'semver_satisfies', call: ( version, pattern ) =>
      return 1 if semver_satisfies version, pattern
      return 0


  #=========================================================================================================
  # DB
  #---------------------------------------------------------------------------------------------------------
  db_add_pkg_info: ( cfg ) ->
    validate.dpan_db_add_pkg_info_cfg cfg = { types.defaults.dpan_db_add_pkg_info_cfg..., cfg..., }
    { pkg_info, } = cfg
    @dba.run @sql.add_pkg_name,     pkg_info
    @dba.run @sql.add_pkg_version,  pkg_info
    @dba.run @sql.add_pkg,          pkg_info
    #.......................................................................................................
    for dep_name, dep_svrange of pkg_info.pkg_deps
      @dba.run @sql.add_pkg_name,     { pkg_name: dep_name, }
      @dba.run @sql.add_pkg_svrange,  { pkg_svrange: dep_svrange, }
      @dba.run @sql.add_pkg_dep,      { pkg_info..., dep_name, dep_svrange, }
    #.......................................................................................................
    return null


  #=========================================================================================================
  # FS
  #---------------------------------------------------------------------------------------------------------
  fs_fetch_pkg_info: ( cfg ) ->
    validate.dpan_fs_fetch_pkg_info_cfg cfg = { types.defaults.dpan_fs_fetch_pkg_info_cfg..., cfg..., }
    RPKGUP            = await import( 'read-pkg-up' )
    { pkg_fspath }    = cfg
    pkg_json_info     = await RPKGUP.readPackageUpAsync { cwd: pkg_fspath, normalize: true, }
    unless pkg_json_info?
      return cfg.fallback unless cfg.fallback is misfit
      throw new E.Dba_fs_pkg_json_not_found '^fs_fetch_pkg_info@1^', cfg.pkg_fspath
    pkg_json          = pkg_json_info.packageJson
    pkg_name          = pkg_json.name
    pkg_version       = pkg_json.version
    pkg_url           = @_pkg_url_from_pkg_json pkg_json
    pkg_description   = pkg_json.description
    pkg_keywords      = pkg_json.keywords     ? []
    pkg_deps          = pkg_json.dependencies ? {}
    pkg_json_fspath   = pkg_json_info.path
    return {
      # pkg_json
      pkg_name
      pkg_version
      pkg_url
      pkg_fspath
      pkg_description
      pkg_keywords
      pkg_deps
      pkg_json_fspath }

  #---------------------------------------------------------------------------------------------------------
  fs_resolve_dep_fspath: ( cfg ) ->
    validate.dpan_fs_resolve_dep_fspath_cfg cfg = { types.defaults.dpan_fs_resolve_dep_fspath_cfg..., cfg..., }
    path  = PATH.join cfg.pkg_fspath, 'whatever' ### pkg_fspath points to pkg folder, must be one element deeper ###
    rq    = ( @_cache.custom_requires[ path ] ?= createRequire path )
    return rq.resolve cfg.dep_name

  #---------------------------------------------------------------------------------------------------------
  fs_walk_dep_infos: ( cfg ) ->
    validate.dpan_fs_walk_dep_infos_cfg cfg = { types.defaults.dpan_fs_walk_dep_infos_cfg..., cfg..., }
    { pkg_fspath
      fallback    }             = cfg
    pkg_info                    = await @fs_fetch_pkg_info { pkg_fspath, }
    # { pkg_json    }             = await @fs_fetch_pkg_info { pkg_fspath, }
    for dep_name, dep_svrange of pkg_info.pkg_deps ? {}
      dep_fspath                = @fs_resolve_dep_fspath { pkg_fspath, dep_name, }
      dep_json_info             = await @fs_fetch_pkg_info { pkg_fspath: dep_fspath, fallback, }
      ### TAINT `dep_svrange` is a property of the depending package, not the dependency ###
      dep_json_info.dep_svrange = dep_svrange
      yield dep_json_info
    return null

  #=========================================================================================================
  # RETRIEVING CANONICAL PACKAGE URL
  #---------------------------------------------------------------------------------------------------------
  _url_from_pkg_json_homepage: ( pkg_json ) ->
    if ( R = pkg_json.homepage ? null )?
      return R.replace /#readme$/, ''
    return null

  #---------------------------------------------------------------------------------------------------------
  _url_from_pkg_json_repository: ( pkg_json ) ->
    if ( R = pkg_json.repository?.url  ? null )?
      return R.replace /^(git\+)?(.+?)(\.git)?$/, '$2'
    return null

  #---------------------------------------------------------------------------------------------------------
  _url_from_pkg_json_bugs: ( pkg_json ) ->
    if ( R = pkg_json.bugs?.url        ? null )?
      return R.replace /\/issues$/, ''
    return null

  #---------------------------------------------------------------------------------------------------------
  _pkg_url_from_pkg_json: ( pkg_json ) ->
    return R if ( R = @_url_from_pkg_json_homepage    pkg_json )?
    return R if ( R = @_url_from_pkg_json_repository  pkg_json )?
    return R if ( R = @_url_from_pkg_json_bugs        pkg_json )?
    return null
