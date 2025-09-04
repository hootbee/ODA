# Use an official OpenJDK runtime as a parent image
FROM openjdk:21-jdk-slim

# Set the working directory in the container
WORKDIR /app

# Copy the Gradle wrapper and build files to the container
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle .
COPY settings.gradle .

# Grant executable permissions to the Gradle wrapper
RUN chmod +x ./gradlew

# Download dependencies. This will be cached if the build files don't change.
RUN ./gradlew dependencies

# Copy the rest of the application's source code
COPY src ./src

# Build the application
RUN ./gradlew build -x test

# Expose the port the app runs on
EXPOSE 8080

# Specify the command to run on container startup
ENTRYPOINT ["java", "-jar", "build/libs/oda-0.0.1-SNAPSHOT.jar"]
