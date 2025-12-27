#include "automata/json_serializer.hpp"

namespace automata {

std::string JsonSerializer::stringify(const std::string& s) {
    return "\"" + escape(s) + "\"";
}

std::string JsonSerializer::stringify(int value) {
    return std::to_string(value);
}

std::string JsonSerializer::stringify(double value) {
    std::ostringstream oss;
    oss << value;
    return oss.str();
}

std::string JsonSerializer::stringify(bool value) {
    return value ? "true" : "false";
}

std::string JsonSerializer::escape(const std::string& s) {
    std::string result;
    result.reserve(s.size());
    for (char c : s) {
        switch (c) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (c >= 0 && c < 32) {
                    char buf[8];
                    snprintf(buf, sizeof(buf), "\\u%04x", static_cast<unsigned char>(c));
                    result += buf;
                } else {
                    result += c;
                }
        }
    }
    return result;
}

// ObjectBuilder
JsonSerializer::ObjectBuilder& JsonSerializer::ObjectBuilder::add(const std::string& key, const std::string& value) {
    pairs_.emplace_back(key, stringify(value));
    return *this;
}

JsonSerializer::ObjectBuilder& JsonSerializer::ObjectBuilder::add(const std::string& key, int value) {
    pairs_.emplace_back(key, stringify(value));
    return *this;
}

JsonSerializer::ObjectBuilder& JsonSerializer::ObjectBuilder::add(const std::string& key, double value) {
    pairs_.emplace_back(key, stringify(value));
    return *this;
}

JsonSerializer::ObjectBuilder& JsonSerializer::ObjectBuilder::add(const std::string& key, bool value) {
    pairs_.emplace_back(key, stringify(value));
    return *this;
}

JsonSerializer::ObjectBuilder& JsonSerializer::ObjectBuilder::addRaw(const std::string& key, const std::string& rawJson) {
    pairs_.emplace_back(key, rawJson);
    return *this;
}

std::string JsonSerializer::ObjectBuilder::build() const {
    if (pairs_.empty()) return "{}";
    std::ostringstream oss;
    oss << "{";
    for (size_t i = 0; i < pairs_.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "\"" << pairs_[i].first << "\":" << pairs_[i].second;
    }
    oss << "}";
    return oss.str();
}

// ArrayBuilder
JsonSerializer::ArrayBuilder& JsonSerializer::ArrayBuilder::add(const std::string& value) {
    items_.push_back(stringify(value));
    return *this;
}

JsonSerializer::ArrayBuilder& JsonSerializer::ArrayBuilder::add(int value) {
    items_.push_back(stringify(value));
    return *this;
}

JsonSerializer::ArrayBuilder& JsonSerializer::ArrayBuilder::add(double value) {
    items_.push_back(stringify(value));
    return *this;
}

JsonSerializer::ArrayBuilder& JsonSerializer::ArrayBuilder::add(bool value) {
    items_.push_back(stringify(value));
    return *this;
}

JsonSerializer::ArrayBuilder& JsonSerializer::ArrayBuilder::addRaw(const std::string& rawJson) {
    items_.push_back(rawJson);
    return *this;
}

std::string JsonSerializer::ArrayBuilder::build() const {
    if (items_.empty()) return "[]";
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < items_.size(); ++i) {
        if (i > 0) oss << ",";
        oss << items_[i];
    }
    oss << "]";
    return oss.str();
}

} // namespace automata
