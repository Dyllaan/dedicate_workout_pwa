FROM ibm-semeru-runtimes:open-21-jdk-jammy AS build
WORKDIR /workspace
RUN apt-get -o Acquire::Check-Date=false -o Acquire::Check-Valid-Until=false update && apt-get install -y --no-install-recommends binutils findutils && rm -rf /var/lib/apt/lists/*
COPY ops/scripts/jlink-runtime.sh /usr/local/bin/jlink-runtime.sh
RUN chmod +x /usr/local/bin/jlink-runtime.sh
COPY auth-service/ ./auth-service/
WORKDIR /workspace/auth-service
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew bootJar -x test --no-daemon
RUN /usr/local/bin/jlink-runtime.sh build/libs/AuthService-*.jar /opt/java-runtime 21

FROM debian:bookworm-slim
WORKDIR /app
ENV JAVA_HOME=/opt/java-runtime
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0 -XX:InitialRAMPercentage=25.0 -XX:MaxMetaspaceSize=256m -XX:+ExitOnOutOfMemoryError"
COPY --from=build /opt/java-runtime /opt/java-runtime
COPY --from=build /workspace/auth-service/build/libs/AuthService-*.jar app.jar
EXPOSE 8010
ENTRYPOINT ["/opt/java-runtime/bin/java"]
CMD ["-jar", "app.jar", "--spring.profiles.active=docker"]
