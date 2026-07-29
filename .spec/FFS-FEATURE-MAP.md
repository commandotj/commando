# FreeFileSync 14.10 Capability Inventory

Parent: [RFC-2026-012](./rfc/012-sync-module-compare-report.md)
Snapshot: **FreeFileSync 14.10**, released 2026-06-28; inventory captured 2026-07-29.

This file records FreeFileSync facts and Commando decisions separately. Presence in FFS does not require adoption. UI wording describes user capability, not FFS layout.

## Legend

Decision: `U` Unreviewed · `A` Adopt · `AD` Adapt · `R` Reject · `D` Defer
Status: `M` Missing · `P` Partial · `I` Implemented · `X` Unsupported
Platform/edition: `All` Windows/macOS/Linux standard feature unless noted.

## Source keys

| Key      | Official source                                                      |
| -------- | -------------------------------------------------------------------- |
| HOME     | <https://freefilesync.org/>                                          |
| FAQ      | <https://freefilesync.org/faq.php>                                   |
| ARC      | <https://freefilesync.org/archive.php>                               |
| QUICK    | <https://freefilesync.org/manual.php>                                |
| COMP     | <https://freefilesync.org/manual.php?topic=comparison-settings>      |
| DST      | <https://freefilesync.org/manual.php?topic=daylight-saving-time>     |
| FILTER   | <https://freefilesync.org/manual.php?topic=exclude-files>            |
| EXPERT   | <https://freefilesync.org/manual.php?topic=expert-settings>          |
| EXT      | <https://freefilesync.org/manual.php?topic=external-applications>    |
| MACRO    | <https://freefilesync.org/manual.php?topic=macros>                   |
| PERF     | <https://freefilesync.org/manual.php?topic=performance>              |
| RTS      | <https://freefilesync.org/manual.php?topic=realtimesync>             |
| SERVICE  | <https://freefilesync.org/manual.php?topic=realtimesync-as-service>  |
| SCHEDULE | <https://freefilesync.org/manual.php?topic=schedule-batch-jobs>      |
| SCRIPT   | <https://freefilesync.org/manual.php?topic=scripting>                |
| SYNC     | <https://freefilesync.org/manual.php?topic=synchronization-settings> |
| FTP      | <https://freefilesync.org/manual.php?topic=ftp-setup>                |
| TIPS     | <https://freefilesync.org/manual.php?topic=tips-and-tricks>          |
| DRIVE    | <https://freefilesync.org/manual.php?topic=variable-drive-letters>   |
| VERSION  | <https://freefilesync.org/manual.php?topic=versioning>               |
| VSS      | <https://freefilesync.org/manual.php?topic=volume-shadow-copy>       |
| CLI      | <https://freefilesync.org/manual.php?topic=command-line>             |
| COMM     | Existing Commando code baseline; not an FFS fact                     |

## UI and workflow

