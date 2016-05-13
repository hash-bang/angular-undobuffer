/**
* Undo buffer web worker
* This module acts like a circular buffer - pushing and poping complex objects from a stack
*
* It is intended to be invoked as a web worker object
*
* @author Matt Carter <m@ttcarter.com>
*/


/**
* Main undo buffer
* Each buffer item is an object of the form:
* {
* 	compressed: Boolean|String, // Either true, false, 'compressing' or 'fullObject'
* 	contents: Object, // The actual object itself
* }
* @var {array}
*/
var buffer = [];


/**
* The maxmim size of the circular undo buffer
* Set to 0 for infinite (not recommended as this will slowly eat all system memory)
* @var {number}
*/
var maxBufferSize = 10;


/**
* How often the compression worker should perform its cleanup
* Set to 0 to disable
* @var {number}
*/
var compressionWorkerInterval = 1000;


/**
* How many items the compression worker should work on per cycle
* Set to 0 to compress all
* @var {number}
*/
var compressionWorkerPerCycle = 1;


/**
* Tracker for the next ID
* @var {number}
*/
var nextId = 0;

/**
* ID prefix
* @var {string}
*/
var idPrefix = 'hist-';


// Imports
self.importScripts('/js/deep-diff.js');


// Utility functions {{{
function getFullObjectAt(id) {
	// find histOffset {{{
	var histOffset = buffer.findIndex(function(h) { return h.id == id });
	if (histOffset < 0) throw new Error('Cannot get full history for non-existant history ID: ' + id);
	// }}}

	// find lastFullObjOffset {{{
	console.log('WANT', id, 'histOffset', histOffset);

	// Walk backwards until we hit a full or non-compressed object
	var lastFullObjOffset = -1;
	for (var x = histOffset; x > -1; x--) {
		if (buffer[x].compressed == 'fullObject' || buffer[x].compressed === false) {
			lastFullObjOffset = x;
			break;
		}
	}
	if (lastFullObjOffset < 0) {
		console.log('BUFFER DUMP', buffer.map(function(b) { return b.id + ' (compressed:' + b.compressed + ')'}));
		throw new Error('Cannot reconstruct history ID: ' + id + ' as no fullObjects before it in the stack exist!');
	}
	// }}}

	// Walk between lastFullObjOffset -> histOffset and patch as we go {{{
	console.log('WALK', lastFullObjOffset, histOffset);
	var output = buffer[lastFullObjOffset].contents;
	console.log('BUFF', lastFullObjOffset, 'IS', buffer[lastFullObjOffset]);
	for (var x = lastFullObjOffset + 1; x < histOffset + 1; x++) {
		console.log('PATCH', x, buffer[x].id, buffer[x].contents, 'AGAINST FULL', output);
		for (var i = buffer[x].contents.length - 1; i >= 0; i--) {
			DeepDiff.applyChange(output, true, buffer[x].contents[i]);
		}
	}
	// }}}
	console.log('DONE WITH', output);
	console.log('---');
	return output;
}
// }}}


self.addEventListener('message', function(e) {
	switch (e.data.cmd) {
		case 'start':
			self.postMessage({id: e.data.id, cmd: 'message', payload: 'UndoBuffer started'});
			break;
		case 'end':
			self.close();
			self.postMessage({id: e.data.id, cmd: 'message', payload: 'UndoBuffer closed'});
			break;
		case 'ping':
			self.postMessage({id: e.data.id, cmd: 'message', payload: 'PONG!'});
			break;
		case 'clear':
			buffer = [];
			self.postMessage({id: e.data.id, cmd: 'clear'});
			break;
		case 'push':
			buffer.push({
				id: idPrefix + nextId++,
				compressed: buffer.length == 0 ? 'fullObject' : false,
				contents: e.data.payload,
			});
			if (maxBufferSize && buffer.length > maxBufferSize) { // Shift off start of buffer if we are limiting the buffer size
				if (buffer.length > 1) {
					buffer[1].contents = getFullObjectAt(buffer[1].id);
					buffer[1].compressed = 'fullObject';
				}
				buffer.shift();
				// FIXME: Move last fullObject if needed
			}
			break;
		case 'pop':
			var contents = getFullObjectAt(buffer[buffer.length-1].id);
			buffer.pop(e.data.payload);
			self.postMessage({id: e.data.id, cmd: 'pop', payload: contents});
			break;
		case 'popPatch':
			var contents = buffer.pop(e.data.payload);
			self.postMessage({id: e.data.id, cmd: 'popPatch', payload: contents.contents});
			break;
		case 'getHistory':
			self.postMessage({id: e.data.id, cmd: 'getHistory', payload: buffer});
			break;
		case 'setMaxBufferSize':
			maxBufferSize = e.data.payload;
			if (buffer.length > maxBufferSize) buffer = buffer.slice(buffer.length - maxBufferSize);
			self.postMessage({id: e.data.id, cmd: 'setMaxBufferSize', payload: maxBufferSize});
			break;
		default:
			self.postMessage({id: e.data.id, cmd: 'error', payload: 'Unknown UndoBuffer command: ' + e.data.cmd});
	}
}, false);


var compressionWorkerHandle;
if (compressionWorkerInterval) {
	var compressionWorkerFunc = function() {
		// Work out the candidate buffers to compress {{{
		var candidates = buffer.filter(function(buf) { return buf.compressed === false });
		candidates.reverse();
		if (compressionWorkerPerCycle > 0) candidates = candidates.slice(0, compressionWorkerPerCycle);
		// }}}

		if (candidates && candidates.length) {
			candidates.forEach(function(candidateBuffer) {
				candidateBuffer.compressed = 'compressing';
				var bufferIndex = buffer.findIndex(function(b) { return b.id == candidateBuffer.id });
				if (bufferIndex < 0) throw new Error('Trying to compress non-existant buffer ID: ' + candidateBuffer.id);
				var fullObject = getFullObjectAt(buffer[bufferIndex-1].id);

				var patch = DeepDiff.diff(fullObject, candidateBuffer.contents);

				if (patch === undefined) { // Empty buffer - slice from buffer stack
					buffer = buffer.filter(function(b) { return b.id != candidateBuffer.id });
				} else {
					candidateBuffer.contents = DeepDiff.diff(fullObject, candidateBuffer.contents);
					candidateBuffer.compressed = true;
				}
			});
		}

		compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
	};

	compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
}
