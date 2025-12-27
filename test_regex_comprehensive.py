#!/usr/bin/env python3
"""
Comprehensive regex pattern test suite for the automata project.
Tests both Python's re module (expected behavior) and the C++ backend.
"""
import re
import subprocess
import json

# Test cases: (pattern, test_string, should_match)
TEST_CASES = [
    # Original failing case
    ("^(AT|CG)*A?(GG+|T{2,3})(C|GA)?A+T$", "TTAAT", True),
    
    # Basic anchor tests
    ("^ATG", "ATGCCC", True),
    ("^ATG", "CCATG", False),
    ("ATG$", "CCCATG", True),
    ("ATG$", "ATGCCC", False),
    ("^ATG$", "ATG", True),
    ("^ATG$", "ATGC", False),
    
    # Counted quantifier tests
    ("A{3}", "AAA", True),
    ("A{3}", "AA", False),
    ("A{3}", "AAAA", True),  # Contains AAA
    ("A{2,4}", "AA", True),
    ("A{2,4}", "AAA", True),
    ("A{2,4}", "AAAA", True),
    ("A{2,4}", "A", False),
    ("A{2,}", "AA", True),
    ("A{2,}", "AAAAAAA", True),
    ("A{2,}", "A", False),
    
    # DNA pattern tests
    ("TAA|TAG|TGA", "TAA", True),
    ("TAA|TAG|TGA", "TAG", True),
    ("TAA|TAG|TGA", "TGA", True),
    ("TAA|TAG|TGA", "TAC", False),
    
    # Complex pattern tests
    ("[ACGT]+", "ATGC", True),
    ("[ACGT]+", "", False),
    ("GC[AT]GC", "GCAGC", True),
    ("GC[AT]GC", "GCTGC", True),
    ("GC[AT]GC", "GCGGC", False),
    
    # Kleene star and plus
    ("A*", "", True),
    ("A*", "AAA", True),
    ("A+", "", False),
    ("A+", "A", True),
    ("A+", "AAA", True),
    
    # Optional
    ("AB?C", "AC", True),
    ("AB?C", "ABC", True),
    ("AB?C", "ABBC", False),
    
    # Grouping with quantifiers
    ("(AT)+", "AT", True),
    ("(AT)+", "ATAT", True),
    ("(AT)+", "ATA", True),  # Contains AT
    ("(AT)*", "", True),
    ("(AT)*", "ATATAT", True),
    
    # Nested groups
    ("((AT)+|(CG)+)", "ATAT", True),
    ("((AT)+|(CG)+)", "CGCG", True),
    
    # Combined anchors and quantifiers
    ("^A{2,3}T$", "AAT", True),
    ("^A{2,3}T$", "AAAT", True),
    ("^A{2,3}T$", "AT", False),
    ("^A{2,3}T$", "AAAAT", False),
    
    # The original complex pattern components
    ("(AT|CG)*", "", True),
    ("(AT|CG)*", "AT", True),
    ("(AT|CG)*", "CG", True),
    ("(AT|CG)*", "ATCG", True),
    ("(AT|CG)*", "ATCGATCG", True),
    ("GG+", "GG", True),
    ("GG+", "GGG", True),
    ("GG+", "G", False),
    ("T{2,3}", "TT", True),
    ("T{2,3}", "TTT", True),
    ("T{2,3}", "T", False),
    ("T{2,3}", "TTTT", True),  # Contains TT or TTT
    ("A+T", "AT", True),
    ("A+T", "AAT", True),
    ("A+T", "AAAT", True),
    ("A+T", "T", False),
]

def test_python_regex():
    """Test patterns using Python's re module"""
    print("=" * 60)
    print("PYTHON REGEX TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for pattern, test_str, expected in TEST_CASES:
        # Use search for patterns without anchors, fullmatch for anchored patterns
        if pattern.startswith('^') and pattern.endswith('$'):
            # Full match expected
            match = re.fullmatch(pattern, test_str)
            actual = match is not None
        else:
            # Partial match (search)
            match = re.search(pattern, test_str)
            actual = match is not None
        
        status = "PASS" if actual == expected else "FAIL"
        if actual != expected:
            failed += 1
            print(f"[{status}] Pattern: {pattern!r}")
            print(f"       Test: {test_str!r}")
            print(f"       Expected: {expected}, Got: {actual}")
        else:
            passed += 1
    
    print(f"\nResults: {passed}/{passed+failed} passed")
    return failed == 0


def test_cpp_cli():
    """Test patterns using C++ CLI tool"""
    print("\n" + "=" * 60)
    print("C++ CLI REGEX TEST RESULTS")
    print("=" * 60)
    
    cli_path = "./build/automata_cli"
    
    passed = 0
    failed = 0
    errors = 0
    
    # Only test patterns with anchors since the CLI uses full-string matching
    anchored_cases = [
        ("^(AT|CG)*A?(GG+|T{2,3})(C|GA)?A+T$", "TTAAT", True),
        ("^ATG$", "ATG", True),
        ("^ATG$", "ATGC", False),
        ("^A{2,3}T$", "AAT", True),
        ("^A{2,3}T$", "AAAT", True),
        ("^A{2,3}T$", "AT", False),
        ("^A+T$", "AT", True),
        ("^A+T$", "AAT", True),
        ("^A+T$", "T", False),
        ("^(AT)+$", "AT", True),
        ("^(AT)+$", "ATAT", True),
        ("^GG+$", "GG", True),
        ("^GG+$", "GGG", True),
        ("^GG+$", "G", False),
        ("^T{2,3}$", "TT", True),
        ("^T{2,3}$", "TTT", True),
        ("^T{2,3}$", "T", False),
        ("^T{2,3}$", "TTTT", False),  # Exact 2-3, not more
    ]
    
    for pattern, test_str, expected in anchored_cases:
        try:
            # Remove anchors for CLI (it does full string matching)
            clean_pattern = pattern
            if clean_pattern.startswith('^'):
                clean_pattern = clean_pattern[1:]
            if clean_pattern.endswith('$'):
                clean_pattern = clean_pattern[:-1]
            
            result = subprocess.run(
                [cli_path, "regex", clean_pattern, test_str],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            output = result.stdout + result.stderr
            
            # Check for acceptance in output
            actual = "ACCEPTED" in output or "accepts: true" in output.lower()
            
            status = "PASS" if actual == expected else "FAIL"
            if actual != expected:
                failed += 1
                print(f"[{status}] Pattern: {clean_pattern!r}")
                print(f"       Test: {test_str!r}")
                print(f"       Expected: {expected}, Got: {actual}")
                print(f"       Output: {output[:200]}")
            else:
                passed += 1
                
        except subprocess.TimeoutExpired:
            errors += 1
            print(f"[ERROR] Timeout: {pattern!r} with {test_str!r}")
        except Exception as e:
            errors += 1
            print(f"[ERROR] {e}: {pattern!r}")
    
    print(f"\nResults: {passed}/{passed+failed+errors} passed, {errors} errors")
    return failed == 0 and errors == 0


if __name__ == "__main__":
    print("Comprehensive Regex Pattern Test Suite")
    print("=" * 60)
    
    python_ok = test_python_regex()
    cpp_ok = test_cpp_cli()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Python regex tests: {'PASS' if python_ok else 'FAIL'}")
    print(f"C++ CLI tests: {'PASS' if cpp_ok else 'FAIL'}")
