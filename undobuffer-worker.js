/**
* Undo buffer web worker
* This module acts like a circular buffer - pushing and poping complex objects from a stack
*
* It is intended to be invoked as a web worker object
*
* @author Matt Carter <m@ttcarter.com>
* @example
* 	// Boot buffer
* 	var undoBufferWorker = new Worker('/js/undoBuffer.js');
*	
* 	// Listen for messages back
* 	undoBuffer.addEventListener('message', function(e) {
* 		switch (e.data.cmd) {
*			case 'message':
* 				console.log('UndoBuffer:', e.data.payload);
* 				break;
* 			case 'pop':
* 				console.log('Restore undo buffer item', e.data.payload);
* 				break;
* 			default:
* 				throw new Error('Unknown response from UndoBuffer: ' + e.data.cmd);
* 		}
* 	}, false);
*	
* 	// Push one item into the buffer
* 	worker.postMessage({'cmd': 'push', 'payload': someObject});
* 	
* 	// Pop last item
*/


/**
* Main undo buffer
* Each buffer item is an object of the form:
* {
* 	compressed: Boolean|String, // Either true, false or 'compressing'
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
				compressed: false,
				contents: e.data.payload,
			});
			if (maxBufferSize && buffer.length > maxBufferSize) buffer.shift(); // Shift off start of buffer if we are limiting the buffer size
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
		var candidates = buffer.reverse().filter(function(buf) { return buf.compressed === false });
		if (compressionWorkerPerCycle > 0) candidates = candidates.slice(0, compressionWorkerPerCycle);

		if (candidates && candidates.length)
			candidates
				.forEach(function(buffer) {
					buffer.compressed = 'compressing';
					console.log('COMPRESS', buffer);
					for (var i = 0; i < 1000000000; i++) {
						// Pass
					}
					buffer.compressed = true;
				});

		compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
	};

	compressionWorkerHandle = setTimeout(compressionWorkerFunc, compressionWorkerInterval);
}