| ID    | Capability                                                 | Source        | Platform / Edition   | Decision | Owner   | Status | Evidence               |
| ----- | ---------------------------------------------------------- | ------------- | -------------------- | -------- | ------- | ------ | ---------------------- |
| UI-01 | Select left and right folders by browser or path           | QUICK         | All                  | U        | RFC-015 | P      | `SyncRootBar.tsx`      |
| UI-02 | Start folder comparison                                    | QUICK         | All                  | U        | RFC-015 | P      | `SyncToolbar.tsx`      |
| UI-03 | Open comparison settings                                   | QUICK, ARC    | All; FFS shortcut F6 | U        | RFC-015 | M      | —                      |
| UI-04 | Open synchronization settings                              | QUICK, ARC    | All; FFS shortcut F8 | U        | RFC-015 | M      | —                      |
| UI-05 | Open include/exclude filter settings                       | QUICK, ARC    | All; FFS shortcut F7 | U        | RFC-019 | M      | —                      |
| UI-06 | Start synchronization after preview                        | QUICK         | All                  | U        | RFC-015 | P      | `SyncToolbar.tsx`      |
| UI-07 | Preview per-item synchronization action                    | QUICK         | All                  | U        | RFC-022 | P      | `SyncPlanModal.tsx`    |
| UI-08 | Show directory tree overview                               | QUICK         | All                  | U        | RFC-022 | M      | —                      |
| UI-09 | Filter grid by comparison/change category                  | QUICK         | All                  | U        | RFC-022 | M      | —                      |
| UI-10 | Show item, byte and action statistics                      | QUICK         | All                  | U        | RFC-020 | P      | `SyncSummaryStrip.tsx` |
| UI-11 | Visually distinguish comparison categories                 | QUICK         | All                  | U        | RFC-022 | P      | `SyncLegend.tsx`       |
| UI-12 | Save and load interactive sync configuration               | QUICK, CLI    | All                  | U        | RFC-021 | M      | —                      |
| UI-13 | Save unattended batch configuration                        | CLI, SCHEDULE | All                  | U        | RFC-021 | M      | —                      |
| UI-14 | Process multiple folder pairs in one configuration         | QUICK, CLI    | All                  | U        | RFC-022 | M      | —                      |
| UI-15 | Override action for selected item                          | SYNC, TIPS    | All                  | U        | RFC-022 | M      | —                      |
| UI-16 | Apply action override to subtree                           | TIPS          | All                  | U        | RFC-022 | M      | —                      |
| UI-17 | Reveal selected item in platform file manager              | EXT           | All                  | U        | RFC-023 | M      | —                      |
| UI-18 | Configure external applications/context commands           | EXT           | All                  | U        | RFC-023 | M      | —                      |
| UI-19 | Execute configured commands from context menu              | EXT           | All                  | U        | RFC-023 | M      | —                      |
| UI-20 | Show comparison progress and allow cancellation            | QUICK         | All                  | U        | RFC-020 | M      | —                      |
| UI-21 | Show sync progress, current item and ETA                   | SCHEDULE      | All                  | U        | RFC-020 | M      | —                      |
| UI-22 | Show terminal success/warning/error summary                | CLI, SCRIPT   | All                  | U        | RFC-020 | M      | —                      |
| UI-23 | Configure minimized, auto-close or visible completion flow | SCHEDULE, CLI | All                  | U        | RFC-020 | M      | —                      |
| UI-24 | Keep bounded recent-sync log                               | ARC           | All                  | U        | RFC-024 | M      | —                      |
| UI-25 | Rename multiple selected files with preview                | FAQ           | All                  | U        | RFC-023 | M      | —                      |
| UI-26 | Show drive-space distribution by directory                 | FAQ           | All                  | U        | RFC-022 | M      | —                      |
| UI-27 | Synchronize selected items only                            | TIPS          | All                  | U        | RFC-022 | M      | —                      |
| UI-28 | Start synchronization without manual compare step          | TIPS          | All                  | U        | RFC-015 | M      | —                      |
| UI-29 | Populate both folder inputs by dragging two directories    | TIPS          | All                  | U        | RFC-015 | M      | —                      |
| UI-30 | Select and merge multiple configurations                   | TIPS, CLI     | All                  | U        | RFC-021 | M      | —                      |
| UI-31 | Copy selected items to alternate target folder             | TIPS          | All                  | U        | RFC-023 | M      | —                      |
| UI-32 | Show image thumbnails in file grid                         | TIPS          | All                  | U        | RFC-022 | M      | —                      |
| UI-33 | Persist default view filters                               | TIPS          | All                  | U        | RFC-022 | M      | —                      |
| UI-34 | Clear folder-path history                                  | TIPS          | All                  | U        | RFC-015 | M      | —                      |
| UI-35 | Reorder folder pairs                                       | TIPS          | All                  | U        | RFC-022 | M      | —                      |

## Comparison and filesystem semantics

