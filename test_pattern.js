// Test the pattern matching logic
const sequence = 'ATGCGATCGATCGATGCTAGCTAGATGCGATCGTAGCTAATGCGATCG';
const pattern = 'ATG';

// Manual verification - find all ATG occurrences
const matches = [];
let pos = 0;
while ((pos = sequence.indexOf(pattern, pos)) !== -1) {
    matches.push({ start: pos, end: pos + pattern.length, text: sequence.substr(pos, pattern.length) });
    pos++;
}

console.log('Sequence:', sequence);
console.log('Pattern:', pattern);
console.log('Length:', sequence.length);
console.log('');
console.log('Expected matches:');
matches.forEach((m, i) => {
    console.log('  Match', i, ': Position', m.start, '-', m.end, ' Text:', m.text);
});
console.log('');
console.log('Total matches:', matches.length);

// Also test the KMP failure function
function computeFailure(pat) {
    const failure = new Array(pat.length).fill(0);
    let j = 0;
    for (let i = 1; i < pat.length; i++) {
        while (j > 0 && pat[i] !== pat[j]) {
            j = failure[j - 1];
        }
        if (pat[i] === pat[j]) {
            j++;
        }
        failure[i] = j;
    }
    return failure;
}

console.log('');
console.log('=== KMP Failure Function Tests ===');
console.log('Pattern "ATG":', JSON.stringify(computeFailure('ATG')), '=> All failures go to q0');
console.log('Pattern "AAAA":', JSON.stringify(computeFailure('AAAA')), '=> Failures go to progressively earlier states');
console.log('Pattern "ABAB":', JSON.stringify(computeFailure('ABAB')), '=> Failure from q3 goes to q1 (AB prefix = AB suffix)');
console.log('Pattern "ATAT":', JSON.stringify(computeFailure('ATAT')), '=> Failure from q3 goes to q1 (AT prefix = AT suffix)');
