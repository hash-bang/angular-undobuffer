angular-undobuffer
==================
Web worker powered Undo Buffer for exceptionally large and complex objects.

This module provides a circular buffer for storing complex objects in memory to provide undo functionality. Rather than just storing the objects in memory it uses a passive compression worker to reduce the memory footprint when the browsers web worker thread is idle.
