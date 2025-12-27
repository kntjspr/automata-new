#include "automata/pda.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

PDA::PDA() : startState_(-1), nextStateId_(0), initialStackSymbol_(STACK_EMPTY) {}

StateId PDA::addState(const std::string& label, bool isAccepting) {
    StateId id = nextStateId_++;
    states_.emplace(id, State(id, label, isAccepting, states_.empty()));
    if (states_.size() == 1) startState_ = id;
    if (isAccepting) acceptingStates_.insert(id);
    return id;
}

void PDA::setStartState(StateId id) {
    if (states_.find(id) == states_.end()) throw InvalidStateException(id);
    startState_ = id;
    states_.at(id).setStart(true);
}

void PDA::setAcceptingState(StateId id, bool accepting) {
    if (states_.find(id) == states_.end()) throw InvalidStateException(id);
    states_.at(id).setAccepting(accepting);
    if (accepting) acceptingStates_.insert(id);
    else acceptingStates_.erase(id);
}

void PDA::addTransition(StateId from, StateId to, Symbol inputSymbol,
                        StackSymbol popSymbol, const std::string& pushSymbols) {
    transitions_.emplace_back(from, to, inputSymbol, popSymbol, pushSymbols);
}

std::string PDA::Configuration::toString() const {
    return "(" + std::to_string(state) + ", \"" + remainingInput + "\", " + stack + ")";
}

std::vector<PDA::Configuration> PDA::step(const Configuration& config) const {
    std::vector<Configuration> next;
    for (const auto& t : transitions_) {
        if (t.getFrom() != config.state) continue;
        
        // Check input symbol
        bool consumeInput = t.getInputSymbol() != EPSILON;
        if (consumeInput && (config.remainingInput.empty() || 
            config.remainingInput[0] != t.getInputSymbol())) continue;
        
        // Check stack top
        bool popStack = t.getPopSymbol() != EPSILON;
        if (popStack && (config.stack.empty() || 
            config.stack.back() != t.getPopSymbol())) continue;
        
        // Create new configuration
        Configuration newConfig;
        newConfig.state = t.getTo();
        newConfig.remainingInput = consumeInput ? config.remainingInput.substr(1) : config.remainingInput;
        newConfig.stack = popStack ? config.stack.substr(0, config.stack.size() - 1) : config.stack;
        newConfig.stack += t.getPushSymbols();
        
        next.push_back(newConfig);
    }
    return next;
}

bool PDA::acceptsByFinalState(const std::string& input) const {
    if (startState_ < 0) return false;
    
    std::queue<Configuration> bfs;
    Configuration initial{startState_, input, std::string(1, initialStackSymbol_)};
    bfs.push(initial);
    
    std::set<std::tuple<StateId, std::string, std::string>> visited;
    size_t maxIterations = 10000;
    
    while (!bfs.empty() && maxIterations-- > 0) {
        Configuration current = bfs.front();
        bfs.pop();
        
        auto key = std::make_tuple(current.state, current.remainingInput, current.stack);
        if (visited.count(key)) continue;
        visited.insert(key);
        
        if (current.remainingInput.empty() && acceptingStates_.count(current.state)) {
            return true;
        }
        
        for (const auto& next : step(current)) {
            bfs.push(next);
        }
    }
    return false;
}

bool PDA::acceptsByEmptyStack(const std::string& input) const {
    if (startState_ < 0) return false;
    
    std::queue<Configuration> bfs;
    Configuration initial{startState_, input, std::string(1, initialStackSymbol_)};
    bfs.push(initial);
    
    std::set<std::tuple<StateId, std::string, std::string>> visited;
    size_t maxIterations = 10000;
    
    while (!bfs.empty() && maxIterations-- > 0) {
        Configuration current = bfs.front();
        bfs.pop();
        
        auto key = std::make_tuple(current.state, current.remainingInput, current.stack);
        if (visited.count(key)) continue;
        visited.insert(key);
        
        if (current.remainingInput.empty() && current.stack.empty()) {
            return true;
        }
        
        for (const auto& next : step(current)) {
            bfs.push(next);
        }
    }
    return false;
}

