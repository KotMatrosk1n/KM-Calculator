/*global window */
(function () {
	var desktopBridge = window.kmCalculatorDesktop || window.royalSwordDesktop;
	var nativeStorage = desktopBridge && desktopBridge.storage;
	var local = null;
	var migratedKeys = {};

	function getLocalStorage() {
		if (local !== null) return local;
		try {
			local = window.localStorage || false;
		} catch (error) {
			local = false;
		}
		return local || null;
	}

	function normalizeKey(key) {
		return key === undefined || key === null ? "" : String(key);
	}

	function migrateKey(key) {
		var localStorage = getLocalStorage();
		var localValue;
		key = normalizeKey(key);
		if (!nativeStorage || !localStorage || !key || migratedKeys[key]) return;
		migratedKeys[key] = true;
		if (nativeStorage.getItem(key) !== null) return;
		try {
			localValue = localStorage.getItem(key);
		} catch (error) {
			localValue = null;
		}
		if (localValue !== null) nativeStorage.setItem(key, localValue);
	}

	function getItem(key) {
		var localStorage;
		key = normalizeKey(key);
		if (!key) return null;
		migrateKey(key);
		if (nativeStorage) return nativeStorage.getItem(key);
		localStorage = getLocalStorage();
		if (!localStorage) return null;
		try {
			return localStorage.getItem(key);
		} catch (error) {
			return null;
		}
	}

	function setItem(key, value) {
		var localStorage;
		key = normalizeKey(key);
		if (!key) return;
		value = value === undefined || value === null ? "" : String(value);
		if (nativeStorage) nativeStorage.setItem(key, value);
		localStorage = getLocalStorage();
		if (!localStorage) return;
		try {
			localStorage.setItem(key, value);
		} catch (error) {}
	}

	function removeItem(key) {
		var localStorage;
		key = normalizeKey(key);
		if (!key) return;
		if (nativeStorage) nativeStorage.removeItem(key);
		localStorage = getLocalStorage();
		if (!localStorage) return;
		try {
			localStorage.removeItem(key);
		} catch (error) {}
	}

	function key(index) {
		var localStorage;
		if (nativeStorage) return nativeStorage.key(index);
		localStorage = getLocalStorage();
		if (!localStorage) return null;
		try {
			return localStorage.key(index);
		} catch (error) {
			return null;
		}
	}

	function length() {
		var localStorage;
		if (nativeStorage) return nativeStorage.length();
		localStorage = getLocalStorage();
		if (!localStorage) return 0;
		try {
			return localStorage.length;
		} catch (error) {
			return 0;
		}
	}

	function clearByPrefix(prefix) {
		var keys = [];
		var storageLength;
		var currentKey;
		var localStorage;
		prefix = prefix === undefined || prefix === null ? "" : String(prefix);
		storageLength = length();
		for (var i = 0; i < storageLength; i++) {
			currentKey = key(i);
			if (currentKey && currentKey.indexOf(prefix) === 0) keys.push(currentKey);
		}
		localStorage = getLocalStorage();
		if (localStorage) {
			try {
				for (var localIndex = localStorage.length - 1; localIndex >= 0; localIndex--) {
					currentKey = localStorage.key(localIndex);
					if (currentKey && currentKey.indexOf(prefix) === 0 && keys.indexOf(currentKey) === -1) keys.push(currentKey);
				}
			} catch (error) {}
		}
		if (nativeStorage) nativeStorage.clearByPrefix(prefix);
		for (var j = 0; j < keys.length; j++) removeItem(keys[j]);
	}

	window.kmCalculatorStorage = {
		getItem: getItem,
		setItem: setItem,
		removeItem: removeItem,
		key: key,
		length: length,
		clearByPrefix: clearByPrefix
	};

	window.getKMCalculatorStorage = function () {
		return window.kmCalculatorStorage;
	};

	// Keep the legacy names so saved-data and third-party integrations continue to work.
	window.royalSwordStorage = window.kmCalculatorStorage;
	window.getRoyalSwordStorage = window.getKMCalculatorStorage;
})();
