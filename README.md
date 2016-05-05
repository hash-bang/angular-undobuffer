angular-undobuffer
==================

**THIS PROJECT IS STILL BEING DEVELOPED. PLEASE DO NOT USE IT YET**

Web worker powered Undo Buffer for exceptionally large and complex objects.

This module provides a circular buffer for storing complex objects in memory to provide undo functionality. Rather than just storing the objects in memory it uses a passive compression worker to reduce the memory footprint when the browsers web worker thread is idle.


Installation
============
1. Add `angular-undobuffer` as a module in your main `angular.module()` call.
2. Include the service somewhere in your project by either loading the `angular-undobuffer.js` file or rolling into your minifier / webpack / concat process of choice.
3. Provide access to the `undobuffer-worker.js` via `/js/undobuffer-worker.js` so it can load as a Web Worker.


Example within a project
------------------------
The below example sets up a `project` object which is monitored via an Angular `$watch` which pushes onto the UndoBuffer stack on each change. Any call to `$scope.undo()` will rewind the project to its last state.

```javascript
app.controller('undoBufferExampleController', function($scope, UndoBuffer) {
	$scope.project = {};

	$scope.undoBuffer = UndoBuffer();

	// Setup a watch on project to store each change into the Undo buffer
	$scope.$watch('project', function(newProject, oldProject) {
		if (!oldProject) return; // Not yet any content

		// Push a project state
		$scope.undoBuffer.push(oldProject);
	}, true);


	$scope.undo = function() {
		// Pop a state (i.e. undo)
		$scope.undoBuffer.pop().then(function(res) {
			// res should now equal the last project state
			$scope.project = res;
		});
	};
});
```

For a more complex example see the fully-featured Undo UI in the [demo](demo/) directory.



UndoBuffer API
==============
The Angular UndoBuffer factory contains the following API functionality. Each of the below will return a `$q` compatible promise.


UndoBuffer.clear()
------------------
Erase all contents of the UndoBuffer contents.


UndoBuffer.push(object)
-----------------------
Add a new state to the UndoBuffer contents.


UndoBuffer.pop([id])
-----------------------
'Rewind' to either that last known state, or if String is specified to that history items ID.


UndoBuffer.getHistory()
-----------------------
Return the raw array content of the internal UndoBuffer instance.


UndoBuffer.setMaxBufferSize(size)
-----------------------
Set the maximum buffer size (i.e. undo steps) that are retained in memory. If size is zero no undo-contents will be removed automatically - this is not recommended as it will slowly consume all system memory.


UndoBuffer.sendMessage(message)
------------------------------
Send a raw message to the Web Worker. This is mainly for internal use only but is exposed here in case you need to communicate directly.
