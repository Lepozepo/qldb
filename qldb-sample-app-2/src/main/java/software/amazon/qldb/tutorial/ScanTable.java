/*
 * Copyright 2014-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
package software.amazon.qldb.tutorial;

import java.util.ArrayList;
import java.util.List;

import com.amazon.ion.IonStruct;
import com.amazon.qldb.QldbSession;
import com.amazon.qldb.transaction.result.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Scan for all the documents in a table.
 */
public class ScanTable {

    private static final Logger log = LoggerFactory.getLogger(ScanTable.class);

    /**
     * Scan the table with the given {@code tableName} for all documents.
     */
    public static List<IonStruct> scanTableForDocuments(QldbSession session, String tableName) {
        log.info("Scanning '{}'...", tableName);
        final String scanTable = String.format("SELECT * FROM %s", tableName);
        return session.execute(txn -> {
            try (Result result = txn.execute(scanTable)) {
                return toIonStructs(result);
            }
        }, documents -> {
            log.info("Scan successful!");
            printDocuments(documents);
        });
    }

    /**
     * Pretty print all elements in the provided Result.
     */
    public static void printDocuments(Result result) {
        result.iterator().forEachRemaining(row -> log.info(row.toPrettyString()));
    }

    /**
     * Pretty print all elements in the provided list of IonStructs.
     */
    public static void printDocuments(List<IonStruct> documents) {
        documents.forEach(row -> log.info(row.toPrettyString()));
    }

    /**
     * Convert the result set into a list of IonStructs.
     */
    public static List<IonStruct> toIonStructs(Result result) {
        final List<IonStruct> documentList = new ArrayList<>();
        result.iterator().forEachRemaining(row -> documentList.add((IonStruct)row));
        return documentList;
    }

    public static void main(String... args) {
    }
}
