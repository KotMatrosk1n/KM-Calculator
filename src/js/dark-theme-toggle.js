/* Restore the app theme before the workspace can paint. */
(function () {
	"use strict";
	var key = "km-calculator.visual-theme.v1";
	var choices = ["classic", "renegade", "royal", "sovereign"];
	var storage;
	var theme = "classic";
	try {
		storage = window.getKMCalculatorStorage ? window.getKMCalculatorStorage() : window.localStorage;
		var saved = storage.getItem(key);
		if (choices.indexOf(saved) !== -1) theme = saved;
	} catch (error) {
		// An unavailable preference store must not prevent the app from opening.
	}
	function apply(value) {
		theme = choices.indexOf(value) === -1 ? "classic" : value;
		document.documentElement.setAttribute("data-km-theme", theme);
	}
	apply(theme);
	function bind() {
		var select = document.getElementById("dark-theme-toggle");
		if (!select) return;
		select.value = theme;
		select.addEventListener("change", function () {
			apply(select.value);
			select.value = theme;
			try {
				if (storage) storage.setItem(key, theme);
			} catch (error) {
				// Keep the selected theme usable for this session if saving fails.
			}
		});
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
	else bind();
})();
