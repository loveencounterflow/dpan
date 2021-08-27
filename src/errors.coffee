'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/ERRORS'
debug                     = CND.get_logger 'debug',     badge
# warn                      = CND.get_logger 'warn',      badge
# info                      = CND.get_logger 'info',      badge
# urge                      = CND.get_logger 'urge',      badge
# help                      = CND.get_logger 'help',      badge
# whisper                   = CND.get_logger 'whisper',   badge
# echo                      = CND.echo.bind CND


#-----------------------------------------------------------------------------------------------------------
class @Dba_error extends Error
  constructor: ( ref, message ) ->
    super()
    @message  = "#{ref} (#{@constructor.name}) #{message}"
    @ref      = ref
    return undefined ### always return `undefined` from constructor ###

#-----------------------------------------------------------------------------------------------------------
class @Dba_fs_pkg_json_not_found   extends @Dba_error
  constructor: ( ref, pkg_fspath )     -> super ref, "unable to locate package.json for path #{pkg_fspath}"
class @Dba_git_not_a_repo          extends @Dba_error
  constructor: ( ref, pkg_fspath )     -> super ref, "not a git repository: #{pkg_fspath}"