| ID      | Capability                                                  | Source     | Platform / Edition            | Decision | Owner   | Status | Evidence              |
| ------- | ----------------------------------------------------------- | ---------- | ----------------------------- | -------- | ------- | ------ | --------------------- |
| CMP-01  | Compare by file time and size                               | COMP       | All                           | A        | RFC-016 | P      | `sync/engine`         |
| CMP-02  | Compare complete binary content                             | COMP       | All                           | A        | RFC-016 | I      | `equal.go`            |
| CMP-03  | Compare by file size only                                   | COMP       | All                           | A        | RFC-016 | I      | `equal.go`            |
| CMP-04  | Exclude symbolic links                                      | COMP       | All                           | A        | RFC-016 | I      | `index.go`            |
| CMP-05  | Treat symbolic link as link object                          | COMP       | All; Windows copy needs admin | A        | RFC-016 | I      | `fsutil`              |
| CMP-06  | Follow symbolic link target                                 | COMP       | All                           | A        | RFC-016 | I      | `fsutil`              |
| CMP-07  | Recognize junction, mount and WSL link classes              | COMP       | Windows/NTFS/WSL              | AD       | RFC-016 | M      | split by LINK IDs     |
| CMP-08  | Configurable file-time tolerance; FFS default 2s            | EXPERT     | All                           | A        | RFC-016 | I      | `CompareSettings`     |
| CMP-09  | Handle FAT daylight-saving/time-shift differences           | DST        | All; FAT relevant             | AD       | RFC-016 | M      | —                     |
| CMP-10  | Parallel directory traversal                                | PERF       | All                           | AD       | RFC-016 | P      | sequential WalkDir    |
| CMP-11  | Parallel binary comparison                                  | PERF       | All                           | AD       | RFC-016 | P      | —                     |
| CMP-12  | Support Windows paths longer than 260 characters            | FAQ        | Windows                       | AD       | RFC-016 | M      | —                     |
| CMP-13  | Full Unicode path support                                   | FAQ        | All                           | A        | RFC-016 | P      | Go strings; no matrix |
| CMP-14  | Case-sensitive synchronization where filesystem requires it | FAQ        | Platform/filesystem dependent | AD       | RFC-016 | M      | —                     |
| CMP-15  | Distinguish conflict from ordinary difference               | COMP, SYNC | All                           | A        | RFC-017 | P      | `CategoryConflict`    |
| LINK-01 | Recognize filesystem symlinks                               | COMP       | All                           | AD       | RFC-016 | P      | —                     |
| LINK-02 | Recognize NTFS volume mount points                          | COMP       | Windows/NTFS                  | AD       | RFC-016 | M      | —                     |
| LINK-03 | Recognize NTFS junction points                              | COMP       | Windows/NTFS                  | AD       | RFC-016 | M      | —                     |
| LINK-04 | Recognize WSL symlinks                                      | COMP       | Windows/WSL                   | AD       | RFC-016 | M      | —                     |
| LINK-05 | Recognize Google Drive shortcuts                            | COMP       | Google Drive                  | D        | RFC-014 | M      | —                     |

## Synchronization variants and change detection

| ID     | Capability                                              | Source | Platform / Edition   | Decision | Owner   | Status | Evidence                 |
| ------ | ------------------------------------------------------- | ------ | -------------------- | -------- | ------- | ------ | ------------------------ |
| VAR-01 | Mirror source state to target                           | SYNC   | All                  | A        | RFC-017 | P      | strategy exists          |
| VAR-02 | Update target without propagating source deletion       | SYNC   | All                  | A        | RFC-017 | P      | strategy exists          |
| VAR-03 | Update based on detected changes                        | SYNC   | All                  | AD       | RFC-017 | M      | —                        |
| VAR-04 | Two-way propagation of creates, updates and deletes     | SYNC   | All                  | AD       | RFC-017 | M      | —                        |
| VAR-05 | Custom rules based on comparison categories             | SYNC   | All                  | AD       | RFC-017 | M      | —                        |
| VAR-06 | Custom rules based on detected changes                  | SYNC   | All                  | AD       | RFC-017 | M      | —                        |
| VAR-07 | Preserve filters while changing variant                 | TIPS   | All                  | AD       | RFC-017 | M      | —                        |
| VAR-08 | Swap source and target safely                           | TIPS   | All                  | AD       | RFC-017 | M      | —                        |
| DB-01  | Detect creates, updates and deletes against prior state | SYNC   | All                  | AD       | RFC-018 | M      | sub-capability of SYN-01 |
| DB-02  | Do not claim move detection on first sync               | SYNC   | All                  | AD       | RFC-018 | M      | sub-capability of SYN-02 |
| DB-03  | Fall back to copy+delete without stable file IDs        | SYNC   | FAT/SFTP limitations | AD       | RFC-018 | M      | sub-capability of SYN-02 |

