#ifndef AUTOMATA_REGEX_PARSER_HPP
#define AUTOMATA_REGEX_PARSER_HPP

#include "common.hpp"
#include "nfa.hpp"

namespace automata {

/**
 * @brief Regular expression parser with Thompson's construction
 * 
 * Supports basic regex operators and generates NFA using Thompson's construction.
 * 
 * Grammar:
 *   regex   -> union
 *   union   -> concat ('|' concat)*
 *   concat  -> repeat+
 *   repeat  -> atom ('*' | '+' | '?')*
 *   atom    -> char | '(' regex ')' | '[' charclass ']' | '.'
 *   charclass -> (char | char-char)+
 */
class RegexParser {
public:
    RegexParser();
    ~RegexParser() = default;
    
    /**
     * @brief Parse a regular expression and construct an NFA
     * @param pattern The regex pattern
     * @return NFA recognizing the language of the pattern
     * @throws ParseException if the pattern is invalid
     */
    NFA parse(const std::string& pattern);
    
    /**
     * @brief Get the AST representation of the last parsed regex
     */
    std::string getASTString() const { return astString_; }
    
    // AST node types for visualization
    enum class NodeType {
        CHAR,
        EPSILON,
        UNION,
        CONCAT,
        STAR,
        PLUS,
        OPTIONAL,
        GROUP,
        CHAR_CLASS,
        ANY,
        START_ANCHOR,   // ^ - matches start of string
        END_ANCHOR,     // $ - matches end of string
        REPEAT_N        // {m}, {m,}, {m,n} - counted repetition
    };
    
    struct ASTNode {
        NodeType type;
        char value;  // For CHAR nodes
        std::set<char> charClass;  // For CHAR_CLASS nodes
        std::vector<std::shared_ptr<ASTNode>> children;
        int minRepeat = 0;  // For REPEAT_N nodes
        int maxRepeat = -1; // For REPEAT_N nodes (-1 means unlimited)
        
        std::string toString() const;
        std::string toJson() const;
    };
    
    /**
     * @brief Get the AST of the last parsed regex
     */
    std::shared_ptr<ASTNode> getAST() const { return ast_; }
    
    // DNA/RNA specific shortcuts
    static std::string expandDNAShortcuts(const std::string& pattern);
    
private:
    std::string pattern_;
    size_t pos_;
    std::shared_ptr<ASTNode> ast_;
    std::string astString_;
    
    // Parsing methods (recursive descent)
    std::shared_ptr<ASTNode> parseUnion();
    std::shared_ptr<ASTNode> parseConcat();
    std::shared_ptr<ASTNode> parseRepeat();
    std::shared_ptr<ASTNode> parseAtom();
    std::set<char> parseCharClass();
    
    // Helper methods
    char peek() const;
    char advance();
    bool match(char c);
    bool isAtEnd() const;
    bool isMetaChar(char c) const;
    bool parseCountedQuantifier(int& minRep, int& maxRep);  // Parse {m}, {m,}, {m,n}
    int parseNumber();  // Parse a decimal number
    
    // NFA construction from AST
    NFA buildNFA(const std::shared_ptr<ASTNode>& node);
};

/**
 * @brief Regular expression syntax highlighting for UI
 */
class RegexHighlighter {
public:
    enum class TokenType {
        LITERAL,
        METACHAR,
        QUANTIFIER,
        GROUP_OPEN,
        GROUP_CLOSE,
        CHAR_CLASS,
        ESCAPE,
        ERROR
    };
    
    struct Token {
        TokenType type;
        size_t start;
        size_t length;
        std::string text;
    };
    
    static std::vector<Token> tokenize(const std::string& pattern);
    static std::string toHighlightedHtml(const std::string& pattern);
};

} // namespace automata

#endif // AUTOMATA_REGEX_PARSER_HPP
