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


// Utility functions {{{
function getFullObjectAt(id) {
	var histOffset = buffer.findIndex(function(h) { return h.id == id });
	if (histOffset < 0) throw new Error('Cannot get full history for non-existant history ID: ' + id);

	var lastFullObjOffset = buffer.slice(histOffset).findIndex(function(h) {
		return (h.compressed == 'fullObject' || h.compressed === false);
	});
	if (lastFullObjOffset < 0) {
		console.log('BUFFER DUMP', buffer.map(function(b) { return {id: b.id, compressed: b.compressed } }));
		throw new Error('Cannot reconstruct history ID: ' + id + ' as no fullObjects before it in the stack exist!');
	}

	console.log('FULL OBJ', id, '@', histOffset, 'Needs everything', lastFullObjOffset, '->', histOffset);
	var output = buffer
		.slice(lastFullObjOffset, histOffset - lastFullObjOffset)
		.map(function(buffer) { return buffer.contents })
		.reduce(function(full, patch) {
			console.log('REDUCE FULL ->', full);
			console.log('REDUCE PATC ->', patch);
			return full;
		}, buffer[lastFullObjOffset].contents);
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
			var contents = buffer.pop(e.data.payload);
			if (contents) contents = contents.contents;
			self.postMessage({id: e.data.id, cmd: 'pop', payload: contents});
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

				console.log('COMPRESS', candidateBuffer, 'AGAINST FULL', fullObject);
				console.log('PATCH BECOMES', DeepDiff.diff(fullObject, candidateBuffer));

				candidateBuffer.compressed = true;
			});
		}

		compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
	};

	compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
}
