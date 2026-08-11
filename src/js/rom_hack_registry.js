/*global module */

/*
 * KM Calculator ROM-hack profile registry.
 *
 * Profiles describe which canonical generation a ROM hack extends and which
 * calculator, trainer, save-import, and optional data-provider layers belong
 * to it. The registry deliberately does not persist the active profile: the
 * chooser asks again whenever the app starts.
 */
(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		var api = factory();
		var registry;
		root.KMCalculatorRomHacks = api;
		registry = api.createRegistry({
			eventTarget: root,
			globalObject: root
		});
		root.KMCalculatorRomHackRegistry = registry;
		root.kmRomHackRegistry = registry;
	}
})(typeof self !== "undefined" ? self : this, function () {
	"use strict";

	var PROFILE_SCHEMA = "km-calculator.rom-hack-profile";
	var PROFILE_SCHEMA_VERSION = 1;
	var DOM_EVENT_NAMES = {
		profilechange: "kmcalculator:romhackchange",
		profileschange: "kmcalculator:romhackprofileschange",
		providerchange: "kmcalculator:romhackproviderchange",
		chooserrequest: "kmcalculator:romhackchooserrequest"
	};

	function RomHackProfileError(message, issues) {
		this.name = "RomHackProfileError";
		this.message = message;
		this.issues = issues || [];
		if (Error.captureStackTrace) Error.captureStackTrace(this, RomHackProfileError);
	}
	RomHackProfileError.prototype = Object.create(Error.prototype);
	RomHackProfileError.prototype.constructor = RomHackProfileError;

	function isObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	function cleanString(value) {
		return typeof value === "string" ? value.replace(/^\s+|\s+$/g, "") : "";
	}

	function clone(value) {
		var result;
		var keys;
		var i;

		if (Array.isArray(value)) {
			result = [];
			for (i = 0; i < value.length; i++) result.push(clone(value[i]));
			return result;
		}
		if (!isObject(value)) return value;

		result = {};
		keys = Object.keys(value);
		for (i = 0; i < keys.length; i++) result[keys[i]] = clone(value[keys[i]]);
		return result;
	}

	function normalizeGeneration(value, path, issues) {
		var generation = Number(value);
		if (generation % 1 !== 0 || generation < 1 || generation > 9) {
			issues.push(path + " must be an integer from 1 through 9.");
			return null;
		}
		return generation;
	}

	function normalizeAuthors(value, issues) {
		var authors = [];
		var author;
		var i;

		if (!Array.isArray(value) || !value.length) {
			issues.push("attribution.authors must contain at least one credited person or team.");
			return authors;
		}

		for (i = 0; i < value.length; i++) {
			if (typeof value[i] === "string") {
				author = {name: cleanString(value[i])};
			} else if (isObject(value[i])) {
				author = {
					name: cleanString(value[i].name),
					role: cleanString(value[i].role),
					url: cleanString(value[i].url)
				};
			} else {
				author = {name: ""};
			}

			if (!author.name) {
				issues.push("attribution.authors[" + i + "].name is required.");
				continue;
			}
			authors.push(author);
		}
		return authors;
	}

	function normalizeAttribution(value, issues) {
		var source;
		var license;

		if (!isObject(value)) {
			issues.push("attribution is required.");
			value = {};
		}

		source = isObject(value.source) ? {
			name: cleanString(value.source.name),
			url: cleanString(value.source.url)
		} : {name: "", url: ""};
		if (!source.name) issues.push("attribution.source.name is required.");
		if (!source.url) issues.push("attribution.source.url is required.");

		if (typeof value.license === "string") {
			license = {name: cleanString(value.license), url: ""};
		} else if (isObject(value.license)) {
			license = {
				name: cleanString(value.license.name),
				url: cleanString(value.license.url)
			};
		} else {
			license = {name: "", url: ""};
		}
		if (!license.name) issues.push("attribution.license.name is required.");

		return {
			authors: normalizeAuthors(value.authors, issues),
			source: source,
			license: license,
			notes: cleanString(value.notes)
		};
	}

	function normalizeProfile(value) {
		var issues = [];
		var id;
		var name;
		var baseGeneration;
		var calcSource;
		var trainerSource;
		var saveSource;
		var saveAdapter;
		var tileSource;
		var dataSource;
		var featuresSource;
		var profile;

		if (!isObject(value)) {
			throw new RomHackProfileError("ROM-hack profile must be an object.", ["profile must be an object."]);
		}

		id = cleanString(value.id).toLowerCase();
		name = cleanString(value.name);
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
			issues.push("id must be a lowercase, hyphen-separated identifier.");
		}
		if (!name) issues.push("name is required.");
		baseGeneration = normalizeGeneration(value.baseGeneration, "baseGeneration", issues);

		calcSource = isObject(value.calc) ? value.calc : {};
		trainerSource = isObject(value.trainerData) ? value.trainerData : {};
		saveSource = isObject(value.saveImport) ? value.saveImport : {};
		saveAdapter = cleanString(saveSource.adapter || saveSource.adapterId).toLowerCase();
		tileSource = isObject(value.tile) ? value.tile : {};
		dataSource = isObject(value.generationData) ? value.generationData : {};
		featuresSource = isObject(value.features) ? value.features : {};

		if (!cleanString(value.calcProfile || calcSource.generationProfile)) {
			issues.push("calcProfile is required.");
		}
		if (!cleanString(trainerSource.packId)) {
			issues.push("trainerData.packId is required.");
		}
		if (saveAdapter && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(saveAdapter)) {
			issues.push("saveImport.adapter must be a lowercase, hyphen-separated identifier.");
		}

		profile = {
			schema: PROFILE_SCHEMA,
			schemaVersion: PROFILE_SCHEMA_VERSION,
			id: id,
			name: name,
			shortName: cleanString(value.shortName) || name,
			version: cleanString(value.version) || "1",
			baseGeneration: baseGeneration,
			calcProfile: cleanString(value.calcProfile || calcSource.generationProfile),
			calc: {
				generationProfile: cleanString(value.calcProfile || calcSource.generationProfile),
				dataGeneration: calcSource.dataGeneration === undefined ? baseGeneration :
					normalizeGeneration(calcSource.dataGeneration, "calc.dataGeneration", issues)
			},
			trainerData: {
				packId: cleanString(trainerSource.packId)
			},
			saveImport: {
				generation: saveSource.generation === undefined ? baseGeneration :
					normalizeGeneration(saveSource.generation, "saveImport.generation", issues),
				adapter: saveAdapter
			},
			generationData: {
				canonicalProviderId: cleanString(dataSource.canonicalProviderId) ||
					("canonical-gen-" + baseGeneration),
				overrideProviderId: cleanString(dataSource.overrideProviderId)
			},
			features: {
				battleSimulator: cleanString(featuresSource.battleSimulator)
			},
			tile: {
				description: cleanString(tileSource.description),
				icon: cleanString(tileSource.icon),
				badge: cleanString(tileSource.badge)
			},
			attribution: normalizeAttribution(value.attribution, issues)
		};

		if (issues.length) {
			throw new RomHackProfileError("Invalid ROM-hack profile " + (name || id || "(unnamed)") + ".", issues);
		}
		return profile;
	}

	function createDomEvent(eventTarget, name, detail) {
		var event;
		var documentObject;

		if (!eventTarget || typeof eventTarget.dispatchEvent !== "function") return null;
		if (typeof eventTarget.CustomEvent === "function") {
			return new eventTarget.CustomEvent(name, {detail: detail});
		}

		documentObject = eventTarget.document || (eventTarget.ownerDocument || null);
		if (documentObject && typeof documentObject.createEvent === "function") {
			event = documentObject.createEvent("CustomEvent");
			event.initCustomEvent(name, false, false, detail);
			return event;
		}
		return null;
	}

	function Registry(options) {
		options = options || {};
		this._profiles = {};
		this._profileOrder = [];
		this._generationProviders = {};
		this._profileOverrideProviders = {};
		this._overrideProviderHook = null;
		this._listeners = {};
		this._activeProfileId = null;
		this._activeExtraContext = {};
		this._eventTarget = options.eventTarget || null;
		this._globalObject = options.globalObject || null;
	}

	Registry.prototype._emit = function (type, detail) {
		var listeners = (this._listeners[type] || []).slice();
		var domName = DOM_EVENT_NAMES[type];
		var domEvent;
		var i;

		for (i = 0; i < listeners.length; i++) listeners[i](detail);
		if (domName) {
			domEvent = createDomEvent(this._eventTarget, domName, detail);
			if (domEvent) this._eventTarget.dispatchEvent(domEvent);
		}
	};

	Registry.prototype.on = function (type, listener) {
		var registry = this;
		if (typeof listener !== "function") throw new TypeError("listener must be a function.");
		if (!this._listeners[type]) this._listeners[type] = [];
		this._listeners[type].push(listener);
		return function () {
			registry.off(type, listener);
		};
	};

	Registry.prototype.off = function (type, listener) {
		var listeners = this._listeners[type] || [];
		var index = listeners.indexOf(listener);
		if (index !== -1) listeners.splice(index, 1);
	};

	Registry.prototype.registerProfile = function (profile, options) {
		var normalized = normalizeProfile(profile);
		var exists = !!this._profiles[normalized.id];
		options = options || {};

		if (exists && !options.replace) {
			throw new RomHackProfileError("ROM-hack profile already registered: " + normalized.id + ".", [
				"Pass {replace: true} to intentionally replace a bundled profile."
			]);
		}
		this._profiles[normalized.id] = normalized;
		if (!exists) this._profileOrder.push(normalized.id);
		this._emit("profileschange", {
			action: exists ? "replace" : "register",
			profile: clone(normalized),
			profiles: this.listProfiles()
		});
		return clone(normalized);
	};

	Registry.prototype.registerProfiles = function (profiles, options) {
		var registered = [];
		var i;
		if (!Array.isArray(profiles)) throw new TypeError("profiles must be an array.");
		for (i = 0; i < profiles.length; i++) {
			registered.push(this.registerProfile(profiles[i], options));
		}
		return registered;
	};

	Registry.prototype.unregisterProfile = function (id) {
		id = cleanString(id).toLowerCase();
		if (!this._profiles[id]) return false;
		if (this._activeProfileId === id) this.clearActiveProfile();
		delete this._profiles[id];
		delete this._profileOverrideProviders[id];
		this._profileOrder.splice(this._profileOrder.indexOf(id), 1);
		this._emit("profileschange", {
			action: "unregister",
			profileId: id,
			profiles: this.listProfiles()
		});
		return true;
	};

	Registry.prototype.listProfiles = function () {
		var profiles = [];
		var i;
		for (i = 0; i < this._profileOrder.length; i++) {
			profiles.push(clone(this._profiles[this._profileOrder[i]]));
		}
		return profiles;
	};

	Registry.prototype.getProfile = function (id) {
		var profile = this._profiles[cleanString(id).toLowerCase()];
		return profile ? clone(profile) : null;
	};

	Registry.prototype.registerGenerationProvider = function (generation, provider) {
		var normalizedGeneration = normalizeGeneration(generation, "generation", []);
		if (!normalizedGeneration) throw new RangeError("generation must be an integer from 1 through 9.");
		if (provider === null || provider === undefined) throw new TypeError("provider is required.");
		this._generationProviders[normalizedGeneration] = provider;
		this._emit("providerchange", {
			type: "canonical",
			generation: normalizedGeneration,
			provider: provider
		});
		return provider;
	};

	Registry.prototype.getGenerationProvider = function (generation) {
		return this._generationProviders[Number(generation)] || null;
	};

	Registry.prototype.registerProfileOverrideProvider = function (profileId, provider) {
		var id = cleanString(profileId).toLowerCase();
		if (!this._profiles[id]) throw new Error("Unknown ROM-hack profile: " + id + ".");
		if (provider === null || provider === undefined) throw new TypeError("provider is required.");
		this._profileOverrideProviders[id] = provider;
		this._emit("providerchange", {
			type: "profile-override",
			profile: this.getProfile(id),
			provider: provider
		});
		return provider;
	};

	Registry.prototype.setOverrideProviderHook = function (hook) {
		var previous = this._overrideProviderHook;
		if (hook !== null && typeof hook !== "function") {
			throw new TypeError("override provider hook must be a function or null.");
		}
		this._overrideProviderHook = hook;
		this._emit("providerchange", {type: "resolver-hook", provider: hook});
		return previous;
	};

	Registry.prototype.resolveGenerationProvider = function (profileOrId, extraContext) {
		var profile = typeof profileOrId === "string" ? this.getProfile(profileOrId) : clone(profileOrId);
		var canonicalProvider;
		var overrideProvider;
		var resolvedProvider;
		var hookResult;

		if (!profile) throw new Error("Cannot resolve data provider for an unknown ROM-hack profile.");
		canonicalProvider = this.getGenerationProvider(profile.baseGeneration);
		overrideProvider = this._profileOverrideProviders[profile.id] || null;
		resolvedProvider = overrideProvider || canonicalProvider;

		if (this._overrideProviderHook) {
			hookResult = this._overrideProviderHook({
				profile: clone(profile),
				canonicalProvider: canonicalProvider,
				profileOverrideProvider: overrideProvider,
				context: clone(extraContext || {})
			});
			if (hookResult !== undefined) resolvedProvider = hookResult;
		}

		return {
			canonicalProvider: canonicalProvider,
			overrideProvider: overrideProvider,
			resolvedProvider: resolvedProvider
		};
	};

	Registry.prototype.getActivationContext = function (profileOrId, extraContext) {
		var profile = typeof profileOrId === "string" ? this.getProfile(profileOrId) : clone(profileOrId);
		var providers;
		if (!profile) throw new Error("Unknown ROM-hack profile.");
		providers = this.resolveGenerationProvider(profile, extraContext);
		return {
			profile: profile,
			baseGeneration: profile.baseGeneration,
			calcProfile: profile.calcProfile,
			calcGenerationProfile: profile.calc.generationProfile,
			calcDataGeneration: profile.calc.dataGeneration,
			trainerPackId: profile.trainerData.packId,
			saveGeneration: profile.saveImport.generation,
			saveAdapter: profile.saveImport.adapter,
			battleSimulator: profile.features.battleSimulator,
			canonicalProvider: providers.canonicalProvider,
			overrideProvider: providers.overrideProvider,
			resolvedProvider: providers.resolvedProvider,
			extra: clone(extraContext || {})
		};
	};

	Registry.prototype.activateProfile = function (id, extraContext) {
		var profile = this.getProfile(id);
		var context;
		if (!profile) throw new Error("Unknown ROM-hack profile: " + id + ".");
		this._activeProfileId = profile.id;
		this._activeExtraContext = clone(extraContext || {});
		context = this.getActivationContext(profile, this._activeExtraContext);

		if (this._globalObject) {
			this._globalObject.KMCalculatorActiveRomHackProfile = clone(profile);
			this._globalObject.KMCalculatorActiveRomHackContext = context;
		}
		this._emit("profilechange", context);
		return context;
	};

	Registry.prototype.getActiveProfile = function () {
		return this._activeProfileId ? this.getProfile(this._activeProfileId) : null;
	};

	Registry.prototype.getActiveContext = function () {
		return this._activeProfileId ?
			this.getActivationContext(this._activeProfileId, this._activeExtraContext) : null;
	};

	Registry.prototype.getActiveGeneration = function (calcApi) {
		var context = this.getActiveContext();
		var provider;
		if (!context) return null;
		if (!calcApi) throw new TypeError("calcApi is required.");

		provider = context.resolvedProvider;
		if (provider && typeof provider.getGeneration === "function") {
			return provider.getGeneration(calcApi, context.profile, context);
		}
		if (typeof provider === "function") {
			return provider(calcApi, context.profile, context);
		}
		if (context.profile.calcProfile === "royal-sword" &&
			calcApi.RoyalSwordGenerations &&
			typeof calcApi.RoyalSwordGenerations.get === "function") {
			return calcApi.RoyalSwordGenerations.get(context.baseGeneration);
		}
		if (!calcApi.Generations || typeof calcApi.Generations.get !== "function") {
			throw new TypeError("calcApi.Generations.get is required for a canonical profile.");
		}
		return calcApi.Generations.get(context.baseGeneration);
	};

	Registry.prototype.clearActiveProfile = function () {
		var previous = this.getActiveProfile();
		this._activeProfileId = null;
		this._activeExtraContext = {};
		if (this._globalObject) {
			this._globalObject.KMCalculatorActiveRomHackProfile = null;
			this._globalObject.KMCalculatorActiveRomHackContext = null;
		}
		this._emit("profilechange", {profile: null, previousProfile: previous});
	};

	Registry.prototype.requestChooser = function (reason) {
		this._emit("chooserrequest", {
			reason: cleanString(reason) || "change",
			activeProfile: this.getActiveProfile()
		});
	};

	Registry.prototype.reopenChooser = function () {
		this.requestChooser("change");
	};

	function createRegistry(options) {
		return new Registry(options);
	}

	return {
		PROFILE_SCHEMA: PROFILE_SCHEMA,
		PROFILE_SCHEMA_VERSION: PROFILE_SCHEMA_VERSION,
		RomHackProfileError: RomHackProfileError,
		Registry: Registry,
		normalizeProfile: normalizeProfile,
		createRegistry: createRegistry
	};
});
