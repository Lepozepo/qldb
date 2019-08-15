package software.amazon.qldb.tutorial.model;

import com.amazon.ion.IonInt;
import com.amazon.ion.IonString;
import com.amazon.ion.IonStruct;
import com.amazon.ion.IonType;
import com.amazon.ion.IonWriter;
import com.amazon.ion.system.IonBinaryWriterBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Objects;

/**
 * Represents the BlockAddress field of a QLDB document
 */
public class BlockAddress {

    private static final Logger log = LoggerFactory.getLogger(BlockAddress.class);
    private static final String ION_VERSION = "2019-06-05";

    private final String strandId;
    private final long sequenceNo;

    public BlockAddress(String strandId, long sequenceNo) {
        this.strandId = strandId;
        this.sequenceNo = sequenceNo;
    }

    public String getStrandId() {
        return strandId;
    }

    public long getSequenceNo() {
        return sequenceNo;
    }

    public static BlockAddress fromIon(IonStruct ionStruct) {
        if (ionStruct == null)
            throw new IllegalArgumentException("BlockAddress cannot be null");
        try {
            IonString strandId = (IonString)ionStruct.get("strandId");
            IonInt sequenceNo = (IonInt)ionStruct.get("sequenceNo");
            if (strandId == null || sequenceNo == null)
                throw new IllegalArgumentException("Document is missing required fields");
            return new BlockAddress(strandId.stringValue(), sequenceNo.longValue());
        } catch (ClassCastException e) {
            log.error("Failed to parse ion document");
            throw new IllegalArgumentException("Document members are not of the correct type", e);
        }
    }

    public byte[] toIon() {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            IonWriter ionWriter = IonBinaryWriterBuilder.standard().build(baos);
            ionWriter.addTypeAnnotation(ION_VERSION);
            ionWriter.stepIn(IonType.STRUCT);
            ionWriter.setFieldName("strandId");
            ionWriter.writeString(strandId);
            ionWriter.setFieldName("sequenceNo");
            ionWriter.writeInt(sequenceNo);
            ionWriter.stepOut();
            ionWriter.flush();
            ionWriter.close();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to write BlockAddress as binary ion");
        }
    }

    @Override
    public String toString() {
        return "BlockAddress{" +
                "strandId='" + strandId + '\'' +
                ", sequenceNo=" + sequenceNo +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BlockAddress that = (BlockAddress) o;
        return sequenceNo == that.sequenceNo &&
                strandId.equals(that.strandId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(strandId, sequenceNo);
    }
}
