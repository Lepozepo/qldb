package software.amazon.qldb.tutorial;

import com.amazon.ion.IonStruct;
import com.amazon.ion.IonValue;
import software.amazon.qldb.QldbSession;
import software.amazon.qldb.Result;

import java.util.ArrayList;
import java.util.List;

public class Execute {
    public static List<IonValue> execute(String accessKey, String secretKey, String region, String ledgerName, String query) {
        try (QldbSession session = ConnectToLedger.connectQldbSession(accessKey, secretKey, region, ledgerName)) {
            Result result = session.execute(query);
            List<IonValue> l = toIonValues(result);
            return l;
        } catch (Exception e) {
            throw e;
        }
    }

    public static List<IonStruct> executeStructs(String accessKey, String secretKey, String region, String ledgerName, String query) {
        try (QldbSession session = ConnectToLedger.connectQldbSession(accessKey, secretKey, region, ledgerName)) {
            Result result = session.execute(query);
            List<IonStruct> l = toIonStructs(result);
            return l;
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
