A comprehensive automata theory implementation for DNA pattern matching and context-free language recognition.


## Features

- **Regular Expression Engine**: Regex → NFA → DFA → Minimized DFA (Thompson's construction, subset construction, Hopcroft's minimization)
- **DNA Pattern Matching**: Find motifs with exact or approximate matching
- **Pushdown Automata**: Balanced parentheses, aⁿbⁿ language, palindromes, RNA stem-loops
- **CFG to PDA Conversion**: Convert context-free grammars to pushdown automata
- **Web Interface**: Interactive visualization with Vite + React

---

## Quick Start

```bash
# Build C++ backend
mkdir build && cd build
cmake ..
make

# Start API server (default port 5000)
./api_server &

# Start frontend
cd ../vite/automata
npm install
npm run dev
```
A precompiled binary is also available at `/build/api_server` for linux distributions.

---

## C++ API

### Prerequisites

- CMake 3.16+
- C++17 compatible compiler (GCC 8+, Clang 7+)
- pthread library

### Building

```bash
# Navigate to project root
cd automata-main

# Create build directory
mkdir build && cd build

# Configure and build
cmake ..
make

# Build specific targets
make automata_cli          # Command-line interface
make api_server            # HTTP API server
make automata_engine       # Shared library (.so)
make automata_engine_static # Static library (.a)
```

### Build Outputs

| Target | Description | Location |
|--------|-------------|----------|
| `automata_cli` | Command-line tool | `build/automata_cli` |
| `api_server` | HTTP REST API | `build/api_server` |
| `libautomata_engine.so` | Shared library | `build/libautomata_engine.so` |
| `libautomata_engine_static.a` | Static library | `build/libautomata_engine_static.a` |

---

## Command Line Interface

The `automata_cli` provides four commands:

### `regex` - Regular Expression Demo

Parses regex, builds NFA via Thompson's construction, converts to DFA via subset construction, minimizes via Hopcroft's algorithm.

```bash
./build/automata_cli regex <pattern> [test_string]

# Examples
./build/automata_cli regex "a(b|c)*d" "abcbd"
./build/automata_cli regex "ATG[ACGT]*TAA"
```

### `dna` - DNA Pattern Matching

Finds patterns in DNA sequences with optional mismatch tolerance.

```bash
./build/automata_cli dna <sequence> <pattern> [max_mismatches]

# Examples
./build/automata_cli dna "ATGCGATCGATCG" "ATG" 0
./build/automata_cli dna "ATGCGATCGATCGATGCGATCG" "ATG" 1
```

### `pda` - Pushdown Automaton Demo

Tests pre-built PDAs for context-free languages.

```bash
./build/automata_cli pda <type> <input>
```

| Type | Language | Example |
|------|----------|---------|
| `balanced` | Balanced parentheses | `./build/automata_cli pda balanced "(())"` |
| `anbn` | aⁿbⁿ language | `./build/automata_cli pda anbn "aaabbb"` |
| `palindrome` | Palindromes over {a,b} | `./build/automata_cli pda palindrome "abba"` |
| `rna` | RNA stem-loop | `./build/automata_cli pda rna "GCAUGC"` |

### `viz` - NFA Visualization

Displays ASCII art visualization of NFA structure.

```bash
./build/automata_cli viz <pattern>

# Example: Stop codon visualization
./build/automata_cli viz "TAA|TAG|TGA"
```

---

## Using as a Library

Include headers and link against the library:

```cpp
#include <automata/nfa.hpp>
#include <automata/dfa.hpp>
#include <automata/pda.hpp>
#include <automata/regex_parser.hpp>

using namespace automata;

int main() {
    // Parse regex to NFA (Thompson's construction)
    RegexParser parser;
    NFA nfa = parser.parse("ATG[ACGT]*TAA");
    
    // Convert to DFA (subset construction)
    DFA dfa = DFA::fromNFA(nfa);
    
    // Minimize (Hopcroft's algorithm)
    DFA minDfa = dfa.minimize();
    
    // Test acceptance
    bool matches = minDfa.accepts("ATGCGATAA");
    
    // Create PDA for balanced parentheses
    PDA pda = PDA::createBalancedParentheses();
    bool balanced = pda.acceptsByFinalState("(())");
    
    return 0;
}
```

Compile with:

```bash
g++ -std=c++17 -I./include your_code.cpp -L./build -lautomata_engine
```

---

## API Server

Start the HTTP API server:

```bash
./build/api_server [options]

# Options:
#   -p, --port <port>     Port to listen on (default: 5000)
#   -s, --static <dir>    Static files directory (default: ./vite/dist)
#   -h, --help            Show help
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/bio/analyze` | Analyze DNA sequence (GC content, complement) |
| POST | `/api/bio/match` | Find pattern matches in DNA |
| POST | `/api/pda/rna` | Validate RNA structure (dot-bracket) |
| POST | `/api/pda/xml` | Validate XML well-formedness |

### Example: DNA Pattern Matching

```bash
curl -X POST http://localhost:5000/api/bio/match \
  -H "Content-Type: application/json" \
  -d '{"sequence": "ATGCGATCGATCG", "pattern": "ATG", "maxDistance": 0}'
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {"start": 0, "end": 3, "text": "ATG", "distance": 0, "strand": "forward"}
  ],
  "count": 1
}
```

---

## Frontend for GUI (Vite but uses the C++ API server)

### Prerequisites

- Node.js 18+ or Bun

### Installation

```bash
cd vite/automata

# Using npm
npm install

# Or using bun
bun install
```

### Development

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Project Structure

```
vite/automata/
├── src/
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main application
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── package.json
└── vite.config.ts
```

---

## Project Structure

```
automata-main/
├── CMakeLists.txt           # C++ build configuration
├── README.md                # This file
├── include/
│   ├── automata/
│   │   ├── common.hpp       # Type definitions, constants
│   │   ├── nfa.hpp          # NFA class
│   │   ├── dfa.hpp          # DFA class
│   │   ├── pda.hpp          # PDA and CFG classes
│   │   ├── regex_parser.hpp # Regex parser
│   │   ├── state.hpp        # State class
│   │   └── transition.hpp   # Transition classes
│   └── bio/
│       ├── sequence.hpp     # DNA sequence utilities
│       └── approximate_matcher.hpp
├── src/
│   ├── main.cpp             # CLI entry point
│   ├── api_server.cpp       # HTTP API server
│   ├── nfa.cpp              # NFA + Thompson's construction
│   ├── dfa.cpp              # DFA + subset/minimize
│   ├── pda.cpp              # PDA + CFG to PDA
│   └── regex_parser.cpp     # Recursive descent parser
├── vite/automata/           # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── DOCUMENTATION.md     # Technical documentation
└── build/                   # Build output (generated)
```

---

## Documentation

For detailed technical documentation including algorithm descriptions with mathematical notation, see [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md).

---
