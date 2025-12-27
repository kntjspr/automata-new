#include "automata/state.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

State::State(StateId id, const std::string& label, bool isAccepting, bool isStart)
    : id_(id)
    , label_(label.empty() ? "q" + std::to_string(id) : label)
    , isAccepting_(isAccepting)
    , isStart_(isStart)
{}

std::string State::toString() const {
    std::string result = label_;
    if (isStart_) result = "->" + result;
    if (isAccepting_) result = "(" + result + ")";
    return result;
}

std::string State::toJson() const {
    return JsonSerializer::ObjectBuilder()
        .add("id", id_)
        .add("label", label_)
        .add("isAccepting", isAccepting_)
        .add("isStart", isStart_)
        .build();
}

} // namespace automata
