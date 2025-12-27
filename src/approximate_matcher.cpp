#include "bio/approximate_matcher.hpp"
#include <algorithm>
#include <limits>

namespace bio {

ApproximateMatcher::ApproximateMatcher(const std::string& pattern, int maxDistance, int editTypes)
    : pattern_(pattern), maxDistance_(maxDistance), editTypes_(editTypes) {
    buildAlphabet();
}

void ApproximateMatcher::buildAlphabet() {
    for (char c : pattern_) {
        alphabet_.insert(c);
    }
    // Add common characters
    for (char c = 'A'; c <= 'Z'; ++c) alphabet_.insert(c);
    for (char c = 'a'; c <= 'z'; ++c) alphabet_.insert(c);
}

automata::StateId ApproximateMatcher::encodeState(int pos, int edits) const {
    return pos * (maxDistance_ + 1) + edits;
}

std::pair<int, int> ApproximateMatcher::decodeState(automata::StateId id) const {
    return {id / (maxDistance_ + 1), id % (maxDistance_ + 1)};
}

automata::NFA ApproximateMatcher::buildNFA() const {
    automata::NFA nfa;
    int n = pattern_.size();
    
    // Create states: (position, edits) where position is 0..n and edits is 0..maxDistance
    std::map<std::pair<int, int>, automata::StateId> stateMap;
    
    for (int pos = 0; pos <= n; ++pos) {
        for (int edits = 0; edits <= maxDistance_; ++edits) {
            bool isAccepting = (pos == n);
            auto id = nfa.addState("", isAccepting);
            stateMap[{pos, edits}] = id;
        }
    }
    
    nfa.setStartState(stateMap[{0, 0}]);
    
    // Add transitions
    for (int pos = 0; pos < n; ++pos) {
        for (int edits = 0; edits <= maxDistance_; ++edits) {
            automata::StateId from = stateMap[{pos, edits}];
            
            // Exact match
            nfa.addTransition(from, stateMap[{pos + 1, edits}], pattern_[pos]);
            
            if (edits < maxDistance_) {
                // Substitution (if allowed)
                if (editTypes_ & static_cast<int>(EditType::SUBSTITUTION)) {
                    for (char c : alphabet_) {
                        if (c != pattern_[pos]) {
                            nfa.addTransition(from, stateMap[{pos + 1, edits + 1}], c);
                        }
                    }
                }
                
                // Insertion (if allowed) - consume input without advancing pattern
                if (editTypes_ & static_cast<int>(EditType::INSERTION)) {
                    for (char c : alphabet_) {
                        nfa.addTransition(from, stateMap[{pos, edits + 1}], c);
                    }
                }
                
                // Deletion (if allowed) - advance pattern without consuming input
                if (editTypes_ & static_cast<int>(EditType::DELETION)) {
                    nfa.addEpsilonTransition(from, stateMap[{pos + 1, edits + 1}]);
                }
            }
        }
    }
    
    return nfa;
}

automata::DFA ApproximateMatcher::buildDFA() const {
    return automata::DFA::fromNFA(buildNFA());
}

bool ApproximateMatcher::matches(const std::string& text) const {
    return buildNFA().accepts(text);
}

std::vector<ApproximateMatcher::Match> ApproximateMatcher::findAll(const std::string& text) const {
    std::vector<Match> matches;
    auto nfa = buildNFA();
    
    for (size_t start = 0; start < text.size(); ++start) {
        for (size_t len = 1; len <= text.size() - start && len <= pattern_.size() + maxDistance_; ++len) {
            std::string substr = text.substr(start, len);
            if (nfa.accepts(substr)) {
                int dist = editDistance(pattern_, substr);
                if (dist <= maxDistance_) {
                    matches.push_back({start, start + len, dist, substr});
                }
            }
        }
    }
    
    return matches;
}

int ApproximateMatcher::editDistance(const std::string& s1, const std::string& s2) {
    int m = s1.size(), n = s2.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1));
    
    for (int i = 0; i <= m; ++i) dp[i][0] = i;
    for (int j = 0; j <= n; ++j) dp[0][j] = j;
    
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (s1[i-1] == s2[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + std::min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
            }
        }
    }
    
    return dp[m][n];
}

