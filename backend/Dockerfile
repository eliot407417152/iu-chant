FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN for i in 1 2 3 4 5; do \
      mvn -q -B -Dmaven.wagon.http.retryHandler.count=5 dependency:go-offline && exit 0; \
      echo "dependency download failed, retry $i"; sleep 20; \
    done; exit 1
COPY src ./src
RUN for i in 1 2 3 4 5; do \
      mvn -q -B -Dmaven.wagon.http.retryHandler.count=5 package -DskipTests && exit 0; \
      echo "build failed, retry $i"; sleep 20; \
    done; exit 1

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]