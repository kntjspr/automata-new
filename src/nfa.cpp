#include "automata/nfa.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

NFA::NFA()
    : startState_(-1)
    , nextStateId_(0)
{}

NFA::NFA(const NFA& other)
    : states_(other.states_)
    , transitions_(other.transitions_)
    , startState_(other.startState_)
    , acceptingStates_(other.acceptingStates_)
    , nextStateId_(other.nextStateId_)
{}

NFA::NFA(NFA&& other) noexcept
    : states_(std::move(other.states_))
    , transitions_(std::move(other.transitions_))
    , startState_(other.startState_)
    , acceptingStates_(std::move(other.acceptingStates_))
    , nextStateId_(other.nextStateId_)
{}

NFA& NFA::operator=(const NFA& other) {
    if (this != &other) {
        states_ = other.states_;
        transitions_ = other.transitions_;
        startState_ = other.startState_;
        acceptingStates_ = other.acceptingStates_;
        nextStateId_ = other.nextStateId_;
    }
    return *this;
}

NFA& NFA::operator=(NFA&& other) noexcept {
    if (this != &other) {
        states_ = std::move(other.states_);
        transitions_ = std::move(other.transitions_);
        startState_ = other.startState_;
        acceptingStates_ = std::move(other.acceptingStates_);
        nextStateId_ = other.nextStateId_;
    }
    return *this;
}

StateId NFA::addState(const std::string& label, bool isAccepting) {
    StateId id = nextStateId_++;
    states_.emplace(id, State(id, label, isAccepting, states_.empty()));
    if (states_.size() == 1) {
        startState_ = id;
    }
    if (isAccepting) {
        acceptingStates_.insert(id);
    }
    return id;
}

void NFA::setStartState(StateId id) {
    if (states_.find(id) == states_.end()) {
        throw InvalidStateException(id);
    }
    if (startState_ >= 0 && states_.count(startState_)) {
        states_.at(startState_).setStart(false);
    }
    startState_ = id;
    states_.at(id).setStart(true);
}

void NFA::setAcceptingState(StateId id, bool accepting) {
    if (states_.find(id) == states_.end()) {
        throw InvalidStateException(id);
    }
    states_.at(id).setAccepting(accepting);
    if (accepting) {
        acceptingStates_.insert(id);
    } else {
        acceptingStates_.erase(id);
    }
}

void NFA::addTransition(StateId from, StateId to, Symbol symbol) {
    if (states_.find(from) == states_.end()) {
        throw InvalidStateException(from);
    }
    if (states_.find(to) == states_.end()) {
        throw InvalidStateException(to);
    }
    transitions_.emplace_back(from, to, symbol);
}

void NFA::addEpsilonTransition(StateId from, StateId to) {
    addTransition(from, to, EPSILON);
}

std::vector<Transition> NFA::getTransitionsFrom(StateId state) const {
    std::vector<Transition> result;
    for (const auto& t : transitions_) {
        if (t.getFrom() == state) {
            result.push_back(t);
        }
    }
    return result;
}

std::vector<Transition> NFA::getTransitionsFrom(StateId state, Symbol symbol) const {
    std::vector<Transition> result;
    for (const auto& t : transitions_) {
        if (t.getFrom() == state && t.getSymbol() == symbol) {
            result.push_back(t);
        }
    }
    return result;
}

std::set<StateId> NFA::epsilonClosure(StateId state) const {
    std::set<StateId> closure;
    std::stack<StateId> stack;
    
    stack.push(state);
    closure.insert(state);
    
    while (!stack.empty()) {
        StateId current = stack.top();
        stack.pop();
        
        for (const auto& t : getTransitionsFrom(current, EPSILON)) {
            if (closure.find(t.getTo()) == closure.end()) {
                closure.insert(t.getTo());
                stack.push(t.getTo());
            }
        }
    }
    
    return closure;
}

std::set<StateId> NFA::epsilonClosure(const std::set<StateId>& states) const {
    std::set<StateId> closure;
    for (StateId s : states) {
        auto single = epsilonClosure(s);
        closure.insert(single.begin(), single.end());
    }
    return closure;
}

std::set<StateId> NFA::move(const std::set<StateId>& states, Symbol symbol) const {
    std::set<StateId> result;
    for (StateId s : states) {
        for (const auto& t : getTransitionsFrom(s, symbol)) {
            result.insert(t.getTo());
        }
    }
    return result;
}

std::set<StateId> NFA::extendedDelta(const std::set<StateId>& states, const std::string& input) const {
    std::set<StateId> current = epsilonClosure(states);
    
    for (char c : input) {
        current = epsilonClosure(move(current, c));
    }
    
    return current;
}

