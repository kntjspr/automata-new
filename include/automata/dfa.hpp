#ifndef AUTOMATA_DFA_HPP
#define AUTOMATA_DFA_HPP

#include "common.hpp"
#include "state.hpp"
#include "transition.hpp"
#include "nfa.hpp"

namespace automata {

/**
 * @brief Deterministic Finite Automaton
 * 
 * Supports subset construction from NFA, minimization via Hopcroft's algorithm,
 * and efficient string matching.
 */
class DFA {
public:
    DFA();
    ~DFA() = default;
    
    // State management
    StateId addState(const std::string& label = "", bool isAccepting = false);
    void setStartState(StateId id);
    void setAcceptingState(StateId id, bool accepting = true);
    StateId getStartState() const { return startState_; }
    const std::set<StateId>& getAcceptingStates() const { return acceptingStates_; }
    size_t getStateCount() const { return states_.size(); }
    
    // Transition management (DFA has exactly one transition per symbol per state)
    void addTransition(StateId from, StateId to, Symbol symbol);
    std::optional<StateId> getNextState(StateId from, Symbol symbol) const;
    const std::vector<Transition>& getTransitions() const { return transitions_; }
    
    // Acceptance testing
    bool accepts(const std::string& input) const;
    
    // Execution trace for visualization
    struct ExecutionStep {
        StateId currentState;
        Symbol consumedSymbol;
        StateId nextState;
        bool accepted;
    };
    std::vector<ExecutionStep> traceExecution(const std::string& input) const;
    
    // Match all occurrences in text
    std::vector<std::pair<size_t, size_t>> findAllMatches(const std::string& text) const;
    
    // Get alphabet
    std::set<Symbol> getAlphabet() const;
    
    // Get all states
    const std::map<StateId, State>& getStates() const { return states_; }
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;
    
    // Create from JSON
    static DFA fromJson(const std::string& json);
    
    // Subset construction from NFA
    static DFA fromNFA(const NFA& nfa);
    
    // Minimization using Hopcroft's algorithm
    DFA minimize() const;
    
    // Generate regular grammar
    struct GrammarRule {
        char nonTerminal;
        std::string production;
    };
    std::vector<GrammarRule> toRegularGrammar() const;
    
    // Complement DFA
    DFA complement() const;
    
    // Intersection of two DFAs (product construction)
    static DFA intersection(const DFA& a, const DFA& b);
    
    // Union of two DFAs
    static DFA unionDFA(const DFA& a, const DFA& b);

private:
    std::map<StateId, State> states_;
    std::vector<Transition> transitions_;
    std::map<std::pair<StateId, Symbol>, StateId> transitionTable_;
    StateId startState_;
    std::set<StateId> acceptingStates_;
    StateId nextStateId_;
    std::set<Symbol> alphabet_;
};

} // namespace automata

#endif // AUTOMATA_DFA_HPP
