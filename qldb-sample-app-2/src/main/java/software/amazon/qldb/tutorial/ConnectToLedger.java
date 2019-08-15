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

import com.amazon.qldb.QldbSession;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.qldb.AmazonQLDB;
import com.amazonaws.services.qldb.AmazonQLDBClientBuilder;
import com.amazonaws.services.qldbsessionv1.AmazonQLDBSessionV1ClientBuilder;

/**
 * Connect to a session for a given ledger using default settings.
 */
public class ConnectToLedger {
    public static QldbSession connectQldbSession(String accessKey, String secretKey, String region, String ledgerName) {
        BasicAWSCredentials awsCreds = new BasicAWSCredentials(accessKey, secretKey);
        AmazonQLDBSessionV1ClientBuilder builder = AmazonQLDBSessionV1ClientBuilder
                .standard()
                .withCredentials(new AWSStaticCredentialsProvider(awsCreds))
                .withRegion(region);
        return QldbSession.builder()
                .withLedger(ledgerName)
                .withOccConflictRetryLimit(4)
                .withSessionClientBuilder(builder)
                .build();
    }

    public static AmazonQLDB connectQldbClient(String accessKey, String secretKey, String region) {
        BasicAWSCredentials awsCreds = new BasicAWSCredentials(accessKey, secretKey);
        return AmazonQLDBClientBuilder
                .standard()
                .withCredentials(new AWSStaticCredentialsProvider(awsCreds))
                .withRegion(region)
                .build();
    }

    public static void main(String... args) {
    }
}