bool NFA::accepts(const std::string& input) const {
    if (startState_ < 0) return false;
    
    std::set<StateId> finalStates = extendedDelta({startState_}, input);
    
    for (StateId s : finalStates) {
        if (acceptingStates_.count(s)) {
            return true;
        }
    }
    return false;
}

std::vector<NFA::ExecutionStep> NFA::traceExecution(const std::string& input) const {
    std::vector<ExecutionStep> trace;
    if (startState_ < 0) return trace;
    
    std::set<StateId> current = {startState_};
    
    // Initial epsilon closure
    std::set<StateId> afterEpsilon = epsilonClosure(current);
    if (afterEpsilon != current) {
        trace.push_back({current, EPSILON, afterEpsilon, true});
        current = afterEpsilon;
    }
    
    for (char c : input) {
        std::set<StateId> afterMove = move(current, c);
        trace.push_back({current, c, afterMove, false});
        
        std::set<StateId> afterEpsilonMove = epsilonClosure(afterMove);
        if (afterEpsilonMove != afterMove) {
            trace.push_back({afterMove, EPSILON, afterEpsilonMove, true});
        }
        current = afterEpsilonMove;
    }
    
    return trace;
}

std::set<Symbol> NFA::getAlphabet() const {
    std::set<Symbol> alphabet;
    for (const auto& t : transitions_) {
        if (!t.isEpsilon()) {
            alphabet.insert(t.getSymbol());
        }
    }
    return alphabet;
}

std::string NFA::toString() const {
    std::ostringstream oss;
    oss << "NFA:\n";
    oss << "  States: ";
    for (const auto& [id, state] : states_) {
        oss << state.toString() << " ";
    }
    oss << "\n  Transitions:\n";
    for (const auto& t : transitions_) {
        oss << "    " << t.toString() << "\n";
    }
    return oss.str();
}

std::string NFA::toJson() const {
    JsonSerializer::ArrayBuilder statesArray;
    for (const auto& [id, state] : states_) {
        statesArray.addRaw(state.toJson());
    }
    
    JsonSerializer::ArrayBuilder transitionsArray;
    for (const auto& t : transitions_) {
        transitionsArray.addRaw(t.toJson());
    }
    
    JsonSerializer::ArrayBuilder acceptingArray;
    for (StateId s : acceptingStates_) {
        acceptingArray.add(static_cast<int>(s));
    }
    
    return JsonSerializer::ObjectBuilder()
        .add("type", std::string("NFA"))
        .add("startState", startState_)
        .addRaw("acceptingStates", acceptingArray.build())
        .addRaw("states", statesArray.build())
        .addRaw("transitions", transitionsArray.build())
        .build();
}

void NFA::renumberStates(StateId offset) {
    std::map<StateId, State> newStates;
    std::vector<Transition> newTransitions;
    std::set<StateId> newAccepting;
    
    std::map<StateId, StateId> mapping;
    StateId newId = offset;
    for (const auto& [id, state] : states_) {
        mapping[id] = newId;
        newStates.emplace(newId, State(newId, "", state.isAccepting(), state.isStart()));
        if (state.isAccepting()) {
            newAccepting.insert(newId);
        }
        newId++;
    }
    
    for (const auto& t : transitions_) {
        newTransitions.emplace_back(mapping[t.getFrom()], mapping[t.getTo()], t.getSymbol());
    }
    
    states_ = std::move(newStates);
    transitions_ = std::move(newTransitions);
    acceptingStates_ = std::move(newAccepting);
    startState_ = mapping[startState_];
    nextStateId_ = newId;
}

// Thompson's construction building blocks

NFA NFA::createEmpty() {
    NFA nfa;
    StateId start = nfa.addState("", false);
    StateId end = nfa.addState("", true);
    nfa.setStartState(start);
    nfa.addEpsilonTransition(start, end);
    return nfa;
}

NFA NFA::createSingle(Symbol s) {
    NFA nfa;
    StateId start = nfa.addState("", false);
    StateId end = nfa.addState("", true);
    nfa.setStartState(start);
    nfa.addTransition(start, end, s);
    return nfa;
}