## Execution, deletion, metadata and safety

| ID      | Capability                                                     | Source         | Platform / Edition            | Decision | Owner   | Status | Evidence                 |
| ------- | -------------------------------------------------------------- | -------------- | ----------------------------- | -------- | ------- | ------ | ------------------------ |
| SYN-01  | Persist database file for change detection                     | SYNC           | All                           | AD       | RFC-018 | M      | —                        |
| SYN-02  | Detect moved files using stable file IDs; fallback copy+delete | SYNC           | Filesystem dependent          | AD       | RFC-018 | M      | —                        |
| SYN-03  | Permanent deletion                                             | VERSION        | All                           | A        | RFC-027 | P      | `os.Remove` only         |
| SYN-04  | Move deleted/replaced items to recycle bin                     | VERSION        | Local drives only             | AD       | RFC-027 | M      | —                        |
| SYN-05  | Keep deleted/replaced items using versioning                   | VERSION        | All                           | AD       | RFC-027 | M      | —                        |
| SYN-06  | Timestamp versioning                                           | VERSION        | All                           | AD       | RFC-027 | M      | split by VER IDs         |
| SYN-07  | Replace prior version                                          | VERSION        | All                           | AD       | RFC-027 | M      | —                        |
| SYN-08  | Expand macros in versioning path                               | VERSION, MACRO | All                           | AD       | RFC-027 | M      | —                        |
| SYN-09  | Stop/cancel on first error                                     | CLI            | All                           | AD       | RFC-028 | M      | —                        |
| SYN-10  | Ignore item errors and continue with summary                   | CLI            | All                           | AD       | RFC-028 | M      | —                        |
| SYN-11  | Verify copied files by complete binary comparison              | EXPERT         | All                           | AD       | RFC-028 | M      | sampling rejected        |
| SYN-12  | Copy locked files with Volume Shadow Copy                      | VSS            | Windows; admin                | AD       | RFC-028 | M      | —                        |
| SYN-13  | Create missing destination directories                         | SYNC           | All                           | A        | RFC-028 | P      | planner/executor         |
| SYN-14  | Preserve modification time, permissions and extended metadata  | FAQ            | Platform/filesystem dependent | A        | RFC-028 | P      | split by META IDs        |
| SYN-15  | Fail-safe copy prevents target corruption                      | FAQ            | All                           | AD       | RFC-028 | M      | —                        |
| SYN-16  | Configure parallel file operations per device                  | PERF           | Donation/Business in FFS      | AD       | RFC-028 | M      | —                        |
| SYN-17  | Optimize execution order to reduce peak disk use               | FAQ            | All                           | AD       | RFC-028 | M      | —                        |
| SYN-18  | Serialize access with per-folder lock files                    | EXPERT         | All                           | AD       | RFC-028 | M      | —                        |
| SYN-19  | Lower filesystem priority during sync                          | EXPERT         | All                           | AD       | RFC-028 | M      | —                        |
| SYN-20  | Email synchronization report                                   | FAQ            | Donation/Business             | D        | RFC-024 | M      | —                        |
| VER-01  | Timestamp each versioned file                                  | VERSION        | All                           | AD       | RFC-027 | M      | sub-capability of SYN-06 |
| VER-02  | Place versions in timestamped folder                           | VERSION        | All                           | AD       | RFC-027 | M      | sub-capability of SYN-06 |
| META-01 | Preserve NTFS compressed/encrypted/sparse attributes           | FAQ            | Windows/NTFS                  | AD       | RFC-028 | M      | —                        |
| META-02 | Preserve NTFS DACL/SACL/Owner/Group                            | FAQ            | Windows/NTFS; privileges      | AD       | RFC-028 | M      | —                        |
| META-03 | Preserve NTFS Alternate Data Streams                           | FAQ            | Windows/NTFS                  | AD       | RFC-028 | M      | —                        |
| META-04 | Preserve HFS+ extended attributes                              | FAQ            | macOS/HFS+                    | AD       | RFC-028 | M      | —                        |
| META-05 | Preserve HFS+ ACLs                                             | FAQ            | macOS/HFS+                    | AD       | RFC-028 | M      | —                        |
| EXEC-01 | Produce detailed per-item error reporting                      | FAQ            | All                           | A        | RFC-028 | P      | basic errors only        |

