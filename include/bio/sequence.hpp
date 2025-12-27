#ifndef BIO_SEQUENCE_HPP
#define BIO_SEQUENCE_HPP

#include <string>
#include <vector>
#include <set>
#include <map>
#include <stdexcept>

namespace bio {

/**
 * @brief Enumeration of biological sequence types
 */
enum class SequenceType {
    DNA,
    RNA,
    PROTEIN
};

/**
 * @brief Biological sequence handling class
 * 
 * Provides validation, complement operations, and motif extraction
 * for DNA, RNA, and protein sequences.
 */
class Sequence {
public:
    /**
     * @brief Construct a sequence
     * @param seq The sequence string
     * @param type Type of sequence (DNA, RNA, PROTEIN)
     * @throws std::invalid_argument if sequence contains invalid characters
     */
    Sequence(const std::string& seq, SequenceType type = SequenceType::DNA);
    
    // Getters
    const std::string& getString() const { return sequence_; }
    SequenceType getType() const { return type_; }
    size_t length() const { return sequence_.length(); }
    
    // Validation
    static bool isValidDNA(const std::string& seq);
    static bool isValidRNA(const std::string& seq);
    static bool isValidProtein(const std::string& seq);
    
    // Get valid alphabet
    static std::set<char> getAlphabet(SequenceType type);
    
    // Complement operations
    Sequence complement() const;
    Sequence reverseComplement() const;
    
    // Transcription (DNA -> RNA)
    Sequence transcribe() const;
    
    // Subsequence extraction
    Sequence subsequence(size_t start, size_t length) const;
    
    // Find all occurrences of a motif
    std::vector<size_t> findMotif(const std::string& motif) const;
    
    // GC content for DNA/RNA
    double gcContent() const;
    
    // Convert to FASTA format
    std::string toFasta(const std::string& header = "sequence") const;
    
    // Parse from FASTA format
    static std::vector<std::pair<std::string, Sequence>> parseFasta(const std::string& fasta);
    
    // JSON serialization
    std::string toJson() const;
    
    // Comparison
    bool operator==(const Sequence& other) const;
    
    // Character access
    char operator[](size_t index) const { return sequence_[index]; }

private:
    std::string sequence_;
    SequenceType type_;
    
    void validate() const;
    static char complementBase(char base, SequenceType type);
};

/**
 * @brief Codon table for translation
 */
class CodonTable {
public:
    CodonTable();
    
    // Translate a codon to amino acid
    char translate(const std::string& codon) const;
    
    // Translate entire sequence
    std::string translateSequence(const Sequence& seq) const;
    
    // Check if codon is start codon
    bool isStartCodon(const std::string& codon) const;
    
    // Check if codon is stop codon
    bool isStopCodon(const std::string& codon) const;

private:
    std::map<std::string, char> table_;
};

/**
 * @brief Common DNA/RNA sequence motifs
 */
struct Motifs {
    // DNA regulatory elements
    static const std::string TATA_BOX;  // Promoter element
    static const std::string KOZAK;     // Translation initiation
    
    // Restriction enzyme sites
    static const std::string ECORI;     // EcoRI: GAATTC
    static const std::string BAMHI;     // BamHI: GGATCC
    static const std::string HINDIII;   // HindIII: AAGCTT
    
    // Start and stop codons
    static const std::string START_CODON;
    static const std::string STOP_CODONS;  // Regex pattern for all stop codons
};

} // namespace bio

#endif // BIO_SEQUENCE_HPP