NFA NFA::createUnion(NFA&& a, NFA&& b) {
    NFA result;
    
    // Renumber states
    StateId offset = 1;  // Reserve 0 for new start
    a.renumberStates(offset);
    offset += a.states_.size();
    b.renumberStates(offset);
    
    // Create new start and end states
    StateId newStart = result.addState("", false);
    result.setStartState(newStart);
    
    // Copy states and transitions from a
    for (const auto& [id, state] : a.states_) {
        result.states_.emplace(id, State(id, "", false, false));
    }
    for (const auto& t : a.transitions_) {
        result.transitions_.push_back(t);
    }
    
    // Copy states and transitions from b
    for (const auto& [id, state] : b.states_) {
        result.states_.emplace(id, State(id, "", false, false));
    }
    for (const auto& t : b.transitions_) {
        result.transitions_.push_back(t);
    }
    
    // Add new end state
    StateId newEnd = result.states_.size();
    result.states_.emplace(newEnd, State(newEnd, "", true, false));
    result.acceptingStates_.insert(newEnd);
    
    // Connect new start to old starts
    result.addEpsilonTransition(newStart, a.startState_);
    result.addEpsilonTransition(newStart, b.startState_);
    
    // Connect old accepting to new end
    for (StateId s : a.acceptingStates_) {
        result.states_.at(s).setAccepting(false);
        result.addEpsilonTransition(s, newEnd);
    }
    for (StateId s : b.acceptingStates_) {
        result.states_.at(s).setAccepting(false);
        result.addEpsilonTransition(s, newEnd);
    }
    
    result.nextStateId_ = newEnd + 1;
    return result;
}

NFA NFA::createConcat(NFA&& a, NFA&& b) {
    // Renumber b's states to not overlap with a
    b.renumberStates(a.states_.size());
    
    // Copy all states and transitions from both
    NFA result = std::move(a);
    
    for (const auto& [id, state] : b.states_) {
        result.states_.emplace(id, State(id, "", state.isAccepting(), false));
        if (state.isAccepting()) {
            result.acceptingStates_.insert(id);
        }
    }
    for (const auto& t : b.transitions_) {
        result.transitions_.push_back(t);
    }
    
    // Connect a's accepting states to b's start via epsilon
    for (StateId s : result.acceptingStates_) {
        if (b.acceptingStates_.find(s) == b.acceptingStates_.end()) {
            result.states_.at(s).setAccepting(false);
            result.addEpsilonTransition(s, b.startState_);
        }
    }
    
    // Update accepting states
    result.acceptingStates_ = b.acceptingStates_;
    result.nextStateId_ = result.states_.size();
    
    return result;
}

NFA NFA::createStar(NFA&& a) {
    NFA result;
    
    // Renumber a's states
    a.renumberStates(1);
    
    // Create new start state
    StateId newStart = result.addState("", false);
    result.setStartState(newStart);
    
    // Copy a's states and transitions
    for (const auto& [id, state] : a.states_) {
        result.states_.emplace(id, State(id, "", false, false));
    }
    for (const auto& t : a.transitions_) {
        result.transitions_.push_back(t);
    }
    
    // Create new end state
    StateId newEnd = result.states_.size();
    result.states_.emplace(newEnd, State(newEnd, "", true, false));
    result.acceptingStates_.insert(newEnd);
    
    // Epsilon from new start to a's start and to new end
    result.addEpsilonTransition(newStart, a.startState_);
    result.addEpsilonTransition(newStart, newEnd);
    
    // Epsilon from a's accepting to a's start and to new end
    for (StateId s : a.acceptingStates_) {
        result.addEpsilonTransition(s, a.startState_);
        result.addEpsilonTransition(s, newEnd);
    }
    
    result.nextStateId_ = newEnd + 1;
    return result;
}

NFA NFA::createPlus(NFA&& a) {
    // a+ = aa*
    NFA copy = a;  // Make a copy for the star part
    return createConcat(std::move(a), createStar(std::move(copy)));
}

NFA NFA::createOptional(NFA&& a) {
    NFA result;
    
    // Renumber a's states
    a.renumberStates(1);
    
    // Create new start state
    StateId newStart = result.addState("", false);
    result.setStartState(newStart);
    
    // Copy a's states and transitions
    for (const auto& [id, state] : a.states_) {
        result.states_.emplace(id, State(id, "", false, false));
    }
    for (const auto& t : a.transitions_) {
        result.transitions_.push_back(t);
    }
    
    // Create new end state
    StateId newEnd = result.states_.size();
    result.states_.emplace(newEnd, State(newEnd, "", true, false));
    result.acceptingStates_.insert(newEnd);
    
    // Epsilon from new start to a's start and to new end (skip path)
    result.addEpsilonTransition(newStart, a.startState_);
    result.addEpsilonTransition(newStart, newEnd);
    
    // Epsilon from a's accepting to new end
    for (StateId s : a.acceptingStates_) {
        result.addEpsilonTransition(s, newEnd);
    }
    
    result.nextStateId_ = newEnd + 1;
    return result;
}

} // namespace automata
