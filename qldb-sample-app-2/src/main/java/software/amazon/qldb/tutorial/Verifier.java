package software.amazon.qldb.tutorial;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.qldb.tutorial.model.Proof;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * This class encapsulates the logic to verify the integrity of revisions or blocks on a QLDB ledger. The main
 * public static methods is {@link #verify(byte[], byte[], byte[])}
 */
public class Verifier {

    private static final Logger log = LoggerFactory.getLogger(Verifier.class);

    /**
     * Verify the integrity of a document with respect to a QLDB ledger digest.
     * <p>
     * The verification algorithm includes the following steps:
     * <p>
     * 1. {@link #buildCandidateDigest(Proof, byte[])} build the candidate digest from the internal hashes
     * in the proof
     * 2. Check that the <code>candidateLedgerDigest</code> is equal to the <code>ledgerDigest</code>
     *
     * @param documentHash -- the hash of the document to be verified
     * @param digest   -- the QLDB ledger digest. This digest should have been retrieved using
     *                       {@link com.amazonaws.services.qldb.AmazonQLDB#getDigest}
     * @param proofBlob      -- the ion encoded bytes representing the {@link Proof} associated with the supplied
     *                       <code>digestTipAddress</code> and <code>address</code> retrieved using
     *                       {@link com.amazonaws.services.qldb.AmazonQLDB#getRevision}
     * @return true if the record is verified or false if it is not verified.
     */
    public static boolean verify(
            byte[] documentHash,
            byte[] digest,
            String proofBlob
    ) {
        Proof proof = Proof.fromBlob(proofBlob);

        byte[] candidateDigest = buildCandidateDigest(proof, documentHash);

        return Arrays.equals(digest, candidateDigest);
    }

    /**
     * Build the candidate digest representing the entire ledger from the internal hashes of the
     * <code>proof</code>
     */
    private static byte[] buildCandidateDigest(Proof proof, byte[] leafHash) {
        return calculateRootHashFromInternalHashes(proof.getInternalHashes(), leafHash);
    }

    /**
     * Get a new instance of {@link MessageDigest} using the SHA-256 algorithm. If this algorithm is
     * not available on the current JVM then throws {@link IllegalStateException}
     */
    static MessageDigest newMessageDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            log.error("Failed to create SHA-256 MessageDigest", e);
            throw new IllegalStateException("SHA-256 message digest is unavailable", e);
        }
    }

    /**
     * Takes two hashes, sorts them, concatenates them, and then returns the
     * hash of the concatenated array.
     */
    public static byte[] joinHashesPairwise(byte[] h1, byte[] h2) {
        if (h1.length == 0)
            return h2;
        if (h2.length == 0)
            return h1;
        byte[] concatenated = new byte[h1.length + h2.length];
        if (hashComparator.compare(h1, h2) < 0) {
            System.arraycopy(h1, 0, concatenated, 0, h1.length);
            System.arraycopy(h2, 0, concatenated, h1.length, h2.length);
        } else {
            System.arraycopy(h2, 0, concatenated, 0, h2.length);
            System.arraycopy(h1, 0, concatenated, h2.length, h1.length);
        }
        MessageDigest messageDigest = newMessageDigest();
        messageDigest.update(concatenated);
        return messageDigest.digest();
    }

    /**
     * Compares two hashes by their unsigned integral value ascending.
     *
     * This comparator assumes <code>h1</code> and <code>h2</code> represent big-endian integers.
     */
    private static Comparator<byte[]> hashComparator = (h1, h2) -> {
        if (h1.length != 32 || h2.length != 32)
            throw new IllegalArgumentException("Invalid hash");
        for (int i = h1.length - 1; i >= 0; i--) {
            int byteEqual = Byte.compare(h1[i], h2[i]);
            if (byteEqual != 0)
                return byteEqual;
        }

        return 0;
    };

    /**
     * Starting with the provided <code>leafHash</code> combined with the provided <code>internalHashes</code>
     * pairwise until only the root hash remains.
     */
    public static byte[] calculateRootHashFromInternalHashes(List<byte[]> internalHashes, byte[] leafHash) {
        return internalHashes.stream().reduce(leafHash, Verifier::joinHashesPairwise);
    }

    /**
     * Return a new byte array with a single random bit changed. This method is intended to be used for purpose of
     * demonstrating the QLDB verification features only.
     */
    public static byte[] flipRandomBit(byte[] original) {
        if (original.length == 0)
            throw new IllegalArgumentException("Array cannot be empty");
        int B = ThreadLocalRandom.current().nextInt(original.length);
        int b = ThreadLocalRandom.current().nextInt(8);
        byte[] altered = new byte[original.length];
        System.arraycopy(original, 0, altered, 0, original.length);
        altered[B] = (byte) (altered[B] ^ (1 << b));
        return altered;
    }

}
