package software.amazon.qldb.tutorial.model;

import com.amazon.ion.IonReader;
import com.amazon.ion.IonSystem;
import com.amazon.ion.system.IonSystemBuilder;
import com.amazonaws.services.qldb.model.GetRevisionRequest;
import com.amazonaws.services.qldb.model.GetRevisionResult;

import java.util.ArrayList;
import java.util.List;

/**
 * A Java representation of the Proof object returned from the {@link com.amazonaws.services.qldb.AmazonQLDB#getRevision(GetRevisionRequest)} api.
 */
public class Proof {
    private static final IonSystem ion = IonSystemBuilder.standard().build();

    private List<byte[]> internalHashes;

    public Proof(List<byte[]> internalHashes) {
        this.internalHashes = internalHashes;
    }

    public List<byte[]> getInternalHashes() {
        return internalHashes;
    }

    /**
     * Decodes a {@link Proof} from an ion text. This ion text is returned in
     * a {@link GetRevisionResult#getProof()}
     */
    public static Proof fromBlob(String ionText) {
        try {
            IonReader reader = ion.newReader(ionText);
            List<byte[]> list = new ArrayList<>();
            reader.next();
            reader.stepIn();
            while (reader.next() != null)
                list.add(reader.newBytes());
            return new Proof(list);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse a Proof from byte array");
        }
    }

}
