#include "bio/sequence.hpp"
#include <algorithm>
#include <sstream>
#include <cctype>

namespace bio {

// Static constants
const std::string Motifs::TATA_BOX = "TATAAA";
const std::string Motifs::KOZAK = "[AG]CCATGG";
const std::string Motifs::ECORI = "GAATTC";
const std::string Motifs::BAMHI = "GGATCC";
const std::string Motifs::HINDIII = "AAGCTT";
const std::string Motifs::START_CODON = "ATG";
const std::string Motifs::STOP_CODONS = "(TAA|TAG|TGA)";

Sequence::Sequence(const std::string& seq, SequenceType type)
    : sequence_(seq), type_(type) {
    // Convert to uppercase
    std::transform(sequence_.begin(), sequence_.end(), sequence_.begin(), ::toupper);
    validate();
}

bool Sequence::isValidDNA(const std::string& seq) {
    for (char c : seq) {
        char upper = std::toupper(c);
        if (upper != 'A' && upper != 'C' && upper != 'G' && upper != 'T') {
            return false;
        }
    }
    return true;
}

bool Sequence::isValidRNA(const std::string& seq) {
    for (char c : seq) {
        char upper = std::toupper(c);
        if (upper != 'A' && upper != 'C' && upper != 'G' && upper != 'U') {
            return false;
        }
    }
    return true;
}

bool Sequence::isValidProtein(const std::string& seq) {
    static const std::string aminoAcids = "ACDEFGHIKLMNPQRSTVWY*";
    for (char c : seq) {
        char upper = std::toupper(c);
        if (aminoAcids.find(upper) == std::string::npos) {
            return false;
        }
    }
    return true;
}

std::set<char> Sequence::getAlphabet(SequenceType type) {
    switch (type) {
        case SequenceType::DNA:
            return {'A', 'C', 'G', 'T'};
        case SequenceType::RNA:
            return {'A', 'C', 'G', 'U'};
        case SequenceType::PROTEIN:
            return {'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L',
                    'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y', '*'};
    }
    return {};
}

void Sequence::validate() const {
    bool valid = false;
    switch (type_) {
        case SequenceType::DNA:
            valid = isValidDNA(sequence_);
            break;
        case SequenceType::RNA:
            valid = isValidRNA(sequence_);
            break;
        case SequenceType::PROTEIN:
            valid = isValidProtein(sequence_);
            break;
    }
    if (!valid) {
        throw std::invalid_argument("Invalid characters in sequence for type");
    }
}

char Sequence::complementBase(char base, SequenceType type) {
    switch (base) {
        case 'A': return (type == SequenceType::RNA) ? 'U' : 'T';
        case 'T': return 'A';
        case 'U': return 'A';
        case 'G': return 'C';
        case 'C': return 'G';
        default: return 'N';
    }
}

Sequence Sequence::complement() const {
    if (type_ == SequenceType::PROTEIN) {
        throw std::runtime_error("Complement not defined for proteins");
    }
    std::string comp;
    comp.reserve(sequence_.size());
    for (char c : sequence_) {
        comp += complementBase(c, type_);
    }
    return Sequence(comp, type_);
}

Sequence Sequence::reverseComplement() const {
    Sequence comp = complement();
    std::string rev = comp.sequence_;
    std::reverse(rev.begin(), rev.end());
    return Sequence(rev, type_);
}

Sequence Sequence::transcribe() const {
    if (type_ != SequenceType::DNA) {
        throw std::runtime_error("Only DNA can be transcribed");
    }
    std::string rna;
    rna.reserve(sequence_.size());
    for (char c : sequence_) {
        rna += (c == 'T') ? 'U' : c;
    }
    return Sequence(rna, SequenceType::RNA);
}

Sequence Sequence::subsequence(size_t start, size_t length) const {
    if (start >= sequence_.size()) {
        throw std::out_of_range("Start position out of range");
    }
    return Sequence(sequence_.substr(start, length), type_);
}

std::vector<size_t> Sequence::findMotif(const std::string& motif) const {
    std::vector<size_t> positions;
    size_t pos = 0;
    while ((pos = sequence_.find(motif, pos)) != std::string::npos) {
        positions.push_back(pos);
        ++pos;
    }
    return positions;
}

double Sequence::gcContent() const {
    if (type_ == SequenceType::PROTEIN) {
        throw std::runtime_error("GC content not defined for proteins");
    }
    if (sequence_.empty()) return 0.0;
    size_t gc = 0;
    for (char c : sequence_) {
        if (c == 'G' || c == 'C') ++gc;
    }
    return static_cast<double>(gc) / sequence_.size();
}

std::string Sequence::toFasta(const std::string& header) const {
    std::ostringstream oss;
    oss << ">" << header << "\n";
    for (size_t i = 0; i < sequence_.size(); i += 70) {
        oss << sequence_.substr(i, 70) << "\n";
    }
    return oss.str();
}

std::vector<std::pair<std::string, Sequence>> Sequence::parseFasta(const std::string& fasta) {
    std::vector<std::pair<std::string, Sequence>> result;
    std::istringstream iss(fasta);
    std::string line;
    std::string currentHeader;
    std::string currentSeq;
    
    while (std::getline(iss, line)) {
        if (line.empty()) continue;
        if (line[0] == '>') {
            if (!currentHeader.empty() && !currentSeq.empty()) {
                result.emplace_back(currentHeader, Sequence(currentSeq, SequenceType::DNA));
            }
            currentHeader = line.substr(1);
            currentSeq.clear();
        } else {
            currentSeq += line;
        }
    }
    
    if (!currentHeader.empty() && !currentSeq.empty()) {
        result.emplace_back(currentHeader, Sequence(currentSeq, SequenceType::DNA));
    }
    
    return result;
}

std::string Sequence::toJson() const {
    std::string typeStr;
    switch (type_) {
        case SequenceType::DNA: typeStr = "DNA"; break;
        case SequenceType::RNA: typeStr = "RNA"; break;
        case SequenceType::PROTEIN: typeStr = "PROTEIN"; break;
    }
    return "{\"type\":\"" + typeStr + "\",\"sequence\":\"" + sequence_ + 
           "\",\"length\":" + std::to_string(sequence_.size()) + "}";
}

bool Sequence::operator==(const Sequence& other) const {
    return type_ == other.type_ && sequence_ == other.sequence_;
}

// CodonTable implementation
CodonTable::CodonTable() {
    // Standard genetic code
    table_ = {
        {"TTT", 'F'}, {"TTC", 'F'}, {"TTA", 'L'}, {"TTG", 'L'},
        {"CTT", 'L'}, {"CTC", 'L'}, {"CTA", 'L'}, {"CTG", 'L'},
        {"ATT", 'I'}, {"ATC", 'I'}, {"ATA", 'I'}, {"ATG", 'M'},
        {"GTT", 'V'}, {"GTC", 'V'}, {"GTA", 'V'}, {"GTG", 'V'},
        {"TCT", 'S'}, {"TCC", 'S'}, {"TCA", 'S'}, {"TCG", 'S'},
        {"CCT", 'P'}, {"CCC", 'P'}, {"CCA", 'P'}, {"CCG", 'P'},
        {"ACT", 'T'}, {"ACC", 'T'}, {"ACA", 'T'}, {"ACG", 'T'},
        {"GCT", 'A'}, {"GCC", 'A'}, {"GCA", 'A'}, {"GCG", 'A'},
        {"TAT", 'Y'}, {"TAC", 'Y'}, {"TAA", '*'}, {"TAG", '*'},
        {"CAT", 'H'}, {"CAC", 'H'}, {"CAA", 'Q'}, {"CAG", 'Q'},
        {"AAT", 'N'}, {"AAC", 'N'}, {"AAA", 'K'}, {"AAG", 'K'},
        {"GAT", 'D'}, {"GAC", 'D'}, {"GAA", 'E'}, {"GAG", 'E'},
        {"TGT", 'C'}, {"TGC", 'C'}, {"TGA", '*'}, {"TGG", 'W'},
        {"CGT", 'R'}, {"CGC", 'R'}, {"CGA", 'R'}, {"CGG", 'R'},
        {"AGT", 'S'}, {"AGC", 'S'}, {"AGA", 'R'}, {"AGG", 'R'},
        {"GGT", 'G'}, {"GGC", 'G'}, {"GGA", 'G'}, {"GGG", 'G'}
    };
}

char CodonTable::translate(const std::string& codon) const {
    auto it = table_.find(codon);
    if (it != table_.end()) return it->second;
    return 'X';  // Unknown
}

std::string CodonTable::translateSequence(const Sequence& seq) const {
    std::string protein;
    const std::string& s = seq.getString();
    for (size_t i = 0; i + 2 < s.size(); i += 3) {
        protein += translate(s.substr(i, 3));
    }
    return protein;
}

bool CodonTable::isStartCodon(const std::string& codon) const {
    return codon == "ATG";
}

bool CodonTable::isStopCodon(const std::string& codon) const {
    return codon == "TAA" || codon == "TAG" || codon == "TGA";
}

} // namespace bio
