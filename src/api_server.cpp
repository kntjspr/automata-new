/**
 * DNA Pattern Matcher - C++ HTTP API Server
 * 
 * Provides REST API endpoints for DNA sequence analysis
 * and pattern matching, replacing the Python Flask implementation.
 */

#include "api/server.hpp"
#include "httplib.h"
#include "bio/sequence.hpp"
#include "bio/approximate_matcher.hpp"
#include "automata/regex_parser.hpp"
#include "automata/dfa.hpp"
#include "automata/pda.hpp"

#include <iostream>
#include <sstream>
#include <fstream>
#include <regex>
#include <algorithm>
#include <cctype>

namespace api {

// ============ JSON Helpers ============

std::string Server::escapeJson(const std::string& s) {
    std::string result;
    result.reserve(s.size());
    for (char c : s) {
        switch (c) {
            case '"':  result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:   result += c; break;
        }
    }
    return result;
}

std::string Server::jsonError(const std::string& message) {
    return "{\"success\":false,\"error\":\"" + escapeJson(message) + "\"}";
}

// Simple JSON value extractor (basic implementation)
std::string extractJsonString(const std::string& json, const std::string& key) {
    std::string searchKey = "\"" + key + "\"";
    size_t keyPos = json.find(searchKey);
    if (keyPos == std::string::npos) return "";
    
    size_t colonPos = json.find(':', keyPos + searchKey.length());
    if (colonPos == std::string::npos) return "";
    
    // Skip whitespace
    size_t start = colonPos + 1;
    while (start < json.length() && std::isspace(json[start])) start++;
    
    if (start >= json.length()) return "";
    
    if (json[start] == '"') {
        // String value
        start++;
        size_t end = start;
        while (end < json.length() && json[end] != '"') {
            if (json[end] == '\\' && end + 1 < json.length()) end++;
            end++;
        }
        return json.substr(start, end - start);
    }
    return "";
}

int extractJsonInt(const std::string& json, const std::string& key, int defaultVal = 0) {
    std::string searchKey = "\"" + key + "\"";
    size_t keyPos = json.find(searchKey);
    if (keyPos == std::string::npos) return defaultVal;
    
    size_t colonPos = json.find(':', keyPos + searchKey.length());
    if (colonPos == std::string::npos) return defaultVal;
    
    size_t start = colonPos + 1;
    while (start < json.length() && std::isspace(json[start])) start++;
    
    try {
        return std::stoi(json.substr(start));
    } catch (...) {
        return defaultVal;
    }
}

bool extractJsonBool(const std::string& json, const std::string& key, bool defaultVal = true) {
    std::string searchKey = "\"" + key + "\"";
    size_t keyPos = json.find(searchKey);
    if (keyPos == std::string::npos) return defaultVal;
    
    size_t colonPos = json.find(':', keyPos + searchKey.length());
    if (colonPos == std::string::npos) return defaultVal;
    
    size_t start = colonPos + 1;
    while (start < json.length() && std::isspace(json[start])) start++;
    
    if (json.substr(start, 4) == "true") return true;
    if (json.substr(start, 5) == "false") return false;
    return defaultVal;
}

// ============ DNA Analysis Helpers ============

std::string validateDNA(const std::string& sequence) {
    std::string clean;
    clean.reserve(sequence.size());
    for (char c : sequence) {
        if (c == ' ' || c == '\n' || c == '\r' || c == '\t') continue;
        char upper = std::toupper(c);
        if (upper != 'A' && upper != 'C' && upper != 'G' && upper != 'T') {
            throw std::invalid_argument("Invalid DNA sequence: only A, C, G, T allowed");
        }
        clean += upper;
    }
    return clean;
}

std::string getComplement(const std::string& sequence) {
    std::string result;
    result.reserve(sequence.size());
    for (char c : sequence) {
        switch (c) {
            case 'A': result += 'T'; break;
            case 'T': result += 'A'; break;
            case 'G': result += 'C'; break;
            case 'C': result += 'G'; break;
            default:  result += 'N'; break;
        }
    }
    return result;
}

std::string getReverseComplement(const std::string& sequence) {
    std::string comp = getComplement(sequence);
    std::reverse(comp.begin(), comp.end());
    return comp;
}

double gcContent(const std::string& sequence) {
    if (sequence.empty()) return 0.0;
    int gc = 0;
    for (char c : sequence) {
        if (c == 'G' || c == 'C') gc++;
    }
    return static_cast<double>(gc) / sequence.size() * 100.0;
}

int hammingDistance(const std::string& s1, const std::string& s2) {
    if (s1.length() != s2.length()) return 999999;
    int dist = 0;
    for (size_t i = 0; i < s1.length(); i++) {
        if (s1[i] != s2[i]) dist++;
    }
    return dist;
}

// Check if pattern contains regex metacharacters
bool isRegexPattern(const std::string& pattern) {
    return pattern.find_first_of("[]|*+?().") != std::string::npos;
}

// ============ Server Implementation ============

Server::Server(int port, const std::string& staticDir)
    : port_(port), staticDir_(staticDir), running_(false) {}

void Server::stop() {
    running_ = false;
}

void Server::start() {
    httplib::Server svr;
    running_ = true;
    
    // Set default CORS headers for ALL responses (including OPTIONS preflight)
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Accept, Origin, X-Requested-With"},
        {"Access-Control-Max-Age", "86400"}
    });
    
    // Handle OPTIONS preflight - just return 204 (headers already set by default)
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });
    
    // ============ API Endpoints ============
    
    // Health check
    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(
            R"({"status":"healthy","service":"DNA Pattern Matcher","version":"1.0.0"})",
            "application/json"
        );
    });
    
    // Analyze DNA sequence
    svr.Post("/api/bio/analyze", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json");
        
        try {
            std::string sequenceStr = extractJsonString(req.body, "sequence");
            if (sequenceStr.empty()) {
                res.status = 400;
                res.set_content(jsonError("Missing 'sequence' field"), "application/json");
                return;
            }
            
            std::string sequence = validateDNA(sequenceStr);
            std::string complement = getComplement(sequence);
            std::string reverseComp = getReverseComplement(sequence);
            double gc = gcContent(sequence);
            
            std::ostringstream json;
            json << "{";
            json << "\"success\":true,";
            json << "\"sequence\":\"" << sequence << "\",";
            json << "\"length\":" << sequence.length() << ",";
            json << std::fixed << std::setprecision(2);
            json << "\"gcContent\":" << gc << ",";
            json << "\"complement\":\"" << complement << "\",";
            json << "\"reverseComplement\":\"" << reverseComp << "\"";
            json << "}";
            
            res.set_content(json.str(), "application/json");
            
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(jsonError(e.what()), "application/json");
        }
    });
    
    // Pattern matching
    svr.Post("/api/bio/match", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json");
        
        try {
            std::string sequenceStr = extractJsonString(req.body, "sequence");
            std::string pattern = extractJsonString(req.body, "pattern");
            int maxDistance = extractJsonInt(req.body, "maxDistance", 0);
            bool searchBoth = extractJsonBool(req.body, "searchBothStrands", true);
            
            if (sequenceStr.empty()) {
                res.status = 400;
                res.set_content(jsonError("Missing 'sequence' field"), "application/json");
                return;
            }
            if (pattern.empty()) {
                res.status = 400;
                res.set_content(jsonError("Missing 'pattern' field"), "application/json");
                return;
            }
            
            std::string sequence = validateDNA(sequenceStr);
            std::string patternUpper = pattern;
            std::transform(patternUpper.begin(), patternUpper.end(), patternUpper.begin(), ::toupper);
            
            std::vector<std::tuple<size_t, size_t, std::string, int, std::string>> matches;
            
            bool useRegex = isRegexPattern(pattern);
            
            if (useRegex) {
                // Use regex matching
                try {
                    std::regex regex(patternUpper);
                    std::sregex_iterator it(sequence.begin(), sequence.end(), regex);
                    std::sregex_iterator end;
                    
                    while (it != end) {
                        std::smatch match = *it;
                        matches.emplace_back(
                            match.position(),
                            match.position() + match.length(),
                            match.str(),
                            0,
                            "forward"
                        );
                        ++it;
                    }
                } catch (const std::regex_error& e) {
                    res.status = 400;
                    res.set_content(jsonError(std::string("Invalid regex: ") + e.what()), "application/json");
                    return;
                }
            } else {
                // Exact/approximate matching
                size_t patLen = patternUpper.length();
                for (size_t i = 0; i + patLen <= sequence.length(); i++) {
                    std::string substr = sequence.substr(i, patLen);
                    int dist = hammingDistance(patternUpper, substr);
                    if (dist <= maxDistance) {
                        matches.emplace_back(i, i + patLen, substr, dist, "forward");
                    }
                }
            }
            
            // Search reverse complement if requested
            if (searchBoth) {
                std::string revComp = getReverseComplement(sequence);
                
                if (useRegex) {
                    try {
                        std::regex regex(patternUpper);
                        std::sregex_iterator it(revComp.begin(), revComp.end(), regex);
                        std::sregex_iterator end;
                        
                        while (it != end) {
                            std::smatch match = *it;
                            size_t revStart = match.position();
                            size_t revEnd = revStart + match.length();
                            // Convert to forward strand coordinates
                            size_t fwdStart = sequence.length() - revEnd;
                            size_t fwdEnd = sequence.length() - revStart;
                            matches.emplace_back(fwdStart, fwdEnd, match.str(), 0, "reverse");
                            ++it;
                        }
                    } catch (...) {
                        // Ignore regex errors on reverse strand
                    }
                } else {
                    size_t patLen = patternUpper.length();
                    for (size_t i = 0; i + patLen <= revComp.length(); i++) {
                        std::string substr = revComp.substr(i, patLen);
                        int dist = hammingDistance(patternUpper, substr);
                        if (dist <= maxDistance) {
                            size_t fwdStart = sequence.length() - (i + patLen);
                            size_t fwdEnd = fwdStart + patLen;
                            matches.emplace_back(fwdStart, fwdEnd, substr, dist, "reverse");
                        }
                    }
                }
            }
            
            // Sort by position
            std::sort(matches.begin(), matches.end(),
                [](const auto& a, const auto& b) { return std::get<0>(a) < std::get<0>(b); });
            
            // Build JSON response
            std::ostringstream json;
            json << "{";
            json << "\"success\":true,";
            json << "\"matches\":[";
            
            for (size_t i = 0; i < matches.size(); i++) {
                if (i > 0) json << ",";
                json << "{";
                json << "\"start\":" << std::get<0>(matches[i]) << ",";
                json << "\"end\":" << std::get<1>(matches[i]) << ",";
                json << "\"text\":\"" << std::get<2>(matches[i]) << "\",";
                json << "\"distance\":" << std::get<3>(matches[i]) << ",";
                json << "\"strand\":\"" << std::get<4>(matches[i]) << "\"";
                json << "}";
            }
            
            json << "],";
            json << "\"count\":" << matches.size() << ",";
            json << "\"dfaStates\":" << (patternUpper.length() + 1) << ",";
            json << "\"matchType\":\"" << (maxDistance > 0 ? "Levenshtein DFA" : "DFA") << "\"";
            json << "}";
            
            res.set_content(json.str(), "application/json");
            
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(jsonError(e.what()), "application/json");
        }
    });
    
    // ============ PDA Endpoints (RNA/XML Validation) ============
    
    // Validate RNA secondary structure (dot-bracket notation)
    svr.Post("/api/pda/rna", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json");
        
        try {
            std::string structure = extractJsonString(req.body, "structure");
            if (structure.empty()) {
                res.status = 400;
                res.set_content(jsonError("Missing 'structure' field"), "application/json");
                return;
            }
            
            // PDA-based bracket matching
            std::vector<std::tuple<std::string, char, std::string, std::string>> history;
            std::string stack = "$";  // Initial stack symbol
            std::string currentState = "q0";
            std::string error;
            
            for (size_t i = 0; i < structure.length() && error.empty(); i++) {
                char symbol = structure[i];
                char stackTop = stack.back();
                std::string stackAction;
                
                if (symbol == '(' || symbol == '[' || symbol == '{' || symbol == '<') {
                    stack += symbol;
                    stackAction = std::string("PUSH ") + symbol;
                    currentState = "q1";
                } else if (symbol == ')' || symbol == ']' || symbol == '}' || symbol == '>') {
                    char expected = 0;
                    switch (symbol) {
                        case ')': expected = '('; break;
                        case ']': expected = '['; break;
                        case '}': expected = '{'; break;
                        case '>': expected = '<'; break;
                    }
                    
                    if (stackTop == expected) {
                        stack.pop_back();
                        stackAction = std::string("POP ") + expected;
                    } else if (stackTop == '$') {
                        error = "Position " + std::to_string(i + 1) + ": Unexpected closing '" + symbol + "'";
                        currentState = "qReject";
                    } else {
                        error = "Position " + std::to_string(i + 1) + ": Mismatched brackets";
                        currentState = "qReject";
                    }
                } else if (symbol == '.' || symbol == 'A' || symbol == 'U' || 
                           symbol == 'G' || symbol == 'C' || std::isspace(symbol)) {
                    stackAction = "SKIP";
                } else {
                    error = "Position " + std::to_string(i + 1) + ": Invalid character '" + symbol + "'";
                    currentState = "qReject";
                }
                
                history.emplace_back(currentState, symbol, stackAction, stack);
            }
            
            // Check for unclosed brackets
            if (error.empty() && stack.length() > 1) {
                error = "Unclosed brackets at end";
                currentState = "qReject";
            }
            
            bool accepted = error.empty() && stack == "$";
            if (accepted) currentState = "qAccept";
            
            // Build response
            std::ostringstream json;
            json << "{";
            json << "\"success\":true,";
            json << "\"accepted\":" << (accepted ? "true" : "false") << ",";
            json << "\"currentState\":\"" << currentState << "\",";
            json << "\"stack\":\"" << stack << "\",";
            json << "\"error\":" << (error.empty() ? "null" : ("\"" + escapeJson(error) + "\"")) << ",";
            json << "\"history\":[";
            for (size_t i = 0; i < history.size(); i++) {
                if (i > 0) json << ",";
                json << "{\"state\":\"" << std::get<0>(history[i]) << "\",";
                json << "\"symbol\":\"" << std::get<1>(history[i]) << "\",";
                json << "\"stackAction\":\"" << std::get<2>(history[i]) << "\",";
                json << "\"stack\":\"" << std::get<3>(history[i]) << "\"}";
            }
            json << "]}";
            
            res.set_content(json.str(), "application/json");
            
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(jsonError(e.what()), "application/json");
        }
    });
    
    // Validate XML well-formedness
    svr.Post("/api/pda/xml", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json");
        
        try {
            std::string xml = extractJsonString(req.body, "xml");
            if (xml.empty()) {
                res.status = 400;
                res.set_content(jsonError("Missing 'xml' field"), "application/json");
                return;
            }
            
            // Simple XML tag parsing
            std::vector<std::tuple<std::string, std::string, std::string, std::string>> history;
            std::vector<std::tuple<std::string, std::string, size_t>> tags;
            std::string stack = "$";
            std::string currentState = "q0";
            std::string error;
            
            std::regex tagRegex("</?([a-zA-Z][a-zA-Z0-9]*)\\s*/?>");
            std::sregex_iterator it(xml.begin(), xml.end(), tagRegex);
            std::sregex_iterator end;
            
            while (it != end && error.empty()) {
                std::smatch match = *it;
                std::string fullTag = match[0];
                std::string tagName = match[1];
                size_t position = match.position();
                std::string stackAction;
                std::string tagType;
                
                if (fullTag[1] == '/') {
                    // Closing tag
                    tagType = "close";
                    
                    // Find the tag on stack
                    size_t stackPos = stack.rfind("<" + tagName + ">");
                    if (stackPos != std::string::npos && stackPos > 0) {
                        // Check if it's the top element
                        std::string expectedClose = "<" + tagName + ">";
                        if (stack.length() >= expectedClose.length() && 
                            stack.substr(stack.length() - expectedClose.length()) == expectedClose) {
                            stack = stack.substr(0, stack.length() - expectedClose.length());
                            stackAction = "POP <" + tagName + ">";
                            currentState = "q1";
                        } else {
                            error = "Position " + std::to_string(position) + ": Mismatched closing tag </" + tagName + ">";
                            currentState = "qReject";
                        }
                    } else if (stack == "$") {
                        error = "Position " + std::to_string(position) + ": Unexpected closing tag </" + tagName + ">";
                        currentState = "qReject";
                    } else {
                        error = "Position " + std::to_string(position) + ": Mismatched closing tag </" + tagName + ">";
                        currentState = "qReject";
                    }
                } else if (fullTag.back() == '>' && fullTag[fullTag.length()-2] == '/') {
                    // Self-closing tag
                    tagType = "self-close";
                    stackAction = "SKIP (self-closing)";
                } else {
                    // Opening tag
                    tagType = "open";
                    stack += "<" + tagName + ">";
                    stackAction = "PUSH <" + tagName + ">";
                    currentState = "q1";
                }
                
                tags.emplace_back(tagName, tagType, position);
                history.emplace_back(currentState, fullTag, stackAction, stack);
                ++it;
            }
            
            // Check for unclosed tags
            if (error.empty() && stack != "$") {
                error = "Unclosed tags at end";
                currentState = "qReject";
            }
            
            bool accepted = error.empty() && stack == "$";
            if (accepted) currentState = "qAccept";
            
            // Build response
            std::ostringstream json;
            json << "{";
            json << "\"success\":true,";
            json << "\"accepted\":" << (accepted ? "true" : "false") << ",";
            json << "\"currentState\":\"" << currentState << "\",";
            json << "\"error\":" << (error.empty() ? "null" : ("\"" + escapeJson(error) + "\"")) << ",";
            json << "\"tags\":[";
            for (size_t i = 0; i < tags.size(); i++) {
                if (i > 0) json << ",";
                json << "{\"name\":\"" << std::get<0>(tags[i]) << "\",";
                json << "\"type\":\"" << std::get<1>(tags[i]) << "\",";
                json << "\"position\":" << std::get<2>(tags[i]) << "}";
            }
            json << "],";
            json << "\"history\":[";
            for (size_t i = 0; i < history.size(); i++) {
                if (i > 0) json << ",";
                json << "{\"state\":\"" << std::get<0>(history[i]) << "\",";
                json << "\"symbol\":\"" << escapeJson(std::get<1>(history[i])) << "\",";
                json << "\"stackAction\":\"" << escapeJson(std::get<2>(history[i])) << "\",";
                json << "\"stack\":\"" << escapeJson(std::get<3>(history[i])) << "\"}";
            }
            json << "]}";
            
            res.set_content(json.str(), "application/json");
            
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(jsonError(e.what()), "application/json");
        }
    });
    
    // Static file serving
    svr.set_mount_point("/", staticDir_);
    
    // Fallback to index.html for SPA routing
    svr.set_error_handler([&](const httplib::Request& req, httplib::Response& res) {
        if (res.status == 404 && req.path.find("/api/") != 0) {
            // Try to serve index.html for non-API routes
            std::string indexPath = staticDir_ + "/index.html";
            std::ifstream file(indexPath);
            if (file.is_open()) {
                std::ostringstream content;
                content << file.rdbuf();
                res.status = 200;
                res.set_content(content.str(), "text/html");
            } else {
                res.set_content("404 Not Found", "text/plain");
            }
        }
    });
    
    std::cout << "🧬 DNA Pattern Matcher C++ API running at http://localhost:" << port_ << std::endl;
    svr.listen("0.0.0.0", port_);
}

} // namespace api

// ============ Main Entry Point ============

int main(int argc, char* argv[]) {
    int port = 5000;
    std::string staticDir = "./vite/dist";
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "-p" || arg == "--port") {
            if (i + 1 < argc) {
                port = std::stoi(argv[++i]);
            }
        } else if (arg == "-s" || arg == "--static") {
            if (i + 1 < argc) {
                staticDir = argv[++i];
            }
        } else if (arg == "-h" || arg == "--help") {
            std::cout << "DNA Pattern Matcher - C++ API Server\n\n";
            std::cout << "Usage: api_server [options]\n\n";
            std::cout << "Options:\n";
            std::cout << "  -p, --port <port>      Port to listen on (default: 5000)\n";
            std::cout << "  -s, --static <dir>     Static files directory (default: ./vite/dist)\n";
            std::cout << "  -h, --help             Show this help message\n";
            return 0;
        } else {
            // Positional argument: port
            try {
                port = std::stoi(arg);
            } catch (...) {
                std::cerr << "Unknown argument: " << arg << std::endl;
                return 1;
            }
        }
    }
    
    api::Server server(port, staticDir);
    server.start();
    
    return 0;
}
