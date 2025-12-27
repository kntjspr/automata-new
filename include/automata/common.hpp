#ifndef AUTOMATA_COMMON_HPP
#define AUTOMATA_COMMON_HPP

#include <string>
#include <vector>
#include <set>
#include <map>
#include <unordered_map>
#include <unordered_set>
#include <memory>
#include <functional>
#include <optional>
#include <variant>
#include <stdexcept>
#include <algorithm>
#include <queue>
#include <stack>
#include <sstream>
#include <iostream>

namespace automata {

// Forward declarations
class State;
class Transition;
class NFA;
class DFA;
class PDA;

// Type aliases
using StateId = int;
using Symbol = char;
using StackSymbol = char;

// Constants
constexpr char EPSILON = '\0';  // Epsilon transition symbol
constexpr char STACK_EMPTY = '$';  // Bottom of stack marker

// Exception classes
class AutomataException : public std::runtime_error {
public:
    explicit AutomataException(const std::string& msg) : std::runtime_error(msg) {}
};

class ParseException : public AutomataException {
public:
    explicit ParseException(const std::string& msg) : AutomataException("Parse error: " + msg) {}
};

class InvalidStateException : public AutomataException {
public:
    explicit InvalidStateException(StateId id) 
        : AutomataException("Invalid state ID: " + std::to_string(id)) {}
};

// Utility functions
inline std::string symbolToString(Symbol s) {
    if (s == EPSILON) return "ε";
    return std::string(1, s);
}

inline bool isEpsilon(Symbol s) {
    return s == EPSILON;
}

} // namespace automata

#endif // AUTOMATA_COMMON_HPP
