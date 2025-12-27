#include "automata/transition.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

Transition::Transition(StateId from, StateId to, Symbol symbol)
    : from_(from)
    , to_(to)
    , symbol_(symbol)
{}

bool Transition::operator<(const Transition& other) const {
    if (from_ != other.from_) return from_ < other.from_;
    if (symbol_ != other.symbol_) return symbol_ < other.symbol_;
    return to_ < other.to_;
}

bool Transition::operator==(const Transition& other) const {
    return from_ == other.from_ && to_ == other.to_ && symbol_ == other.symbol_;
}

std::string Transition::toString() const {
    return "(" + std::to_string(from_) + ", " + symbolToString(symbol_) + 
           ") -> " + std::to_string(to_);
}

std::string Transition::toJson() const {
    return JsonSerializer::ObjectBuilder()
        .add("from", from_)
        .add("to", to_)
        .add("symbol", symbolToString(symbol_))
        .add("isEpsilon", isEpsilon())
        .build();
}

// PDATransition implementation

PDATransition::PDATransition(StateId from, StateId to, Symbol inputSymbol,
                             StackSymbol popSymbol, const std::string& pushSymbols)
    : from_(from)
    , to_(to)
    , inputSymbol_(inputSymbol)
    , popSymbol_(popSymbol)
    , pushSymbols_(pushSymbols)
{}

std::string PDATransition::toString() const {
    std::string input = inputSymbol_ == EPSILON ? "ε" : std::string(1, inputSymbol_);
    std::string pop = popSymbol_ == EPSILON ? "ε" : std::string(1, popSymbol_);
    std::string push = pushSymbols_.empty() ? "ε" : pushSymbols_;
    
    return "(" + std::to_string(from_) + ", " + input + ", " + pop + 
           ") -> (" + std::to_string(to_) + ", " + push + ")";
}

std::string PDATransition::toJson() const {
    return JsonSerializer::ObjectBuilder()
        .add("from", from_)
        .add("to", to_)
        .add("inputSymbol", inputSymbol_ == EPSILON ? "ε" : std::string(1, inputSymbol_))
        .add("popSymbol", popSymbol_ == EPSILON ? "ε" : std::string(1, popSymbol_))
        .add("pushSymbols", pushSymbols_.empty() ? "ε" : pushSymbols_)
        .build();
}

} // namespace automata
