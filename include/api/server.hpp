#ifndef API_SERVER_HPP
#define API_SERVER_HPP

#include <string>
#include <functional>

namespace api {

/**
 * @brief DNA Pattern Matcher HTTP API Server
 * 
 * Provides REST API endpoints for DNA sequence analysis
 * and pattern matching using automata-based algorithms.
 */
class Server {
public:
    /**
     * @brief Construct the API server
     * @param port The port to listen on (default: 5000)
     * @param staticDir Directory for static files (default: "./vite/dist")
     */
    Server(int port = 5000, const std::string& staticDir = "./vite/dist");
    
    /**
     * @brief Start the server (blocking)
     */
    void start();
    
    /**
     * @brief Stop the server
     */
    void stop();
    
    /**
     * @brief Check if server is running
     */
    bool isRunning() const { return running_; }

private:
    int port_;
    std::string staticDir_;
    bool running_;
    
    // JSON helpers
    static std::string jsonError(const std::string& message);
    static std::string escapeJson(const std::string& s);
};

} // namespace api

#endif // API_SERVER_HPP
