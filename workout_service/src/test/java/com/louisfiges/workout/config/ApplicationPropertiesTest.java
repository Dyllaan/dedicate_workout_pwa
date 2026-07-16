package com.louisfiges.workout.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApplicationPropertiesTest {

    @Test
    void dockerProfileUsesStructuredConsoleLogging() throws IOException {
        Properties properties = load("application-docker.properties");

        assertEquals("logstash", properties.getProperty("logging.structured.format.console"));
    }

    private Properties load(String resourceName) throws IOException {
        Properties properties = new Properties();
        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(resourceName)) {
            if (inputStream == null) {
                throw new IOException("Missing resource: " + resourceName);
            }
            properties.load(inputStream);
        }
        return properties;
    }
}
