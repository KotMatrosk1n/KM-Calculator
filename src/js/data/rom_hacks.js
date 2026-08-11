/*global module, require */

/* Bundled ROM-hack profiles for KM Calculator. */
(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory(require("../rom_hack_registry.js"));
	} else {
		var bundled = factory(root.KMCalculatorRomHacks);
		root.KMCalculatorBundledRomHacks = bundled;
		bundled.install(root.kmRomHackRegistry);
	}
})(typeof self !== "undefined" ? self : this, function (romHackApi) {
	"use strict";

	if (!romHackApi) throw new Error("rom_hack_registry.js must load before data/rom_hacks.js.");

	var profiles = [
		{
			id: "pokemon-royal-sword",
			name: "Pokémon Royal Sword",
			shortName: "Royal Sword",
			version: "1",
			baseGeneration: 8,
			calcProfile: "royal-sword",
			calc: {
				dataGeneration: 8
			},
			trainerData: {
				packId: "pokemon-royal-sword"
			},
			saveImport: {
				generation: 8
			},
			generationData: {
				canonicalProviderId: "canonical-gen-8",
				overrideProviderId: "royal-sword"
			},
			features: {
				battleSimulator: "royal-sword-swsh-ai"
			},
			tile: {
				description: "Generation 8 data, trainers, save imports, and Royal Sword mechanics.",
				icon: "./img/km-calculator-icon.png",
				badge: "Generation 8"
			},
			attribution: {
				authors: [
					{
						name: "Matroskin",
						role: "KM Calculator profile, mechanics integration, and bundled trainer data"
					}
				],
				source: {
					name: "KM Calculator Pokémon Royal Sword profile",
					url: "https://github.com/KotMatrosk1n/KM-Calculator"
				},
				license: {
					name: "MIT",
					url: "https://github.com/KotMatrosk1n/KM-Calculator/blob/master/LICENSE"
				},
				notes: "Attribution covers the calculator profile and bundled support data."
			}
		}
	];

	var canonicalGenerationEightProvider = {
		id: "canonical-gen-8",
		kind: "canonical-generation",
		generation: 8,
		getGeneration: function (calcApi, profile) {
			if (!calcApi || !calcApi.Generations || typeof calcApi.Generations.get !== "function") {
				throw new TypeError("The canonical calculator generation provider requires calc.Generations.get.");
			}
			return calcApi.Generations.get(profile.baseGeneration);
		}
	};

	var royalSwordOverrideProvider = {
		id: "royal-sword",
		kind: "rom-hack-override",
		baseGeneration: 8,
		getGeneration: function (calcApi, profile) {
			if (!calcApi || !calcApi.RoyalSwordGenerations ||
				typeof calcApi.RoyalSwordGenerations.get !== "function") {
				throw new Error("The Royal Sword calculator data profile is not available in this build.");
			}
			return calcApi.RoyalSwordGenerations.get(profile.baseGeneration);
		}
	};

	function install(registry) {
		var i;
		if (!registry || typeof registry.registerProfile !== "function") {
			throw new TypeError("A KM Calculator ROM-hack registry is required.");
		}

		for (i = 0; i < profiles.length; i++) {
			registry.registerProfile(profiles[i], {replace: !!registry.getProfile(profiles[i].id)});
		}
		registry.registerGenerationProvider(8, canonicalGenerationEightProvider);
		registry.registerProfileOverrideProvider("pokemon-royal-sword", royalSwordOverrideProvider);
		return registry.listProfiles();
	}

	return {
		profiles: profiles,
		canonicalGenerationEightProvider: canonicalGenerationEightProvider,
		royalSwordOverrideProvider: royalSwordOverrideProvider,
		install: install
	};
});
