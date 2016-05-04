/**
* Front-end angular service for UndoBuffer web worker
*/
angular.module('angular-undobuffer', [])
.factory('UndoBuffer', function($q) {
	return function() {
		var messages = {};
		var messageId = 1;

		// Boot the worker and setup messaging {{{
		var worker = new Worker('undobuffer-worker.js');
		worker.addEventListener('message', function(e) {
			switch (e.data.cmd) {
				case 'message':
					console.log('UndoBuffer:', e.data.payload);
					break;
				case 'pop':
					console.log('Restore undo buffer item', e.data.payload);
					break;
				default:
					throw new Error('Unknown response from UndoBuffer: ' + e.data.cmd);
			}

			if (e.data.id && messages[e.data.id]) { // Dispatch callback for this message
				messages[e.data.id](null, e.data);
				delete messages[e.data.id];
			}
		}, false);
		worker.postMessage({'cmd': 'start'});
		// }}}

		/**
		* Dispatch a message to the worker
		* This function will also attach a message ID and return a promise for the completed callback
		* @param {Object} message The message object to dispatch
		* @return {Promise} Promise object for message return
		*/
		this.sendMessage = function(message) {
			return $q(function(resolve, reject) {
				message.id = messageId++;
				messages[message.id] = function(err, res) {
					if (err) return reject(new Error(err.message));
					resolve(res);
				};

				worker.postMessage(message);
			});
		};

		this.push = function(payload) {
			return this.sendMessage({cmd: 'push', payload: payload});
		};

		this.pop = function() {
			return $q(function(resolve, reject) {
				this.sendMessage({cmd: 'pop'}).then(function(res) {
					resolve(res.payload);
				}, reject);
			});
		};

		this.ping = function(payload) {
			return this.sendMessage({cmd: 'ping'});
		};

		return this;
	};
});
