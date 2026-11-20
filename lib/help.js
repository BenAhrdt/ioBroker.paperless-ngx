'use strict';

/*
 * The answer of the message "help": what the instance answers, written for AI agents (e.g. ioBroker.pi-agent or
 * the MCP server with send_to) and script authors. Keep it in sync with onMessage in main.js.
 */

/** Every command onMessage answers; write = it changes something (the searches replace the result states). */
const COMMANDS = [
    { command: 'help', write: false },
    { command: 'dashboardInfo', write: false },
    { command: 'dashboardSearch', write: true },
    { command: 'dashboardGlobalSearch', write: true },
    { command: 'dashboardRefresh', write: true },
];

const HELP = `ioBroker.paperless-ngx: reads a Paperless-ngx document server (tags, documents, document types, users,
correspondents) into states and searches its documents. An agent can search documents by text and tags and read
the results (title, dates, correspondent, tags, links) from the states of this instance.

Commands (sendTo paperless-ngx.0, every command needs a callback):
- dashboardSearch {query?, tags?, blockedTags?, allTags?}: searches documents: query = full-text search (empty =
  all documents), tags = tag ids the documents must have (allTags true, the default: all of them; false: one of
  them), blockedTags = tag ids they must not have. Answer {ok: true, count} or {ok: false, error, forbidden?}.
  The results replace the previous ones in paperless-ngx.0.search.documents.results.* (see States).
- dashboardGlobalSearch {query}: the global search of Paperless (query required; documents, tags, correspondents,
  document types, users ... that match; Paperless returns only a few per kind). Answer {ok: true, count (= total)}
  or {ok: false, error, forbidden?}; the results replace the previous ones in paperless-ngx.0.search.global.results.*.
- dashboardInfo: {ok, baseUrl (address of Paperless), connection (true = reachable), currentStep ("idle" or what
  runs)}.
- dashboardRefresh: reads tags, documents, document types, users and correspondents again into the states: {ok:
  true}, {ok: false, busy: true} while a reading runs, or {ok: false, error}.
Searches run one after the other; read the result states after the answer.

States (paperless-ngx.0.*; <NNN> = the id of Paperless with at least 3 digits, e.g. 007 for id 7):
- search.documents.results.count, .all (JSON list of the document ids) and .documents.<NNN>.* = the fields of
  Paperless: id, title, content, created, modified, added, correspondent (id), document_type (id), tags (JSON list
  of tag ids), archive_serial_number, original_file_name ..., links.preview / links.download / links.thumbnail
  (addresses in Paperless, a login there is needed).
- search.global.results.total and .documents / .tags / .correspondents / .document_types / .users ... .<NNN>.*.
- tags.detailed.<NNN>.name / color / document_count (the tag names for the ids, if the settings read tags
  "detailed", the default); correspondents.detailed, document_types.detailed, users.detailed and
  documents.detailed the same if set to "detailed"; <kind>.basic.count = the number.
- search.documents.query / queryTags / queryBlockedTags / queryAllTags and search.global.query: the last search
  (writing them also starts a search); control.requestTrigger (true = read again); info.connection.

How to talk to the user:
- Documents are private: give titles, dates, correspondents and their content only to the user who asks, and
  never send or forward them to anybody without the user's explicit request.
- Name tags, correspondents and document types by name (tags.detailed, search.global.results), not by id; give
  dates in local time; offer the preview link.
- A search replaces the results shown in the Paperless tab of admin and in vis; tell the user if it was not
  their own search. Prefer a query or tags over listing all documents.`;

module.exports = { COMMANDS, HELP };