## Filters

FFS syntax below is inventory fact, not Commando syntax requirement. Commando currently uses doublestar glob; that is an `Adapt` candidate for RFC-019.

| ID        | Capability                                                 | Source | Platform / Edition   | Decision | Owner   | Status | Evidence                  |
| --------- | ---------------------------------------------------------- | ------ | -------------------- | -------- | ------- | ------ | ------------------------- |
| FLT-01    | Include rules; item must match at least one                | FILTER | All                  | A        | RFC-019 | I      | `filter.Matcher`          |
| FLT-02    | Exclude rules override include                             | FILTER | All                  | A        | RFC-019 | I      | `filter.Matcher`          |
| FLT-03    | Wildcard matching capability                               | FILTER | All                  | A        | RFC-019 | I      | Commando uses doublestar  |
| FLT-04    | Default exclusions for system-generated items              | FAQ    | Platform dependent   | A        | RFC-019 | I      | `DefaultRules`            |
| FLT-05    | Exclude complete directory subtree                         | FILTER | All                  | A        | RFC-019 | I      | doublestar                |
| FLT-06    | Quick-exclude selected grid item                           | TIPS   | All                  | AD       | RFC-019 | M      | UI scope → move to UI RFC |
| FLT-07    | Normalize/display path separators across platforms         | FILTER | All                  | AD       | RFC-019 | P      | internal `/`              |
| FLT-08    | Exclude rules take precedence over include                 | FILTER | All                  | A        | RFC-019 | I      | `filter.Matcher`          |
| FLT-09    | Filter by modification-time range                          | TIPS   | All                  | D        | RFC-019 | M      | —                         |
| FLT-10    | Filter by minimum/maximum file size                        | TIPS   | All                  | D        | RFC-019 | M      | —                         |
| FLT-11    | Combine global settings with per-folder-pair local filters | TIPS   | All                  | D        | RFC-019 | M      | —                         |
| FFSFLT-01 | FFS wildcard `*`                                           | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |
| FFSFLT-02 | FFS wildcard `?`                                           | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |
| FFSFLT-03 | FFS wildcard `?*`                                          | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |
| FFSFLT-04 | FFS wildcard matching is case-insensitive                  | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |
| FFSFLT-05 | FFS file-only rule uses `:` convention                     | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |
| FFSFLT-06 | FFS folder-only rule uses trailing separator               | FILTER | All; FFS syntax fact | R        | RFC-019 | M      | doublestar replaces       |

## CLI, configuration, macros and automation

