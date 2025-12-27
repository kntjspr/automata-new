#ifndef AUTOMATA_PDA_HPP
#define AUTOMATA_PDA_HPP

#include "common.hpp"
#include "state.hpp"
#include "transition.hpp"

namespace automata {

/**
 * @brief Pushdown Automaton for context-free language recognition
 * 
 * Supports stack operations, configuration tracking, and applications
 * like RNA secondary structure validation and XML well-formedness checking.
 */
class PDA {
public:
    PDA();
    ~PDA() = default;
    
    // State management
    StateId addState(const std::string& label = "", bool isAccepting = false);
    void setStartState(StateId id);
    void setAcceptingState(StateId id, bool accepting = true);
    StateId getStartState() const { return startState_; }
    const std::set<StateId>& getAcceptingStates() const { return acceptingStates_; }
    
    // Stack alphabet
    void setInitialStackSymbol(StackSymbol symbol) { initialStackSymbol_ = symbol; }
    StackSymbol getInitialStackSymbol() const { return initialStackSymbol_; }
    
    // Transition management
    void addTransition(StateId from, StateId to, Symbol inputSymbol,
                       StackSymbol popSymbol, const std::string& pushSymbols);
    const std::vector<PDATransition>& getTransitions() const { return transitions_; }
    
    // Configuration representation
    struct Configuration {
        StateId state;
        std::string remainingInput;
        std::string stack;  // Bottom at index 0, top at end
        
        std::string toString() const;
    };
    
    // Get possible next configurations
    std::vector<Configuration> step(const Configuration& config) const;
    
    // Acceptance testing (by final state)
    bool acceptsByFinalState(const std::string& input) const;
    
    // Acceptance testing (by empty stack)
    bool acceptsByEmptyStack(const std::string& input) const;
    
    // Execution trace for visualization
    struct ExecutionStep {
        Configuration before;
        std::optional<PDATransition> transition;
        Configuration after;
    };
    std::vector<std::vector<ExecutionStep>> traceAllPaths(const std::string& input, size_t maxDepth = 1000) const;
    
    // Get one accepting path if exists
    std::optional<std::vector<ExecutionStep>> findAcceptingPath(const std::string& input) const;
    
    // Get all states
    const std::map<StateId, State>& getStates() const { return states_; }
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;
    
    // Create from JSON
    static PDA fromJson(const std::string& json);
    
    // Pre-built PDAs for common patterns
    
    // Balanced parentheses: { (^n )^n | n >= 0 }
    static PDA createBalancedParentheses();
    
    // Palindromes: { w w^R | w in {a,b}* }
    static PDA createPalindromeRecognizer();
    
    // RNA stem-loop structure recognizer
    static PDA createRNAStemLoopRecognizer();
    
    // XML well-formedness checker (simplified)
    static PDA createXMLValidator();
    
    // a^n b^n language
    static PDA createAnBn();

private:
    std::map<StateId, State> states_;
    std::vector<PDATransition> transitions_;
    StateId startState_;
    std::set<StateId> acceptingStates_;
    StateId nextStateId_;
    StackSymbol initialStackSymbol_;
};

/**
 * @brief Context-Free Grammar representation
 */
class CFG {
public:
    struct Production {
        char lhs;  // Non-terminal
        std::string rhs;  // Right-hand side (mix of terminals and non-terminals)
    };
    
    CFG();
    
    void setStartSymbol(char symbol) { startSymbol_ = symbol; }
    char getStartSymbol() const { return startSymbol_; }
    
    void addProduction(char lhs, const std::string& rhs);
    void addTerminal(char symbol);
    void addNonTerminal(char symbol);
    
    const std::set<char>& getTerminals() const { return terminals_; }
    const std::set<char>& getNonTerminals() const { return nonTerminals_; }
    const std::vector<Production>& getProductions() const { return productions_; }
    
    // Convert to PDA (acceptance by empty stack)
    PDA toPDA() const;
    
    // Parse using CYK algorithm (requires CNF)
    bool parse(const std::string& input) const;
    
    // Convert to Chomsky Normal Form
    CFG toChomskyNormalForm() const;
    
    std::string toString() const;
    std::string toJson() const;

private:
    char startSymbol_;
    std::set<char> terminals_;
    std::set<char> nonTerminals_;
    std::vector<Production> productions_;
};

} // namespace automata

#endif // AUTOMATA_PDA_HPP
