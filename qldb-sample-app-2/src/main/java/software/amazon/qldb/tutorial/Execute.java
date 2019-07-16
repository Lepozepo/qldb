package software.amazon.qldb.tutorial;

import java.util.ArrayList;
import java.util.List;

import com.amazon.ion.IonStruct;
import com.amazon.ion.IonValue;
import com.amazon.qldb.QldbSession;
import com.amazon.qldb.transaction.result.Result;

public class Execute {
    public static List<IonValue> execute(String accessKey, String secretKey, String region, String ledgerName, String query) {
        try (QldbSession session = ConnectToLedger.connectQldbSession(accessKey, secretKey, region, ledgerName)) {
            return session.execute(txn -> {
                try (Result result = txn.execute(query)) {
                    List<IonValue> l = toIonValues(result);
                    return l;
                }
            }, documents -> {
//                System.out.println(documents);
            });
        } catch (Exception e) {
            throw e;
        }
    }

    public static List<IonStruct> executeStructs(String accessKey, String secretKey, String region, String ledgerName, String query) {
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
            throw e;
        }
    }

    public static List<IonStruct> toIonStructs(Result result) {
        final List<IonStruct> documentList = new ArrayList<>();
        result.iterator().forEachRemaining(row -> documentList.add((IonStruct)row));
        return documentList;
    }

    public static List<IonValue> toIonValues(Result result) {
        final List<IonValue> valueList = new ArrayList<>();
        result.iterator().forEachRemaining(valueList::add);
        return valueList;
    }

    public static void main(String[] args) {
    }
}
