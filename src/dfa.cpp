#include "automata/dfa.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

DFA::DFA() : startState_(-1), nextStateId_(0) {}

StateId DFA::addState(const std::string& label, bool isAccepting) {
    StateId id = nextStateId_++;
    states_.emplace(id, State(id, label, isAccepting, states_.empty()));
    if (states_.size() == 1) startState_ = id;
    if (isAccepting) acceptingStates_.insert(id);
    return id;
}

void DFA::setStartState(StateId id) {
    if (states_.find(id) == states_.end()) throw InvalidStateException(id);
    if (startState_ >= 0 && states_.count(startState_)) states_.at(startState_).setStart(false);
    startState_ = id;
    states_.at(id).setStart(true);
}

void DFA::setAcceptingState(StateId id, bool accepting) {
    if (states_.find(id) == states_.end()) throw InvalidStateException(id);
    states_.at(id).setAccepting(accepting);
    if (accepting) acceptingStates_.insert(id);
    else acceptingStates_.erase(id);
}

void DFA::addTransition(StateId from, StateId to, Symbol symbol) {
    if (states_.find(from) == states_.end()) throw InvalidStateException(from);
    if (states_.find(to) == states_.end()) throw InvalidStateException(to);
    auto key = std::make_pair(from, symbol);
    if (transitionTable_.count(key)) {
        throw AutomataException("DFA already has transition");
    }
    transitions_.emplace_back(from, to, symbol);
    transitionTable_[key] = to;
    alphabet_.insert(symbol);
}

std::optional<StateId> DFA::getNextState(StateId from, Symbol symbol) const {
    auto it = transitionTable_.find({from, symbol});
    if (it != transitionTable_.end()) return it->second;
    return std::nullopt;
}

bool DFA::accepts(const std::string& input) const {
    if (startState_ < 0) return false;
    StateId current = startState_;
    for (char c : input) {
        auto next = getNextState(current, c);
        if (!next) return false;
        current = *next;
    }
    return acceptingStates_.count(current) > 0;
}

std::vector<DFA::ExecutionStep> DFA::traceExecution(const std::string& input) const {
    std::vector<ExecutionStep> trace;
    if (startState_ < 0) return trace;
    StateId current = startState_;
    for (size_t i = 0; i < input.size(); ++i) {
        char c = input[i];
        auto next = getNextState(current, c);
        ExecutionStep step{current, c, next.value_or(-1), false};
        if (!next) { trace.push_back(step); return trace; }
        current = *next;
        step.nextState = current;
        step.accepted = (i == input.size() - 1) && acceptingStates_.count(current);
        trace.push_back(step);
    }
    return trace;
}

std::vector<std::pair<size_t, size_t>> DFA::findAllMatches(const std::string& text) const {
    std::vector<std::pair<size_t, size_t>> matches;
    for (size_t i = 0; i < text.size(); ++i) {
        StateId current = startState_;
        if (acceptingStates_.count(current)) matches.emplace_back(i, i);
        for (size_t j = i; j < text.size(); ++j) {
            auto next = getNextState(current, text[j]);
            if (!next) break;
            current = *next;
            if (acceptingStates_.count(current)) matches.emplace_back(i, j + 1);
        }
    }
    return matches;
}

std::set<Symbol> DFA::getAlphabet() const { return alphabet_; }

std::string DFA::toString() const {
    std::ostringstream oss;
    oss << "DFA:\n  States: ";
    for (const auto& [id, state] : states_) oss << state.toString() << " ";
    oss << "\n  Transitions:\n";
    for (const auto& t : transitions_) oss << "    " << t.toString() << "\n";
    return oss.str();
}

