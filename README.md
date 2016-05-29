angular-undobuffer
==================

**THIS PROJECT IS STILL BEING DEVELOPED. PLEASE DO NOT USE IT YET**

Web worker powered Undo Buffer for exceptionally large and complex objects.

This module provides a circular buffer for storing complex objects in memory to provide undo functionality. Rather than just storing the objects in memory it uses a passive compression worker to reduce the memory footprint when the browsers web worker thread is idle.


See the fully-featured Undo UI in the [demo](demo/) directory for examples of this module in use.


Installation
============
1. Add `angular-undobuffer` as a module in your main `angular.module()` call.
2. Include the service somewhere in your project by either loading the `angular-undobuffer.js` file or rolling into your minifier / webpack / concat process of choice.
3. Provide access to the `undobuffer-worker.js` via `/js/undobuffer-worker.js` so it can load as a Web Worker.
4. The worker requires [deep-diff](https://www.npmjs.com/package/deep-diff) exposes as `/js/deep-diff.js` so it must, likewise, be provided to the front-end browser.


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
This function will return (in as the result of the promise) the full object.


UndoBuffer.popPatch([id])
-----------------------
Similar to `pop()` but tries to return the most recent patch object rather than the full object.

This is faster to apply in your own project than replacing the entire object as with `pop()` but does require you to have [deep-diff](https://www.npmjs.com/package/deep-diff) locally available on the front-end.

**Example usage**
```javascript
$scope.project = /* Something complicated */

$scope.undo = function() {
	UndoBuffer.popPatch()
		.then(function(res) {
			res.reverse().forEach(function(patch) { // Note that we need to reverse the array or some patches will screw up later ones
				DeepDiff.applyChange($scope.project, true, patch);
			});
		})
		.catch(function(e) {
			console.log('Something went wrong during undo:', e);
		});
};
```

**NOTE**: `popPatch()` will *try* to return the patch object but if that object has not yet been compressed will instead return the full object similar to `pop()`. This means you have to do a type check on the return value. If the value is an array - its a patch and calling `DeepDiff.applyChange()` on each element in reverse is fine, if its an object you should simply replace the object as with the return of `pop()`.



UndoBuffer.getHistory([resolve=false])
-----------------------
Return the raw array content of the internal UndoBuffer instance.
If `resolve` is truthy each history element is returned as a full object, not as the internally stored patch. This is exceptionally CPU costly on each call and is only intended for debugging purposes.


UndoBuffer.setMaxBufferSize(size)
-----------------------
Set the maximum buffer size (i.e. undo steps) that are retained in memory. If size is zero no undo-contents will be removed automatically - this is not recommended as it will slowly consume all system memory.


UndoBuffer.sendMessage(message)
------------------------------
Send a raw message to the Web Worker. This is mainly for internal use only but is exposed here in case you need to communicate directly.