std::optional<std::vector<PDA::ExecutionStep>> PDA::findAcceptingPath(const std::string& input) const {
    if (startState_ < 0) return std::nullopt;
    
    struct PathNode {
        Configuration config;
        std::optional<PDATransition> transition;
        int parent;
    };
    
    std::vector<PathNode> nodes;
    std::queue<int> bfs;
    
    Configuration initial{startState_, input, std::string(1, initialStackSymbol_)};
    nodes.push_back({initial, std::nullopt, -1});
    bfs.push(0);
    
    std::set<std::tuple<StateId, std::string, std::string>> visited;
    
    while (!bfs.empty()) {
        int idx = bfs.front();
        bfs.pop();
        
        const Configuration& current = nodes[idx].config;
        auto key = std::make_tuple(current.state, current.remainingInput, current.stack);
        if (visited.count(key)) continue;
        visited.insert(key);
        
        if (current.remainingInput.empty() && acceptingStates_.count(current.state)) {
            // Reconstruct path
            std::vector<ExecutionStep> path;
            int i = idx;
            while (nodes[i].parent >= 0) {
                ExecutionStep step;
                step.after = nodes[i].config;
                step.transition = nodes[i].transition;
                step.before = nodes[nodes[i].parent].config;
                path.push_back(step);
                i = nodes[i].parent;
            }
            std::reverse(path.begin(), path.end());
            return path;
        }
        
        for (const auto& t : transitions_) {
            if (t.getFrom() != current.state) continue;
            
            bool consumeInput = t.getInputSymbol() != EPSILON;
            if (consumeInput && (current.remainingInput.empty() || 
                current.remainingInput[0] != t.getInputSymbol())) continue;
            
            bool popStack = t.getPopSymbol() != EPSILON;
            if (popStack && (current.stack.empty() || 
                current.stack.back() != t.getPopSymbol())) continue;
            
            Configuration newConfig;
            newConfig.state = t.getTo();
            newConfig.remainingInput = consumeInput ? current.remainingInput.substr(1) : current.remainingInput;
            newConfig.stack = popStack ? current.stack.substr(0, current.stack.size() - 1) : current.stack;
            newConfig.stack += t.getPushSymbols();
            
            nodes.push_back({newConfig, t, idx});
            bfs.push(nodes.size() - 1);
        }
    }
    return std::nullopt;
}

std::string PDA::toString() const {
    std::ostringstream oss;
    oss << "PDA:\n  States: ";
    for (const auto& [id, state] : states_) oss << state.toString() << " ";
    oss << "\n  Transitions:\n";
    for (const auto& t : transitions_) oss << "    " << t.toString() << "\n";
    return oss.str();
}

std::string PDA::toJson() const {
    JsonSerializer::ArrayBuilder statesArray, transitionsArray, acceptingArray;
    for (const auto& [id, state] : states_) statesArray.addRaw(state.toJson());
    for (const auto& t : transitions_) transitionsArray.addRaw(t.toJson());
    for (StateId s : acceptingStates_) acceptingArray.add(static_cast<int>(s));
    return JsonSerializer::ObjectBuilder()
        .add("type", std::string("PDA")).add("startState", startState_)
        .add("initialStackSymbol", std::string(1, initialStackSymbol_))
        .addRaw("acceptingStates", acceptingArray.build())
        .addRaw("states", statesArray.build())
        .addRaw("transitions", transitionsArray.build()).build();
}

// Pre-built PDAs

PDA PDA::createBalancedParentheses() {
    PDA pda;
    StateId q0 = pda.addState("q0", true);
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    // Push ( on stack
    pda.addTransition(q0, q0, '(', EPSILON, "(");
    // Pop ( when seeing )
    pda.addTransition(q0, q0, ')', '(', "");
    return pda;
}

PDA PDA::createAnBn() {
    PDA pda;
    StateId q0 = pda.addState("q0", false);
    StateId q1 = pda.addState("q1", false);
    StateId q2 = pda.addState("q2", true);
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    
    // Read a's, push A
    pda.addTransition(q0, q0, 'a', EPSILON, "A");
    // Switch to reading b's
    pda.addTransition(q0, q1, 'b', 'A', "");
    // Read b's, pop A
    pda.addTransition(q1, q1, 'b', 'A', "");
    // Accept when stack has only Z
    pda.addTransition(q1, q2, EPSILON, 'Z', "");
    // Also accept empty string
    pda.addTransition(q0, q2, EPSILON, 'Z', "");
    
    return pda;
}

PDA PDA::createRNAStemLoopRecognizer() {
    // Recognizes simple stem-loop: (base pairs)* loop (complementary base pairs)*
    PDA pda;
    StateId q0 = pda.addState("stem-5'", false);
    StateId q1 = pda.addState("loop", false);
    StateId q2 = pda.addState("stem-3'", true);
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    
    // Push bases in 5' stem
    pda.addTransition(q0, q0, 'A', EPSILON, "U");  // A pairs with U
    pda.addTransition(q0, q0, 'U', EPSILON, "A");
    pda.addTransition(q0, q0, 'G', EPSILON, "C");
    pda.addTransition(q0, q0, 'C', EPSILON, "G");
    
    // Transition to loop (epsilon)
    pda.addTransition(q0, q1, EPSILON, EPSILON, "");
    
    // Loop region (consume any bases without stack ops)
    pda.addTransition(q1, q1, 'A', EPSILON, "");
    pda.addTransition(q1, q1, 'U', EPSILON, "");
    pda.addTransition(q1, q1, 'G', EPSILON, "");
    pda.addTransition(q1, q1, 'C', EPSILON, "");
    
    // Transition to 3' stem
    pda.addTransition(q1, q2, EPSILON, EPSILON, "");
    
    // Pop complementary bases
    pda.addTransition(q2, q2, 'A', 'A', "");
    pda.addTransition(q2, q2, 'U', 'U', "");
    pda.addTransition(q2, q2, 'G', 'G', "");
    pda.addTransition(q2, q2, 'C', 'C', "");
    
    return pda;
}

