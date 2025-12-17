FROM node:22.12.0-slim

RUN apt update && apt install -y git openssl

# Create non-root user with configurable UID/GID for file permission consistency
ARG USER_UID=1000
ARG USER_GID=1000

# Check if group/user already exists and create only if necessary
RUN if ! getent group ${USER_GID} > /dev/null 2>&1; then \
      groupadd -g ${USER_GID} nodeuser; \
    else \
      GROUP_NAME=$(getent group ${USER_GID} | cut -d: -f1); \
      groupmod -n nodeuser ${GROUP_NAME} || true; \
    fi && \
    if ! getent passwd ${USER_UID} > /dev/null 2>&1; then \
      useradd -u ${USER_UID} -g ${USER_GID} -m -s /bin/bash nodeuser; \
    else \
      USER_NAME=$(getent passwd ${USER_UID} | cut -d: -f1); \
      usermod -l nodeuser -d /home/nodeuser -m ${USER_NAME} || true; \
      usermod -g ${USER_GID} nodeuser || true; \
    fi

WORKDIR /home/nodeuser/app

# Change ownership to non-root user
RUN chown -R nodeuser:nodeuser /home/nodeuser/app

# Switch to non-root user
USER nodeuser
