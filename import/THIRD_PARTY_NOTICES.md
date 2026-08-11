# Save-import third-party notices

The generated save-import lookup bundle uses factual name and game-index data from the following permissively licensed projects. PKHeX is not bundled; it is used only as an external compatibility-validation reference.

## PokéAPI

Source: <https://github.com/PokeAPI/pokeapi>
Pinned revision: `17dd3092872cabcb7c008051771d2a2fd8c8c260`
License: BSD 3-Clause

Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors (<https://github.com/PokeAPI/pokeapi#contributing>). Pokémon and Pokémon character names are trademarks of Nintendo.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- Neither the name of PokéAPI nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Pokémon Showdown

Source: <https://github.com/smogon/pokemon-showdown>
Pinned revision: `54069be35a89f103e06aabcfbe624382179308af`
License: MIT

Copyright (c) 2011-2026 Guangcong Luo and other contributors <http://pokemonshowdown.com/>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## PKHeX validation reference

Source: <https://github.com/kwsch/PKHeX>
Audited revision: `6169d60cfdd2bfe30e17805f8677523e8d498d67`
License: GPL-3.0

No PKHeX source code or generated resource bundle is intentionally included by this save-import work. The pinned revision is an external behavioral oracle used to compare supported game families, entity sizes, offsets, and expected outcomes. GPL attribution does not grant permission to copy PKHeX implementation expression into this MIT repository.

## Release-review disclosure: Switch XOR interoperability constant

`src/js/save_import.js` retains a pre-existing 127-byte static XOR constant required to open supported Switch save containers. Its original provenance and licensing could not be independently established during this audit. The surrounding parser and keystream implementation were independently rewritten, but this isolated constant must receive legal/provenance review before release; this notice does not represent it as MIT-licensed or as authorized by PKHeX attribution.
