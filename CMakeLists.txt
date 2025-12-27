cmake_minimum_required(VERSION 3.16)
project(AutomataSimulator VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -Wall -Wextra -Wpedantic")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)

# Source files
set(AUTOMATA_SOURCES
    src/state.cpp
    src/transition.cpp
    src/nfa.cpp
    src/dfa.cpp
    src/pda.cpp
    src/regex_parser.cpp
    src/sequence.cpp
    src/approximate_matcher.cpp
    src/json_serializer.cpp
)

# Create shared library for Python binding
add_library(automata_engine SHARED ${AUTOMATA_SOURCES})
target_include_directories(automata_engine PUBLIC ${CMAKE_SOURCE_DIR}/include)

# Create static library for internal use
add_library(automata_engine_static STATIC ${AUTOMATA_SOURCES})
target_include_directories(automata_engine_static PUBLIC ${CMAKE_SOURCE_DIR}/include)

# Main executable
add_executable(automata_cli src/main.cpp)
target_link_libraries(automata_cli automata_engine_static)

# API Server executable
add_executable(api_server src/api_server.cpp)
target_link_libraries(api_server automata_engine_static pthread)


# Installation
install(TARGETS automata_engine
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)
install(DIRECTORY include/ DESTINATION include)
