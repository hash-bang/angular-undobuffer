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


		/**
		* Convenience function clear the buffer
		* @return {Promise}
		*/
		this.clear = function(payload) {
			return this.sendMessage({cmd: 'clear'});
		};


		/**
		* Convenience function to push a object onto the undoBuffer stack
		* @param {Object} payload The object to add to the undo buffer
		* @return {Promise}
		*/
		this.push = function(payload) {
			return this.sendMessage({cmd: 'push', payload: payload});
		};


		/**
		* Convenience function to pop a object off the undoBuffer stack and return it
		* @return {Promise}
		*/
		this.pop = function() {
			return $q(function(resolve, reject) {
				this.sendMessage({cmd: 'pop'}).then(function(res) {
					resolve(res.payload);
				}, reject);
			});
		};


		/**
		* Convenience function to ping the UndoBuffer worker
		* @return {Promise}
		*/
		this.ping = function() {
			return this.sendMessage({cmd: 'ping'});
		};


		/**
		* Convenience function to request all buffer history
		* @return {Promise}
		*/
		this.getHistory = function() {
			return $q(function(resolve, reject) {
				this.sendMessage({cmd: 'getHistory'}).then(function(res) {
					resolve(res.payload);
				}, reject);
			});
		};


		/**
		* Convenience function to set the maximum undo buffer size
		* @param {number} maxBufferSize The new buffer size maximum. Set to 0 for infinite (not recommended as it will slowly eat all system memory)
		* @return {Promise}
		*/
		this.setMaxBufferSize = function(maxBufferSize) {
			return this.sendMessage({cmd: 'setMaxBufferSize', payload: maxBufferSize});
		};


		return this;
	};
});
