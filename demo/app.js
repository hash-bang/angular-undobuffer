var app = angular.module('app', [
	'angular-undobuffer'
]);

app.controller('undoBufferExampleController', function($scope, $timeout, UndoBuffer) {
	$scope.project = {};
	$scope.history;

	// Setup undo buffer {{{
	$scope.undoBuffer = UndoBuffer();

	// Setup a watch to record the old state of the project scope variable whenever it changes
	$scope.skipNextProjectWatch = false; // Whether to ignore the next change - set to true by $scope.undo() to avoid putting the undone item /back/ into the undo buffer
	$scope.$watch('project', function(newProject, oldProject) {
		if (!oldProject) return; // Not yet started

		// Skip one update (if we are in the middle of an undo operation)
		if ($scope.skipNextProjectWatch) {
			$scope.skipNextProjectWatch = false;
			return;
		}

		$scope.undoBuffer.push(oldProject);

		// Update the history list
		$scope.updateHistory();
	}, true);

	$scope.resolveHistory = false; // false=get history as patches, true=get history as full objects
	$scope.$watch('resolveHistory', $scope.updateHistory); // Update on toggle

	/**
	* Periodically refresh the history list by asking the service for the buffer contents
	*/
	$scope.updateHistory = function() {
		$timeout.cancel($scope.updateHistoryTimer); // Cancel existing timer if we were invoked manually
		$scope.undoBuffer.getHistory($scope.resolveHistory)
			.then(function(res) {
				$scope.history = res.reverse();
			})
			.finally(function() {
				// Schedule another update
				$scope.updateHistoryTimer = $timeout($scope.updateHistory, 100);
			});
	};
	// Schedule the initial update
	$scope.updateHistoryTimer = $timeout($scope.updateHistory, 100);
	// }}}

	$scope.junkTerms = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];

	/**
	* Populate a given object with sample data
	* @param {Object} root The root object to populate. Root will be mutated
	* @param {number} minBranches The minimum number of branches to populate
	* @param {number} [maxBranches] Optional maximum number of branches. If specified a random range between min and max is used, if omitted the exact number of minBranches is used
	*/
	$scope.randomizeObject = function(root, minBranches, maxBranches) {
		_.times(maxBranches === undefined ? minBranches : _.random(minBranches, maxBranches), function(i) {
			var key = _.sample($scope.junkTerms) + _.random(100, 999);
			var dice = _.random(0, 10);
			if (dice > 9) {
				root[key] = [];
				_.times(_.random(1, 5), function() {
					root[key].push('arrayValue-' + _.sample($scope.junkTerms) + _.random(100, 999));
				});
			} else if (dice > 7) { // Make an object
				root[key] = {};
				$scope.randomizeObject(root[key], 1, 3);
			} else { // Make a scalar
				key = 'value-' + _.sample($scope.junkTerms) + _.random(100, 999);
			}
		});
	};

	$scope.nextSequencial = 0;
	$scope.addSequencial = function() {
		var thisKey = $scope.nextSequencial++;
		$scope.project['key-' + thisKey] = 'val-' + thisKey;
	};


	/**
	* Clear the project and recreate the whole thing
	*/
	$scope.resetProject = function() {
		$scope.nextSequencial = 0;
		$scope.project = {title: 'project-' + _.sample($scope.junkTerms) + _.random(100, 999)};
		$scope.randomizeObject($scope.project, 5, 25);
	};


	/**
	* Trigger the undo
	*/
	$scope.undo = function() {
		$scope.undoBuffer.pop().then(function(payload) {
			$scope.skipNextProjectWatch = true;
			$scope.project = payload;
			// Update the history list
			$scope.updateHistory();
		});
	};


	/**
	* Clear the buffer
	*/
	$scope.clear = function() {
		$scope.undoBuffer.clear().then(function() {
			$scope.updateHistory();
		});
	};


	/**
	* Ping the worker
	*/
	$scope.ping = function() {
		$scope.undoBuffer.pop().then(function() {
			alert('PONG!');
		});
	};

	
	$scope.maxBufferSize = 10;
	$scope.$watch('maxBufferSize', function() {
		$scope.undoBuffer.setMaxBufferSize($scope.maxBufferSize).then(function() {
			$scope.updateHistory();
		});
	});


	// Initalize main object
	$scope.resetProject();
});
