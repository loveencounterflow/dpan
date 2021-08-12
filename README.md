

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

* [ ] implement
* [ ] document


