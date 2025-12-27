#ifndef AUTOMATA_STATE_HPP
#define AUTOMATA_STATE_HPP

#include "common.hpp"

namespace automata {

/**
 * @brief Represents a state in a finite automaton
 * 
 * States have an ID, optional label, and flags for start/accepting states.
 */
class State {
public:
    /**
     * @brief Construct a new State
     * @param id Unique identifier for the state
     * @param label Human-readable label (optional)
     * @param isAccepting Whether this is an accepting state
     * @param isStart Whether this is the start state
     */
    State(StateId id, const std::string& label = "", 
          bool isAccepting = false, bool isStart = false);
    
    // Getters
    StateId getId() const { return id_; }
    const std::string& getLabel() const { return label_; }
    bool isAccepting() const { return isAccepting_; }
    bool isStart() const { return isStart_; }
    
    // Setters
    void setLabel(const std::string& label) { label_ = label; }
    void setAccepting(bool accepting) { isAccepting_ = accepting; }
    void setStart(bool start) { isStart_ = start; }
    
    // For use in sets/maps
    bool operator<(const State& other) const { return id_ < other.id_; }
    bool operator==(const State& other) const { return id_ == other.id_; }
    
    // String representation
    std::string toString() const;
    
    // JSON serialization
    std::string toJson() const;

private:
    StateId id_;
    std::string label_;
    bool isAccepting_;
    bool isStart_;
};

// Hash for unordered containers
struct StateHash {
    size_t operator()(const State& s) const {
        return std::hash<StateId>{}(s.getId());
    }
};

} // namespace automata

#endif // AUTOMATA_STATE_HPP
