#!/usr/bin/env python3
import re

pattern = r'^(AT|CG)*A?(GG+|T{2,3})(C|GA)?A+T$'
test = 'TTAAT'

print('Testing pattern:', pattern)
print('Against string:', test)
print()

match = re.fullmatch(pattern, test)
print('Full match:', match is not None)
if match:
    print('Match groups:', match.groups())
    print('Full match text:', match.group(0))
else:
    print('No full match')

print()
print('Breaking down why TTAAT should match:')
print('  (AT|CG)* = empty (0 occurrences)')
print('  A? = empty')
print('  (GG+|T{2,3}) = TT')
print('  (C|GA)? = empty')
print('  A+ = AA')
print('  T = T')
print('  Total: TT + AA + T = TTAAT')
