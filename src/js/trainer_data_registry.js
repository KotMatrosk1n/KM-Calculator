/*global module */

(function (root, factory) {
	var api = factory();
	if (typeof module === "object" && module.exports) module.exports = api;
	if (root) root.KMTrainerDataRegistry = api;
})(typeof window !== "undefined" ? window : this, function () {
	"use strict";

	var SCHEMA = "km-calculator.trainer-pack";
	var SCHEMA_VERSION = 1;
	var DEFAULT_STORAGE_KEY = "km-calculator.trainer-packs.v1";
	var STAT_ALIASES = {
		hp: "hp",
		at: "at",
		atk: "at",
		df: "df",
		def: "df",
		sa: "sa",
		spa: "sa",
		sl: "sl",
		spc: "sl",
		spd: "sd",
		sd: "sd",
		sp: "sp",
		spe: "sp"
	};

	function TrainerDataError(message, issues) {
		this.name = "TrainerDataError";
		this.message = message;
		this.issues = issues || [];
		if (Error.captureStackTrace) Error.captureStackTrace(this, TrainerDataError);
	}
	TrainerDataError.prototype = Object.create(Error.prototype);
	TrainerDataError.prototype.constructor = TrainerDataError;

	function isObject(value) {
		return !!value && typeof value === "object" && !Array.isArray(value);
	}

	function copy(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function cleanString(value) {
		return typeof value === "string" ? value.trim() : "";
	}

	function isPublicUrl(value) {
		return /^https?:\/\/[^\s]+$/i.test(cleanString(value));
	}

	function slug(value) {
		return cleanString(value)
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.replace(/^-+|-+$/g, "") || "trainer";
	}

	function pushIssue(issues, path, message) {
		issues.push(path + ": " + message);
	}

	function normalizeGenerations(value, path, issues) {
		var source = Array.isArray(value) ? value : [value];
		var seen = {};
		var result = [];
		for (var i = 0; i < source.length; i++) {
			var generation = Number(source[i]);
			if (generation % 1 !== 0 || generation < 1 || generation > 9) {
				pushIssue(issues, path + "[" + i + "]", "must be an integer from 1 through 9");
				continue;
			}
			if (!seen[generation]) {
				seen[generation] = true;
				result.push(generation);
			}
		}
		result.sort();
		return result;
	}

	function normalizeAuthors(value, issues) {
		if (!Array.isArray(value) || !value.length) {
			pushIssue(issues, "authors", "must list at least one credited person or team");
			return [];
		}
		var authors = [];
		for (var i = 0; i < value.length; i++) {
			var author = value[i];
			if (typeof author === "string") author = {name: author};
			if (!isObject(author) || !cleanString(author.name)) {
				pushIssue(issues, "authors[" + i + "]", "must contain a name");
				continue;
			}
			var normalized = {name: cleanString(author.name)};
			if (cleanString(author.url)) {
				if (!isPublicUrl(author.url)) pushIssue(issues, "authors[" + i + "].url", "must be an http or https URL");
				else normalized.url = cleanString(author.url);
			}
			authors.push(normalized);
		}
		return authors;
	}

	function normalizeSource(value, issues) {
		if (!isObject(value)) {
			pushIssue(issues, "source", "must identify the trainer-data source");
			return {name: "", url: ""};
		}
		var source = {
			name: cleanString(value.name),
			url: cleanString(value.url)
		};
		if (!source.name) pushIssue(issues, "source.name", "is required");
		if (!source.url) pushIssue(issues, "source.url", "is required for attribution");
		else if (!isPublicUrl(source.url)) pushIssue(issues, "source.url", "must be an http or https URL");
		if (cleanString(value.notes)) source.notes = cleanString(value.notes);
		return source;
	}

	function normalizeStats(value, path, maximum, issues) {
		if (value === undefined) return undefined;
		if (!isObject(value)) {
			pushIssue(issues, path, "must be an object keyed by stats");
			return undefined;
		}
		var stats = {};
		var keys = Object.keys(value);
		for (var i = 0; i < keys.length; i++) {
			var input = keys[i];
			var stat = STAT_ALIASES[input.toLowerCase()];
			var number = Number(value[input]);
			if (!stat) {
				pushIssue(issues, path + "." + input, "is not a supported stat key");
				continue;
			}
			if (number % 1 !== 0 || number < 0 || number > maximum) {
				pushIssue(issues, path + "." + input, "must be an integer from 0 through " + maximum);
				continue;
			}
			stats[stat] = number;
		}
		return stats;
	}

	function normalizePokemon(value, path, issues) {
		if (!isObject(value)) {
			pushIssue(issues, path, "must be an object");
			return null;
		}
		var species = cleanString(value.species || value.name);
		if (!species) pushIssue(issues, path + ".species", "is required");
		var pokemon = {species: species};
		var stringFields = ["nickname", "ability", "item", "nature", "gender", "teraType"];
		for (var i = 0; i < stringFields.length; i++) {
			var field = stringFields[i];
			if (cleanString(value[field])) pokemon[field] = cleanString(value[field]);
		}
		if (pokemon.gender && ["M", "F", "N"].indexOf(pokemon.gender) === -1) {
			pushIssue(issues, path + ".gender", "must be M, F, or N");
		}
		var level = value.level === undefined ? 100 : Number(value.level);
		if (level % 1 !== 0 || level < 1 || level > 100) {
			pushIssue(issues, path + ".level", "must be an integer from 1 through 100");
		} else {
			pokemon.level = level;
		}
		if (value.slot !== undefined) {
			var slot = Number(value.slot);
			if (slot % 1 !== 0 || slot < 1) pushIssue(issues, path + ".slot", "must be a positive integer");
			else pokemon.slot = slot;
		}
		if (value.moves !== undefined) {
			if (!Array.isArray(value.moves)) {
				pushIssue(issues, path + ".moves", "must be an array");
			} else {
				pokemon.moves = [];
				for (var moveIndex = 0; moveIndex < value.moves.length && moveIndex < 4; moveIndex++) {
					var move = cleanString(value.moves[moveIndex]);
					if (!move) pushIssue(issues, path + ".moves[" + moveIndex + "]", "must be a non-empty move name");
					else pokemon.moves.push(move);
				}
				if (value.moves.length > 4) pushIssue(issues, path + ".moves", "cannot contain more than four moves");
			}
		}
		pokemon.ivs = normalizeStats(value.ivs, path + ".ivs", 31, issues);
		pokemon.dvs = normalizeStats(value.dvs, path + ".dvs", 15, issues);
		pokemon.evs = normalizeStats(value.evs, path + ".evs", 252, issues);
		if (isObject(value.metadata)) pokemon.metadata = copy(value.metadata);
		return pokemon;
	}

	function normalizeTrainer(value, index, packGenerations, issues) {
		var path = "trainers[" + index + "]";
		if (!isObject(value)) {
			pushIssue(issues, path, "must be an object");
			return null;
		}
		var name = cleanString(value.name || value.trainer);
		if (!name) pushIssue(issues, path + ".name", "is required");
		var id = slug(value.id || name + "-" + (index + 1));
		var battleType = cleanString(value.battleType || "Single").toLowerCase();
		if (["single", "double"].indexOf(battleType) === -1) {
			pushIssue(issues, path + ".battleType", "must be Single or Double in schema version 1");
		}
		var pokemonSource = value.pokemon || value.team;
		if (!Array.isArray(pokemonSource) || !pokemonSource.length) {
			pushIssue(issues, path + ".pokemon", "must contain at least one Pokemon");
			pokemonSource = [];
		}
		var pokemon = [];
		for (var i = 0; i < pokemonSource.length; i++) {
			var normalizedPokemon = normalizePokemon(pokemonSource[i], path + ".pokemon[" + i + "]", issues);
			if (normalizedPokemon) pokemon.push(normalizedPokemon);
		}
		var generationSource = value.generations !== undefined ? value.generations :
			(value.generation !== undefined ? value.generation : packGenerations);
		var trainer = {
			id: id,
			area: cleanString(value.area) || "Trainers",
			name: name,
			trainer: name,
			battleType: battleType === "double" ? "Double" : "Single",
			generations: normalizeGenerations(generationSource, path + ".generations", issues),
			pokemon: pokemon
		};
		if (cleanString(value.variant)) trainer.variant = cleanString(value.variant);
		if (isObject(value.metadata)) trainer.metadata = copy(value.metadata);
		return trainer;
	}

	function normalizePack(value) {
		var issues = [];
		if (!isObject(value)) throw new TrainerDataError("Trainer pack must be a JSON object", ["root: must be an object"]);
		if (value.schema !== undefined && value.schema !== SCHEMA) {
			pushIssue(issues, "schema", "must be " + SCHEMA);
		}
		var version = Number(value.schemaVersion);
		if (version !== SCHEMA_VERSION) pushIssue(issues, "schemaVersion", "must be " + SCHEMA_VERSION);
		var id = slug(value.id);
		if (!cleanString(value.id)) pushIssue(issues, "id", "is required");
		var name = cleanString(value.name);
		if (!name) pushIssue(issues, "name", "is required");
		var generationsValue = value.generations !== undefined ? value.generations : value.generation;
		var generations = normalizeGenerations(generationsValue, "generations", issues);
		if (!generations.length) pushIssue(issues, "generations", "must include at least one generation");
		var trainersSource = value.trainers;
		if (!Array.isArray(trainersSource) || !trainersSource.length) {
			pushIssue(issues, "trainers", "must contain at least one trainer");
			trainersSource = [];
		}
		var trainers = [];
		var trainerIds = {};
		for (var i = 0; i < trainersSource.length; i++) {
			var trainer = normalizeTrainer(trainersSource[i], i, generations, issues);
			if (!trainer) continue;
			if (trainerIds[trainer.id]) pushIssue(issues, "trainers[" + i + "].id", "duplicates " + trainer.id);
			trainerIds[trainer.id] = true;
			trainers.push(trainer);
		}
		var pack = {
			schema: SCHEMA,
			schemaVersion: SCHEMA_VERSION,
			id: id,
			name: name,
			version: cleanString(value.version) || "1",
			generations: generations,
			authors: normalizeAuthors(value.authors, issues),
			source: normalizeSource(value.source, issues),
			license: cleanString(value.license),
			profileId: slug(value.profileId || value.id),
			trainers: trainers
		};
		if (!pack.license) pushIssue(issues, "license", "is required so redistribution terms remain visible");
		if (cleanString(value.game)) pack.game = cleanString(value.game);
		if (cleanString(value.mod)) pack.mod = cleanString(value.mod);
		if (cleanString(value.description)) pack.description = cleanString(value.description);
		if (isObject(value.metadata)) pack.metadata = copy(value.metadata);
		if (issues.length) throw new TrainerDataError("Trainer pack validation failed", issues);
		return pack;
	}

	function createRegistry(options) {
		options = options || {};
		var storage = options.storage || null;
		var storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
		var builtInPacks = [];
		var importedPacks = [];

		function persist() {
			if (!storage || typeof storage.setItem !== "function") return;
			storage.setItem(storageKey, JSON.stringify(importedPacks));
		}

		function replacePack(collection, pack) {
			for (var i = 0; i < collection.length; i++) {
				if (collection[i].id === pack.id) {
					collection[i] = pack;
					return;
				}
			}
			collection.push(pack);
		}

		function setBuiltInPack(value) {
			var pack = normalizePack(value);
			replacePack(builtInPacks, pack);
			return copy(pack);
		}

		function importPack(value) {
			var pack = normalizePack(value);
			for (var i = 0; i < builtInPacks.length; i++) {
				if (builtInPacks[i].id === pack.id) {
					throw new TrainerDataError("Trainer pack id is reserved by built-in data", ["id: " + pack.id + " is built in"]);
				}
			}
			replacePack(importedPacks, pack);
			persist();
			return copy(pack);
		}

		function load() {
			var report = {loaded: 0, errors: []};
			if (!storage || typeof storage.getItem !== "function") return report;
			var text = storage.getItem(storageKey);
			if (!text) return report;
			var values;
			try {
				values = JSON.parse(text);
			} catch (error) {
				report.errors.push("Stored trainer packs are not valid JSON");
				return report;
			}
			if (!Array.isArray(values)) values = [values];
			importedPacks = [];
			for (var i = 0; i < values.length; i++) {
				try {
					replacePack(importedPacks, normalizePack(values[i]));
					report.loaded++;
				} catch (error) {
					report.errors.push(error.message + (error.issues && error.issues.length ? ": " + error.issues.join("; ") : ""));
				}
			}
			return report;
		}

		function removeImportedPack(id) {
			var normalizedId = slug(id);
			var next = [];
			var removed = false;
			for (var i = 0; i < importedPacks.length; i++) {
				if (importedPacks[i].id === normalizedId) removed = true;
				else next.push(importedPacks[i]);
			}
			importedPacks = next;
			if (removed) persist();
			return removed;
		}

		function clearImportedPacks() {
			var count = importedPacks.length;
			importedPacks = [];
			persist();
			return count;
		}

		function getPacks() {
			return copy(builtInPacks.concat(importedPacks));
		}

		function getImportedPacks() {
			return copy(importedPacks);
		}

		function supportsGeneration(generations, generation) {
			return !generation || generations.indexOf(Number(generation)) !== -1;
		}

		function getTrainerEntries(generation, profileId) {
			var entries = [];
			var packs = builtInPacks.concat(importedPacks);
			var selectedProfile = profileId ? slug(profileId) : "";
			for (var packIndex = 0; packIndex < packs.length; packIndex++) {
				var pack = packs[packIndex];
				if (selectedProfile && pack.profileId !== selectedProfile) continue;
				if (!supportsGeneration(pack.generations, generation)) continue;
				for (var trainerIndex = 0; trainerIndex < pack.trainers.length; trainerIndex++) {
					var trainer = pack.trainers[trainerIndex];
					if (!supportsGeneration(trainer.generations, generation)) continue;
					var entry = copy(trainer);
					entry._kmId = pack.id + ":" + trainer.id;
					entry._kmPack = {
						id: pack.id,
						name: pack.name,
						version: pack.version,
						authors: copy(pack.authors),
						source: copy(pack.source),
						license: pack.license,
						game: pack.game || "",
						mod: pack.mod || ""
					};
					entry._kmPack.profileId = pack.profileId;
					entries.push(entry);
				}
			}
			return entries;
		}

		return {
			setBuiltInPack: setBuiltInPack,
			importPack: importPack,
			load: load,
			removeImportedPack: removeImportedPack,
			clearImportedPacks: clearImportedPacks,
			getPacks: getPacks,
			getImportedPacks: getImportedPacks,
			getTrainerEntries: getTrainerEntries
		};
	}

	return {
		SCHEMA: SCHEMA,
		SCHEMA_VERSION: SCHEMA_VERSION,
		DEFAULT_STORAGE_KEY: DEFAULT_STORAGE_KEY,
		TrainerDataError: TrainerDataError,
		normalizePack: normalizePack,
		createRegistry: createRegistry
	};
});
