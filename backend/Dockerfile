FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 改用 Google 的 Maven Central 鏡像，避免 Render 的 IP 被 Maven Central 限流（429）
RUN printf '%s\n' \
  '<settings>' \
  '  <mirrors>' \
  '    <mirror>' \
  '      <id>google-central</id>' \
  '      <mirrorOf>central</mirrorOf>' \
  '      <url>https://maven-central.storage-download.googleapis.com/maven2/</url>' \
  '    </mirror>' \
  '  </mirrors>' \
  '</settings>' > /root/.m2/settings.xml

COPY pom.xml .
COPY src ./src
RUN for i in 1 2 3; do \
      mvn -q -B -DskipTests package && exit 0; \
      echo "build failed, retry $i"; sleep 20; \
    done; exit 1

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]