std::string DFA::toJson() const {
    JsonSerializer::ArrayBuilder statesArray, transitionsArray, acceptingArray;
    for (const auto& [id, state] : states_) statesArray.addRaw(state.toJson());
    for (const auto& t : transitions_) transitionsArray.addRaw(t.toJson());
    for (StateId s : acceptingStates_) acceptingArray.add(static_cast<int>(s));
    return JsonSerializer::ObjectBuilder()
        .add("type", std::string("DFA")).add("startState", startState_)
        .addRaw("acceptingStates", acceptingArray.build())
        .addRaw("states", statesArray.build())
        .addRaw("transitions", transitionsArray.build()).build();
}

DFA DFA::fromNFA(const NFA& nfa) {
    DFA dfa;
    std::set<Symbol> alphabet = nfa.getAlphabet();
    std::map<std::set<StateId>, StateId> stateMap;
    std::queue<std::set<StateId>> workList;
    std::set<StateId> initial = nfa.epsilonClosure(nfa.getStartState());
    bool isAccepting = false;
    for (StateId s : initial) if (nfa.getAcceptingStates().count(s)) { isAccepting = true; break; }
    StateId dfaStart = dfa.addState("", isAccepting);
    dfa.setStartState(dfaStart);
    stateMap[initial] = dfaStart;
    workList.push(initial);
    while (!workList.empty()) {
        std::set<StateId> current = workList.front(); workList.pop();
        StateId currentDfa = stateMap[current];
        for (Symbol symbol : alphabet) {
            std::set<StateId> next = nfa.epsilonClosure(nfa.move(current, symbol));
            if (next.empty()) continue;
            if (stateMap.find(next) == stateMap.end()) {
                isAccepting = false;
                for (StateId s : next) if (nfa.getAcceptingStates().count(s)) { isAccepting = true; break; }
                stateMap[next] = dfa.addState("", isAccepting);
                workList.push(next);
            }
            dfa.addTransition(currentDfa, stateMap[next], symbol);
        }
    }
    return dfa;
}

DFA DFA::minimize() const {
    if (states_.empty()) return *this;
    std::set<StateId> accepting, nonAccepting;
    for (const auto& [id, state] : states_) {
        if (state.isAccepting()) accepting.insert(id);
        else nonAccepting.insert(id);
    }
    std::vector<std::set<StateId>> partition;
    if (!accepting.empty()) partition.push_back(accepting);
    if (!nonAccepting.empty()) partition.push_back(nonAccepting);
    std::vector<std::set<StateId>> workList = partition;
    while (!workList.empty()) {
        std::set<StateId> A = workList.back(); workList.pop_back();
        for (Symbol c : alphabet_) {
            std::set<StateId> X;
            for (const auto& [id, state] : states_) {
                auto next = getNextState(id, c);
                if (next && A.count(*next)) X.insert(id);
            }
            std::vector<std::set<StateId>> newPartition;
            for (const auto& Y : partition) {
                std::set<StateId> intersection, difference;
                for (StateId s : Y) { if (X.count(s)) intersection.insert(s); else difference.insert(s); }
                if (!intersection.empty() && !difference.empty()) {
                    newPartition.push_back(intersection); newPartition.push_back(difference);
                    auto it = std::find(workList.begin(), workList.end(), Y);
                    if (it != workList.end()) { workList.erase(it); workList.push_back(intersection); workList.push_back(difference); }
                    else workList.push_back(intersection.size() <= difference.size() ? intersection : difference);
                } else newPartition.push_back(Y);
            }
            partition = newPartition;
        }
    }
    DFA minDfa;
    std::map<StateId, StateId> stateToPartition;
    for (size_t i = 0; i < partition.size(); ++i) {
        bool isAcc = false;
        for (StateId s : partition[i]) { stateToPartition[s] = i; if (acceptingStates_.count(s)) isAcc = true; }
        minDfa.addState("", isAcc);
    }
    minDfa.setStartState(stateToPartition[startState_]);
    std::set<std::tuple<StateId, StateId, Symbol>> added;
    for (const auto& t : transitions_) {
        StateId from = stateToPartition[t.getFrom()], to = stateToPartition[t.getTo()];
        auto key = std::make_tuple(from, to, t.getSymbol());
        if (added.find(key) == added.end()) { minDfa.addTransition(from, to, t.getSymbol()); added.insert(key); }
    }
    return minDfa;
}

