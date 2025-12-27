#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include "automata/regex_parser.hpp"
#include "automata/nfa.hpp"
#include "automata/dfa.hpp"
#include "automata/pda.hpp"
#include "bio/sequence.hpp"
#include "bio/approximate_matcher.hpp"

void printUsage() {
    std::cout << "Automata Simulator - Command Line Interface\n\n";
    std::cout << "Usage:\n";
    std::cout << "  automata_cli regex <pattern> [test_string]\n";
    std::cout << "  automata_cli dna <sequence> <pattern> [max_mismatches]\n";
    std::cout << "  automata_cli pda <type> <input>\n";
    std::cout << "  automata_cli viz <pattern>           # Visualize NFA for pattern\n";
    std::cout << "\nExamples:\n";
    std::cout << "  automata_cli regex \"a(b|c)*d\" \"abcbd\"\n";
    std::cout << "  automata_cli dna \"ATGCGATCGATCG\" \"ATG\" 1\n";
    std::cout << "  automata_cli pda balanced \"((()))\"\n";
    std::cout << "  automata_cli viz \"TAA|TAG|TGA\"        # Visualize stop codons NFA\n";
}

// ASCII Art NFA Visualization
void printNFAVisualization(const automata::NFA& nfa, const std::string& pattern) {
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                    NFA VISUALIZATION                             ║\n";
    std::cout << "║  Pattern: " << std::left << std::setw(54) << pattern << " ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════════╣\n";
    
    auto states = nfa.getStates();
    auto transitions = nfa.getTransitions();
    auto acceptingStates = nfa.getAcceptingStates();
    auto startState = nfa.getStartState();
    
    // Print states summary
    std::cout << "║  States: " << nfa.getStateCount() << std::string(56, ' ') << "║\n";
    std::cout << "║  Transitions: " << transitions.size() << std::string(51, ' ') << "║\n";
    std::cout << "║  Start: q" << startState << std::string(55, ' ') << "║\n";
    
    std::cout << "║  Accept: ";
    std::ostringstream acceptOss;
    for (auto it = acceptingStates.begin(); it != acceptingStates.end(); ++it) {
        if (it != acceptingStates.begin()) acceptOss << ", ";
        acceptOss << "q" << *it;
    }
    std::string acceptStr = acceptOss.str();
    std::cout << std::left << std::setw(56) << acceptStr << "║\n";
    
    std::cout << "╠══════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║  TRANSITIONS                                                     ║\n";
    std::cout << "╠──────────────────────────────────────────────────────────────────╣\n";
    
    // Group transitions by source state
    std::map<automata::StateId, std::vector<std::pair<std::string, automata::StateId>>> grouped;
    for (const auto& t : transitions) {
        std::string symbol = t.isEpsilon() ? "ε" : std::string(1, t.getSymbol());
        grouped[t.getFrom()].push_back({symbol, t.getTo()});
    }
    
    for (const auto& [from, trans] : grouped) {
        std::ostringstream lineOss;
        std::string prefix = (from == startState) ? "→ " : "  ";
        std::string suffix = (acceptingStates.count(from)) ? " (accept)" : "";
        
        lineOss << prefix << "q" << from << suffix << ": ";
        for (size_t i = 0; i < trans.size(); ++i) {
            if (i > 0) lineOss << ", ";
            lineOss << "--[" << trans[i].first << "]--> q" << trans[i].second;
        }
        
        std::string line = lineOss.str();
        if (line.length() > 64) line = line.substr(0, 61) + "...";
        std::cout << "║  " << std::left << std::setw(64) << line << "║\n";
    }
    
    // Print accept states that have no outgoing transitions
    for (auto accState : acceptingStates) {
        if (grouped.find(accState) == grouped.end()) {
            std::ostringstream lineOss;
            lineOss << "  q" << accState << " (accept): [final state]";
            std::cout << "║  " << std::left << std::setw(64) << lineOss.str() << "║\n";
        }
    }
    
    std::cout << "╠══════════════════════════════════════════════════════════════════╣\n";
    
    // Draw ASCII graph for simple alternation patterns
    if (pattern.find('|') != std::string::npos && pattern.find('*') == std::string::npos 
        && pattern.find('+') == std::string::npos && pattern.find('?') == std::string::npos) {
        
        std::cout << "║  GRAPH (Alternation Pattern)                                    ║\n";
        std::cout << "╠──────────────────────────────────────────────────────────────────╣\n";
        
        // Parse alternation branches
        std::vector<std::string> branches;
        std::istringstream iss(pattern);
        std::string branch;
        while (std::getline(iss, branch, '|')) {
            branches.push_back(branch);
        }
        
        // Draw the structure
        size_t maxLen = 0;
        for (const auto& b : branches) maxLen = std::max(maxLen, b.length());
        
        std::cout << "║                                                                  ║\n";
        
        for (size_t i = 0; i < branches.size(); ++i) {
            std::ostringstream rowOss;
            
            // Epsilon branch indicator
            if (i == 0) {
                rowOss << "         ╭──ε──";
            } else if (i == branches.size() - 1) {
                rowOss << "         ╰──ε──";
            } else {
                rowOss << "         ├──ε──";
            }
            
            // States and transitions for this branch
            const std::string& b = branches[i];
            rowOss << "○";
            for (size_t j = 0; j < b.length(); ++j) {
                rowOss << "──" << b[j] << "──";
                if (j < b.length() - 1) {
                    rowOss << "○";
                } else {
                    rowOss << "◎";  // Accept state
                }
            }
            
            // Pad and add branch label
            std::string rowStr = rowOss.str();
            while (rowStr.length() < 54) rowStr += " ";
            rowStr += "\"" + b + "\"";
            
            while (rowStr.length() < 64) rowStr += " ";
            std::cout << "║  " << rowStr << "║\n";
        }
        
        // Draw start state
        std::cout << "║         │                                                       ║\n";
        std::cout << "║    →○───┘  (q0 = start)                                         ║\n";
        std::cout << "║                                                                  ║\n";
    }
    
    std::cout << "╠══════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║  LEGEND                                                          ║\n";
    std::cout << "║  → = Start state    ○ = State    ◎ = Accept state               ║\n";
    std::cout << "║  ε = Epsilon (empty) transition                                  ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════════╝\n";
}

