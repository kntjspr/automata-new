#ifndef AUTOMATA_TRANSITION_HPP
#define AUTOMATA_TRANSITION_HPP

#include "common.hpp"

namespace automata {

/**
 * @brief Represents a transition in a finite automaton
 * 
 * A transition connects a source state to a destination state on a given symbol.
 * Epsilon transitions use the EPSILON constant as the symbol.
 */
class Transition {
public:
    /**
     * @brief Construct a new Transition
     * @param from Source state ID
     * @param to Destination state ID
     * @param symbol Transition symbol (EPSILON for epsilon transitions)
     */
    Transition(StateId from, StateId to, Symbol symbol);
    
    // Getters
    StateId getFrom() const { return from_; }
    StateId getTo() const { return to_; }
    Symbol getSymbol() const { return symbol_; }
    
    // Check if this is an epsilon transition
    bool isEpsilon() const { return symbol_ == EPSILON; }
    
    // For use in sets/maps
    bool operator<(const Transition& other) const;
    bool operator==(const Transition& other) const;
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;

private:
    StateId from_;
    StateId to_;
    Symbol symbol_;
};

/**
 * @brief Represents a transition in a Pushdown Automaton
 * 
 * PDA transitions also include stack operations (pop and push symbols).
 */
class PDATransition {
public:
    /**
     * @brief Construct a new PDA Transition
     * @param from Source state ID
     * @param to Destination state ID
     * @param inputSymbol Input symbol to consume (EPSILON for no consumption)
     * @param popSymbol Stack symbol to pop (EPSILON for no pop)
     * @param pushSymbols Symbols to push onto stack (top is last)
     */
    PDATransition(StateId from, StateId to, Symbol inputSymbol,
                  StackSymbol popSymbol, const std::string& pushSymbols);
    
    // Getters
    StateId getFrom() const { return from_; }
    StateId getTo() const { return to_; }
    Symbol getInputSymbol() const { return inputSymbol_; }
    StackSymbol getPopSymbol() const { return popSymbol_; }
    const std::string& getPushSymbols() const { return pushSymbols_; }
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;

private:
    StateId from_;
    StateId to_;
    Symbol inputSymbol_;
    StackSymbol popSymbol_;
    std::string pushSymbols_;  // Symbols to push (bottom to top)
};

} // namespace automata

#endif // AUTOMATA_TRANSITION_HPP
