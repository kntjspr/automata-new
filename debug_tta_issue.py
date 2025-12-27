#!/usr/bin/env python3
"""
Debug script to understand the "TTA" return issue.
"""
import re

# The original pattern and test
pattern = r'^(AT|CG)*A?(GG+|T{2,3})(C|GA)?A+T$'
sequence = 'TTAAT'

print("=" * 60)
print("DEBUGGING 'TTA' RETURN VALUE ISSUE")
print("=" * 60)
print(f"Pattern: {pattern}")
print(f"Sequence: {sequence}")
print()

# Test 1: Full match
print("Test 1: Full match (re.fullmatch)")
match = re.fullmatch(pattern, sequence)
print(f"  Result: {match.group(0) if match else 'No match'}")
print()

# Test 2: Search (partial match)
print("Test 2: Search (re.search)")
match = re.search(pattern, sequence)
print(f"  Result: {match.group(0) if match else 'No match'}")
print()

# Test 3: Without anchors - this might cause issues
pattern_no_anchors = r'(AT|CG)*A?(GG+|T{2,3})(C|GA)?A+T'
print(f"Test 3: Without anchors: {pattern_no_anchors}")
for match in re.finditer(pattern_no_anchors, sequence):
    print(f"  Found at {match.start()}-{match.end()}: '{match.group(0)}'")

# Test 4: What if we try to find matches with exec-style loop (like JS)?
print()
print("Test 4: finditer (like JS regex.exec loop)")
for match in re.finditer(pattern, sequence):
    print(f"  Found at {match.start()}-{match.end()}: '{match.group(0)}'")

# Test 5: Check if there's a different interpretation
print()
print("Test 5: Could there be a different pattern interpretation?")
# What if someone accidentally used a partial pattern?
test_patterns = [
    r'(AT|CG)*A?(GG+|T{2,3})',  # Missing the end part
    r'T{2,3}',                   # Just the T quantifier
    r'TT',                       # Just TT
    r'A+',                       # Just A+
]
for p in test_patterns:
    matches = list(re.finditer(p, sequence))
    if matches:
        print(f"  Pattern '{p}' matches: {[m.group(0) for m in matches]}")

# Test 6: The problem might be the { being interpreted differently
print()
print("Test 6: Check if {2,3} is causing issues")
# In JavaScript, if { isn't followed by a valid quantifier, it's treated as literal
test_str = "TTAAT"
patterns_to_test = [
    (r"T{2,3}", "T repeated 2-3 times"),
    (r"T{2}", "T repeated exactly 2 times"),
    (r"TT", "Literal TT"),
]
for p, desc in patterns_to_test:
    matches = list(re.finditer(p, test_str))
    print(f"  {desc} ({p}): {[m.group(0) for m in matches]}")

print()
print("=" * 60)
print("CONCLUSION")
print("=" * 60)
print("If 'TTA' was returned, possible causes:")
print("1. The pattern was truncated or modified before matching")
print("2. The sequence was different than expected")
print("3. An older version of the code was running")
print("4. The C++ backend was used and it didn't support the full pattern")
