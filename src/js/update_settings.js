(function () {
	"use strict";

	var settingsButton = document.getElementById("km-settings-button");
	var updateBadge = document.getElementById("km-settings-update-badge");
	var overlay = document.getElementById("km-settings-overlay");
	var dialog = document.getElementById("km-settings-dialog");
	var closeButton = document.getElementById("km-settings-close");
	var settingsView = document.getElementById("km-settings-view");
	var updateView = document.getElementById("km-update-view");
	var versionValue = document.getElementById("km-settings-version");
	var updateAction = document.getElementById("km-settings-update-action");
	var updateActionLabel = document.getElementById("km-settings-update-action-label");
	var updateStatus = document.getElementById("km-settings-update-status");
	var openReleaseButton = document.getElementById("km-settings-open-release");
	var promptCopy = document.getElementById("km-update-prompt-copy");
	var releaseNotes = document.getElementById("km-update-release-notes");
	var progressPanel = document.getElementById("km-update-progress-panel");
	var progressTitle = document.getElementById("km-update-progress-title");
	var progressPercent = document.getElementById("km-update-progress-percent");
	var progressTrack = document.getElementById("km-update-progress-track");
	var progressFill = document.getElementById("km-update-progress-fill");
	var progressMessage = document.getElementById("km-update-progress-message");
	var updateError = document.getElementById("km-update-error");
	var updateErrorTitle = document.getElementById("km-update-error-title");
	var updateErrorMessage = document.getElementById("km-update-error-message");
	var updateErrorNextStep = document.getElementById("km-update-error-next-step");
	var installButton = document.getElementById("km-update-install");
	var installLabel = document.getElementById("km-update-install-label");
	var dismissButton = document.getElementById("km-update-dismiss");
	var desktopBridge = window.kmCalculatorDesktop || window.royalSwordDesktop;
	var updateBridge = desktopBridge && desktopBridge.updates;
	var activeView = "settings";
	var previousFocus = null;
	var unsubscribe = null;
	var stateRevision = 0;
	var updateState = {
		appVersion: "",
		packaged: false,
		status: "unavailable",
		message: "Update checks are available in the installed app.",
		version: "",
		available: false,
		percent: null,
		transferred: 0,
		total: 0,
		bytesPerSecond: 0,
		error: "",
		errorTitle: "",
		nextStep: "",
		releaseNotes: "",
		releaseUrl: "",
		busy: false,
		canCheck: false,
		canInstall: false
	};

	if (!settingsButton || !overlay || !dialog || !updateAction || !installButton) return;

	function hasNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function normalizeState(nextState) {
		nextState = nextState && typeof nextState === "object" ? nextState : {};
		var status = typeof nextState.status === "string" ? nextState.status : "idle";
		var busy = !!nextState.busy || status === "checking" || status === "downloading" || status === "installing";
		return {
			appVersion: typeof nextState.appVersion === "string" ? nextState.appVersion : "",
			packaged: !!nextState.packaged,
			status: status,
			message: typeof nextState.message === "string" ? nextState.message : "",
			version: typeof nextState.version === "string" ? nextState.version : "",
			available: !!nextState.available,
			percent: hasNumber(nextState.percent) ? Math.max(0, Math.min(100, nextState.percent)) : null,
			transferred: hasNumber(nextState.transferred) ? Math.max(0, nextState.transferred) : 0,
			total: hasNumber(nextState.total) ? Math.max(0, nextState.total) : 0,
			bytesPerSecond: hasNumber(nextState.bytesPerSecond) ? Math.max(0, nextState.bytesPerSecond) : 0,
			error: typeof nextState.error === "string" ? nextState.error : "",
			errorTitle: typeof nextState.errorTitle === "string" ? nextState.errorTitle : "",
			nextStep: typeof nextState.nextStep === "string" ? nextState.nextStep : "",
			releaseNotes: typeof nextState.releaseNotes === "string" ? nextState.releaseNotes : "",
			releaseUrl: typeof nextState.releaseUrl === "string" ? nextState.releaseUrl : "",
			busy: busy,
			canCheck: !!nextState.canCheck,
			canInstall: !!nextState.canInstall
		};
	}

	function mergeState(patch) {
		var merged = {};
		Object.keys(updateState).forEach(function (key) {
			merged[key] = updateState[key];
		});
		Object.keys(patch || {}).forEach(function (key) {
			merged[key] = patch[key];
		});
		applyState(merged);
	}

	function getVersionLabel(version) {
		if (!version) return "Unavailable";
		return /^v/i.test(version) ? version : "v" + version;
	}

	function formatBytes(bytes) {
		var units = ["B", "KB", "MB", "GB"];
		var unitIndex = 0;
		var value = bytes;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex += 1;
		}
		return (unitIndex === 0 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2)) + " " + units[unitIndex];
	}

	function isApplyingUpdate() {
		return updateState.status === "downloading" || updateState.status === "installing";
	}

	function getSettingsActionLabel() {
		if (updateState.status === "checking") return "Checking";
		if (updateState.status === "downloading") return "Downloading";
		if (updateState.status === "installing") return "Installing";
		if (updateState.available) return updateState.status === "error" ? "Retry Update" : "Install Update";
		return "Check for Updates";
	}

	function getSettingsStatusText() {
		if (updateState.status !== "error") return updateState.message;
		var parts = [];
		if (updateState.errorTitle) parts.push(updateState.errorTitle);
		if (updateState.error || updateState.message) parts.push(updateState.error || updateState.message);
		if (updateState.nextStep) parts.push(updateState.nextStep);
		return parts.join("\n\n");
	}

	function renderSettingsView() {
		var canUsePrimaryAction = updateState.available ? updateState.canInstall : updateState.canCheck;
		versionValue.textContent = getVersionLabel(updateState.appVersion);
		updateActionLabel.textContent = getSettingsActionLabel();
		updateAction.disabled = updateState.busy || !canUsePrimaryAction;
		updateStatus.textContent = getSettingsStatusText();
		updateStatus.setAttribute("data-kind", updateState.status);
		updateStatus.setAttribute("role", updateState.status === "error" ? "alert" : "status");
		openReleaseButton.hidden = !updateState.available;
		openReleaseButton.disabled = isApplyingUpdate();
	}

	function renderBadge() {
		updateBadge.hidden = !updateState.available;
		settingsButton.setAttribute("aria-label", updateState.available ? "Settings: Update Available" : "Settings");
	}

	function renderProgress() {
		var isDownloading = updateState.status === "downloading";
		var isInstalling = updateState.status === "installing";
		var showProgress = isDownloading || isInstalling;
		var hasProgress = updateState.percent !== null;
		var message = updateState.message;
		progressPanel.hidden = !showProgress;
		if (!showProgress) return;

		progressTitle.textContent = isInstalling ? "Installing update" : "Downloading update";
		progressPercent.textContent = hasProgress ? Math.round(updateState.percent) + "%" : "";
		progressTrack.setAttribute("data-indeterminate", hasProgress ? "false" : "true");
		progressFill.style.width = hasProgress ? updateState.percent + "%" : "";
		if (hasProgress) {
			progressTrack.setAttribute("aria-valuemin", "0");
			progressTrack.setAttribute("aria-valuemax", "100");
			progressTrack.setAttribute("aria-valuenow", String(Math.round(updateState.percent)));
		} else {
			progressTrack.removeAttribute("aria-valuemin");
			progressTrack.removeAttribute("aria-valuemax");
			progressTrack.removeAttribute("aria-valuenow");
		}
		if (isDownloading && updateState.total > 0) {
			message += " (" + formatBytes(updateState.transferred) + " of " + formatBytes(updateState.total);
			if (updateState.bytesPerSecond > 0) message += ", " + formatBytes(updateState.bytesPerSecond) + "/s";
			message += ")";
		}
		progressTrack.setAttribute("aria-valuetext", message);
		progressMessage.textContent = message;
	}

	function renderUpdateView() {
		var version = getVersionLabel(updateState.version);
		var applying = isApplyingUpdate();
		promptCopy.textContent = "KM Calculator " + version + " is available. Install it now?";
		releaseNotes.textContent = updateState.releaseNotes;
		releaseNotes.hidden = !updateState.releaseNotes;
		updateError.hidden = updateState.status !== "error";
		updateErrorTitle.textContent = updateState.errorTitle || "Update failed";
		updateErrorMessage.textContent = updateState.error || updateState.message;
		updateErrorNextStep.textContent = updateState.nextStep;
		installButton.disabled = applying || !updateState.canInstall;
		dismissButton.disabled = applying;
		closeButton.disabled = applying;
		installLabel.textContent = applying ? (updateState.status === "installing" ? "Installing" : "Downloading") :
			(updateState.status === "error" ? "Retry Update" : "Install Update");
		renderProgress();
	}

	function render() {
		renderBadge();
		renderSettingsView();
		renderUpdateView();
		if (activeView === "update" && !updateState.available) showSettingsView(false);
	}

	function applyState(nextState) {
		updateState = normalizeState(nextState);
		stateRevision += 1;
		render();
	}

	function showSettingsView(shouldFocus) {
		activeView = "settings";
		settingsView.hidden = false;
		updateView.hidden = true;
		dialog.setAttribute("aria-labelledby", "km-settings-heading");
		if (shouldFocus !== false) updateAction.focus();
	}

	function showUpdateView() {
		if (!updateState.available) return;
		activeView = "update";
		settingsView.hidden = true;
		updateView.hidden = false;
		dialog.setAttribute("aria-labelledby", "km-update-prompt-heading");
		installButton.focus();
	}

	function openSettings() {
		previousFocus = document.activeElement;
		showSettingsView(false);
		overlay.hidden = false;
		document.body.classList.add("km-settings-open");
		settingsButton.setAttribute("aria-expanded", "true");
		window.setTimeout(function () {
			dialog.focus();
		}, 0);
	}

	function closeSettings() {
		if (isApplyingUpdate()) return;
		overlay.hidden = true;
		document.body.classList.remove("km-settings-open");
		settingsButton.setAttribute("aria-expanded", "false");
		showSettingsView(false);
		if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
		previousFocus = null;
	}

	function getFocusableElements() {
		var candidates = dialog.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])");
		return Array.prototype.filter.call(candidates, function (element) {
			var current = element;
			while (current && current !== dialog) {
				if (current.hidden) return false;
				current = current.parentElement;
			}
			return current === dialog;
		});
	}

	function keepFocusInsideDialog(event) {
		if (overlay.hidden || dialog.contains(event.target)) return;
		var focusable = getFocusableElements();
		if (focusable.length) focusable[0].focus();
		else dialog.focus();
	}

	function handleDialogKeydown(event) {
		if (overlay.hidden) return;
		if (event.key === "Escape") {
			if (isApplyingUpdate()) return;
			event.preventDefault();
			if (activeView === "update") showSettingsView();
			else closeSettings();
			return;
		}
		if (event.key !== "Tab") return;
		var focusable = getFocusableElements();
		if (!focusable.length) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		var first = focusable[0];
		var last = focusable[focusable.length - 1];
		var activeElement = document.activeElement;
		var activeIndex = focusable.indexOf(activeElement);
		if (activeElement === dialog || !dialog.contains(activeElement) || activeIndex === -1) {
			event.preventDefault();
			if (event.shiftKey) last.focus();
			else first.focus();
		} else if (event.shiftKey && activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function setBridgeError(title, message) {
		mergeState({
			status: "error",
			message: message,
			error: message,
			errorTitle: title,
			nextStep: "Try again. If the problem continues, open the release page and install the latest version manually.",
			busy: false,
			canCheck: !!updateState.packaged,
			canInstall: !!updateState.packaged && updateState.available
		});
	}

	function runUpdateAction(methodName, pendingState, errorTitle, errorMessage) {
		if (!updateBridge || typeof updateBridge[methodName] !== "function") return;
		mergeState(pendingState);
		var result;
		try {
			result = updateBridge[methodName]();
		} catch (error) {
			void error;
			setBridgeError(errorTitle, errorMessage);
			return;
		}
		if (!result || typeof result.then !== "function") return;
		result.then(function (nextState) {
			if (nextState) applyState(nextState);
		}, function (error) {
			void error;
			setBridgeError(errorTitle, errorMessage);
		});
	}

	function checkForUpdates() {
		runUpdateAction("check", {
			status: "checking",
			message: "Checking for updates...",
			available: false,
			busy: true,
			canCheck: false,
			canInstall: false,
			error: "",
			errorTitle: "",
			nextStep: ""
		}, "Update check failed", "KM Calculator could not check for updates right now.");
	}

	function installUpdate() {
		if (!updateState.available) return;
		runUpdateAction("install", {
			status: "downloading",
			message: "Preparing update download...",
			percent: 0,
			transferred: 0,
			total: 0,
			bytesPerSecond: 0,
			busy: true,
			canCheck: false,
			canInstall: false,
			error: "",
			errorTitle: "",
			nextStep: ""
		}, "Update install failed", "KM Calculator could not start the update installer.");
	}

	function openReleasePage() {
		if (!updateBridge || typeof updateBridge.openReleasePage !== "function") return;
		try {
			var result = updateBridge.openReleasePage();
			if (result && typeof result.then === "function") {
				result.then(null, function (error) {
					void error;
					setBridgeError("Could not open release page", "KM Calculator could not open the release page.");
				});
			}
		} catch (error) {
			void error;
			setBridgeError("Could not open release page", "KM Calculator could not open the release page.");
		}
	}

	settingsButton.addEventListener("click", openSettings);
	closeButton.addEventListener("click", closeSettings);
	overlay.addEventListener("click", function (event) {
		if (event.target === overlay) closeSettings();
	});
	document.addEventListener("keydown", handleDialogKeydown);
	document.addEventListener("focusin", keepFocusInsideDialog);
	updateAction.addEventListener("click", function () {
		if (updateState.available) showUpdateView();
		else checkForUpdates();
	});
	openReleaseButton.addEventListener("click", openReleasePage);
	installButton.addEventListener("click", installUpdate);
	dismissButton.addEventListener("click", function () {
		if (!isApplyingUpdate()) showSettingsView();
	});

	if (updateBridge && typeof updateBridge.subscribe === "function") {
		unsubscribe = updateBridge.subscribe(function (nextState) {
			applyState(nextState);
		});
	}
	if (updateBridge && typeof updateBridge.getState === "function") {
		var revisionBeforeSnapshot = stateRevision;
		updateBridge.getState().then(function (nextState) {
			if (stateRevision === revisionBeforeSnapshot) applyState(nextState);
		}, function (error) {
			void error;
			setBridgeError("Update status unavailable", "KM Calculator could not read the updater status.");
		});
	}
	window.addEventListener("beforeunload", function () {
		if (typeof unsubscribe === "function") unsubscribe();
	});
	render();
})();
