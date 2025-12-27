#ifndef AUTOMATA_JSON_SERIALIZER_HPP
#define AUTOMATA_JSON_SERIALIZER_HPP

#include "common.hpp"
#include <string>
#include <vector>
#include <map>
#include <set>
#include <sstream>

namespace automata {

/**
 * @brief Simple JSON serializer without external dependencies
 * 
 * Provides utilities for serializing automata to JSON format
 * for web UI consumption.
 */
class JsonSerializer {
public:
    // Basic value serialization
    static std::string stringify(const std::string& s);
    static std::string stringify(int value);
    static std::string stringify(double value);
    static std::string stringify(bool value);
    
    // Array serialization
    template<typename T>
    static std::string stringifyArray(const std::vector<T>& arr);
    
    template<typename T>
    static std::string stringifyArray(const std::set<T>& s);
    
    // Object building
    class ObjectBuilder {
    public:
        ObjectBuilder& add(const std::string& key, const std::string& value);
        ObjectBuilder& add(const std::string& key, int value);
        ObjectBuilder& add(const std::string& key, double value);
        ObjectBuilder& add(const std::string& key, bool value);
        ObjectBuilder& addRaw(const std::string& key, const std::string& rawJson);
        
        std::string build() const;
        
    private:
        std::vector<std::pair<std::string, std::string>> pairs_;
    };
    
    // Array building
    class ArrayBuilder {
    public:
        ArrayBuilder& add(const std::string& value);
        ArrayBuilder& add(int value);
        ArrayBuilder& add(double value);
        ArrayBuilder& add(bool value);
        ArrayBuilder& addRaw(const std::string& rawJson);
        
        std::string build() const;
        
    private:
        std::vector<std::string> items_;
    };
    
    // Escape special characters
    static std::string escape(const std::string& s);
};

// Template implementation
template<typename T>
std::string JsonSerializer::stringifyArray(const std::vector<T>& arr) {
    if (arr.empty()) return "[]";
    
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < arr.size(); ++i) {
        if (i > 0) oss << ",";
        if constexpr (std::is_same_v<T, std::string>) {
            oss << stringify(arr[i]);
        } else if constexpr (std::is_same_v<T, bool>) {
            oss << stringify(arr[i]);
        } else if constexpr (std::is_arithmetic_v<T>) {
            oss << arr[i];
        } else {
            // Assume T has toJson() method
            oss << arr[i].toJson();
        }
    }
    oss << "]";
    return oss.str();
}

template<typename T>
std::string JsonSerializer::stringifyArray(const std::set<T>& s) {
    return stringifyArray(std::vector<T>(s.begin(), s.end()));
}

} // namespace automata

#endif // AUTOMATA_JSON_SERIALIZER_HPP
