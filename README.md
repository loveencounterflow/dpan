

# DPAN, a DePendency ANalyzer


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [What It Is](#what-it-is)
- [Notes](#notes)
- [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## What It Is

**D**e**P**endancy **AN**alyzer, an SQLite-based database of your projects' npm dependency trees

## Notes

* DB file created and re-used by default
* most `inserts` are `upserts` / `on conflict do nothing`, so faster on updates
* unclear how to deal with deletions though


## To Do

* **[–]** implement
* **[–]** document
* **[–]** add property `dba` to `Dpan::constructor()` to pass configuration directly to ICQL/DBA
* **[–]** fetch data from `https://registry.npmjs.cf/$pkg_name`
* **[–]** provide info about vulnerabilities
  * **[–]** from GitHub
  * **[–]** from npm
* **[–]** package manager used (npm/pnpm/yarn...)
* **[–]** circular dependencies
* **[–]** try to handle spurious changes caused by Unicode Normalization on some file systems (e.g. APFS);
  case in point is
  [dbay-rustybuzz](https://github.com/loveencounterflow/dbay-rustybuzz/tree/7987afbdf57fcffcb996cd410fe55cf4f1c2395f)
  which has some filenames with `ä`; originally entered as single codepoint, the `ä` is turned into a
  sequence of base letter plus combining diacritic. This change is *not* reported by `git status`, but
  `git-utils` `repo.getStatus()` returns an object like this:

  ```
  { 'fonts/schäffel.ch/1455_gutenberg_b42.otf': 128,
    'fonts/schäffel.ch/1458_gutenberg_b36.otf': 128,
    'fonts/schäffel.ch/2002_horatius.otf': 128,
    'fonts/schäffel.ch/LICENSE.txt': 128,
    'fonts/schäffel.ch/1455_gutenberg_b42.otf': 512,
    'fonts/schäffel.ch/1458_gutenberg_b36.otf': 512,
    'fonts/schäffel.ch/2002_horatius.otf': 512,
    'fonts/schäffel.ch/LICENSE.txt': 512 }
  ```

  where the files in question both have a `deleted` and a `new` marker. One should suspect this being
  a flaw in either `git` or in [`git-utils`](http://libgit2.github.com/); also check how
  [`nodegit`][https://github.com/nodegit/nodegit] deals with this situation.