PDA PDA::createXMLValidator() {
    // Simplified XML validator for matching open/close tags
    PDA pda;
    StateId q0 = pda.addState("start", true);
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    
    // Simplified: use single chars for tags
    // < pushes next char, > with / pops
    for (char c = 'a'; c <= 'z'; ++c) {
        // Opening tag: push tag name
        pda.addTransition(q0, q0, c, EPSILON, std::string(1, c));
        // Closing tag: pop matching tag
        pda.addTransition(q0, q0, static_cast<char>(c - 32), c, "");  // Uppercase = close
    }
    
    return pda;
}

PDA PDA::createPalindromeRecognizer() {
    PDA pda;
    StateId q0 = pda.addState("push", false);
    StateId q1 = pda.addState("pop", false);
    StateId q2 = pda.addState("accept", true);
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    
    // Push first half
    pda.addTransition(q0, q0, 'a', EPSILON, "a");
    pda.addTransition(q0, q0, 'b', EPSILON, "b");
    
    // Guess middle (odd length) or switch (even length)
    pda.addTransition(q0, q1, 'a', EPSILON, "");  // odd, middle is 'a'
    pda.addTransition(q0, q1, 'b', EPSILON, "");  // odd, middle is 'b'
    pda.addTransition(q0, q1, EPSILON, EPSILON, "");  // even length
    
    // Pop second half
    pda.addTransition(q1, q1, 'a', 'a', "");
    pda.addTransition(q1, q1, 'b', 'b', "");
    
    // Accept
    pda.addTransition(q1, q2, EPSILON, 'Z', "");
    pda.addTransition(q0, q2, EPSILON, 'Z', "");  // empty string
    
    return pda;
}

// CFG implementation
CFG::CFG() : startSymbol_('S') {}

void CFG::addProduction(char lhs, const std::string& rhs) {
    productions_.push_back({lhs, rhs});
    nonTerminals_.insert(lhs);
}

void CFG::addTerminal(char symbol) { terminals_.insert(symbol); }
void CFG::addNonTerminal(char symbol) { nonTerminals_.insert(symbol); }

PDA CFG::toPDA() const {
    // Standard CFG to PDA construction
    PDA pda;
    StateId q0 = pda.addState("start", false);
    StateId q1 = pda.addState("loop", false);
    StateId q2 = pda.addState("accept", true);
    
    pda.setStartState(q0);
    pda.setInitialStackSymbol('Z');
    
    // Push start symbol
    pda.addTransition(q0, q1, EPSILON, 'Z', std::string(1, startSymbol_) + "Z");
    
    // For each production A -> w, pop A and push w (reversed)
    for (const auto& prod : productions_) {
        std::string reversed(prod.rhs.rbegin(), prod.rhs.rend());
        pda.addTransition(q1, q1, EPSILON, prod.lhs, reversed);
    }
    
    // For each terminal a, pop a on input a
    for (char t : terminals_) {
        pda.addTransition(q1, q1, t, t, "");
    }
    
    // Accept when stack has only Z
    pda.addTransition(q1, q2, EPSILON, 'Z', "");
    
    return pda;
}

std::string CFG::toString() const {
    std::ostringstream oss;
    oss << "CFG:\n  Start: " << startSymbol_ << "\n  Productions:\n";
    for (const auto& p : productions_) {
        oss << "    " << p.lhs << " -> " << (p.rhs.empty() ? "ε" : p.rhs) << "\n";
    }
    return oss.str();
}

std::string CFG::toJson() const {
    JsonSerializer::ArrayBuilder prodsArray;
    for (const auto& p : productions_) {
        prodsArray.addRaw(JsonSerializer::ObjectBuilder()
            .add("lhs", std::string(1, p.lhs))
            .add("rhs", p.rhs.empty() ? "ε" : p.rhs).build());
    }
    return JsonSerializer::ObjectBuilder()
        .add("startSymbol", std::string(1, startSymbol_))
        .addRaw("productions", prodsArray.build()).build();
}

} // namespace automata