std::vector<DFA::GrammarRule> DFA::toRegularGrammar() const {
    std::vector<GrammarRule> rules;
    auto getNT = [this](StateId id) -> char { return id == startState_ ? 'S' : 'A' + static_cast<char>(id - (id > startState_ ? 1 : 0)); };
    for (const auto& t : transitions_) { rules.push_back({getNT(t.getFrom()), std::string(1, t.getSymbol()) + getNT(t.getTo())}); }
    for (StateId s : acceptingStates_) rules.push_back({getNT(s), ""});
    return rules;
}

DFA DFA::complement() const {
    DFA result = *this;
    result.acceptingStates_.clear();
    for (const auto& [id, state] : result.states_) {
        if (!acceptingStates_.count(id)) result.setAcceptingState(id, true);
        else result.states_.at(id).setAccepting(false);
    }
    return result;
}

DFA DFA::intersection(const DFA& a, const DFA& b) {
    DFA result;
    std::set<Symbol> alphabet = a.alphabet_;
    alphabet.insert(b.alphabet_.begin(), b.alphabet_.end());
    std::map<std::pair<StateId, StateId>, StateId> stateMap;
    std::queue<std::pair<StateId, StateId>> workList;
    auto initial = std::make_pair(a.startState_, b.startState_);
    bool isAcc = a.acceptingStates_.count(a.startState_) && b.acceptingStates_.count(b.startState_);
    StateId startId = result.addState("", isAcc);
    result.setStartState(startId);
    stateMap[initial] = startId;
    workList.push(initial);
    while (!workList.empty()) {
        auto current = workList.front(); workList.pop();
        for (Symbol c : alphabet) {
            auto nextA = a.getNextState(current.first, c), nextB = b.getNextState(current.second, c);
            if (!nextA || !nextB) continue;
            auto next = std::make_pair(*nextA, *nextB);
            if (stateMap.find(next) == stateMap.end()) {
                isAcc = a.acceptingStates_.count(*nextA) && b.acceptingStates_.count(*nextB);
                stateMap[next] = result.addState("", isAcc);
                workList.push(next);
            }
            result.addTransition(stateMap[current], stateMap[next], c);
        }
    }
    return result;
}

DFA DFA::unionDFA(const DFA& a, const DFA& b) {
    DFA result;
    std::set<Symbol> alphabet = a.alphabet_;
    alphabet.insert(b.alphabet_.begin(), b.alphabet_.end());
    std::map<std::pair<StateId, StateId>, StateId> stateMap;
    std::queue<std::pair<StateId, StateId>> workList;
    auto initial = std::make_pair(a.startState_, b.startState_);
    bool isAcc = a.acceptingStates_.count(a.startState_) || b.acceptingStates_.count(b.startState_);
    StateId startId = result.addState("", isAcc);
    result.setStartState(startId);
    stateMap[initial] = startId;
    workList.push(initial);
    while (!workList.empty()) {
        auto current = workList.front(); workList.pop();
        for (Symbol c : alphabet) {
            auto nextA = a.getNextState(current.first, c), nextB = b.getNextState(current.second, c);
            StateId na = nextA.value_or(-1), nb = nextB.value_or(-1);
            if (na == -1 && nb == -1) continue;
            auto next = std::make_pair(na, nb);
            if (stateMap.find(next) == stateMap.end()) {
                isAcc = (nextA && a.acceptingStates_.count(*nextA)) || (nextB && b.acceptingStates_.count(*nextB));
                stateMap[next] = result.addState("", isAcc);
                workList.push(next);
            }
            result.addTransition(stateMap[current], stateMap[next], c);
        }
    }
    return result;
}

} // namespace automata
