FROM openjdk:21-jdk-slim

WORKDIR /app

# Copy the root settings file, which defines the 'backend' subproject
COPY settings.gradle .

# Copy the backend project's build files and wrapper to leverage Docker layer caching
COPY backend/gradlew ./backend/
COPY backend/gradle ./backend/gradle
COPY backend/build.gradle ./backend/

# Set permissions for the wrapper
RUN chmod +x /app/backend/gradlew

# Set the working directory to the subproject
WORKDIR /app/backend

# Download dependencies. This layer will be cached by Docker.
# When source code changes, this layer won't be re-run.
RUN ./gradlew dependencies --no-daemon

# The entrypoint is not strictly necessary for dev mode, but good practice
# It will be overridden by the command in docker-compose.yml
WORKDIR /app
ENTRYPOINT ["java", "-jar", "backend/build/libs/oda-0.0.1-SNAPSHOT.jar"]
