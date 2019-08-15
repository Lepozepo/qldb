package software.amazon.qldb.tutorial;

import static software.amazon.qldb.tutorial.ConnectToLedger.connectQldbClient;
import static software.amazon.qldb.tutorial.ScanTable.toIonStructs;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.amazon.ion.IonReader;
import com.amazon.ion.IonStruct;
import com.amazon.ion.IonSystem;
import com.amazon.ion.IonWriter;
import com.amazon.ion.system.IonReaderBuilder;
import com.amazon.ion.system.IonSystemBuilder;
import com.amazon.qldb.QldbSession;
import com.amazon.qldb.transaction.TransactionExecutor;
import com.amazon.qldb.transaction.result.Result;
import com.amazonaws.services.qldb.AmazonQLDB;
import com.amazonaws.services.qldb.model.GetDigestResult;
import com.amazonaws.services.qldb.model.GetRevisionRequest;
import com.amazonaws.services.qldb.model.GetRevisionResult;
import com.amazonaws.services.qldb.model.ValueHolder;
import com.amazonaws.util.Base64;

import software.amazon.qldb.tutorial.model.BlockAddress;
import software.amazon.qldb.tutorial.model.QLDBRevision;

/**
 * Verify the integrity of a document revision in a QLDB ledger
 * <p>
 * This code expects that you have AWS credentials setup per:
 * http://docs.aws.amazon.com/java-sdk/latest/developer-guide/setup-credentials.html
 */
public class Validate {
    private static final IonSystem ion = IonSystemBuilder.standard().build();

    public static boolean validateDoc(AmazonQLDB client, QldbSession session, String ledgerName, String documentQuery) throws Exception {
        try {
            GetDigestResult digestResult = GetDigest.getDigest(client, ledgerName);

            ValueHolder digestTipAddress = digestResult.getDigestTipAddress();
            byte[] digestBytes = convertByteBufferToByteArray(digestResult.getDigest());

            List<IonStruct> documentsWithMetadataList = new ArrayList<>();
            session.execute(txn -> {
                documentsWithMetadataList.addAll(queryDocuments(txn, documentQuery));
            }, r -> {
            });

            boolean isValid = true;

            for (IonStruct ionStruct : documentsWithMetadataList) {
                QLDBRevision document = QLDBRevision.fromIon(ionStruct);
                GetRevisionResult proofResult = getRevision(
                        client,
                        ledgerName,
                        document.getMetadata().getId(),
                        digestTipAddress,
                        document.getBlockAddress()
                );

                final IonReader reader = IonReaderBuilder.standard().build(Constants.MAPPER.writeValueAsIonValue(proofResult.getProof()));
                reader.next();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                IonWriter writer = ion.newBinaryWriter(baos);
                writer.writeValue(reader);
                writer.close();
                baos.flush();
                baos.close();

                boolean revisionIsValid = Verifier.verify(
                        document.getHash(),
                        digestBytes,
                        proofResult.getProof().getIonText()
                );
                if (!revisionIsValid) {
                    isValid = false;
                }
            }
            return isValid;
        } catch (Exception e) {
            throw e;
        }
    }

    public static boolean validate(String accessKey, String secretKey, String region, String ledgerName, String documentQuery) throws Exception {
        try (QldbSession session = ConnectToLedger.connectQldbSession(accessKey, secretKey, region, ledgerName)) {
            AmazonQLDB client = connectQldbClient(accessKey, secretKey, region);
            return validateDoc(client, session, ledgerName, documentQuery);
        }
    }

    public static GetRevisionResult getRevision(AmazonQLDB client, String ledgerName, String documentId, ValueHolder digestTipAddress, BlockAddress blockAddress) {

        try {
            GetRevisionRequest request = new GetRevisionRequest()
                    .withName(ledgerName)
                    .withDigestTipAddress(digestTipAddress)
                    .withBlockAddress(new ValueHolder().withIonText(Constants.MAPPER.writeValueAsIonValue(blockAddress).toString()))
                    .withDocumentId(documentId);
            return client.getRevision(request);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }


    public static List<IonStruct> queryDocuments(TransactionExecutor txn, String documentQuery) {
        try (Result result = txn.execute(documentQuery)) {
            return toIonStructs(result);
        }
    }

    private static byte[] convertByteBufferToByteArray(ByteBuffer buffer) {
        byte[] arr = new byte[buffer.remaining()];
        buffer.get(arr);
        return arr;
    }

    private static String toBase64(byte[] arr) {
        return new String(Base64.encode(arr), StandardCharsets.UTF_8);
    }
}