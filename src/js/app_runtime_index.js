/*global calc, window */
(function () {
	function normalize(text) {
		return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
	}

	function addName(map, name) {
		var id = normalize(name);
		if (id && !map[id]) map[id] = name;
	}

	function indexNameArray(values) {
		var map = {};
		for (var i = 0; i < (values || []).length; i++) addName(map, values[i]);
		return map;
	}

	function indexObjectNames(values) {
		var map = {};
		Object.keys(values || {}).forEach(function (name) {
			addName(map, name);
		});
		return map;
	}

	function createGenerationIndex(generation) {
		return {
			speciesById: indexObjectNames(calc && calc.SPECIES && calc.SPECIES[generation]),
			movesById: indexObjectNames(calc && calc.MOVES && calc.MOVES[generation]),
			abilitiesById: indexNameArray(calc && calc.ABILITIES && calc.ABILITIES[generation]),
			itemsById: indexNameArray(calc && calc.ITEMS && calc.ITEMS[generation])
		};
	}

	function getGenerationIndex(generation) {
		var index = window.kmCalculatorRuntimeIndex;
		generation = ~~generation || 8;
		if (!index.generations[generation]) index.generations[generation] = createGenerationIndex(generation);
		return index.generations[generation];
	}

	function rebuildTrainerIndex() {
		var trainers = typeof window.TRAINERDEX !== "undefined" ? window.TRAINERDEX : null;
		var trainerIndex = {
			byId: {},
			byName: {},
			byPackId: {}
		};
		var entries;
		if (typeof window.getTrainerEntries === "function") {
			entries = window.getTrainerEntries();
		} else if (Array.isArray(trainers)) {
			entries = trainers;
		} else {
			entries = Object.keys(trainers || {}).map(function (name) {
				return {
					area: "Trainers",
					trainer: name,
					pokemon: trainers[name]
				};
			});
		}
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
			var name = entry && (entry.trainer || entry.name) ? (entry.trainer || entry.name) : "";
			var id = entry && entry._kmId ? entry._kmId : String(i);
			trainerIndex.byId[id] = entry;
			if (name) trainerIndex.byName[normalize(name)] = entry;
			if (entry && entry._kmPack) {
				if (!trainerIndex.byPackId[entry._kmPack.id]) trainerIndex.byPackId[entry._kmPack.id] = {};
				trainerIndex.byPackId[entry._kmPack.id][entry.id || id] = entry;
			}
		}
		window.kmCalculatorRuntimeIndex.trainers = trainerIndex;
		return trainerIndex;
	}

	window.kmCalculatorRuntimeIndex = {
		generations: {},
		normalize: normalize,
		getGeneration: getGenerationIndex,
		getSpeciesName: function (generation, name) {
			return getGenerationIndex(generation).speciesById[normalize(name)] || "";
		},
		getMoveName: function (generation, name) {
			return getGenerationIndex(generation).movesById[normalize(name)] || "";
		},
		getAbilityName: function (generation, name) {
			return getGenerationIndex(generation).abilitiesById[normalize(name)] || "";
		},
		getItemName: function (generation, name) {
			return getGenerationIndex(generation).itemsById[normalize(name)] || "";
		},
		trainers: {
			byId: {},
			byName: {}
		}
	};
	window.royalSwordRuntimeIndex = window.kmCalculatorRuntimeIndex;
	window.rebuildKMCalculatorTrainerIndex = rebuildTrainerIndex;
	window.rebuildRoyalSwordTrainerIndex = rebuildTrainerIndex;
	for (var generation = 1; generation <= 9; generation++) getGenerationIndex(generation);
})();
