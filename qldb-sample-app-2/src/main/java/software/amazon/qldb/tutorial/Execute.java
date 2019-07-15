package software.amazon.qldb.tutorial;

import java.util.ArrayList;
import java.util.List;

import com.amazon.ion.IonStruct;
import com.amazon.qldb.QldbSession;
import com.amazon.qldb.transaction.result.Result;

public class Execute {
    public static List<IonStruct> execute(String accessKey, String secretKey, String region, String ledgerName, String query) {
        try (QldbSession session = ConnectToLedger.connectQldbSession(accessKey, secretKey, region, ledgerName)) {
            return session.execute(txn -> {
                try (Result result = txn.execute(query)) {
                    List<IonStruct> l = toIonStructs(result);
                    return l;
                }
            }, documents -> {
//                System.out.println(documents);
            });
        } catch (Exception e) {
            return null;
        }
    }

    public static List<IonStruct> toIonStructs(Result result) {
        final List<IonStruct> documentList = new ArrayList<>();
        result.iterator().forEachRemaining(row -> documentList.add((IonStruct)row));
        return documentList;
    }

    public static void main(String[] args) {
    }
}