| ID     | Capability                                                          | Source        | Platform / Edition       | Decision | Owner   | Status | Evidence                  |
| ------ | ------------------------------------------------------------------- | ------------- | ------------------------ | -------- | ------- | ------ | ------------------------- |
| CLI-01 | Compare from Commando CLI                                           | COMM          | Commando baseline        | A        | RFC-021 | P      | command exists            |
| CLI-02 | Run sync from Commando CLI                                          | COMM          | Commando baseline        | A        | RFC-021 | P      | command exists            |
| CLI-03 | Export report from Commando CLI                                     | COMM          | Commando baseline        | A        | RFC-021 | P      | command exists            |
| CLI-04 | Override left/right directory from command line                     | CLI           | All; FFS uses `-DirPair` | AD       | RFC-021 | M      | Commando syntax undecided |
| CLI-05 | Exit codes success/warning/error/cancelled = 0/1/2/3                | CLI           | All                      | AD       | RFC-021 | M      | —                         |
| CLI-06 | Merge multiple configuration files                                  | CLI           | All                      | AD       | RFC-021 | M      | —                         |
| CLI-07 | Run saved schedule without GUI interaction                          | CLI, SCHEDULE | All                      | AD       | RFC-021 | M      | —                         |
| CLI-08 | Run FFS batch configuration from command line                       | CLI           | All; FFS fact            | R        | RFC-021 | M      | Commando own format       |
| CLI-09 | Start GUI configuration and compare immediately                     | CLI           | All                      | AD       | RFC-021 | M      | —                         |
| CLI-10 | Select alternate global settings file                               | CLI           | All                      | AD       | RFC-021 | M      | —                         |
| CLI-11 | Emit terminal sync result as JSON                                   | CLI, SCRIPT   | All                      | A        | RFC-021 | P      | Commando NDJSON differs   |
| CLI-12 | Terminal result includes status, timing, counts, bytes and log path | SCRIPT        | All                      | AD       | RFC-021 | M      | —                         |
| CFG-01 | Save global settings separately from sync profiles                  | CLI, EXPERT   | All                      | AD       | RFC-021 | M      | —                         |
| CFG-02 | Expand macros in paths and settings                                 | MACRO         | All                      | AD       | RFC-021 | M      | split by MAC IDs          |
| CFG-03 | Resolve variable drive letters by volume label                      | DRIVE         | Windows/removable media  | AD       | RFC-021 | M      | —                         |
| CFG-04 | Separate global defaults from folder-pair overrides                 | TIPS          | All                      | AD       | RFC-021 | M      | —                         |
| CFG-05 | Load profile/schedule without GUI                                   | CLI, SCHEDULE | All                      | AD       | RFC-021 | M      | —                         |
| MAC-01 | Expand built-in date/time macros                                    | MACRO         | All                      | D        | RFC-021 | M      | sub-capability of CFG-02  |
| MAC-02 | Expand operating-system environment variables                       | MACRO         | All                      | D        | RFC-021 | M      | sub-capability of CFG-02  |
| MAC-03 | Expand Windows CSIDL special-folder macros                          | MACRO         | Windows                  | D        | RFC-021 | M      | sub-capability of CFG-02  |

## RealTimeSync

| ID     | Capability                                         | Source  | Platform / Edition | Decision | Owner   | Status | Evidence |
| ------ | -------------------------------------------------- | ------- | ------------------ | -------- | ------- | ------ | -------- |
| RTS-01 | Watch directories for changes                      | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-02 | Trigger when monitored directory becomes available | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-03 | Wait for configurable idle period                  | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-04 | Execute configured command after trigger           | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-05 | Save/load dedicated realtime configuration         | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-06 | Expand `%change_path%` and `%change_action%`       | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-07 | Run watcher as background service                  | SERVICE | Platform dependent | D        | RFC-025 | M      | —        |
| RTS-08 | Import/convert batch sync configuration            | RTS     | All                | D        | RFC-025 | M      | —        |
| RTS-09 | Pause monitoring while command executes            | RTS     | All                | D        | RFC-025 | M      | —        |

## Remote storage

| ID     | Capability                                     | Source   | Platform / Edition         | Decision | Owner   | Status | Evidence    |
| ------ | ---------------------------------------------- | -------- | -------------------------- | -------- | ------- | ------ | ----------- |
| REM-01 | Synchronize local paths and SMB/network shares | FAQ      | All                        | A        | RFC-030 | P      | local paths |
| REM-02 | Synchronize over SFTP                          | FAQ, FTP | All                        | D        | RFC-026 | M      | —           |
| REM-03 | Synchronize over FTP and FTPS                  | FAQ, FTP | All                        | D        | RFC-026 | M      | —           |
| REM-04 | Synchronize Google Drive                       | FAQ      | Provider availability      | D        | RFC-014 | M      | —           |
| REM-05 | Synchronize MTP devices                        | FAQ      | Platform/device dependent  | D        | RFC-014 | M      | —           |
| REM-06 | Cache remote directory listings                | PERF     | Remote providers           | D        | RFC-026 | M      | —           |
| REM-07 | Parallelize high-latency remote access         | PERF     | Edition/provider dependent | D        | RFC-026 | M      | —           |

