#!/usr/bin/env python3
# Test the pattern matching logic
sequence = 'ATGCGATCGATCGATGCTAGCTAGATGCGATCGTAGCTAATGCGATCG'
pattern = 'ATG'

# Find all ATG occurrences
matches = []
pos = 0
while True:
    pos = sequence.find(pattern, pos)
    if pos == -1:
        break
    matches.append({'start': pos, 'end': pos + len(pattern), 'text': sequence[pos:pos+len(pattern)]})
    pos += 1

print(f"Sequence: {sequence}")
print(f"Pattern: {pattern}")
print(f"Length: {len(sequence)}")
print()
print("Expected matches:")
for i, m in enumerate(matches):
    print(f"  Match {i}: Position {m['start']}-{m['end']}, Text: {m['text']}")
print()
print(f"Total matches: {len(matches)}")

# KMP failure function
def compute_failure(pat):
    failure = [0] * len(pat)
    j = 0
    for i in range(1, len(pat)):
        while j > 0 and pat[i] != pat[j]:
            j = failure[j-1]
        if pat[i] == pat[j]:
            j += 1
        failure[i] = j
    return failure

print()
print("=== KMP Failure Function Tests ===")
print(f'Pattern "ATG": {compute_failure("ATG")} => All failures go to q0')
print(f'Pattern "AAAA": {compute_failure("AAAA")} => Failures go to progressively earlier states')  
print(f'Pattern "ABAB": {compute_failure("ABAB")} => Failure from q3 goes to q1')
print(f'Pattern "ATAT": {compute_failure("ATAT")} => Failure from q3 goes to q1')
