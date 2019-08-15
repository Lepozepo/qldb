package software.amazon.qldb.tutorial.model;


import com.amazon.ion.IonBlob;
import com.amazon.ion.IonInt;
import com.amazon.ion.IonReader;
import com.amazon.ion.IonString;
import com.amazon.ion.IonStruct;
import com.amazon.ion.IonSystem;
import com.amazon.ion.IonTimestamp;
import com.amazon.ion.IonValue;
import com.amazon.ion.Timestamp;
import com.amazon.ion.system.IonSystemBuilder;
import com.amazon.ionhash.IonHashReader;
import com.amazon.ionhash.IonHashReaderBuilder;
import com.amazon.ionhash.MessageDigestIonHasherProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.qldb.tutorial.Verifier;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Objects;

/**
 * Represents a QLDBRevision including both user data an metadata
 */
public class QLDBRevision {
    private static final Logger log = LoggerFactory.getLogger(QLDBRevision.class);
    private static final IonSystem ion = IonSystemBuilder.standard().build();
    private static MessageDigestIonHasherProvider ionHasherProvider = new MessageDigestIonHasherProvider("SHA-256");
    private static final ZoneId UTC = ZoneId.of("UTC");
    private static final BigDecimal ONE_THOUSAND = BigDecimal.valueOf(1000L);

    /**
     * Represents the metadata field of a QLDB Document
     */
    public static class Metadata {
        private final String id;
        private final long version;
        private final ZonedDateTime txTime;
        private final String txId;

        public Metadata(String id, long version, ZonedDateTime txTime, String txId) {
            this.id = id;
            this.version = version;
            this.txTime = txTime;
            this.txId = txId;
        }

        public String getId() {
            return id;
        }

        public long getVersion() {
            return version;
        }

        public ZonedDateTime getTxTime() {
            return txTime;
        }

        public String getTxId() {
            return txId;
        }

        public static Metadata fromIon(IonStruct ionStruct) {
            if (ionStruct == null)
                throw new IllegalArgumentException("Metadata cannot be null");
            try {
                IonString id = (IonString)ionStruct.get("id");
                IonInt version = (IonInt)ionStruct.get("version");
                IonTimestamp txTime = (IonTimestamp)ionStruct.get("txTime");
                IonString txId = (IonString)ionStruct.get("txId");
                if (id == null || version == null || txTime == null || txId == null)
                    throw new IllegalArgumentException("Document is missing required fields");
                return new Metadata(id.stringValue(), version.longValue(), toUTCDateTime(txTime.timestampValue()), txId.stringValue());
            } catch (ClassCastException e) {
                log.error("Failed to parse ion document");
                throw new IllegalArgumentException("Document members are not of the correct type", e);
            }
        }

        @Override
        public String toString() {
            return "Metadata{" +
                    "id='" + id + '\'' +
                    ", version=" + version +
                    ", txTime=" + txTime +
                    ", txId='" + txId + '\'' +
                    '}';
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Metadata metadata = (Metadata) o;
            return version == metadata.version &&
                    id.equals(metadata.id) &&
                    txTime.equals(metadata.txTime) &&
                    txId.equals(metadata.txId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id, version, txTime, txId);
        }
    }

    private final BlockAddress blockAddress;
    private final Metadata metadata;
    private final byte[] hash;
    private final IonStruct data;

    public QLDBRevision(BlockAddress blockAddress, Metadata metadata, byte[] hash, IonStruct data) {
        this.blockAddress = blockAddress;
        this.metadata = metadata;
        this.hash = hash;
        this.data = data;
    }

    public BlockAddress getBlockAddress() {
        return blockAddress;
    }

    public Metadata getMetadata() {
        return metadata;
    }

    public byte[] getHash() {
        return hash;
    }

    public IonStruct getData() {
        return data;
    }

    /**
     * Constructs a new {@link QLDBRevision} from an {@link IonStruct}
     *
     * The specified <code>ionStruct</code> must include the following fields
     *
     * - blockAddress -- a {@link BlockAddress}
     * - metadata -- a {@link Metadata}
     * - hash -- the document's hash calculated by QLDB
     * - data -- an {@link IonStruct} containing user data in the document
     *
     * If any of these fields are missing or are malformed, then throws {@link IllegalArgumentException}
     *
     * If the document hash calculated from the members of the specified <code>ionStruct</code> does not match
     * the hash member of the <code>ionStruct</code> then throws IllegalArgumentException
     */
    public static QLDBRevision fromIon(IonStruct ionStruct) {
        try {
            BlockAddress blockAddress = BlockAddress.fromIon((IonStruct)ionStruct.get("blockAddress"));
            IonBlob hash = (IonBlob)ionStruct.get("hash");
            IonStruct metadataStruct = (IonStruct)ionStruct.get("metadata");
            IonStruct data = (IonStruct)ionStruct.get("data");
            if (hash == null || data == null)
                throw new IllegalArgumentException("Document is missing required fields");
            byte[] candidateHash = computeHash(metadataStruct, data);
            if (!Arrays.equals(candidateHash, hash.getBytes()))
                throw new IllegalArgumentException("Hash entry of QLDB revision and computed hash of QLDB revision do not match");
            Metadata metadata = Metadata.fromIon(metadataStruct);
            return new QLDBRevision(blockAddress, metadata, hash.getBytes(), data);
        } catch (ClassCastException e) {
            log.error("Failed to parse ion document");
            throw new IllegalArgumentException("Document members are not of the correct type", e);
        }
    }

    public static byte[] computeHash(IonStruct metadata, IonStruct data) {
        byte[] metaDataHash = hashIonValue(metadata);
        byte[] dataHash = hashIonValue(data);
        return Verifier.joinHashesPairwise(metaDataHash, dataHash);
    }

    private static byte[] hashIonValue(IonValue ionValue) {
        IonReader reader = ion.newReader(ionValue);
        IonHashReader hashReader = IonHashReaderBuilder.standard()
                .withHasherProvider(ionHasherProvider)
                .withReader(reader)
                .build();
        while (hashReader.next() != null) {}
        return hashReader.digest();
    }

    /**
     * Converts a {@link Timestamp} to a {@link ZonedDateTime} assuming UTC {@link ZoneId}
     *
     * Note, this method truncates the fractional seconds of a {@link Timestamp} to the three most significant
     * digits
     */
    public static ZonedDateTime toUTCDateTime(Timestamp ionTimestamp) {
        return ZonedDateTime.of(
                ionTimestamp.getZYear(),
                ionTimestamp.getZMonth(),
                ionTimestamp.getZDay(),
                ionTimestamp.getZHour(),
                ionTimestamp.getZMinute(),
                ionTimestamp.getZSecond(),
                ionTimestamp.getZDecimalSecond().remainder(BigDecimal.ONE).multiply(ONE_THOUSAND).intValue(),
                UTC
        );
    }

    @Override
    public String toString() {
        return "QLDBRevision{" +
                "blockAddress=" + blockAddress +
                ", metadata=" + metadata +
                ", hash=" + Arrays.toString(hash) +
                ", data=" + data +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        QLDBRevision that = (QLDBRevision) o;
        return blockAddress.equals(that.blockAddress) &&
                metadata.equals(that.metadata) &&
                Arrays.equals(hash, that.hash) &&
                data.equals(that.data);
    }

    @Override
    public int hashCode() {
        int result = Objects.hash(blockAddress, metadata, data);
        result = 31 * result + Arrays.hashCode(hash);
        return result;
    }
}
