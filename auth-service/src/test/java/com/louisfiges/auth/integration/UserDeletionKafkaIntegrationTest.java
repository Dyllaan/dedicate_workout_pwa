package com.louisfiges.auth.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.louisfiges.auth.config.DemoLimiter;
import com.louisfiges.auth.dao.UserDAO;
import com.louisfiges.auth.repo.UserRepository;
import com.louisfiges.auth.token.DemoTokenProvider;
import com.louisfiges.auth.token.MfaTokenProvider;
import com.louisfiges.auth.token.RefreshTokenProvider;
import com.louisfiges.auth.token.UserTokenProvider;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.ConfluentKafkaContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class UserDeletionKafkaIntegrationTest {

    private static final String TOPIC = "user.deleted.v1";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("auth_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @Container
    static ConfluentKafkaContainer kafka = new ConfluentKafkaContainer(
            DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
    );

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create");
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("app.kafka.user-deleted-topic", () -> TOPIC);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DemoLimiter demoLimiter;

    @MockitoBean
    private UserTokenProvider userTokenProvider;

    @MockitoBean
    private RefreshTokenProvider refreshTokenProvider;

    @MockitoBean
    private MfaTokenProvider mfaTokenProvider;

    @MockitoBean
    private DemoTokenProvider demoTokenProvider;

    private KafkaConsumer<String, String> consumer;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        when(demoLimiter.isDemoMode()).thenReturn(false);
        when(userTokenProvider.getRefreshTokenExpMs()).thenReturn(2_419_200_000L);

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "auth-user-deletion-test-" + UUID.randomUUID());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        consumer = new KafkaConsumer<>(props);
        consumer.subscribe(List.of(TOPIC));
    }

    @AfterEach
    void tearDown() {
        if (consumer != null) {
            consumer.close();
        }
    }

    @Test
    @DisplayName("delete endpoint publishes a USER_DELETED kafka message after successful deletion")
    void deleteEndpointPublishesKafkaMessage() throws Exception {
        UUID userId = UUID.randomUUID();
        UserDAO user = new UserDAO("deleted_user", "password", LocalDateTime.now(), false);
        user.setId(userId);
        userRepository.save(user);

        when(userTokenProvider.validateAndGetUserId("access_token")).thenReturn(Optional.of(userId));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("access_token");

        ResponseEntity<Map> response = restTemplate.exchange(
                "/user/delete",
                HttpMethod.DELETE,
                new HttpEntity<>(null, headers),
                Map.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(userRepository.findById(userId)).isEmpty();

        ConsumerRecord<String, String> record = pollSingleRecord();
        assertThat(record.key()).isEqualTo(userId.toString());

        JsonNode payload = objectMapper.readTree(record.value());
        assertThat(payload.get("eventType").asText()).isEqualTo("USER_DELETED");
        assertThat(payload.get("userId").asText()).isEqualTo(userId.toString());
        assertThat(payload.get("source").asText()).isEqualTo("auth-service");
        assertThat(payload.get("eventId").asText()).isNotBlank();
        assertThat(payload.get("occurredAt").asText()).isNotBlank();
    }

    private ConsumerRecord<String, String> pollSingleRecord() {
        long deadline = System.currentTimeMillis() + Duration.ofSeconds(15).toMillis();
        while (System.currentTimeMillis() < deadline) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
            for (ConsumerRecord<String, String> record : records) {
                return record;
            }
        }
        throw new AssertionError("Expected Kafka record but none was received");
    }
}