## External tools

| ID     | Capability                                        | Source | Platform / Edition | Decision | Owner   | Status | Evidence |
| ------ | ------------------------------------------------- | ------ | ------------------ | -------- | ------- | ------ | -------- |
| EXT-01 | `%item_path%` macro                               | EXT    | All                | U        | RFC-023 | M      | —        |
| EXT-02 | `%local_path%` creates local copy for remote item | EXT    | SFTP/MTP           | U        | RFC-023 | M      | —        |
| EXT-03 | `%item_name%` macro                               | EXT    | All                | U        | RFC-023 | M      | —        |
| EXT-04 | `%parent_path%` macro                             | EXT    | All                | U        | RFC-023 | M      | —        |
| EXT-05 | Opposite-side macro suffix `2`                    | EXT    | All                | U        | RFC-023 | M      | —        |
| EXT-06 | Multi-selection macro suffix `s`                  | EXT    | All                | U        | RFC-023 | M      | —        |
| EXT-07 | Numeric shortcuts 0–9 for configured tools        | EXT    | All                | U        | RFC-023 | M      | —        |

## Reports and notifications

| ID     | Capability                                     | Source      | Platform / Edition | Decision | Owner   | Status | Evidence        |
| ------ | ---------------------------------------------- | ----------- | ------------------ | -------- | ------- | ------ | --------------- |
| RPT-01 | Structured comparison report                   | SCRIPT      | All                | A        | RFC-024 | P      | `CompareReport` |
| RPT-02 | CSV export                                     | COMM        | Commando baseline  | A        | RFC-024 | I      | exporter        |
| RPT-03 | Text export                                    | COMM        | Commando baseline  | A        | RFC-024 | I      | exporter        |
| RPT-04 | Detailed HTML/text synchronization session log | FAQ, SCRIPT | All                | AD       | RFC-024 | M      | —               |

## Platform, scale, localization and distribution

These remain inventory even when Commando decides they are product-level rather than sync-engine work.

| ID      | Capability                                           | Source | Platform / Edition   | Decision | Owner   | Status | Evidence                    |
| ------- | ---------------------------------------------------- | ------ | -------------------- | -------- | ------- | ------ | --------------------------- |
| PLT-01  | Native Windows support                               | FAQ    | Windows              | D        | RFC-029 | P      | Go/Wails build unverified   |
| PLT-02  | Native macOS support                                 | FAQ    | macOS                | D        | RFC-029 | P      | current dev platform        |
| PLT-03  | Native Linux support                                 | FAQ    | Linux                | D        | RFC-029 | P      | Go/Wails build unverified   |
| PLT-04  | Native 64-bit application                            | FAQ    | All                  | D        | RFC-029 | P      | build matrix needed         |
| NFR-01  | No artificial item-count limit                       | FAQ    | All                  | D        | RFC-029 | M      | performance contract absent |
| NFR-02  | Approximate scale target: 1 GB RAM per 1M file pairs | FAQ    | All; FFS observation | D        | RFC-029 | M      | benchmark absent            |
| NFR-03  | Optimized runtime for large trees                    | FAQ    | All                  | D        | RFC-029 | P      | benchmark absent            |
| I18N-01 | Localized UI                                         | FAQ    | 30+ FFS languages    | D        | RFC-029 | P      | en-US, zh-CN only           |
| DIST-01 | Local installation                                   | FAQ    | All                  | D        | RFC-029 | P      | packaging exists            |
| DIST-02 | Portable ZIP                                         | FAQ    | Windows; Donation    | D        | RFC-029 | M      | —                           |
| DIST-03 | Automatic updater                                    | FAQ    | Donation/Business    | D        | RFC-029 | M      | —                           |
| DIST-04 | Parallel file copy edition entitlement               | FAQ    | Donation/Business    | D        | RFC-029 | M      | product decision            |
| DIST-05 | Email notification edition entitlement               | FAQ    | Donation/Business    | D        | RFC-029 | M      | product decision            |
| DIST-06 | Silent installer                                     | FAQ    | Business             | D        | RFC-029 | M      | —                           |
| DIST-07 | Ad-free application/installer promise                | FAQ    | All                  | D        | RFC-029 | M      | product policy              |

