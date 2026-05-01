/**
 * Number of writer reference posts shown to BOTH the hook generator and the
 * voice evaluator. They must use the same value: if the evaluator sees more
 * (or fewer) samples than the generator was trained on, it judges the hooks
 * against a different voice fingerprint than the one they were written to.
 */
export const REFERENCE_SAMPLE_LIMIT = 5;
