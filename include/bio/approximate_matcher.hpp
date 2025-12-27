#ifndef BIO_APPROXIMATE_MATCHER_HPP
#define BIO_APPROXIMATE_MATCHER_HPP

#include "../automata/nfa.hpp"
#include "../automata/dfa.hpp"
#include "sequence.hpp"
#include <vector>
#include <string>

namespace bio {

/**
 * @brief Approximate pattern matching using Levenshtein automaton
 * 
 * Constructs an NFA that accepts all strings within a given edit distance
 * of a pattern, enabling efficient approximate pattern matching within
 * the regular language framework.
 */
class ApproximateMatcher {
public:
    /**
     * @brief Type of edit operations to allow
     */
    enum class EditType {
        SUBSTITUTION = 1,   // Single character replacement
        INSERTION = 2,      // Insert a character
        DELETION = 4,       // Delete a character
        ALL = 7             // All edit types
    };
    
    /**
     * @brief Construct approximate matcher
     * @param pattern The pattern to match
     * @param maxDistance Maximum edit distance (1 or 2 recommended)
     * @param editTypes Bitmask of allowed edit types
     */
    ApproximateMatcher(const std::string& pattern, 
                       int maxDistance = 1,
                       int editTypes = static_cast<int>(EditType::ALL));
    
    // Getters
    const std::string& getPattern() const { return pattern_; }
    int getMaxDistance() const { return maxDistance_; }
    
    /**
     * @brief Build NFA for approximate matching
     * 
     * Constructs a Levenshtein NFA where states track position in pattern
     * and accumulated edit distance.
     */
    automata::NFA buildNFA() const;
    
    /**
     * @brief Build DFA for faster matching (may have exponential states)
     */
    automata::DFA buildDFA() const;
    
    /**
     * @brief Check if text matches pattern within edit distance
     */
    bool matches(const std::string& text) const;
    
    /**
     * @brief Find all approximate matches in text
     * @return Vector of (start, end, editDistance) tuples
     */
    struct Match {
        size_t start;
        size_t end;
        int editDistance;
        std::string matchedText;
    };
    std::vector<Match> findAll(const std::string& text) const;
    
    /**
     * @brief Compute edit distance between two strings
     */
    static int editDistance(const std::string& s1, const std::string& s2);
    
    /**
     * @brief Get edit operations to transform s1 to s2
     */
    struct EditOperation {
        enum Type { MATCH, SUBSTITUTE, INSERT, DELETE } type;
        size_t position;
        char character;
    };
    static std::vector<EditOperation> getEditOperations(const std::string& s1, const std::string& s2);
    
    // JSON serialization of matches
    std::string matchesToJson(const std::vector<Match>& matches) const;

private:
    std::string pattern_;
    int maxDistance_;
    int editTypes_;
    std::set<char> alphabet_;
    
    void buildAlphabet();
    
    // NFA state encoding: (pattern_position, edit_count)
    automata::StateId encodeState(int pos, int edits) const;
    std::pair<int, int> decodeState(automata::StateId id) const;
};

/**
 * @brief DNA-specific approximate matcher
 * 
 * Specialized for DNA sequences with biological edit models.
 */
class DNAApproximateMatcher : public ApproximateMatcher {
public:
    DNAApproximateMatcher(const std::string& pattern, int maxMismatches = 1);
    
    /**
     * @brief Find all approximate matches in a DNA sequence
     */
    std::vector<Match> findInSequence(const Sequence& seq) const;
    
    /**
     * @brief Search both strands (forward and reverse complement)
     */
    struct StrandMatch {
        Match match;
        bool isReverseComplement;
    };
    std::vector<StrandMatch> findBothStrands(const Sequence& seq) const;
};

/**
 * @brief Profile matcher using position weight matrix
 * 
 * Uses probability-weighted matching for motif finding,
 * implemented as a weighted NFA.
 */
class ProfileMatcher {
public:
    /**
     * @brief Construct from position weight matrix
     * @param pwm Matrix where pwm[position][base] = weight
     */
    ProfileMatcher(const std::vector<std::map<char, double>>& pwm);
    
    /**
     * @brief Score a sequence against the profile
     */
    double score(const std::string& seq) const;
    
    /**
     * @brief Find all matches above threshold
     */
    struct ScoredMatch {
        size_t position;
        double score;
        std::string matchedText;
    };
    std::vector<ScoredMatch> findMatches(const std::string& text, double threshold) const;
    
    /**
     * @brief Build consensus sequence from PWM
     */
    std::string consensus() const;

private:
    std::vector<std::map<char, double>> pwm_;
};

} // namespace bio

#endif // BIO_APPROXIMATE_MATCHER_HPP
