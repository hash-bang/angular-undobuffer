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
* @var {array}
*/
var buffer = [];

/**
* The maxmim size of the circular undo buffer
* Set to 0 for infinite (not recommended as this will slowly eat all system memory)
* @var {number}
*/
var maxBufferSize = 10;

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
			break;
		case 'push':
			buffer.push(e.data.payload);
			if (maxBufferSize && buffer.length > maxBufferSize) buffer.shift(); // Shift off start of buffer if we are limiting the buffer size
			break;
		case 'pop':
			self.postMessage({id: e.data.id, cmd: 'pop', payload: buffer.pop(e.data.payload)});
			break;
		case 'getHistory':
			self.postMessage({id: e.data.id, cmd: 'getHistory', payload: buffer});
			break;
		case 'setMaxBufferSize':
			maxBufferSize = e.data.payload;
			self.postMessage({id: e.data.id, cmd: 'setMaxBufferSize', payload: maxBufferSize});
			break;
		default:
			self.postMessage({id: e.data.id, cmd: 'error', payload: 'Unknown UndoBuffer command: ' + e.data.cmd});
	}
}, false);
