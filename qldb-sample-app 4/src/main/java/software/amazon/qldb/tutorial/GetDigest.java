package software.amazon.qldb.tutorial;

import com.amazonaws.services.qldb.AmazonQLDB;
import com.amazonaws.services.qldb.model.GetDigestRequest;
import com.amazonaws.services.qldb.model.GetDigestResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GetDigest {

    private static final Logger log = LoggerFactory.getLogger(GetDigest.class);
    public static void main(String... args) throws Exception {
    }

    public static GetDigestResult getDigest(AmazonQLDB client, String ledgerName) {
        GetDigestRequest request = new GetDigestRequest()
                .withName(ledgerName);
        return client.getDigest(request);
    }

}
