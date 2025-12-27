#include "automata/regex_parser.hpp"
#include "automata/json_serializer.hpp"

namespace automata {

RegexParser::RegexParser() : pos_(0) {}

NFA RegexParser::parse(const std::string& pattern) {
    pattern_ = pattern;
    pos_ = 0;
    
    if (pattern_.empty()) {
        return NFA::createEmpty();
    }
    
    ast_ = parseUnion();
    astString_ = ast_ ? ast_->toString() : "";
    
    if (!isAtEnd()) {
        throw ParseException("Unexpected character at position " + std::to_string(pos_));
    }
    
    return buildNFA(ast_);
}

std::shared_ptr<RegexParser::ASTNode> RegexParser::parseUnion() {
    auto left = parseConcat();
    
    while (match('|')) {
        auto right = parseConcat();
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::UNION;
        node->children.push_back(left);
        node->children.push_back(right);
        left = node;
    }
    
    return left;
}

std::shared_ptr<RegexParser::ASTNode> RegexParser::parseConcat() {
    std::vector<std::shared_ptr<ASTNode>> parts;
    
    while (!isAtEnd() && peek() != '|' && peek() != ')') {
        parts.push_back(parseRepeat());
    }
    
    if (parts.empty()) {
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::EPSILON;
        return node;
    }
    
    if (parts.size() == 1) {
        return parts[0];
    }
    
    auto result = parts[0];
    for (size_t i = 1; i < parts.size(); ++i) {
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::CONCAT;
        node->children.push_back(result);
        node->children.push_back(parts[i]);
        result = node;
    }
    
    return result;
}

std::shared_ptr<RegexParser::ASTNode> RegexParser::parseRepeat() {
    auto base = parseAtom();
    
    while (!isAtEnd()) {
        char c = peek();
        if (c == '*') {
            advance();
            auto node = std::make_shared<ASTNode>();
            node->type = NodeType::STAR;
            node->children.push_back(base);
            base = node;
        } else if (c == '+') {
            advance();
            auto node = std::make_shared<ASTNode>();
            node->type = NodeType::PLUS;
            node->children.push_back(base);
            base = node;
        } else if (c == '?') {
            advance();
            auto node = std::make_shared<ASTNode>();
            node->type = NodeType::OPTIONAL;
            node->children.push_back(base);
            base = node;
        } else if (c == '{') {
            int minRep, maxRep;
            if (parseCountedQuantifier(minRep, maxRep)) {
                auto node = std::make_shared<ASTNode>();
                node->type = NodeType::REPEAT_N;
                node->children.push_back(base);
                node->minRepeat = minRep;
                node->maxRepeat = maxRep;
                base = node;
            } else {
                break;  // Not a valid quantifier, treat { as literal
            }
        } else {
            break;
        }
    }
    
    return base;
}

std::shared_ptr<RegexParser::ASTNode> RegexParser::parseAtom() {
    if (isAtEnd()) {
        throw ParseException("Unexpected end of pattern");
    }
    
    char c = peek();
    
    if (c == '(') {
        advance();
        auto inner = parseUnion();
        if (!match(')')) {
            throw ParseException("Missing closing parenthesis");
        }
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::GROUP;
        node->children.push_back(inner);
        return node;
    }
    
    if (c == '[') {
        advance();
        auto charClass = parseCharClass();
        if (!match(']')) {
            throw ParseException("Missing closing bracket");
        }
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::CHAR_CLASS;
        node->charClass = charClass;
        return node;
    }
    
    if (c == '.') {
        advance();
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::ANY;
        return node;
    }
    
    // Handle start anchor ^
    if (c == '^') {
        advance();
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::START_ANCHOR;
        return node;
    }
    
    // Handle end anchor $
    if (c == '$') {
        advance();
        auto node = std::make_shared<ASTNode>();
        node->type = NodeType::END_ANCHOR;
        return node;
    }
    
    if (c == '\\') {
        advance();
        if (isAtEnd()) {
            throw ParseException("Escape at end of pattern");
        }
        c = advance();
    } else if (isMetaChar(c)) {
        throw ParseException("Unexpected metacharacter: " + std::string(1, c));
    } else {
        advance();
    }
    
    auto node = std::make_shared<ASTNode>();
    node->type = NodeType::CHAR;
    node->value = c;
    return node;
}

std::set<char> RegexParser::parseCharClass() {
    std::set<char> chars;
    bool negate = false;
    
    if (peek() == '^') {
        negate = true;
        advance();
    }
    
    while (!isAtEnd() && peek() != ']') {
        char start = advance();
        
        if (peek() == '-' && pos_ + 1 < pattern_.size() && pattern_[pos_ + 1] != ']') {
            advance(); // consume '-'
            char end = advance();
            for (char c = start; c <= end; ++c) {
                chars.insert(c);
            }
        } else {
            chars.insert(start);
        }
    }
    
    if (negate) {
        std::set<char> negated;
        for (int c = 32; c < 127; ++c) {
            if (chars.find(static_cast<char>(c)) == chars.end()) {
                negated.insert(static_cast<char>(c));
            }
        }
        return negated;
    }
    
    return chars;
}

char RegexParser::peek() const {
    if (isAtEnd()) return '\0';
    return pattern_[pos_];
}

char RegexParser::advance() {
    return pattern_[pos_++];
}

bool RegexParser::match(char c) {
    if (peek() == c) {
        advance();
        return true;
    }
    return false;
}

bool RegexParser::isAtEnd() const {
    return pos_ >= pattern_.size();
}

bool RegexParser::isMetaChar(char c) const {
    return c == '(' || c == ')' || c == '[' || c == ']' ||
           c == '*' || c == '+' || c == '?' || c == '|' ||
           c == '.' || c == '\\' || c == '^' || c == '$' ||
           c == '{' || c == '}';
}

int RegexParser::parseNumber() {
    int num = 0;
    bool hasDigit = false;
    while (!isAtEnd() && std::isdigit(peek())) {
        hasDigit = true;
        num = num * 10 + (advance() - '0');
    }
    return hasDigit ? num : -1;
}

bool RegexParser::parseCountedQuantifier(int& minRep, int& maxRep) {
    // Save position in case we need to backtrack
    size_t startPos = pos_;
    
    if (peek() != '{') return false;
    advance();  // consume '{'
    
    // Parse minimum value
    minRep = parseNumber();
    if (minRep < 0) {
        pos_ = startPos;  // backtrack
        return false;
    }
    
    // Check what comes next
    if (peek() == '}') {
        // {m} - exact repetition
        advance();
        maxRep = minRep;
        return true;
    } else if (peek() == ',') {
        advance();  // consume ','
        
        if (peek() == '}') {
            // {m,} - at least m
            advance();
            maxRep = -1;  // -1 means unlimited
            return true;
        } else {
            // {m,n}
            maxRep = parseNumber();
            if (maxRep < 0 || peek() != '}') {
                pos_ = startPos;  // backtrack
                return false;
            }
            advance();  // consume '}'
            return true;
        }
    } else {
        pos_ = startPos;  // backtrack
        return false;
    }
}

NFA RegexParser::buildNFA(const std::shared_ptr<ASTNode>& node) {
    if (!node) return NFA::createEmpty();
    
    switch (node->type) {
        case NodeType::EPSILON:
            return NFA::createEmpty();
            
        case NodeType::CHAR:
            return NFA::createSingle(node->value);
            
        case NodeType::ANY: {
            // Match any printable ASCII
            NFA result = NFA::createSingle(' ');
            for (int c = '!' ; c < 127; ++c) {
                result = NFA::createUnion(std::move(result), NFA::createSingle(static_cast<char>(c)));
            }
            return result;
        }
            
        case NodeType::CHAR_CLASS: {
            if (node->charClass.empty()) {
                return NFA::createEmpty();
            }
            auto it = node->charClass.begin();
            NFA result = NFA::createSingle(*it);
            ++it;
            while (it != node->charClass.end()) {
                result = NFA::createUnion(std::move(result), NFA::createSingle(*it));
                ++it;
            }
            return result;
        }
            
        case NodeType::UNION:
            return NFA::createUnion(
                buildNFA(node->children[0]),
                buildNFA(node->children[1])
            );
            
        case NodeType::CONCAT:
            return NFA::createConcat(
                buildNFA(node->children[0]),
                buildNFA(node->children[1])
            );
            
        case NodeType::STAR:
            return NFA::createStar(buildNFA(node->children[0]));
            
        case NodeType::PLUS:
            return NFA::createPlus(buildNFA(node->children[0]));
            
        case NodeType::OPTIONAL:
            return NFA::createOptional(buildNFA(node->children[0]));
            
        case NodeType::GROUP:
            return buildNFA(node->children[0]);
        
        case NodeType::START_ANCHOR:
            // Start anchor is a zero-width assertion - in NFA we represent it as epsilon
            // The actual anchoring logic is handled during matching
            return NFA::createEmpty();
            
        case NodeType::END_ANCHOR:
            // End anchor is a zero-width assertion - in NFA we represent it as epsilon
            // The actual anchoring logic is handled during matching
            return NFA::createEmpty();
            
        case NodeType::REPEAT_N: {
            // {m,n} - repeat child between m and n times
            // For {m} (exact), minRepeat == maxRepeat
            // For {m,} (at least m), maxRepeat == -1
            int minRep = node->minRepeat;
            int maxRep = node->maxRepeat;
            
            if (minRep == 0 && maxRep == 0) {
                return NFA::createEmpty();
            }
            
            NFA childNFA = buildNFA(node->children[0]);
            
            // Build the required minimum repetitions
            NFA result = NFA::createEmpty();
            for (int i = 0; i < minRep; ++i) {
                result = NFA::createConcat(std::move(result), buildNFA(node->children[0]));
            }
            
            if (maxRep == -1) {
                // {m,} means minRep required, then Kleene star
                NFA star = NFA::createStar(buildNFA(node->children[0]));
                result = NFA::createConcat(std::move(result), std::move(star));
            } else {
                // {m,n} means minRep required, then up to (maxRep - minRep) optional
                for (int i = minRep; i < maxRep; ++i) {
                    NFA optional = NFA::createOptional(buildNFA(node->children[0]));
                    result = NFA::createConcat(std::move(result), std::move(optional));
                }
            }
            
            return result;
        }
            
        default:
            throw ParseException("Unknown AST node type");
    }
}

std::string RegexParser::ASTNode::toString() const {
    switch (type) {
        case NodeType::EPSILON: return "ε";
        case NodeType::CHAR: return std::string(1, value);
        case NodeType::ANY: return ".";
        case NodeType::CHAR_CLASS: {
            std::string s = "[";
            for (char c : charClass) s += c;
            s += "]";
            return s;
        }
        case NodeType::UNION:
            return "(" + children[0]->toString() + "|" + children[1]->toString() + ")";
        case NodeType::CONCAT:
            return children[0]->toString() + children[1]->toString();
        case NodeType::STAR:
            return "(" + children[0]->toString() + ")*";
        case NodeType::PLUS:
            return "(" + children[0]->toString() + ")+";
        case NodeType::OPTIONAL:
            return "(" + children[0]->toString() + ")?";
        case NodeType::GROUP:
            return "(" + children[0]->toString() + ")";
        case NodeType::START_ANCHOR:
            return "^";
        case NodeType::END_ANCHOR:
            return "$";
        case NodeType::REPEAT_N: {
            std::string result = "(" + children[0]->toString() + "){";
            result += std::to_string(minRepeat);
            if (maxRepeat == -1) {
                result += ",}";
            } else if (maxRepeat != minRepeat) {
                result += "," + std::to_string(maxRepeat) + "}";
            } else {
                result += "}";
            }
            return result;
        }
        default:
            return "?";
    }
}

std::string RegexParser::ASTNode::toJson() const {
    JsonSerializer::ObjectBuilder obj;
    std::string typeName;
    switch (type) {
        case NodeType::EPSILON: typeName = "epsilon"; break;
        case NodeType::CHAR: typeName = "char"; break;
        case NodeType::ANY: typeName = "any"; break;
        case NodeType::CHAR_CLASS: typeName = "charClass"; break;
        case NodeType::UNION: typeName = "union"; break;
        case NodeType::CONCAT: typeName = "concat"; break;
        case NodeType::STAR: typeName = "star"; break;
        case NodeType::PLUS: typeName = "plus"; break;
        case NodeType::OPTIONAL: typeName = "optional"; break;
        case NodeType::GROUP: typeName = "group"; break;
        case NodeType::START_ANCHOR: typeName = "startAnchor"; break;
        case NodeType::END_ANCHOR: typeName = "endAnchor"; break;
        case NodeType::REPEAT_N: typeName = "repeatN"; break;
    }
    obj.add("type", typeName);
    
    if (type == NodeType::CHAR) {
        obj.add("value", std::string(1, value));
    }
    
    if (type == NodeType::CHAR_CLASS) {
        std::string chars;
        for (char c : charClass) chars += c;
        obj.add("chars", chars);
    }
    
    if (type == NodeType::REPEAT_N) {
        obj.add("minRepeat", std::to_string(minRepeat));
        obj.add("maxRepeat", std::to_string(maxRepeat));
    }
    
    if (!children.empty()) {
        JsonSerializer::ArrayBuilder arr;
        for (const auto& child : children) {
            arr.addRaw(child->toJson());
        }
        obj.addRaw("children", arr.build());
    }
    
    return obj.build();
}

std::string RegexParser::expandDNAShortcuts(const std::string& pattern) {
    std::string result;
    for (size_t i = 0; i < pattern.size(); ++i) {
        char c = pattern[i];
        if (c == 'N') {
            result += "[ACGT]";
        } else if (c == 'R') {
            result += "[AG]";  // Purine
        } else if (c == 'Y') {
            result += "[CT]";  // Pyrimidine
        } else if (c == 'W') {
            result += "[AT]";  // Weak
        } else if (c == 'S') {
            result += "[GC]";  // Strong
        } else {
            result += c;
        }
    }
    return result;
}

// RegexHighlighter
std::vector<RegexHighlighter::Token> RegexHighlighter::tokenize(const std::string& pattern) {
    std::vector<Token> tokens;
    size_t i = 0;
    
    while (i < pattern.size()) {
        char c = pattern[i];
        Token t;
        t.start = i;
        t.length = 1;
        t.text = std::string(1, c);
        
        if (c == '*' || c == '+' || c == '?') {
            t.type = TokenType::QUANTIFIER;
        } else if (c == '|') {
            t.type = TokenType::METACHAR;
        } else if (c == '(' || c == ')') {
            t.type = c == '(' ? TokenType::GROUP_OPEN : TokenType::GROUP_CLOSE;
        } else if (c == '[') {
            t.type = TokenType::CHAR_CLASS;
            size_t start = i;
            ++i;
            while (i < pattern.size() && pattern[i] != ']') ++i;
            if (i < pattern.size()) ++i;
            t.length = i - start;
            t.text = pattern.substr(start, t.length);
            tokens.push_back(t);
            continue;
        } else if (c == '\\') {
            t.type = TokenType::ESCAPE;
            if (i + 1 < pattern.size()) {
                t.length = 2;
                t.text = pattern.substr(i, 2);
                ++i;
            }
        } else if (c == '.') {
            t.type = TokenType::METACHAR;
        } else {
            t.type = TokenType::LITERAL;
        }
        
        tokens.push_back(t);
        ++i;
    }
    
    return tokens;
}

std::string RegexHighlighter::toHighlightedHtml(const std::string& pattern) {
    auto tokens = tokenize(pattern);
    std::string html;
    
    for (const auto& t : tokens) {
        std::string className;
        switch (t.type) {
            case TokenType::LITERAL: className = "literal"; break;
            case TokenType::METACHAR: className = "meta"; break;
            case TokenType::QUANTIFIER: className = "quantifier"; break;
            case TokenType::GROUP_OPEN:
            case TokenType::GROUP_CLOSE: className = "group"; break;
            case TokenType::CHAR_CLASS: className = "charclass"; break;
            case TokenType::ESCAPE: className = "escape"; break;
            case TokenType::ERROR: className = "error"; break;
        }
        html += "<span class=\"regex-" + className + "\">" + 
                JsonSerializer::escape(t.text) + "</span>";
    }
    
    return html;
}

} // namespace automata
