/*global window */
(function () {
	"use strict";
	var desktop = window.kmCalculatorDesktop;
	var dialogs = desktop && desktop.dialogs;
	if (!dialogs || typeof dialogs.alert !== "function" || typeof dialogs.confirm !== "function") return;

	// Preserve blocking alert/confirm behavior while restoring desktop input focus.
	window.alert = function (message) {
		dialogs.alert(message === undefined ? "" : String(message));
	};
	window.confirm = function (message) {
		return dialogs.confirm(message === undefined ? "" : String(message)) === true;
	};
})();