void runVizDemo(const std::string& pattern) {
    std::cout << "=== NFA Visualization Demo ===\n";
    std::cout << "Pattern: " << pattern << "\n";
    
    try {
        automata::RegexParser parser;
        automata::NFA nfa = parser.parse(pattern);
        
        // Print basic info
        std::cout << "\nNFA Statistics:\n";
        std::cout << "  States: " << nfa.getStateCount() << "\n";
        std::cout << "  Transitions: " << nfa.getTransitions().size() << "\n";
        std::cout << "  Start State: q" << nfa.getStartState() << "\n";
        std::cout << "  Accepting States: ";
        for (auto s : nfa.getAcceptingStates()) {
            std::cout << "q" << s << " ";
        }
        std::cout << "\n";
        
        // Print ASCII visualization
        printNFAVisualization(nfa, pattern);
        
        // Print detailed transition table
        std::cout << "\nTransition Table:\n";
        std::cout << std::string(50, '-') << "\n";
        std::cout << std::left << std::setw(10) << "From" 
                  << std::setw(15) << "Symbol" 
                  << std::setw(10) << "To" << "\n";
        std::cout << std::string(50, '-') << "\n";
        
        for (const auto& t : nfa.getTransitions()) {
            std::cout << std::left << std::setw(10) << ("q" + std::to_string(t.getFrom()));
            if (t.isEpsilon()) {
                std::cout << std::setw(15) << "ε (epsilon)";
            } else {
                std::cout << std::setw(15) << t.getSymbol();
            }
            std::cout << std::setw(10) << ("q" + std::to_string(t.getTo())) << "\n";
        }
        std::cout << std::string(50, '-') << "\n";
        
        // Test some strings
        std::cout << "\nTest Strings:\n";
        std::vector<std::string> testCases;
        
        // Generate test cases based on pattern
        if (pattern.find('|') != std::string::npos) {
            std::istringstream iss(pattern);
            std::string branch;
            while (std::getline(iss, branch, '|')) {
                testCases.push_back(branch);
            }
            testCases.push_back("INVALID");
            testCases.push_back("");
        } else {
            testCases.push_back(pattern);
            testCases.push_back("");
        }
        
        for (const auto& test : testCases) {
            bool accepted = nfa.accepts(test);
            std::cout << "  \"" << (test.empty() ? "(empty)" : test) << "\" => " 
                      << (accepted ? "✓ ACCEPTED" : "✗ REJECTED") << "\n";
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
    }
}

void runRegexDemo(const std::string& pattern, const std::string& testString = "") {
    std::cout << "=== Regular Expression Demo ===\n\n";
    std::cout << "Pattern: " << pattern << "\n\n";
    
    try {
        automata::RegexParser parser;
        automata::NFA nfa = parser.parse(pattern);
        
        std::cout << "1. NFA constructed via Thompson's algorithm:\n";
        std::cout << "   States: " << nfa.getStateCount() << "\n";
        std::cout << "   Transitions: " << nfa.getTransitions().size() << "\n\n";
        
        automata::DFA dfa = automata::DFA::fromNFA(nfa);
        std::cout << "2. DFA constructed via subset construction:\n";
        std::cout << "   States: " << dfa.getStateCount() << "\n";
        std::cout << "   Transitions: " << dfa.getTransitions().size() << "\n\n";
        
        automata::DFA minDfa = dfa.minimize();
        std::cout << "3. Minimized DFA:\n";
        std::cout << "   States: " << minDfa.getStateCount() << "\n";
        std::cout << "   Transitions: " << minDfa.getTransitions().size() << "\n\n";
        
        auto grammar = minDfa.toRegularGrammar();
        std::cout << "4. Regular Grammar:\n";
        for (const auto& rule : grammar) {
            std::cout << "   " << rule.nonTerminal << " -> ";
            std::cout << (rule.production.empty() ? "ε" : rule.production) << "\n";
        }
        std::cout << "\n";
        
        if (!testString.empty()) {
            bool accepted = minDfa.accepts(testString);
            std::cout << "5. Testing \"" << testString << "\": ";
            std::cout << (accepted ? "ACCEPTED ✓" : "REJECTED ✗") << "\n\n";
            
            std::cout << "Execution trace:\n";
            auto trace = minDfa.traceExecution(testString);
            for (const auto& step : trace) {
                std::cout << "   q" << step.currentState << " --[" 
                          << step.consumedSymbol << "]--> q" << step.nextState;
                if (step.accepted) std::cout << " (accepting)";
                std::cout << "\n";
            }
        }
        
        std::cout << "\nJSON Output:\n" << minDfa.toJson() << "\n";
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
    }
}

void runDNADemo(const std::string& sequence, const std::string& pattern, int maxMismatches) {
    std::cout << "=== DNA Sequence Analysis Demo ===\n\n";
    std::cout << "Sequence: " << sequence << "\n";
    std::cout << "Pattern:  " << pattern << "\n";
    std::cout << "Max mismatches: " << maxMismatches << "\n\n";
    
    try {
        bio::Sequence seq(sequence, bio::SequenceType::DNA);
        std::cout << "Sequence length: " << seq.length() << "\n";
        std::cout << "GC content: " << (seq.gcContent() * 100) << "%\n";
        std::cout << "Complement: " << seq.complement().getString() << "\n";
        std::cout << "Rev. complement: " << seq.reverseComplement().getString() << "\n\n";
        
        bio::DNAApproximateMatcher matcher(pattern, maxMismatches);
        auto matches = matcher.findBothStrands(seq);
        
        std::cout << "Matches found: " << matches.size() << "\n";
        for (const auto& m : matches) {
            std::cout << "  Position " << m.match.start << "-" << m.match.end;
            std::cout << " (" << (m.isReverseComplement ? "reverse" : "forward") << ")";
            std::cout << ": \"" << m.match.matchedText << "\"";
            std::cout << " [distance=" << m.match.editDistance << "]\n";
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
    }
}

void runPDADemo(const std::string& type, const std::string& input) {
    std::cout << "=== Pushdown Automaton Demo ===\n\n";
    std::cout << "Type: " << type << "\n";
    std::cout << "Input: " << input << "\n\n";
    
    automata::PDA pda;
    
    if (type == "balanced") {
        pda = automata::PDA::createBalancedParentheses();
        std::cout << "PDA: Balanced Parentheses { ()^n | n >= 0 }\n";
    } else if (type == "anbn") {
        pda = automata::PDA::createAnBn();
        std::cout << "PDA: a^n b^n language\n";
    } else if (type == "palindrome") {
        pda = automata::PDA::createPalindromeRecognizer();
        std::cout << "PDA: Palindrome recognizer over {a,b}\n";
    } else if (type == "rna") {
        pda = automata::PDA::createRNAStemLoopRecognizer();
        std::cout << "PDA: RNA Stem-Loop structure recognizer\n";
    } else {
        std::cerr << "Unknown PDA type: " << type << "\n";
        return;
    }
    
    std::cout << pda.toString() << "\n";
    
    bool accepted = pda.acceptsByFinalState(input);
    std::cout << "Result: " << (accepted ? "ACCEPTED ✓" : "REJECTED ✗") << "\n\n";
    
    auto path = pda.findAcceptingPath(input);
    if (path) {
        std::cout << "Execution path:\n";
        for (const auto& step : *path) {
            std::cout << "  " << step.before.toString();
            if (step.transition) {
                std::cout << " => " << step.transition->toString();
            }
            std::cout << "\n";
        }
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printUsage();
        return 0;
    }
    
    std::string command = argv[1];
    
    if (command == "regex" && argc >= 3) {
        std::string pattern = argv[2];
        std::string testString = (argc >= 4) ? argv[3] : "";
        runRegexDemo(pattern, testString);
    } else if (command == "dna" && argc >= 4) {
        std::string sequence = argv[2];
        std::string pattern = argv[3];
        int maxMismatches = (argc >= 5) ? std::stoi(argv[4]) : 0;
        runDNADemo(sequence, pattern, maxMismatches);
    } else if (command == "pda" && argc >= 4) {
        std::string type = argv[2];
        std::string input = argv[3];
        runPDADemo(type, input);
    } else if (command == "viz" && argc >= 3) {
        std::string pattern = argv[2];
        runVizDemo(pattern);
    } else {
        printUsage();
        return 1;
    }
    
    return 0;
}

