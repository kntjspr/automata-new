#ifndef AUTOMATA_NFA_HPP
#define AUTOMATA_NFA_HPP

#include "common.hpp"
#include "state.hpp"
#include "transition.hpp"

namespace automata {

/**
 * @brief Non-deterministic Finite Automaton with epsilon transitions
 * 
 * Supports Thompson's construction from regex, epsilon-closure computation,
 * and string acceptance testing.
 */
class NFA {
public:
    NFA();
    ~NFA() = default;
    
    // Copy and move
    NFA(const NFA& other);
    NFA(NFA&& other) noexcept;
    NFA& operator=(const NFA& other);
    NFA& operator=(NFA&& other) noexcept;
    
    // State management
    StateId addState(const std::string& label = "", bool isAccepting = false);
    void setStartState(StateId id);
    void setAcceptingState(StateId id, bool accepting = true);
    StateId getStartState() const { return startState_; }
    const std::set<StateId>& getAcceptingStates() const { return acceptingStates_; }
    size_t getStateCount() const { return states_.size(); }
    
    // Transition management
    void addTransition(StateId from, StateId to, Symbol symbol);
    void addEpsilonTransition(StateId from, StateId to);
    const std::vector<Transition>& getTransitions() const { return transitions_; }
    
    // Get transitions from a state
    std::vector<Transition> getTransitionsFrom(StateId state) const;
    std::vector<Transition> getTransitionsFrom(StateId state, Symbol symbol) const;
    
    // Epsilon closure
    std::set<StateId> epsilonClosure(StateId state) const;
    std::set<StateId> epsilonClosure(const std::set<StateId>& states) const;
    
    // Move function (delta)
    std::set<StateId> move(const std::set<StateId>& states, Symbol symbol) const;
    
    // Extended transition function
    std::set<StateId> extendedDelta(const std::set<StateId>& states, const std::string& input) const;
    
    // Acceptance testing
    bool accepts(const std::string& input) const;
    
    // Execution trace for visualization
    struct ExecutionStep {
        std::set<StateId> currentStates;
        Symbol consumedSymbol;
        std::set<StateId> nextStates;
        bool isEpsilonMove;
    };
    std::vector<ExecutionStep> traceExecution(const std::string& input) const;
    
    // Alphabet extraction
    std::set<Symbol> getAlphabet() const;
    
    // Get all states
    const std::map<StateId, State>& getStates() const { return states_; }
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;
    
    // Create from JSON
    static NFA fromJson(const std::string& json);
    
    // Thompson's construction building blocks
    static NFA createEmpty();  // Accepts only empty string
    static NFA createSingle(Symbol s);  // Accepts single symbol
    static NFA createUnion(NFA&& a, NFA&& b);  // a | b
    static NFA createConcat(NFA&& a, NFA&& b);  // ab
    static NFA createStar(NFA&& a);  // a*
    static NFA createPlus(NFA&& a);  // a+
    static NFA createOptional(NFA&& a);  // a?

private:
    std::map<StateId, State> states_;
    std::vector<Transition> transitions_;
    StateId startState_;
    std::set<StateId> acceptingStates_;
    StateId nextStateId_;
    
    // Internal helper for state renumbering during Thompson's construction
    void renumberStates(StateId offset);
};

} // namespace automata

#endif // AUTOMATA_NFA_HPP