## Source coverage matrix

Inventory cannot be declared complete until each official manual topic maps to at least one ID or explicit N/A reason.

| Manual topic             | Covered IDs / disposition                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick Start              | UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13, UI-14                                                                                                    |
| Command Line             | CLI-04, CLI-05, CLI-06, CLI-07, CLI-08, CLI-09, CLI-10, CLI-11, CLI-12, CFG-01, CFG-05                                                                                                              |
| Comparison Settings      | CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07, CMP-08, CMP-15, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05                                                                                 |
| Daylight Saving Time     | CMP-09                                                                                                                                                                                              |
| Exclude Files            | FLT-01, FLT-02, FLT-03, FLT-04, FLT-05, FLT-06, FLT-07, FLT-08, FLT-09, FLT-10, FLT-11, FFSFLT-01, FFSFLT-02, FFSFLT-03, FFSFLT-04, FFSFLT-05, FFSFLT-06                                            |
| Expert Settings          | CMP-08, SYN-11, SYN-18, SYN-19                                                                                                                                                                      |
| External Applications    | EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, EXT-07, UI-17, UI-18, UI-19                                                                                                                         |
| Macros                   | CFG-02, MAC-01, MAC-02, MAC-03, SYN-08                                                                                                                                                              |
| Performance              | CMP-10, CMP-11, SYN-16, REM-06, REM-07                                                                                                                                                              |
| RealTimeSync             | RTS-01, RTS-02, RTS-03, RTS-04, RTS-05, RTS-06, RTS-07, RTS-08, RTS-09                                                                                                                              |
| RTS: Run as Service      | RTS-07                                                                                                                                                                                              |
| Schedule Batch Jobs      | UI-13, UI-21, UI-22, UI-23, CLI-07, CFG-05                                                                                                                                                          |
| Scripting                | CLI-11, CLI-12, RPT-04                                                                                                                                                                              |
| Synchronization Settings | VAR-01, VAR-02, VAR-03, VAR-04, VAR-05, VAR-06, VAR-07, VAR-08, SYN-01, SYN-02, DB-01, DB-02, DB-03                                                                                                 |
| (S)FTP Setup             | REM-02, REM-03                                                                                                                                                                                      |
| Tips and Tricks          | UI-15, UI-16, UI-27, UI-28, UI-29, UI-30, UI-31, UI-32, UI-33, UI-34, UI-35, FLT-06, FLT-09, FLT-10, FLT-11, CFG-04                                                                                 |
| Variable Drive Letters   | CFG-03                                                                                                                                                                                              |
| Versioning               | SYN-03, SYN-04, SYN-05, SYN-06, SYN-07, SYN-08, VER-01, VER-02                                                                                                                                      |
| Volume Shadow Copy       | SYN-12                                                                                                                                                                                              |
| FAQ feature list         | CMP-12, CMP-13, CMP-14, META-01, META-02, META-03, META-04, META-05, PLT-01, PLT-02, PLT-03, PLT-04, NFR-01, NFR-02, NFR-03, I18N-01, DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06, DIST-07 |

## Inventory status

- Inventory rows: generated by table count during validation; do not hand-maintain totals.
- `Decision = U` is expected until each Owner RFC performs Commando-specific review.
- Every row must name an existing `RFC-NNN` Owner; `TBD` and informal owners are invalid.
- No row may become `I` without evidence.
