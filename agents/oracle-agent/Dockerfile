FROM node:20-alpine

WORKDIR /app

# Copy Oracle agent files
COPY package.json oracle.js ./

# Create non-root user
RUN addgroup -g 1000 oracle && \
    adduser -D -u 1000 -G oracle oracle && \
    chown -R oracle:oracle /app

USER oracle

# Run Oracle agent
CMD ["node", "oracle.js"]
