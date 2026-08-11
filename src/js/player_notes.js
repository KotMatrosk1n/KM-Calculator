/*global TRAINERDEX */
(function () {
	var NOTE_STORAGE_PREFIX = "royalSwordNotes:v1:";
	var NOTE_OPTIONS_KEY = "royalSwordNotesOptions:v1";
	var NOTE_WINDOW_KEY = "royalSwordNotesWindow:v1";
	var DEFAULT_SCOPE = "global";
	var DEFAULT_FONT_SIZE = "medium";
	var SAVE_DELAY = 250;
	var NOTE_SCOPES = [
		{id: "global", label: "Global"},
		{id: "trainer", label: "Trainer"}
	];
	var notesWindow = null;
	var notesTextarea = null;
	var notesLineNumbers = null;
	var notesStatus = null;
	var notesScope = null;
	var notesTrainerLabel = null;
	var notesTrainerSelect = null;
	var notesWordWrap = null;
	var notesFontSize = null;
	var saveTimer = null;
	var activeScope = DEFAULT_SCOPE;
	var activeTrainerId = "";
	var dragging = null;
	var resizing = null;

	function getStorage() {
		return window.getRoyalSwordStorage ? window.getRoyalSwordStorage() : window.localStorage;
	}

	function safeGet(key) {
		try {
			return getStorage().getItem(key);
		} catch (e) {
			return null;
		}
	}

	function safeSet(key, value) {
		try {
			getStorage().setItem(key, value);
		} catch (e) {}
	}

	function safeRemove(key) {
		try {
			getStorage().removeItem(key);
		} catch (e) {}
	}

	function loadJSON(key, fallback) {
		var raw = safeGet(key);
		if (!raw) return fallback;
		try {
			return JSON.parse(raw);
		} catch (e) {
			return fallback;
		}
	}

	function saveJSON(key, value) {
		safeSet(key, JSON.stringify(value));
	}

	function getNoteKey(scope) {
		if (normalizeScope(scope) === "trainer") {
			return NOTE_STORAGE_PREFIX + "trainer:" + normalizeTrainerId(activeTrainerId);
		}
		return NOTE_STORAGE_PREFIX + DEFAULT_SCOPE;
	}

	function getScopeOptionsMarkup() {
		var markup = [];
		var i;
		for (i = 0; i < NOTE_SCOPES.length; i++) {
			markup.push("<option value='" + NOTE_SCOPES[i].id + "'>" + NOTE_SCOPES[i].label + "</option>");
		}
		return markup.join("");
	}

	function normalizeFontSize(fontSize) {
		if (fontSize === "default") return DEFAULT_FONT_SIZE;
		if (fontSize === "small" || fontSize === "medium" || fontSize === "large") return fontSize;
		return DEFAULT_FONT_SIZE;
	}

	function normalizeScope(scope) {
		var i;
		for (i = 0; i < NOTE_SCOPES.length; i++) {
			if (NOTE_SCOPES[i].id === scope) return scope;
		}
		return DEFAULT_SCOPE;
	}

	function getTrainerEntriesForNotes() {
		var trainerNames;
		var trainers = [];
		var i;
		var trainerName;
		if (typeof window.getTrainerEntries === "function") return window.getTrainerEntries();
		if (typeof TRAINERDEX === "undefined") return [];
		if (Array.isArray(TRAINERDEX)) return TRAINERDEX;
		trainerNames = Object.keys(TRAINERDEX);
		trainerNames.sort();
		for (i = 0; i < trainerNames.length; i++) {
			trainerName = trainerNames[i];
			trainers.push({
				area: "Trainers",
				trainer: trainerName,
				pokemon: TRAINERDEX[trainerName]
			});
		}
		return trainers;
	}

	function getTrainerArea(entry) {
		return entry && entry.area ? entry.area : "Trainers";
	}

	function getTrainerName(entry) {
		return entry && (entry.trainer || entry.name) ? (entry.trainer || entry.name) : "Trainer";
	}

	function getTrainerId(entry, index) {
		return entry && entry._kmId ? entry._kmId : String(index);
	}

	function getTrainerGroup(entry) {
		var area = getTrainerArea(entry);
		return entry && entry._kmPack ? entry._kmPack.name + " — " + area : area;
	}

	function getCurrentTrainerId() {
		var selector = $("#trainer-selector");
		var value = selector.length ? selector.val() : "";
		return value === undefined || value === null ? "" : String(value);
	}

	function normalizeTrainerId(trainerId) {
		var trainers = getTrainerEntriesForNotes();
		var id = trainerId === undefined || trainerId === null ? "" : String(trainerId);
		var i;
		for (i = 0; i < trainers.length; i++) {
			if (getTrainerId(trainers[i], i) === id) return id;
		}
		if (/^\d+$/.test(id) && trainers[~~id]) return getTrainerId(trainers[~~id], ~~id);
		id = getCurrentTrainerId();
		for (i = 0; i < trainers.length; i++) {
			if (getTrainerId(trainers[i], i) === id) return id;
		}
		if (/^\d+$/.test(id) && trainers[~~id]) return getTrainerId(trainers[~~id], ~~id);
		return trainers.length ? getTrainerId(trainers[0], 0) : "";
	}

	function refreshTrainerOptions(preferredTrainerId) {
		var trainers;
		var trainerId;
		var selectedId;
		var currentArea = "";
		var optgroup = null;
		var i;
		var entry;
		var area;
		if (!notesTrainerSelect) return;
		trainers = getTrainerEntriesForNotes();
		selectedId = normalizeTrainerId(preferredTrainerId || activeTrainerId);
		notesTrainerSelect.empty();
		if (!trainers.length) {
			notesTrainerSelect.append($("<option></option>").val("").text("No trainers loaded"));
			notesTrainerSelect.prop("disabled", true);
			activeTrainerId = "";
			return;
		}
		notesTrainerSelect.prop("disabled", false);
		for (i = 0; i < trainers.length; i++) {
			entry = trainers[i];
			area = getTrainerGroup(entry);
			if (area !== currentArea) {
				currentArea = area;
				optgroup = $("<optgroup></optgroup>").attr("label", area);
				notesTrainerSelect.append(optgroup);
			}
			trainerId = getTrainerId(entry, i);
			optgroup.append(
				$("<option></option>")
					.val(trainerId)
					.text(getTrainerName(entry))
					.attr("title", area + " > " + getTrainerName(entry))
			);
		}
		activeTrainerId = selectedId;
		notesTrainerSelect.val(activeTrainerId);
	}

	function setTrainerOptionsVisible(visible) {
		if (notesTrainerLabel) notesTrainerLabel.prop("hidden", !visible);
		if (notesTrainerSelect) notesTrainerSelect.prop("disabled", !visible || !getTrainerEntriesForNotes().length);
	}

	function setStatus(message) {
		if (notesStatus) notesStatus.text(message);
	}

	function getLineCount(text) {
		return Math.max(1, String(text || "").split("\n").length);
	}

	function updateLineNumbers() {
		var count = getLineCount(notesTextarea ? notesTextarea.val() : "");
		var lines = [];
		var i;
		for (i = 1; i <= count; i++) {
			lines.push(i);
		}
		if (notesLineNumbers) {
			notesLineNumbers.text(lines.join("\n"));
			notesLineNumbers.scrollTop(notesTextarea ? notesTextarea.scrollTop() : 0);
		}
	}

	function loadNotes(scope) {
		var notes;
		var legacyMatch;
		activeScope = normalizeScope(scope || DEFAULT_SCOPE);
		if (activeScope === "trainer") refreshTrainerOptions(activeTrainerId);
		if (notesScope) notesScope.val(activeScope);
		setTrainerOptionsVisible(activeScope === "trainer");
		notes = safeGet(getNoteKey(activeScope));
		legacyMatch = activeScope === "trainer" ? /^pokemon-royal-sword:trainer-(\d+)$/.exec(activeTrainerId) : null;
		if (notes === null && legacyMatch) {
			notes = safeGet(NOTE_STORAGE_PREFIX + "trainer:" + (Number(legacyMatch[1]) - 1));
			if (notes !== null) safeSet(getNoteKey(activeScope), notes);
		}
		if (notesTextarea) notesTextarea.val(notes || "");
		updateLineNumbers();
		setStatus("Saved");
	}

	function saveNotesNow() {
		if (!notesTextarea) return;
		if (saveTimer) {
			window.clearTimeout(saveTimer);
			saveTimer = null;
		}
		safeSet(getNoteKey(activeScope), notesTextarea.val());
		setStatus("Saved");
	}

	function queueSaveNotes() {
		setStatus("Saving...");
		if (saveTimer) window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(saveNotesNow, SAVE_DELAY);
	}

	function saveOptions() {
		var options = {
			wordWrap: !!(notesWordWrap && notesWordWrap.prop("checked")),
			fontSize: notesFontSize ? normalizeFontSize(notesFontSize.val()) : DEFAULT_FONT_SIZE,
			scope: normalizeScope(activeScope),
			trainerId: normalizeTrainerId(activeTrainerId)
		};
		saveJSON(NOTE_OPTIONS_KEY, options);
	}

	function applyOptions() {
		var fontSize;
		var options = loadJSON(NOTE_OPTIONS_KEY, {
			wordWrap: true,
			fontSize: DEFAULT_FONT_SIZE,
			scope: DEFAULT_SCOPE
		});
		fontSize = normalizeFontSize(options.fontSize);
		activeScope = normalizeScope(options.scope || DEFAULT_SCOPE);
		activeTrainerId = normalizeTrainerId(options.trainerId || activeTrainerId);
		if (notesWordWrap) notesWordWrap.prop("checked", options.wordWrap !== false);
		if (notesFontSize) notesFontSize.val(fontSize);
		notesWindow
			.toggleClass("wrap-on", options.wordWrap !== false)
			.toggleClass("wrap-off", options.wordWrap === false)
			.toggleClass("notes-font-small", fontSize === "small")
			.toggleClass("notes-font-large", fontSize === "large");
		if (notesTextarea) notesTextarea.attr("wrap", options.wordWrap === false ? "off" : "soft");
	}

	function getViewportSize() {
		return {
			width: window.innerWidth || document.documentElement.clientWidth || 1024,
			height: window.innerHeight || document.documentElement.clientHeight || 768
		};
	}

	function constrainWindowPosition() {
		var viewport = getViewportSize();
		var width = notesWindow.outerWidth();
		var height = notesWindow.outerHeight();
		var left = Math.max(8, Math.min(notesWindow.position().left, viewport.width - width - 8));
		var top = Math.max(8, Math.min(notesWindow.position().top, viewport.height - height - 8));
		notesWindow.css({
			left: left + "px",
			top: top + "px"
		});
	}

	function saveWindowState() {
		if (!notesWindow || notesWindow.prop("hidden")) return;
		saveJSON(NOTE_WINDOW_KEY, {
			left: notesWindow.position().left,
			top: notesWindow.position().top,
			width: notesWindow.outerWidth(),
			height: notesWindow.outerHeight()
		});
	}

	function restoreWindowState() {
		var state = loadJSON(NOTE_WINDOW_KEY, null);
		var viewport = getViewportSize();
		if (state) {
			notesWindow.css({
				left: Math.max(8, state.left || 24) + "px",
				top: Math.max(8, state.top || 120) + "px",
				width: Math.max(320, state.width || 520) + "px",
				height: Math.max(230, state.height || 360) + "px"
			});
		} else {
			notesWindow.css({
				left: Math.max(8, Math.floor((viewport.width - 520) / 2)) + "px",
				top: "120px"
			});
		}
		constrainWindowPosition();
	}

	function openNotesWindow() {
		createNotesWindow();
		refreshTrainerOptions(activeTrainerId);
		if (activeScope === "trainer") loadNotes("trainer");
		notesWindow.prop("hidden", false);
		restoreWindowState();
		notesTextarea.focus();
	}

	function closeNotesWindow() {
		saveNotesNow();
		saveWindowState();
		notesWindow.prop("hidden", true);
	}

	function clearAllNotes(event) {
		var confirmed = window.confirm("Clear all notes?");
		if (event && event.currentTarget) $(event.currentTarget).blur();
		if (!confirmed) return;
		try {
			getStorage().clearByPrefix(NOTE_STORAGE_PREFIX);
		} catch (e) {
			safeRemove(getNoteKey(activeScope));
		}
		if (notesTextarea) notesTextarea.val("");
		updateLineNumbers();
		setStatus("Cleared");
	}

	function beginDrag(event) {
		if ($(event.target).closest("button, select, input, label").length) return;
		event.preventDefault();
		dragging = {
			startX: event.clientX,
			startY: event.clientY,
			left: notesWindow.position().left,
			top: notesWindow.position().top
		};
		$(document).on("mousemove.playerNotesDrag", dragWindow);
		$(document).on("mouseup.playerNotesDrag", endDrag);
	}

	function dragWindow(event) {
		if (!dragging) return;
		notesWindow.css({
			left: dragging.left + event.clientX - dragging.startX + "px",
			top: dragging.top + event.clientY - dragging.startY + "px"
		});
		constrainWindowPosition();
	}

	function endDrag() {
		dragging = null;
		$(document).off(".playerNotesDrag");
		saveWindowState();
	}

	function beginResize(event) {
		event.preventDefault();
		resizing = {
			startX: event.clientX,
			startY: event.clientY,
			width: notesWindow.outerWidth(),
			height: notesWindow.outerHeight()
		};
		$(document).on("mousemove.playerNotesResize", resizeWindow);
		$(document).on("mouseup.playerNotesResize", endResize);
	}

	function resizeWindow(event) {
		var viewport;
		var width;
		var height;
		if (!resizing) return;
		viewport = getViewportSize();
		width = Math.max(320, Math.min(resizing.width + event.clientX - resizing.startX, viewport.width - notesWindow.position().left - 8));
		height = Math.max(230, Math.min(resizing.height + event.clientY - resizing.startY, viewport.height - notesWindow.position().top - 8));
		notesWindow.css({
			width: width + "px",
			height: height + "px"
		});
	}

	function endResize() {
		resizing = null;
		$(document).off(".playerNotesResize");
		saveWindowState();
	}

	function createNotesWindow() {
		var markup;
		if (notesWindow) return;
		markup = [
			"<section id='player-notes-window' class='notes-window wrap-on' role='dialog' aria-labelledby='player-notes-title' aria-modal='false' hidden>",
			"<header class='notes-window-header'>",
			"<h2 id='player-notes-title' class='notes-window-title'>Notes</h2>",
			"<div class='notes-window-actions'>",
			"<button type='button' class='btn notes-window-close' aria-label='Close notes'>X</button>",
			"</div>",
			"</header>",
			"<div class='notes-window-options'>",
			"<label for='player-notes-scope'>Scope<select id='player-notes-scope'>" + getScopeOptionsMarkup() + "</select></label>",
			"<label><input type='checkbox' id='player-notes-wrap'> Word wrap</label>",
			"<label for='player-notes-font-size'>Text size<select id='player-notes-font-size'><option value='small'>Small</option><option value='medium'>Medium</option><option value='large'>Large</option></select></label>",
			"<label class='notes-trainer-scope-label' for='player-notes-trainer' hidden>Trainer<select id='player-notes-trainer'></select></label>",
			"</div>",
			"<div class='notes-window-body'>",
			"<pre id='player-notes-lines' class='notes-line-numbers' aria-hidden='true'>1</pre>",
			"<textarea id='player-notes-text' class='player-notes-text' aria-label='Player notes' spellcheck='false' wrap='soft'></textarea>",
			"</div>",
			"<footer class='notes-window-footer'><span id='player-notes-status'>Saved</span><span>Autosaves as you type</span></footer>",
			"<div class='notes-resize-handle' aria-hidden='true'></div>",
			"</section>"
		].join("");
		$("body").append(markup);
		notesWindow = $("#player-notes-window");
		notesTextarea = $("#player-notes-text");
		notesLineNumbers = $("#player-notes-lines");
		notesStatus = $("#player-notes-status");
		notesScope = $("#player-notes-scope");
		notesTrainerLabel = $(".notes-trainer-scope-label");
		notesTrainerSelect = $("#player-notes-trainer");
		notesWordWrap = $("#player-notes-wrap");
		notesFontSize = $("#player-notes-font-size");
		applyOptions();
		refreshTrainerOptions(activeTrainerId);
		loadNotes(activeScope);
		notesTextarea.on("input", function () {
			updateLineNumbers();
			queueSaveNotes();
		});
		notesTextarea.on("scroll", function () {
			notesLineNumbers.scrollTop(notesTextarea.scrollTop());
		});
		notesScope.on("change", function () {
			saveNotesNow();
			loadNotes(notesScope.val());
			saveOptions();
		});
		notesTrainerSelect.on("change", function () {
			saveNotesNow();
			activeTrainerId = normalizeTrainerId(notesTrainerSelect.val());
			loadNotes("trainer");
			saveOptions();
		});
		notesWordWrap.on("change", function () {
			saveOptions();
			applyOptions();
		});
		notesFontSize.on("change", function () {
			saveOptions();
			applyOptions();
			updateLineNumbers();
		});
		notesWindow.find(".notes-window-close").on("click", closeNotesWindow);
		notesWindow.find(".notes-window-header").on("mousedown", beginDrag);
		notesWindow.find(".notes-resize-handle").on("mousedown", beginResize);
		$(window).on("resize", function () {
			if (!notesWindow.prop("hidden")) {
				constrainWindowPosition();
				saveWindowState();
			}
		});
		$(window).on("beforeunload", function () {
			saveNotesNow();
			saveWindowState();
		});
	}

	function installPlayerNotesControls() {
		createNotesWindow();
		$(document).on("click", ".player-notes-open", openNotesWindow);
		$(document).on("click", ".player-notes-clear", clearAllNotes);
		$(document).on("kmtrainerdatachange", function () {
			refreshTrainerOptions(activeTrainerId);
			if (activeScope === "trainer") loadNotes("trainer");
		});
	}

	$(installPlayerNotesControls);
})();