std::vector<ApproximateMatcher::EditOperation> 
ApproximateMatcher::getEditOperations(const std::string& s1, const std::string& s2) {
    int m = s1.size(), n = s2.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1));
    
    for (int i = 0; i <= m; ++i) dp[i][0] = i;
    for (int j = 0; j <= n; ++j) dp[0][j] = j;
    
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (s1[i-1] == s2[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + std::min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
            }
        }
    }
    
    // Backtrack
    std::vector<EditOperation> ops;
    int i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && s1[i-1] == s2[j-1]) {
            ops.push_back({EditOperation::MATCH, static_cast<size_t>(i-1), s1[i-1]});
            --i; --j;
        } else if (i > 0 && j > 0 && dp[i][j] == dp[i-1][j-1] + 1) {
            ops.push_back({EditOperation::SUBSTITUTE, static_cast<size_t>(i-1), s2[j-1]});
            --i; --j;
        } else if (j > 0 && dp[i][j] == dp[i][j-1] + 1) {
            ops.push_back({EditOperation::INSERT, static_cast<size_t>(i), s2[j-1]});
            --j;
        } else {
            ops.push_back({EditOperation::DELETE, static_cast<size_t>(i-1), s1[i-1]});
            --i;
        }
    }
    
    std::reverse(ops.begin(), ops.end());
    return ops;
}

std::string ApproximateMatcher::matchesToJson(const std::vector<Match>& matches) const {
    std::string json = "[";
    for (size_t i = 0; i < matches.size(); ++i) {
        if (i > 0) json += ",";
        json += "{\"start\":" + std::to_string(matches[i].start) +
                ",\"end\":" + std::to_string(matches[i].end) +
                ",\"distance\":" + std::to_string(matches[i].editDistance) +
                ",\"text\":\"" + matches[i].matchedText + "\"}";
    }
    json += "]";
    return json;
}

// DNAApproximateMatcher
DNAApproximateMatcher::DNAApproximateMatcher(const std::string& pattern, int maxMismatches)
    : ApproximateMatcher(pattern, maxMismatches, static_cast<int>(EditType::SUBSTITUTION)) {}

std::vector<ApproximateMatcher::Match> 
DNAApproximateMatcher::findInSequence(const Sequence& seq) const {
    return findAll(seq.getString());
}

std::vector<DNAApproximateMatcher::StrandMatch> 
DNAApproximateMatcher::findBothStrands(const Sequence& seq) const {
    std::vector<StrandMatch> results;
    
    // Forward strand
    auto forwardMatches = findInSequence(seq);
    for (const auto& m : forwardMatches) {
        results.push_back({m, false});
    }
    
    // Reverse complement
    auto revComp = seq.reverseComplement();
    auto reverseMatches = findInSequence(revComp);
    for (const auto& m : reverseMatches) {
        results.push_back({m, true});
    }
    
    return results;
}

// ProfileMatcher
ProfileMatcher::ProfileMatcher(const std::vector<std::map<char, double>>& pwm)
    : pwm_(pwm) {}

double ProfileMatcher::score(const std::string& seq) const {
    if (seq.size() != pwm_.size()) return -std::numeric_limits<double>::infinity();
    
    double total = 0.0;
    for (size_t i = 0; i < seq.size(); ++i) {
        auto it = pwm_[i].find(seq[i]);
        if (it != pwm_[i].end()) {
            total += it->second;
        } else {
            total += -10.0;  // Penalty for unexpected character
        }
    }
    return total;
}

std::vector<ProfileMatcher::ScoredMatch> 
ProfileMatcher::findMatches(const std::string& text, double threshold) const {
    std::vector<ScoredMatch> matches;
    
    for (size_t i = 0; i + pwm_.size() <= text.size(); ++i) {
        std::string substr = text.substr(i, pwm_.size());
        double s = score(substr);
        if (s >= threshold) {
            matches.push_back({i, s, substr});
        }
    }
    
    return matches;
}

std::string ProfileMatcher::consensus() const {
    std::string result;
    for (const auto& pos : pwm_) {
        char best = 'N';
        double maxScore = -std::numeric_limits<double>::infinity();
        for (const auto& [c, score] : pos) {
            if (score > maxScore) {
                maxScore = score;
                best = c;
            }
        }
        result += best;
    }
    return result;
}

} // namespace bio
